/**
 * Example 5: Explanation Generation
 *
 * Demonstrates generating detailed explanations of the reasoning process.
 * Makes AI reasoning transparent and understandable.
 *
 * SEO Keywords:
 * - explainable AI
 * - transparent reasoning
 * - AI explanation
 * - reasoning interpretability
 * - chain-of-thought explanation
 */

import { ThoughtChain } from '@superinstance/thoughtchain';

async function explanationGeneration() {
  const thoughtChain = await ThoughtChain.init({
    explainReasoning: true,
    verifiers: 3,
  });

  const query = 'Why is the sky blue?';

  const result = await thoughtChain.reason(query, {
    steps: 6,
  });

  console.log('=== Detailed Explanation ===\n');
  console.log(result.explanation);
  // Output:
  // I'll explain why the sky is blue through a step-by-step reasoning process:
  //
  // 1. Understanding the Question (Confidence: 98%)
  //    First, I need to identify that this is about atmospheric physics and
  //    light scattering.
  //
  // 2. Identifying Key Concepts (Confidence: 96%)
  //    The main concepts are: sunlight, atmosphere, Rayleigh scattering, and
  //    wavelength dependence.
  //
  // 3. Retrieving Scientific Knowledge (Confidence: 94%)
  //    Sunlight contains all colors of the visible spectrum. When it enters
  //    Earth's atmosphere, it interacts with gas molecules.
  //
  // 4. Analyzing Scattering (Confidence: 95%)
  //    Rayleigh scattering causes shorter wavelengths (blue/violet) to scatter
  //    more than longer wavelengths (red/orange). The scattering is
  //    proportional to 1/λ⁴.
  //
  // 5. Considering Human Perception (Confidence: 93%)
  //    Although violet scatters even more than blue, our eyes are more sensitive
  //    to blue light, and the sun emits more blue than violet.
  //
  // 6. Synthesizing the Answer (Confidence: 97%)
  //    Combining all factors: The sky appears blue because blue light from the
  //    sun is scattered in all directions by the atmosphere more than other
  //    colors, and our eyes are particularly sensitive to this scattered blue
  //    light.
  //
  // Final Answer: The sky appears blue due to Rayleigh scattering of sunlight
  // by the atmosphere, with blue light scattering more than other colors and
  // our eyes being more sensitive to blue wavelengths.
  //
  // Overall Confidence: 95.5%
  // Error Reduction: ~75% through parallel verification
}

// Key features:
// - Detailed step explanations
// - Confidence at each step
// - Scientific reasoning process
// - Transparent decision-making
// - Human-readable output
