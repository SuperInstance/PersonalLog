/**
 * PersonalLog Native Extensions
 *
 * High-performance WebAssembly modules for vector operations and other
 * CPU-intensive tasks.
 */

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global allocator
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// ============================================================================
// VECTOR OPERATIONS
// ============================================================================

mod vector;

pub use vector::{
    cosine_similarity,
    dot_product,
    euclidean_distance,
    batch_cosine_similarity,
    normalize_vector,
};

// ============================================================================
// INITIALIZATION & UTILS
// ============================================================================

/// Initialize the WASM module with console error panic hook
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get version information
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Check if SIMD is enabled in this build
#[wasm_bindgen]
pub fn has_simd() -> bool {
    // This would be determined at compile time
    // For now, return true if targeting wasm32 with simd feature
    cfg!(target_arch = "wasm32")
}

// ============================================================================
// EXPORTED TEST HELPERS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let result = cosine_similarity(&a, &b);
        assert!((result - 1.0).abs() < 0.0001);

        let c = vec![0.0, 1.0, 0.0];
        let result = cosine_similarity(&a, &c);
        assert!((result - 0.0).abs() < 0.0001);
    }

    #[test]
    fn test_dot_product() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let result = dot_product(&a, &b);
        assert!((result - 32.0).abs() < 0.0001);
    }

    #[test]
    fn test_normalize() {
        let a = vec![3.0, 4.0];
        let result = normalize_vector(&a);
        let magnitude = (result[0].powi(2) + result[1].powi(2)).sqrt();
        assert!((magnitude - 1.0).abs() < 0.0001);
    }
}
