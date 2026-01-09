// WebGPU Compute Shaders for NeuralStream
// Optimized matrix multiplication kernels for LLM inference

// =============================================================================
// MATRIX MULTIPLICATION (MATMUL) - The core of neural network computation
// =============================================================================

struct MatmulUniforms {
  // Matrix dimensions
  M: u32,  // Rows in A
  N: u32,  // Cols in B (and C)
  K: u32,  // Cols in A / Rows in B (shared dimension)

  // Tile sizes for optimization
  tileM: u32,
  tileN: u32,
  tileK: u32,
}

@group(0) @binding(0)
var<storage, read> A: array<f32>;  // Input matrix A (M x K)

@group(0) @binding(1)
var<storage, read> B: array<f32>;  // Input matrix B (K x N)

@group(0) @binding(2)
var<storage, read_write> C: array<f32>;  // Output matrix C (M x N)

@group(0) @binding(3)
var<uniform> uniforms: MatmulUniforms;

// Workgroup memory for tiling optimization
var<workgroup> A_tile: array<f32, 128>;  // Shared memory for A tile
var<workgroup> B_tile: array<f32, 128>;  // Shared memory for B tile

/**
 * Standard matrix multiplication C = A * B
 * Uses workgroup tiling for efficient memory access
 */
@compute @workgroup_size(16, 16, 1)
fn matmul_main(@builtin(global_invocation_id) global_id: vec3<u32>,
               @builtin(local_invocation_id) local_id: vec3<u32>,
               @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let row = workgroup_id.y * uniforms.tileM + local_id.y;
  let col = workgroup_id.x * uniforms.tileN + local_id.x;

  // Accumulator for result
  var acc: f32 = 0.0;

  // Loop over tiles in K dimension
  var tileK_start: u32 = 0u;
  for (var tileK: u32 = 0u; tileK < ((uniforms.K + uniforms.tileK - 1u) / uniforms.tileK); tileK++) {
    tileK_start = tileK * uniforms.tileK;

    // Load tiles into workgroup memory
    let A_row = row;
    let A_col = tileK_start + local_id.x;
    let B_row = tileK_start + local_id.y;
    let B_col = col;

    // Check bounds and load
    if (A_row < uniforms.M && A_col < uniforms.K) {
      A_tile[local_id.y * 16u + local_id.x] = A[A_row * uniforms.K + A_col];
    } else {
      A_tile[local_id.y * 16u + local_id.x] = 0.0;
    }

    if (B_row < uniforms.K && B_col < uniforms.N) {
      B_tile[local_id.y * 16u + local_id.x] = B[B_row * uniforms.N + B_col];
    } else {
      B_tile[local_id.y * 16u + local_id.x] = 0.0;
    }

    // Synchronize workgroup
    workgroupBarrier();

    // Compute partial dot product
    for (var k: u32 = 0u; k < uniforms.tileK; k++) {
      acc = acc + A_tile[local_id.y * 16u + k] * B_tile[k * 16u + local_id.x];
    }

    // Synchronize before next tile
    workgroupBarrier();
  }

  // Write result
  if (row < uniforms.M && col < uniforms.N) {
    C[row * uniforms.N + col] = acc;
  }
}

// =============================================================================
// QUANTIZED MATRIX MULTIPLICATION (4-bit) - For compressed models
// =============================================================================

struct QuantizedUniforms {
  M: u32;
  N: u32;
  K: u32;
  blockSize: u32;  // Block size for quantization (e.g., 32)
}

@group(0) @binding(0)
var<storage, read> A_q: array<u32>;  // Quantized A (packed 4-bit)

@group(0) @binding(1)
var<storage, read> B_q: array<u32>;  // Quantized B (packed 4-bit)

@group(0) @binding(2)
var<storage, read> A_scale: array<f32>;  // Scale factors for A

@group(0) @binding(3)
var<storage, read> B_scale: array<f32>;  // Scale factors for B

