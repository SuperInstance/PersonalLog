/**
 * Vector Operations Module
 *
 * High-performance vector math operations for similarity search,
 * optimized for WebAssembly with potential SIMD acceleration.
 */

use wasm_bindgen::prelude::*;

// ============================================================================
// BASIC OPERATIONS
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 *
 * Formula: cos(θ) = (a · b) / (||a|| * ||b||)
 *
 * # Arguments
 * * `a` - First vector (f32 array)
 * * `b` - Second vector (f32 array)
 *
 * # Returns
 * * Similarity score between -1.0 and 1.0 (1.0 = identical)
 *
 * # Panics
 * * Panics if vectors have different lengths
 */
#[wasm_bindgen]
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(
        a.len(),
        b.len(),
        "Vectors must have same length"
    );

    if a.is_empty() {
        return 0.0;
    }

    let dot_product = dot_product(a, b);
    let norm_a = vector_norm(a);
    let norm_b = vector_norm(b);

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot_product / (norm_a * norm_b)
}

/**
 * Calculate dot product of two vectors
 *
 * Formula: a · b = Σ(a[i] * b[i])
 */
#[wasm_bindgen]
pub fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    a.iter()
        .zip(b.iter())
        .map(|(x, y)| x * y)
        .sum()
}

/**
 * Calculate Euclidean distance between two vectors
 *
 * Formula: d = √(Σ(a[i] - b[i])²)
 */
#[wasm_bindgen]
pub fn euclidean_distance(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(
        a.len(),
        b.len(),
        "Vectors must have same length"
    );

    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).powi(2))
        .sum::<f32>()
        .sqrt()
}

/**
 * Normalize a vector to unit length
 *
 * Formula: v' = v / ||v||
 */
#[wasm_bindgen]
pub fn normalize_vector(v: &[f32]) -> Vec<f32> {
    let norm = vector_norm(v);
    if norm == 0.0 {
        return v.to_vec();
    }
    v.iter().map(|x| x / norm).collect()
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Calculate cosine similarities between query and multiple vectors
 *
 * # Arguments
 * * `query` - Query vector
 * * `vectors` - Array of vectors to compare against (flattened: [v1, v2, v3, ...])
 * * `dimension` - Dimension of each vector
 *
 * # Returns
 * * Array of similarity scores
 */
#[wasm_bindgen]
pub fn batch_cosine_similarity(
    query: &[f32],
    vectors: &[f32],
    dimension: usize,
) -> Vec<f32> {
    assert_eq!(
        query.len(),
        dimension,
        "Query dimension mismatch"
    );
    assert!(
        vectors.len() % dimension == 0,
        "Vectors array length must be multiple of dimension"
    );

    let num_vectors = vectors.len() / dimension;
    let mut similarities = Vec::with_capacity(num_vectors);

    for i in 0..num_vectors {
        let start = i * dimension;
        let end = start + dimension;
        let vec_slice = &vectors[start..end];
        similarities.push(cosine_similarity(query, vec_slice));
    }

    similarities
}

/**
 * Find top K most similar vectors
 *
 * # Arguments
 * * `query` - Query vector
 * * `vectors` - Array of vectors to search
 * * `dimension` - Dimension of each vector
 * * `k` - Number of top results to return
 *
 * # Returns
 * * Array of (index, score) tuples for top K results
 */
#[wasm_bindgen]
pub fn top_k_similar(
    query: &[f32],
    vectors: &[f32],
    dimension: usize,
    k: usize,
) -> Vec<f32> {
    let similarities = batch_cosine_similarity(query, vectors, dimension);

    let mut indexed: Vec<(usize, f32)> = similarities
        .into_iter()
        .enumerate()
        .collect();

    // Sort by similarity descending
    indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

    // Take top K and flatten to [index1, score1, index2, score2, ...]
    indexed
        .into_iter()
        .take(k)
        .flat_map(|(idx, score)| vec![idx as f32, score])
        .collect()
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate L2 norm (magnitude) of a vector
 *
 * Formula: ||v|| = √(Σ(v[i]²))
 */
fn vector_norm(v: &[f32]) -> f32 {
    v.iter()
        .map(|x| x.powi(2))
        .sum::<f32>()
        .sqrt()
}

/**
 * Calculate Manhattan (L1) distance between two vectors
 *
 * Formula: d = Σ|a[i] - b[i]|
 */
#[wasm_bindgen]
pub fn manhattan_distance(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(
        a.len(),
        b.len(),
        "Vectors must have same length"
    );

    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).abs())
        .sum()
}

