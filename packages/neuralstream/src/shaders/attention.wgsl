// Self-Attention and Cross-Attention Compute Shaders
// Optimized for multi-head attention in transformer models

// =============================================================================
// MULTI-HEAD ATTENTION - Core of transformer architecture
// =============================================================================

struct AttentionUniforms {
  numHeads: u32;      // Number of attention heads
  headDim: u32;       // Dimension per head
  seqLen: u32;        // Sequence length
  batchSize: u32;     // Batch size
  causal: u32;        // Whether to apply causal masking (0 or 1)
  scale: f32;         // Scaling factor (1 / sqrt(headDim))
}

@group(0) @binding(0)
var<storage, read> Q: array<f32>;  // Query tensor [batch, seqLen, numHeads, headDim]

@group(0) @binding(1)
var<storage, read> K: array<f32>;  // Key tensor [batch, seqLen, numHeads, headDim]

@group(0) @binding(2)
var<storage, read> V: array<f32>;  // Value tensor [batch, seqLen, numHeads, headDim]

@group(0) @binding(3)
var<storage, read_write> output: array<f32>;  // Output tensor [batch, seqLen, numHeads, headDim]

@group(0) @binding(4)
var<uniform> attn_uniforms: AttentionUniforms;

// Workgroup memory for attention scores
var<workgroup> scores_tile: array<f32, 1024>;

/**
 * Multi-head attention computation
 * Computes: softmax(Q * K^T / sqrt(d)) * V
 */
@compute @workgroup_size(16, 16, 1)
fn attention_main(@builtin(global_invocation_id) global_id: vec3<u32>,
                  @builtin(local_invocation_id) local_id: vec3<u32>,
                  @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let batch = global_id.z;
  let head = workgroup_id.y;
  let pos_q = workgroup_id.x;  // Position in sequence for query

  if (batch >= attn_uniforms.batchSize ||
      head >= attn_uniforms.numHeads ||
      pos_q >= attn_uniforms.seqLen) {
    return;
  }

  // Compute attention scores for this position
  var scores: array<f32, 2048>;  // Max sequence length
  var max_score: f32 = -1e9;
  var sum_score: f32 = 0.0;

  // Get query vector for this position
  let q_offset = ((batch * attn_uniforms.seqLen + pos_q) * attn_uniforms.numHeads + head) * attn_uniforms.headDim;

  // Compute attention scores with all keys
  for (var pos_k: u32 = 0u; pos_k < attn_uniforms.seqLen; pos_k++) {
    // Apply causal mask (only attend to past positions)
    if (attn_uniforms.causal == 1u && pos_k > pos_q) {
      scores[pos_k] = -1e9;  // Mask with large negative value
    } else {
      // Dot product: Q[pos_q] · K[pos_k]
      var dot: f32 = 0.0;
      let k_offset = ((batch * attn_uniforms.seqLen + pos_k) * attn_uniforms.numHeads + head) * attn_uniforms.headDim;

      for (var d: u32 = 0u; d < attn_uniforms.headDim; d++) {
        dot = dot + Q[q_offset + d] * K[k_offset + d];
      }

      // Scale and store
      scores[pos_k] = dot * attn_uniforms.scale;
    }

    // Track max for numerical stability
    if (scores[pos_k] > max_score) {
      max_score = scores[pos_k];
    }
  }

  // Compute softmax
  for (var pos_k: u32 = 0u; pos_k < attn_uniforms.seqLen; pos_k++) {
    scores[pos_k] = exp(scores[pos_k] - max_score);
    sum_score = sum_score + scores[pos_k];
  }

  // Normalize
  for (var pos_k: u32 = 0u; pos_k < attn_uniforms.seqLen; pos_k++) {
    scores[pos_k] = scores[pos_k] / sum_score;
  }

  // Compute weighted sum of values
  let out_offset = ((batch * attn_uniforms.seqLen + pos_q) * attn_uniforms.numHeads + head) * attn_uniforms.headDim;

  for (var d: u32 = 0u; d < attn_uniforms.headDim; d++) {
    var weighted_sum: f32 = 0.0;

    for (var pos_k: u32 = 0u; pos_k < attn_uniforms.seqLen; pos_k++) {
      let v_offset = ((batch * attn_uniforms.seqLen + pos_k) * attn_uniforms.numHeads + head) * attn_uniforms.headDim;
      weighted_sum = weighted_sum + scores[pos_k] * V[v_offset + d];
    }

    output[out_offset + d] = weighted_sum;
  }
}