@group(0) @binding(4)
var<storage, read_write> C_q: array<f32>;  // Output (dequantized)

@group(0) @binding(5)
var<uniform> q_uniforms: QuantizedUniforms;

/**
 * Quantized matrix multiplication with block-wise scaling
 * Saves memory and bandwidth, critical for large models
 */
@compute @workgroup_size(16, 16, 1)
fn matmul_quantized(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let row = global_id.y;
  let col = global_id.x;

  if (row >= q_uniforms.M || col >= q_uniforms.N) {
    return;
  }

  var acc: f32 = 0.0;

  // Process blocks
  let numBlocksK = (q_uniforms.K + q_uniforms.blockSize - 1u) / q_uniforms.blockSize;

  for (var blockIdx: u32 = 0u; blockIdx < numBlocksK; blockIdx++) {
    let blockStartK = blockIdx * q_uniforms.blockSize;

    // Get scale factors for this block
    let a_scale = A_scale[(row * numBlocksK + blockIdx)];
    let b_scale = B_scale[(blockIdx * q_uniforms.N + col)];

    // Accumulate quantized values
    for (var k: u32 = 0u; k < q_uniforms.blockSize; k++) {
      let k_global = blockStartK + k;
      if (k_global >= q_uniforms.K) {
        break;
      }

      // Extract 4-bit values (packed as 2 values per 32-bit)
      let a_idx = (row * q_uniforms.K + k_global) / 2u;
      let b_idx = (k_global * q_uniforms.N + col) / 2u;

      let a_packed = A_q[a_idx];
      let b_packed = B_q[b_idx];

      // Extract 4-bit value (0-15 range, needs offset to -8 to 7)
      let a_4bit = i32((a_packed >> ((k_global % 2u) * 4u)) & 0xFu) - 8;
      let b_4bit = i32((b_packed >> (((k_global * q_uniforms.N + col) % 2u) * 4u)) & 0xFu) - 8;

      // Convert to float and scale
      let a_val = f32(a_4bit) * a_scale;
      let b_val = f32(b_4bit) * b_scale;

      acc = acc + a_val * b_val;
    }
  }

  C_q[row * q_uniforms.N + col] = acc;
}

// =============================================================================
// VECTOR-MATRIX MULTIPLICATION - For single token processing
// =============================================================================

struct VecMatUniforms {
  N: u32;  // Vector length and matrix rows
  M: u32;  // Matrix columns
}

@group(0) @binding(0)
var<storage, read> vector: array<f32>;  // Input vector (N x 1)

@group(0) @binding(1)
var<storage, read> matrix: array<f32>;  // Input matrix (N x M)

@group(0) @binding(2)
var<storage, read_write> result: array<f32>;  // Output vector (M x 1)

@group(0) @binding(3)
var<uniform> vm_uniforms: VecMatUniforms;

/**
 * Vector-matrix multiplication (single token forward pass)
 * Optimized for sequential token generation
 */
@compute @workgroup_size(256, 1, 1)
fn vecmat_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let col = global_id.x;

  if (col >= vm_uniforms.M) {
    return;
  }

  var acc: f32 = 0.0;
  for (var row: u32 = 0u; row < vm_uniforms.N; row++) {
    acc = acc + vector[row] * matrix[row * vm_uniforms.M + col];
  }

  result[col] = acc;
}

// =============================================================================
// BATCHED MATRIX MULTIPLICATION - For parallel processing
// =============================================================================

struct BatchMatmulUniforms {
  batchSize: u32;
  M: u32;
  N: u32;
  K: u32;
}

@group(0) @binding(0)
var<storage, read> batch_A: array<f32>;

@group(0) @binding(1)
var<storage, read> batch_B: array<f32>;

@group(0) @binding(2)
var<storage, read_write> batch_C: array<f32>;

@group(0) @binding(3)
var<uniform> batch_uniforms: BatchMatmulUniforms;

