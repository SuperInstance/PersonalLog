/**
 * ComfyUI Workflow Template Library
 *
 * Extensive collection of ready-to-use workflow templates
 * Organized by category, style, and use case
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  style: TemplateStyle;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedCost: 'low' | 'medium' | 'high';
  recommendedModels: string[];
  tags: string[];
  workflowJson: any;
  prompt?: string;
  tips?: string[];
}

export type TemplateCategory =
  | 'portraits'
  | 'landscapes'
  | 'characters'
  | 'objects'
  | 'environments'
  | 'style_transfer'
  | 'inpainting'
  | 'upscaling'
  | 'video'
  | 'animation';

export type TemplateStyle =
  | 'photorealistic'
  | 'anime'
  | 'fantasy'
  | 'cyberpunk'
  | 'minimalist'
  | 'oil_painting'
  | 'watercolor'
  | 'digital_art'
  | '3d_render'
  | 'concept_art';

// ============================================
// TEMPLATE LIBRARY
// ============================================

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ==========================================
  // PORTRAIT TEMPLATES
  // ==========================================

  {
    id: 'portrait-photorealistic-basic',
    name: 'Photorealistic Portrait',
    description: 'High-quality portrait generation with natural lighting and skin texture',
    category: 'portraits',
    style: 'photorealistic',
    difficulty: 'beginner',
    estimatedCost: 'medium',
    recommendedModels: ['SDXL 1.0', 'Realistic Vision'],
    tags: ['portrait', 'photorealistic', 'lighting', 'texture'],
    prompt: 'professional portrait photography, studio lighting, 85mm lens, sharp focus, natural skin texture',
    tips: [
      'Use 768x1024 resolution for portraits',
      'Set CFG scale to 7-8 for better adherence',
      'Start with 20-30 sampling steps',
      'Use DPM++ 2M Karras sampler'
    ],
    workflowJson: {
      name: 'Photorealistic Portrait',
      description: 'Basic photorealistic portrait generation',
      prompt: 'professional portrait photography, studio lighting, 85mm lens, sharp focus, natural skin texture',
      nodes: [
        {
          id: '1',
          type: 'CheckpointLoaderSimple',
          pos: [100, 200],
          size: [300, 100],
          inputs: {
            ckpt_name: 'sdxl_turbo.safetensors'
          },
          outputs: ['MODEL', 'CLIP_VISION', 'CLIP']
        },
        {
          id: '2',
          type: 'CLIPTextEncode',
          pos: [100, 400],
          size: [300, 100],
          inputs: {
            text: 'professional portrait photography, studio lighting, 85mm lens, sharp focus',
            clip: ['1', 1]
          },
          outputs: ['CONDITIONING']
        },
        {
          id: '3',
          type: 'EmptyLatentImage',
          pos: [400, 200],
          size: [300, 100],
          inputs: {
            width: 768,
            height: 1024,
            batch_size: 1
          },
          outputs: ['LATENT']
        },
        {
          id: '4',
          type: 'KSampler',
          pos: [400, 400],
          size: [300, 100],
          inputs: {
            seed: 0,
            steps: 25,
            cfg: 7.5,
            sampler_name: 'euler',
            scheduler: 'normal',
            denoise: 1,
            model: ['1', 1],
            positive: ['2', 0],
            negative: ['2', 1],
            latent_image: ['3', 0]
          },
          outputs: ['LATENT', 'VAE']
        },
        {
          id: '5',
          type: 'VAEDecode',
          pos: [400, 600],
          size: [300, 100],
          inputs: {
            samples: ['4', 0],
            vae: ['1', 2]
          },
          outputs: ['IMAGE']
        }
      ],
      links: [
        [1, 1, 0, 2],
        [1, 2, 0, 5],
        [2, 0, 0, 4],
        [3, 0, 0, 4],
        [4, 0, 0, 5],
        [1, 1, 2, 5]
      ]
    }
  },

  {
    id: 'portrait-anime-stylized',
    name: 'Anime Portrait',
    description: 'Stylized anime-style portrait with vibrant colors',
    category: 'portraits',
    style: 'anime',
    difficulty: 'beginner',
    estimatedCost: 'low',
    recommendedModels: ['Anything V5', 'Niji Journey'],
    tags: ['portrait', 'anime', 'stylized', 'colorful'],
    prompt: 'anime portrait, vibrant colors, large eyes, stylized hair, clean lineart',
    tips: [
      'Use 512x768 for anime style',
      'Lower CFG to 5-6 for more creativity',
      'Use 15-20 steps for faster generation',
      'Try DPM++ 2M Karras sampler'
    ],
    workflowJson: {
      name: 'Anime Portrait',
      description: 'Stylized anime portrait generation',
      prompt: 'anime portrait, vibrant colors, large eyes, stylized hair, clean lineart',
      nodes: [
        {
          id: '1',
          type: 'CheckpointLoaderSimple',
          pos: [100, 200],
          size: [300, 100],
          inputs: {
            ckpt_name: 'anythingV5_v5Prtrei.safetensors'
          },
          outputs: ['MODEL', 'CLIP_VISION', 'CLIP']
        },
        {
          id: '2',
          type: 'CLIPTextEncode',
          pos: [100, 400],
          size: [300, 100],
          inputs: {
            text: 'anime portrait, vibrant colors, large eyes, stylized hair, clean lineart',
            clip: ['1', 1]
          },
          outputs: ['CONDITIONING']
        },
        {
          id: '3',
          type: 'EmptyLatentImage',
          pos: [400, 200],
          size: [300, 100],
          inputs: {
            width: 512,
            height: 768,
            batch_size: 1
          },
          outputs: ['LATENT']
        },
        {
          id: '4',
          type: 'KSampler',
          pos: [400, 400],
          size: [300, 100],
          inputs: {
            seed: 0,
            steps: 20,
            cfg: 5.5,
            sampler_name: 'euler_a',
            scheduler: 'karras',
            denoise: 1,
            model: ['1', 1],
            positive: ['2', 0],
            negative: ['2', 1],
            latent_image: ['3', 0]
          },
          outputs: ['LATENT', 'VAE']
        },
        {
          id: '5',
          type: 'VAEDecode',
          pos: [400, 600],
          size: [300, 100],
          inputs: {
            samples: ['4', 0],
            vae: ['1', 2]
          },
          outputs: ['IMAGE']
        }
      ],
      links: [
        [1, 1, 0, 2],
        [1, 2, 0, 5],
        [2, 0, 0, 4],
        [3, 0, 0, 4],
        [4, 0, 0, 5],
        [1, 1, 2, 5]
      ]
    }
  },

  // ==========================================
  // LANDSCAPE TEMPLATES
  // ==========================================

  {
    id: 'landscape-fantasy-epic',
    name: 'Epic Fantasy Landscape',
    description: 'Dramatic fantasy landscape with mountains, sky, and atmosphere',
    category: 'landscapes',
    style: 'fantasy',
    difficulty: 'intermediate',
    estimatedCost: 'high',
    recommendedModels: ['Fantasy XL', 'DreamShaper'],
    tags: ['landscape', 'fantasy', 'epic', 'atmosphere'],
    prompt: 'epic fantasy landscape, towering mountains, dramatic sky, golden hour lighting, mystical atmosphere, volumetric fog',
    tips: [
      'Use 1024x1024 or 1344x768 for landscapes',
      'Higher steps (30-40) for more detail',
      'CFG 7-9 for better composition',
      'Add LoRA for landscape enhancement'
    ],
    workflowJson: {
      name: 'Epic Fantasy Landscape',
      description: 'Dramatic fantasy landscape generation',
      prompt: 'epic fantasy landscape, towering mountains, dramatic sky, golden hour lighting, mystical atmosphere, volumetric fog',
      nodes: [
        {
          id: '1',
          type: 'CheckpointLoaderSimple',
          pos: [100, 200],
          size: [300, 100],
          inputs: {
            ckpt_name: 'fantasyxl_v10.safetensors'
          },
          outputs: ['MODEL', 'CLIP_VISION', 'CLIP']
        },
        {
          id: '2',
          type: 'LoraLoader',
          pos: [250, 200],
          size: [300, 100],
          inputs: {
            lora_name: 'landscape_enhancer.safetensors',
            strength_model: 0.75,
            strength_clip: 0.75,
            model: ['1', 1],
            clip: ['1', 1]
          },
          outputs: ['MODEL', 'CLIP']
        },
        {
          id: '3',
          type: 'CLIPTextEncode',
          pos: [100, 400],
          size: [300, 100],
          inputs: {
            text: 'epic fantasy landscape, towering mountains, dramatic sky, golden hour lighting, mystical atmosphere, volumetric fog',
            clip: ['1', 1]
          },
          outputs: ['CONDITIONING']
        },
        {
          id: '4',
          type: 'EmptyLatentImage',
          pos: [400, 200],
          size: [300, 100],
          inputs: {
            width: 1024,
            height: 1024,
            batch_size: 1
          },
          outputs: ['LATENT']
        },
        {
          id: '5',
          type: 'KSampler',
          pos: [400, 400],
          size: [300, 100],
          inputs: {
            seed: 0,
            steps: 35,
            cfg: 8.5,
            sampler_name: 'dpmpp_2m',
            scheduler: 'karras',
            denoise: 1,
            model: ['2', 1],
            positive: ['3', 0],
            negative: ['3', 1],
            latent_image: ['4', 0]
          },
          outputs: ['LATENT', 'VAE']
        },
        {
          id: '6',
          type: 'CLIPTextEncode',
          pos: [600, 400],
          size: [300, 100],
          inputs: {
            text: 'blurry, low quality, ugly, distorted, watermark',
            clip: ['1', 1]
          },
          outputs: ['CONDITIONING']
        },
        {
          id: '7',
          type: 'VAEDecode',
          pos: [400, 600],
          size: [300, 100],
          inputs: {
            samples: ['5', 0],
            vae: ['1', 2]
          },
          outputs: ['IMAGE']
        }
      ],
      links: [
        [1, 1, 0, 3],
        [1, 2, 0, 5],
        [2, 0, 0, 5],
        [3, 0, 0, 5],
        [4, 0, 0, 5],
        [1, 1, 1, 6],
        [6, 0, 0, 5],
        [5, 0, 0, 7]
      ]
    }
  },

  {
    id: 'landscape-cyberpunk-city',
    name: 'Cyberpunk Cityscape',
    description: 'Neon-lit cyberpunk city with buildings, rain, and atmosphere',
    category: 'landscapes',
    style: 'cyberpunk',
    difficulty: 'intermediate',
    estimatedCost: 'high',
    recommendedModels: ['CyberRealistic', 'NeonDream'],
    tags: ['landscape', 'cyberpunk', 'neon', 'city', 'night'],
    prompt: 'cyberpunk cityscape, neon lights, futuristic skyscrapers, rain, reflections, holographic signs, moody atmosphere, high contrast',
    tips: [
      'Use 1024x1024 for detailed cityscapes',
      '30-40 steps for complex scenes',
      'CFG 8-10 for strong style adherence',
      'Consider ControlNet for architectural structure'
    ],
    workflowJson: {
      name: 'Cyberpunk Cityscape',
      description: 'Neon cyberpunk city generation',
      prompt: 'cyberpunk cityscape, neon lights, futuristic skyscrapers, rain, reflections, holographic signs, moody atmosphere, high contrast',
      nodes: [
        {
          id: '1',
          type: 'CheckpointLoaderSimple',
          pos: [100, 200],
          size: [300, 100],
          inputs: {
            ckpt_name: 'cyberrealistic_v20.safetensors'
          },
          outputs: ['MODEL', 'CLIP_VISION', 'CLIP']
        },
        {
          id: '2',
          type: 'CLIPTextEncode',
          pos: [100, 400],
          size: [300, 100],
          inputs: {
            text: 'cyberpunk cityscape, neon lights, futuristic skyscrapers, rain, reflections, holographic signs, moody atmosphere, high contrast',
            clip: ['1', 1]
          },
          outputs: ['CONDITIONING']
        },
        {
          id: '3',
          type: 'EmptyLatentImage',
          pos: [400, 200],
          size: [300, 100],
          inputs: {
            width: 1024,
            height: 1024,
            batch_size: 1
          },
          outputs: ['LATENT']
        },
        {
          id: '4',
          type: 'KSampler',
          pos: [400, 400],
          size: [300, 100],
          inputs: {
            seed: 0,
            steps: 35,
            cfg: 9.0,
            sampler_name: 'dpmpp_2m',
            scheduler: 'karras',
            denoise: 1,
            model: ['1', 1],
            positive: ['2', 0],
            negative: ['2', 1],
            latent_image: ['3', 0]
          },
          outputs: ['LATENT', 'VAE']
        },
        {
          id: '5',
          type: 'CLIPTextEncode',
          pos: [600, 400],
          size: [300, 100],
          inputs: {
            text: 'blurry, low quality, ugly, distorted, watermark',
            clip: ['1', 1]
          },
          outputs: ['CONDITIONING']
        },
        {
          id: '6',
          type: 'VAEDecode',
          pos: [400, 600],
          size: [300, 100],
          inputs: {
            samples: ['4', 0],
            vae: ['1', 2]
          },
          outputs: ['IMAGE']
        }
      ],
      links: [
        [1, 1, 0, 2],
        [1, 2, 0, 4],
        [2, 0, 0, 4],
        [3, 0, 0, 4],
        [4, 0, 0, 5],
        [1, 1, 1, 5],
        [5, 0, 0, 6]
      ]
    }
  },

  // ==========================================
  // CHARACTER TEMPLATES
  // ==========================================

  {
    id: 'character-fantasy-warrior',
    name: 'Fantasy Warrior Character',
    description: 'Detailed fantasy character with armor and weapons',
    category: 'characters',
    style: 'fantasy',
    difficulty: 'advanced',
    estimatedCost: 'high',
    recommendedModels: ['Character XL', 'Fantasy Character'],
    tags: ['character', 'fantasy', 'warrior', 'armor', 'detailed'],
    prompt: 'fantasy warrior character, ornate armor, detailed weaponry, dynamic pose, heroic stance, epic lighting, intricate textures',
    tips: [
      'Use higher resolution (768x1024) for characters',
      '40-50 steps for fine details',
      'CFG 8-10 for strong character features',
      'Use character-specific LoRA if available',
      'Consider ControlNet for consistent poses'
    ],
    workflowJson: {
      name: 'Fantasy Warrior Character',
      description: 'Detailed fantasy character generation',
      prompt: 'fantasy warrior character, ornate armor, detailed weaponry, dynamic pose, heroic stance, epic lighting, intricate textures',
      nodes: [
        {
          id: '1',
          type: 'CheckpointLoaderSimple',
          pos: [100, 200],
          size: [300, 100],
          inputs: {
            ckpt_name: 'characterxl_v30.safetensors'
          },
          outputs: ['MODEL', 'CLIP_VISION', 'CLIP']
        },
        {
          id: '2',
          type: 'LoraLoader',
          pos: [250, 200],
          size: [300, 100],
          inputs: {
            lora_name: 'armor_detailer.safetensors',
            strength_model: 0.8,
            strength_clip: 0.8,
            model: ['1', 1],
            clip: ['1', 1]
          },
          outputs: ['MODEL', 'CLIP']
        },
        {
          id: '3',
          type: 'CLIPTextEncode',
          pos: [100, 400],
          size: [300, 100],
          inputs: {
            text: 'fantasy warrior character, ornate armor, detailed weaponry, dynamic pose, heroic stance, epic lighting, intricate textures',
            clip: ['1', 1]
          },
          outputs: ['CONDITIONING']
        },
        {
          id: '4',
          type: 'EmptyLatentImage',
          pos: [400, 200],
          size: [300, 100],
          inputs: {
            width: 768,
            height: 1024,
            batch_size: 1
          },
          outputs: ['LATENT']
        },
        {
          id: '5',
          type: 'KSampler',
          pos: [400, 400],
          size: [300, 100],
          inputs: {
            seed: 0,
            steps: 45,
            cfg: 9.5,
            sampler_name: 'dpmpp_2m',
            scheduler: 'karras',
            denoise: 1,
            model: ['2', 1],
            positive: ['3', 0],
            negative: ['3', 1],
            latent_image: ['4', 0]
          },
          outputs: ['LATENT', 'VAE']
        },
        {
          id: '6',
          type: 'VAEDecode',
          pos: [400, 600],
          size: [300, 100],
          inputs: {
            samples: ['5', 0],
            vae: ['1', 2]
          },
          outputs: ['IMAGE']
        }
      ],
      links: [
        [1, 1, 0, 3],
        [1, 2, 0, 5],
        [2, 0, 0, 5],
        [3, 0, 0, 5],
        [4, 0, 0, 5],
        [5, 0, 0, 6]
      ]
    }
  },

  // ==========================================
  // STYLE TRANSFER TEMPLATES
  // ==========================================

  {
    id: 'style-oil-painting',
    name: 'Oil Painting Style Transfer',
    description: 'Transform any image into oil painting style',
    category: 'style_transfer',
    style: 'oil_painting',
    difficulty: 'intermediate',
    estimatedCost: 'medium',
    recommendedModels: ['Oil Paint XL', 'Artistic Style'],
    tags: ['style_transfer', 'oil_painting', 'artistic', 'texture'],
    prompt: 'oil painting style, visible brushstrokes, rich texture, warm colors, artistic composition',
    tips: [
      'Requires input image (Image-to-Image)',
      'Use 30-40 steps for style transfer',
      'CFG 6-8 for balanced style adherence',
      'Strength 0.6-0.8 for original preservation'
    ],
    workflowJson: {
      name: 'Oil Painting Style Transfer',
      description: 'Apply oil painting style to any image',
      prompt: 'oil painting style, visible brushstrokes, rich texture, warm colors, artistic composition',
      nodes: [
        {
          id: '1',
          type: 'CheckpointLoaderSimple',
          pos: [100, 200],
          size: [300, 100],
          inputs: {
            ckpt_name: 'sdxl_turbo.safetensors'
          },
          outputs: ['MODEL', 'CLIP_VISION', 'CLIP']
        },
        {
          id: '2',
          type: 'LoadImage',
          pos: [250, 200],
          size: [300, 100],
          inputs: {
            image: 'input_image.png'
          },
          outputs: ['IMAGE', 'MASK']
        },
        {
          id: '3',
          type: 'ImageScale',
          pos: [400, 200],
          size: [300, 100],
          inputs: {
            image: ['2', 0],
            upscale_method: 'lanczos',
            width: 1024,
            height: 1024,
            crop: 'disabled'
          },
          outputs: ['IMAGE']
        },
        {
          id: '4',
          type: 'VAEEncode',
          pos: [400, 400],
          size: [300, 100],
          inputs: {
            pixels: ['3', 0],
            vae: ['1', 2]
          },
          outputs: ['LATENT']
        },
        {
          id: '5',
          type: 'KSampler',
          pos: [400, 600],
          size: [300, 100],
          inputs: {
            seed: 0,
            steps: 30,
            cfg: 7.0,
            sampler_name: 'euler_a',
            scheduler: 'karras',
            denoise: 0.7,
            model: ['1', 1],
            positive: ['6', 0],
            negative: ['6', 1],
            latent_image: ['4', 0]
          },
          outputs: ['LATENT', 'VAE']
        },
        {
          id: '6',
          type: 'VAEDecode',
          pos: [400, 800],
          size: [300, 100],
          inputs: {
            samples: ['5', 0],
            vae: ['1', 2]
          },
          outputs: ['IMAGE']
        }
      ],
      links: [
        [1, 1, 0, 5],
        [1, 2, 0, 6],
        [2, 0, 0, 4],
        [4, 0, 0, 5],
        [5, 0, 0, 6]
      ]
    }
  },

  // ==========================================
  // INPAINTING TEMPLATES
  // ==========================================

  {
    id: 'inpaint-object-removal',
    name: 'Object Removal / Inpainting',
    description: 'Remove unwanted objects and fill with AI-generated content',
    category: 'inpainting',
    style: 'photorealistic',
    difficulty: 'beginner',
    estimatedCost: 'low',
    recommendedModels: ['SDXL Inpainting', 'Inpaint Anything'],
    tags: ['inpainting', 'object_removal', 'restoration', 'photorealistic'],
    prompt: 'seamless fill, matching surrounding texture, natural lighting, consistent colors',
    tips: [
      'Use mask to mark areas for removal',
      'Strength 0.8-1.0 for complete replacement',
      'Denoise 0.9-1.0 for full regeneration',
      'Steps 20-30 sufficient for inpainting'
    ],
    workflowJson: {
      name: 'Object Removal Inpainting',
      description: 'Remove objects and fill with AI generation',
      prompt: 'seamless fill, matching surrounding texture, natural lighting, consistent colors',
      nodes: [
        {
          id: '1',
          type: 'CheckpointLoaderSimple',
          pos: [100, 200],
          size: [300, 100],
          inputs: {
            ckpt_name: 'inpaintingxl_v10.safetensors'
          },
          outputs: ['MODEL', 'CLIP_VISION', 'CLIP']
        },
        {
          id: '2',
          type: 'LoadImageMask',
          pos: [250, 200],
          size: [300, 100],
          inputs: {
            image: 'masked_image.png',
            mask: 'mask.png'
          },
          outputs: ['IMAGE', 'MASK']
        },
        {
          id: '3',
          type: 'VAEEncodeForInpaint',
          pos: [400, 200],
          size: [300, 100],
          inputs: {
            pixels: ['2', 0],
            vae: ['1', 2],
            mask: ['2', 1],
            grow_mask_by: 6
          },
          outputs: ['LATENT']
        },
        {
          id: '4',
          type: 'CLIPTextEncode',
          pos: [100, 400],
          size: [300, 100],
          inputs: {
            text: 'seamless fill, matching surrounding texture, natural lighting, consistent colors',
            clip: ['1', 1]
          },
          outputs: ['CONDITIONING']
        },
        {
          id: '5',
          type: 'KSampler',
          pos: [400, 400],
          size: [300, 100],
          inputs: {
            seed: 0,
            steps: 25,
            cfg: 7.5,
            sampler_name: 'euler',
            scheduler: 'normal',
            denoise: 1.0,
            model: ['1', 1],
            positive: ['4', 0],
            negative: ['4', 1],
            latent_image: ['3', 0]
          },
          outputs: ['LATENT', 'VAE']
        },
        {
          id: '6',
          type: 'VAEDecode',
          pos: [400, 600],
          size: [300, 100],
          inputs: {
            samples: ['5', 0],
            vae: ['1', 2]
          },
          outputs: ['IMAGE']
        }
      ],
      links: [
        [1, 1, 0, 4],
        [1, 2, 0, 5],
        [3, 0, 0, 5],
        [4, 0, 0, 5],
        [5, 0, 0, 6]
      ]
    }
  },

  // ==========================================
  // UPSCALING TEMPLATES
  // ==========================================

  {
    id: 'upscale-4x-quality',
    name: '4x Upscaling with Detail Enhancement',
    description: 'High-quality upscaling with detail preservation',
    category: 'upscaling',
    style: 'photorealistic',
    difficulty: 'beginner',
    estimatedCost: 'low',
    recommendedModels: ['Ultimate SD Upscale', 'Real-ESRGAN'],
    tags: ['upscaling', 'detail_enhancement', 'quality', 'sharpening'],
    prompt: 'high quality, detailed textures, sharp edges, natural look, no artifacts',
    tips: [
      'Use 1024x1024 input for best results',
      'Two-pass upscaling for maximum quality',
      'Consider detailer LoRA for enhancement',
      'Sharpening pass as final step'
    ],
    workflowJson: {
      name: '4x Upscaling with Enhancement',
      description: '4x upscale with detail preservation',
      prompt: 'high quality, detailed textures, sharp edges, natural look, no artifacts',
      nodes: [
        {
          id: '1',
          type: 'CheckpointLoaderSimple',
          pos: [100, 200],
          size: [300, 100],
          inputs: {
            ckpt_name: 'sdxl_turbo.safetensors'
          },
          outputs: ['MODEL', 'CLIP_VISION', 'CLIP']
        },
        {
          id: '2',
          type: 'LoadImage',
          pos: [250, 200],
          size: [300, 100],
          inputs: {
            image: 'input_image.png'
          },
          outputs: ['IMAGE', 'MASK']
        },
        {
          id: '3',
          type: 'ImageScale',
          pos: [400, 200],
          size: [300, 100],
          inputs: {
            image: ['2', 0],
            upscale_method: 'nearest-exact',
            width: 2048,
            height: 2048,
            crop: 'disabled'
          },
          outputs: ['IMAGE']
        },
        {
          id: '4',
          type: 'VAEEncode',
          pos: [400, 400],
          size: [300, 100],
          inputs: {
            pixels: ['3', 0],
            vae: ['1', 2]
          },
          outputs: ['LATENT']
        },
        {
          id: '5',
          type: 'KSampler',
          pos: [400, 600],
          size: [300, 100],
          inputs: {
            seed: 0,
            steps: 20,
            cfg: 6.5,
            sampler_name: 'euler',
            scheduler: 'normal',
            denoise: 0.35,
            model: ['1', 1],
            positive: ['6', 0],
            negative: ['6', 1],
            latent_image: ['4', 0]
          },
          outputs: ['LATENT', 'VAE']
        },
        {
          id: '6',
          type: 'VAEDecode',
          pos: [400, 800],
          size: [300, 100],
          inputs: {
            samples: ['5', 0],
            vae: ['1', 2]
          },
          outputs: ['IMAGE']
        }
      ],
      links: [
        [1, 1, 0, 5],
        [1, 2, 0, 6],
        [3, 0, 0, 5],
        [4, 0, 0, 5],
        [5, 0, 0, 6]
      ]
    }
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates by style
 */
export function getTemplatesByStyle(style: TemplateStyle): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t => t.style === style);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t => t.difficulty === difficulty);
}

/**
 * Search templates by tags
 */
export function searchTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return WORKFLOW_TEMPLATES.filter(t =>
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get recommended templates based on user preferences
 */
export function getRecommendedTemplates(
  preferredStyles: TemplateStyle[],
  preferredCategories: TemplateCategory[]
): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t =>
    (preferredStyles.length === 0 || preferredStyles.includes(t.style)) &&
    (preferredCategories.length === 0 || preferredCategories.includes(t.category))
  ).sort((a, b) => {
    if (a.difficulty === 'beginner' && b.difficulty !== 'beginner') return -1;
    if (b.difficulty === 'beginner' && a.difficulty !== 'beginner') return 1;
    return 0;
  });
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find(t => t.id === id);
}