// =============================================================================
// FLASH ATTENTION - Memory-efficient attention
// =============================================================================

struct FlashAttentionUniforms {
  numHeads: u32;
  headDim: u32;
  seqLen: u32;
  batchSize: u32;
  causal: u32;
  block_size: u32;  // Block size for tiling (e.g., 16 or 32)
}

@group(0) @binding(0)
var<storage, read> flash_Q: array<f32>;

@group(0) @binding(1)
var<storage, read> flash_K: array<f32>;

@group(0) @binding(2)
var<storage, read> flash_V: array<f32>;

@group(0) @binding(3)
var<storage, read_write> flash_output: array<f32>;

@group(0) @binding(4)
var<uniform> flash_uniforms: FlashAttentionUniforms;

// Workgroup tiles for Flash Attention
var<workgroup> Q_tile: array<f32, 512>;  // Block_size x headDim
var<workgroup> K_tile: array<f32, 512>;  // Block_size x headDim
var<workgroup> V_tile: array<f32, 512>;  // Block_size x headDim

var<workgroup> O_tile: array<f32, 512>;  // Output tile

/**
 * Flash Attention - I/O memory efficient attention
 * Processes attention in blocks to reduce memory accesses
 * Critical for long context windows
 */
@compute @workgroup_size(16, 16, 1)
fn flash_attention_main(@builtin(global_invocation_id) global_id: vec3<u32>,
                        @builtin(local_invocation_id) local_id: vec3<u32>,
                        @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let batch = global_id.z;
  let head = workgroup_id.y;
  let block_idx_q = workgroup_id.x;  // Block index in sequence

  if (batch >= flash_uniforms.batchSize || head >= flash_uniforms.numHeads) {
    return;
  }

  // Running statistics
  var O: array<f32, 512>;  // Output accumulation
  var l: array<f32, 32>;   // Normalization factor
  var m: array<f32, 32>;   // Max value per block

  // Initialize
  let start_pos_q = block_idx_q * flash_uniforms.block_size;
  for (var i: u32 = 0u; i < flash_uniforms.block_size && start_pos_q + i < flash_uniforms.seqLen; i++) {
    for (var d: u32 = 0u; d < flash_uniforms.headDim; d++) {
      O[i * flash_uniforms.headDim + d] = 0.0;
    }
    l[i] = 1.0;
    m[i] = -1e9;
  }

  // Loop over key/value blocks
  let num_blocks_k = (flash_uniforms.seqLen + flash_uniforms.block_size - 1u) / flash_uniforms.block_size;

  for (var block_idx_k: u32 = 0u; block_idx_k < num_blocks_k; block_idx_k++) {
    let start_pos_k = block_idx_k * flash_uniforms.block_size;

    // Load Q tile
    for (var i: u32 = 0u; i < flash_uniforms.block_size && start_pos_q + i < flash_uniforms.seqLen; i++) {
      let pos_q = start_pos_q + i;
      let q_offset = ((batch * flash_uniforms.seqLen + pos_q) * flash_uniforms.numHeads + head) * flash_uniforms.headDim;

      for (var d: u32 = 0u; d < flash_uniforms.headDim; d++) {
        if (local_id.y == 0u && d < flash_uniforms.headDim) {
          Q_tile[i * flash_uniforms.headDim + d] = flash_Q[q_offset + d];
        }
      }
    }

    // Load K and V tiles
    for (var j: u32 = 0u; j < flash_uniforms.block_size && start_pos_k + j < flash_uniforms.seqLen; j++) {
      let pos_k = start_pos_k + j;
      let k_offset = ((batch * flash_uniforms.seqLen + pos_k) * flash_uniforms.numHeads + head) * flash_uniforms.headDim;
      let v_offset = ((batch * flash_uniforms.seqLen + pos_k) * flash_uniforms.numHeads + head) * flash_uniforms.headDim;

      for (var d: u32 = 0u; d < flash_uniforms.headDim; d++) {
        if (local_id.x == 0u) {
          K_tile[j * flash_uniforms.headDim + d] = flash_K[k_offset + d];
          V_tile[j * flash_uniforms.headDim + d] = flash_V[v_offset + d];
        }
      }
    }

    workgroupBarrier();

    // Compute attention scores for this block
    for (var i: u32 = 0u; i < flash_uniforms.block_size && start_pos_q + i < flash_uniforms.seqLen; i++) {
      let pos_q = start_pos_q + i;

      for (var j: u32 = 0u; j < flash_uniforms.block_size && start_pos_k + j < flash_uniforms.seqLen; j++) {
        let pos_k = start_pos_k + j;

        // Apply causal mask
        if (flash_uniforms.causal == 1u && pos_k > pos_q) {
          continue;
        }

        // Dot product Q[i] · K[j]
        var dot: f32 = 0.0;
        for (var d: u32 = 0u; d < flash_uniforms.headDim; d++) {
          dot = dot + Q_tile[i * flash_uniforms.headDim + d] * K_tile[j * flash_uniforms.headDim + d];
        }

        let score = exp(dot * flash_uniforms.scale);

        // Update statistics
        let new_m = max(m[i], score);
        let new_l = l[i] * exp(m[i] - new_m) + score;
        let alpha = exp(m[i] - new_m) * l[i] / new_l;
        let beta = score / new_l;

        // Update output
        for (var d: u32 = 0u; d < flash_uniforms.headDim; d++) {
          O[i * flash_uniforms.headDim + d] =
            alpha * O[i * flash_uniformq_headDim + d] +
            beta * V_tile[j * flash_uniforms.headDim + d];
        }

        m[i] = new_m;
        l[i] = new_l;
      }
    }

    workgroupBarrier();
  }

  // Write output
  for (var i: u32 = 0u; i < flash_uniforms.block_size && start_pos_q + i < flash_uniforms.seqLen; i++) {
    let pos_q = start_pos_q + i;
    let out_offset = ((batch * flash_uniforms.seqLen + pos_q) * flash_uniforms.numHeads + head) * flash_uniforms.headDim;

    for (var d: u32 = 0u; d < flash_uniforms.headDim; d++) {
      flash_output[out_offset + d] = O[i * flash_uniforms.headDim + d];
    }
  }
}