/**
 * Batched matrix multiplication for processing multiple tokens
 * Reduces kernel launch overhead
 */
@compute @workgroup_size(16, 16, 1)
fn batch_matmul_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let batch = global_id.z;
  let row = global_id.y;
  let col = global_id.x;

  if (batch >= batch_uniforms.batchSize ||
      row >= batch_uniforms.M ||
      col >= batch_uniforms.N) {
    return;
  }

  let batch_offset_A = batch * batch_uniforms.M * batch_uniforms.K;
  let batch_offset_B = batch * batch_uniforms.K * batch_uniforms.N;
  let batch_offset_C = batch * batch_uniforms.M * batch_uniforms.N;

  var acc: f32 = 0.0;
  for (var k: u32 = 0u; k < batch_uniforms.K; k++) {
    let a_val = batch_A[batch_offset_A + row * batch_uniforms.K + k];
    let b_val = batch_B[batch_offset_B + k * batch_uniforms.N + col];
    acc = acc + a_val * b_val;
  }

  batch_C[batch_offset_C + row * batch_uniforms.N + col] = acc;
}

// =============================================================================
// SOFTMAX - For attention and output probability computation
// =============================================================================

struct SoftmaxUniforms {
  numElements: u32;
  batchSize: u32;
}

@group(0) @binding(0)
var<storage, read> input: array<f32>;

@group(0) @binding(1)
var<storage, read_write> output: array<f32>;

@group(0) @binding(2)
var<uniform> softmax_uniforms: SoftmaxUniforms;

// Temporary buffer for max values
var<workgroup> max_val: array<f32, 256>;

// Temporary buffer for sum values
var<workgroup> sum_val: array<f32, 256>;

/**
 * Softmax activation function
 * Critical for attention mechanism and token sampling
 */
@compute @workgroup_size(256, 1, 1)
fn softmax_main(@builtin(global_invocation_id) global_id: vec3<u32>,
                @builtin(local_invocation_id) local_id: vec3<u32>) {
  let batch = global_id.y;
  let idx = global_id.x;

  if (batch >= softmax_uniforms.batchSize || idx >= softmax_uniforms.numElements) {
    return;
  }

  let batch_offset = batch * softmax_uniforms.numElements;

  // Find maximum (for numerical stability)
  let val = input[batch_offset + idx];

  // Workgroup reduction for max
  max_val[local_id.x] = val;
  workgroupBarrier();

  var offset: u32 = 128u;
  while (offset > 0u) {
    if (local_id.x < offset && local_id.x + offset < 256u) {
      max_val[local_id.x] = max(max_val[local_id.x], max_val[local_id.x + offset]);
    }
    workgroupBarrier();
    offset = offset / 2u;
  }

  let max_v = max_val[0];

  // Compute exp(x - max) and sum
  let exp_val = exp(val - max_v);
  sum_val[local_id.x] = exp_val;
  workgroupBarrier();

  offset = 128u;
  while (offset > 0u) {
    if (local_id.x < offset && local_id.x + offset < 256u) {
      sum_val[local_id.x] = sum_val[local_id.x] + sum_val[local_id.x + offset];
    }
    workgroupBarrier();
    offset = offset / 2u;
  }

  let sum_exp = sum_val[0];

  // Normalize
  output[batch_offset + idx] = exp_val / sum_exp;
}

// =============================================================================
// LAYER NORMALIZATION - For transformer layers
// =============================================================================

struct LayerNormUniforms {
  numElements: u32;
  epsilon: f32;
}

@group(0) @binding(0)
var<storage, read> ln_input: array<f32>;

@group(0) @binding(1)
var<storage, read> gamma: array<f32>;  // Scale parameter

@group(0) @binding(2)
var<storage, read> beta: array<f32>;  // Shift parameter

@group(0) @binding(3)
var<storage, read_write> ln_output: array<f32>;

@group(0) @binding(4)
var<uniform> ln_uniforms: LayerNormUniforms;