/**
 * Calculate squared Euclidean distance (faster than euclidean_distance)
 *
 * Formula: d² = Σ(a[i] - b[i])²
 *
 * Use this when you only need to compare distances (avoids sqrt)
 */
#[wasm_bindgen]
pub fn squared_euclidean_distance(a: &[f32], b: &[f32]) -> f32 {
    assert_eq!(
        a.len(),
        b.len(),
        "Vectors must have same length"
    );

    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).powi(2))
        .sum()
}

// ============================================================================
// AGGREGATION OPERATIONS
// ============================================================================

/**
 * Calculate mean of vectors
 */
#[wasm_bindgen]
pub fn vector_mean(vectors: &[f32], dimension: usize) -> Vec<f32> {
    assert!(
        vectors.len() % dimension == 0,
        "Vectors array length must be multiple of dimension"
    );

    let num_vectors = vectors.len() / dimension;
    if num_vectors == 0 {
        return Vec::new();
    }

    let mut mean = vec![0.0f32; dimension];

    for i in 0..num_vectors {
        let start = i * dimension;
        let end = start + dimension;
        for j in 0..dimension {
            mean[j] += vectors[start + j];
        }
    }

    for val in mean.iter_mut() {
        *val /= num_vectors as f32;
    }

    mean
}

/**
 * Calculate weighted sum of vectors
 */
#[wasm_bindgen]
pub fn weighted_sum(vectors: &[f32], weights: &[f32], dimension: usize) -> Vec<f32> {
    let num_vectors = vectors.len() / dimension;
    assert_eq!(
        num_vectors,
        weights.len(),
        "Weights length must match number of vectors"
    );

    let mut result = vec![0.0f32; dimension];

    for i in 0..num_vectors {
        let start = i * dimension;
        let end = start + dimension;
        let weight = weights[i];

        for j in 0..dimension {
            result[j] += vectors[start + j] * weight;
        }
    }

    result
}

// ============================================================================
// TEXT UTILITIES (for future embedding operations)
// ============================================================================

/**
 * Simple hash function for text (for placeholder embeddings)
 *
 * Note: This is a basic hash function for demo purposes.
 * Real embeddings should use trained models.
 */
#[wasm_bindgen]
pub fn hash_embedding(text: &str, dimensions: usize) -> Vec<f32> {
    let bytes = text.as_bytes();
    let mut hash: u32 = 5381;

    for &byte in bytes {
        hash = hash.wrapping_mul(33).wrapping_add(byte as u32);
    }

    let mut seed = hash as f32;
    let mut vector = vec![0.0f32; dimensions];

    for i in 0..dimensions {
        seed = seed * 1.1 + 0.3;
        seed -= seed.floor();
        vector[i] = seed;
    }

    // Normalize to unit length
    normalize_vector(&vector)
}

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

/**
 * Estimate memory usage of vectors in bytes
 */
#[wasm_bindgen]
pub fn estimate_memory_size(num_vectors: usize, dimension: usize) -> usize {
    // Each f32 is 4 bytes
    num_vectors * dimension * 4
}

/**
 * Get recommended batch size for operations based on vector size
 */
#[wasm_bindgen]
pub fn recommended_batch_size(vector_dimension: usize) -> usize {
    // Tune based on empirical testing
    match vector_dimension {
        d if d <= 128 => 256,
        d if d <= 384 => 128,
        d if d <= 768 => 64,
        _ => 32,
    }
}

// ============================================================================
// SIMD-OPTIMIZED VERSIONS (Future Enhancement)
// ============================================================================

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "simd")]
mod simd {
    use super::*;

    /**
     * SIMD-accelerated cosine similarity
     *
     * Requires WebAssembly SIMD support and nightly Rust
     */
    #[wasm_bindgen]
    pub fn cosine_similarity_simd(a: &[f32], b: &[f32]) -> f32 {
        // TODO: Implement with packed SIMD instructions
        // This requires nightly Rust and explicit SIMD intrinsics
        cosine_similarity(a, b) // Fallback to scalar for now
    }
}