// =============================================================================
// GROUPED-QUERY ATTENTION (GQA) - Memory-efficient attention
// =============================================================================

struct GQAUniforms {
  numQueryHeads: u32;   // Number of query heads
  numKVHeads: u32;      // Number of key-value heads (usually smaller)
  headDim: u32;
  seqLen: u32;
  batchSize: u32;
  causal: u32;
  scale: f32;
}

@group(0) @binding(0)
var<storage, read> gqa_Q: array<f32>;  // [batch, seqLen, numQueryHeads, headDim]

@group(0) @binding(1)
var<storage, read> gqa_K: array<f32>;  // [batch, seqLen, numKVHeads, headDim]

@group(0) @binding(2)
var<storage, read> gqa_V: array<f32>;  // [batch, seqLen, numKVHeads, headDim]

@group(0) @binding(3)
var<storage, read_write> gqa_output: array<f32>;

@group(0) @binding(4)
var<uniform> gqa_uniforms: GQAUniforms;

/**
 * Grouped-Query Attention
 * Multiple query heads share key-value heads
 * Reduces memory footprint for large models
 */
@compute @workgroup_size(16, 16, 1)
fn gqa_main(@builtin(global_invocation_id) global_id: vec3<u32>,
            @builtin(workgroup_id) workgroup_id: vec3<u32>) {
  let batch = global_id.z;
  let query_head = workgroup_id.y;
  let pos_q = workgroup_id.x;

  if (batch >= gqa_uniforms.batchSize ||
      query_head >= gqa_uniforms.numQueryHeads ||
      pos_q >= gqa_uniforms.seqLen) {
    return;
  }

  // Map query head to KV head (round-robin)
  let kv_head = query_head / (gqa_uniforms.numQueryHeads / gqa_uniforms.numKVHeads);

  // Get query vector
  let q_offset = ((batch * gqa_uniforms.seqLen + pos_q) * gqa_uniforms.numQueryHeads + query_head) * gqa_uniforms.headDim;
  let kv_offset_base = (batch * gqa_uniforms.seqLen + pos_q) * gqa_uniforms.numKVHeads + kv_head;

  // Compute attention scores
  var scores: array<f32, 2048>;
  var max_score: f32 = -1e9;
  var sum_score: f32 = 0.0;

  for (var pos_k: u32 = 0u; pos_k < gqa_uniforms.seqLen; pos_k++) {
    // Apply causal mask
    if (gqa_uniforms.causal == 1u && pos_k > pos_q) {
      scores[pos_k] = -1e9;
    } else {
      var dot: f32 = 0.0;
      let k_offset = ((batch * gqa_uniforms.seqLen + pos_k) * gqa_uniforms.numKVHeads + kv_head) * gqa_uniforms.headDim;

      for (var d: u32 = 0u; d < gqa_uniforms.headDim; d++) {
        dot = dot + gqa_Q[q_offset + d] * gqa_K[k_offset + d];
      }

      scores[pos_k] = dot * gqa_uniforms.scale;
    }

    if (scores[pos_k] > max_score) {
      max_score = scores[pos_k];
    }
  }

  // Softmax
  for (var pos_k: u32 = 0u; pos_k < gqa_uniforms.seqLen; pos_k++) {
    scores[pos_k] = exp(scores[pos_k] - max_score);
    sum_score = sum_score + scores[pos_k];
  }

  for (var pos_k: u32 = 0u; pos_k < gqa_uniforms.seqLen; pos_k++) {
    scores[pos_k] = scores[pos_k] / sum_score;
  }

  // Weighted sum of values
  let out_offset = q_offset;

  for (var d: u32 = 0u; d < gqa_uniforms.headDim; d++) {
    var weighted_sum: f32 = 0.0;

    for (var pos_k: u32 = 0u; pos_k < gqa_uniforms.seqLen; pos_k++) {
      let v_offset = ((batch * gqa_uniforms.seqLen + pos_k) * gqa_uniforms.numKVHeads + kv_head) * gqa_uniforms.headDim;
      weighted_sum = weighted_sum + scores[pos_k] * gqa_V[v_offset + d];
    }

    gqa_output[out_offset + d] = weighted_sum;
  }
}