/**
 * Layer normalization
 * Essential for transformer architecture stability
 */
@compute @workgroup_size(256, 1, 1)
fn layer_norm_main(@builtin(global_invocation_id) global_id: vec3<u32>,
                   @builtin(local_invocation_id) local_id: vec3<u32>) {
  let batch = global_id.y;
  let idx = global_id.x;

  if (idx >= ln_uniforms.numElements) {
    return;
  }

  let batch_offset = batch * ln_uniforms.numElements;

  // Compute mean
  var mean: f32 = 0.0;
  for (var i: u32 = 0u; i < ln_uniforms.numElements; i++) {
    mean = mean + ln_input[batch_offset + i];
  }
  mean = mean / f32(ln_uniforms.numElements);

  // Compute variance
  var variance: f32 = 0.0;
  for (var i: u32 = 0u; i < ln_uniforms.numElements; i++) {
    let diff = ln_input[batch_offset + i] - mean;
    variance = variance + diff * diff;
  }
  variance = variance / f32(ln_uniforms.numElements);

  // Normalize
  let std_dev = sqrt(variance + ln_uniforms.epsilon);
  ln_output[batch_offset + idx] = gamma[idx] * ((ln_input[batch_offset + idx] - mean) / std_dev) + beta[idx];
}

// =============================================================================
// GELU ACTIVATION - For feed-forward networks
// =============================================================================

@group(0) @binding(0)
var<storage, read> gelu_input: array<f32>;

@group(0) @binding(1)
var<storage, read_write> gelu_output: array<f32>;

/**
 * GELU (Gaussian Error Linear Unit) activation function
 * Standard activation for modern transformers
 */
@compute @workgroup_size(256, 1, 1)
fn gelu_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;

  let x = gelu_input[idx];

  // GELU approximation: 0.5 * x * (1 + tanh(sqrt(2/pi) * (x + 0.044715 * x^3)))
  let sqrt_2_over_pi = 0.7978845608;
  let coeff = 0.044715;

  let x_cubed = x * x * x;
  let inner = sqrt_2_over_pi * (x + coeff * x_cubed);
  let tanh_val = tanh(inner);

  gelu_output[idx] = 0.5 * x * (1.0 + tanh_val);
}

// =============================================================================
// ROTARY POSITIONAL EMBEDDINGS (RoPE) - For attention
// =============================================================================

struct RoPEUniforms {
  numHeads: u32;
  headDim: u32;
  seqLen: u32;
}

@group(0) @binding(0)
var<storage, read_write> qkv: array<f32>;  // Query, Key, Value tensors

@group(0) @binding(1)
var<storage, read> cos: array<f32>;  // Cosine values for positions

@group(0) @binding(2)
var<storage, read> sin: array<f32>;  // Sine values for positions

@group(0) @binding(3)
var<uniform> rope_uniforms: RoPEUniforms;

/**
 * Apply rotary positional embeddings to queries and keys
 * Essential for modern LLM positional encoding
 */
@compute @workgroup_size(256, 1, 1)
fn rope_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let head = global_id.y;
  let pos = global_id.z;
  let idx = global_id.x;

  if (head >= rope_uniforms.numHeads ||
      pos >= rope_uniforms.seqLen ||
      idx >= rope_uniforms.headDim) {
    return;
  }

  // Apply rotation to pairs of dimensions
  if (idx % 2u == 0u && idx + 1u < rope_uniforms.headDim) {
    let head_offset = (pos * rope_uniforms.numHeads + head) * rope_uniforms.headDim;

    let x = qkv[head_offset + idx];
    let y = qkv[head_offset + idx + 1u];

    let cos_val = cos[(pos * rope_uniforms.headDim + idx) / 2u];
    let sin_val = sin[(pos * rope_uniforms.headDim + idx) / 2u];

    qkv[head_offset + idx] = x * cos_val - y * sin_val;
    qkv[head_offset + idx + 1u] = x * sin_val + y * cos_val;
  }
}