// =============================================================================
// KV-CACHE UPDATE - Efficient caching for generation
// =============================================================================

struct KVCacheUniforms {
  numHeads: u32;
  headDim: u32;
  seqLen: u32;
  batchSize: u32;
  cacheSize: u32;  // Total cache size
  currentPos: u32; // Current position in cache
}

@group(0) @binding(0)
var<storage, read> new_K: array<f32>;  // New key vectors

@group(0) @binding(1)
var<storage, read> new_V: array<f32>;  // New value vectors

@group(0) @binding(2)
var<storage, read_write> K_cache: array<f32>;  // Key cache

@group(0) @binding(3)
var<storage, read_write> V_cache: array<f32>;  // Value cache

@group(0) @binding(4)
var<uniform> cache_uniforms: KVCacheUniforms;

/**
 * Update KV-cache with new tokens
 * Critical for efficient autoregressive generation
 */
@compute @workgroup_size(256, 1, 1)
fn kv_cache_update(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let batch = global_id.y;
  let head = global_id.z;
  let idx = global_id.x;

  if (batch >= cache_uniforms.batchSize ||
      head >= cache_uniforms.numHeads ||
      idx >= cache_uniforms.headDim ||
      cache_uniforms.currentPos >= cache_uniforms.cacheSize) {
    return;
  }

  let cache_idx = ((batch * cache_uniforms.cacheSize + cache_uniforms.currentPos) *
                   cache_uniforms.numHeads + head) * cache_uniforms.headDim;
  let new_idx = ((batch * cache_uniforms.seqLen + cache_uniforms.currentPos) *
                 cache_uniforms.numHeads + head) * cache_uniforms.headDim;

  K_cache[cache_idx + idx] = new_K[new_idx + idx];
  V_cache[cache_idx + idx] = new_V[new_idx + idx];
}
