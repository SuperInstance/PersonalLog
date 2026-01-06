# ComfyUI Vibe Coding Agent

A conversational AI assistant for creating ComfyUI image generation workflows - think of it like GitHub Copilot or Cursor for creative AI workflows!

## 🎯 What This Is

Just as coding agents help you build software through conversation in an IDE, this agent helps you build ComfyUI workflows through conversation in a web interface. You can:

- **Think through your creative vision** naturally with an AI assistant
- **Generate complete ComfyUI workflows** tailored to your needs
- **Get prompt suggestions** optimized for your specific use case
- **Receive model recommendations** (checkpoints, LoRAs, embeddings)
- **Understand costs** for different generation options
- **Organize your project** with folders for generated assets

## 🚀 Features

### 1. Conversational Workflow Building
- Chat with an AI assistant that understands ComfyUI
- Describe what you want to create in natural language
- Get workflow suggestions with proper node connections
- Ask questions and get clarifications

### 2. Dynamic Workflow Visualization
- See your workflows come to life in real-time
- Visual representation of ComfyUI nodes and connections
- View node types, parameters, and connections
- Understand how components connect together

### 3. Project Organization
- Create projects for different creative endeavors
- Organize generated images into folders
- Track prompts and workflow history
- Build a library of reusable assets

### 4. AI-Powered Suggestions
- **Model Recommendations**: Best checkpoints, LoRAs, and embeddings for your use case
- **Prompt Engineering**: Detailed, optimized prompts for your goals
- **Parameter Optimization**: Suggestions for steps, resolution, CFG scale
- **Cost Estimates**: Understanding computational costs for different options

## 🏗️ Architecture

### Frontend Components
- **ChatPanel**: Conversational interface with message history
- **WorkflowCanvas**: Visual workflow renderer
- **AssetSidebar**: Project organization and file management

### Backend APIs
- **`/api/comfyui/chat`**: AI-powered chat with workflow generation
- **`/api/comfyui/assets`**: Asset management and retrieval
- **`/api/comfyui/folders`**: Folder structure management

### Database Models
- **Project**: Container for your creative work
- **Workflow**: ComfyUI workflow JSON storage
- **ChatMessage**: Conversation history
- **GeneratedAsset**: Images and related files
- **Prompt**: Stored prompts for reuse
- **ModelSuggestion**: Recommended models and resources

## 💡 How to Use

### Getting Started

1. **Open the application** at the root URL
2. **Start a conversation** with the AI assistant
3. **Describe your creative vision**
4. **Watch as workflows are generated** automatically
5. **View the workflow structure** in the center panel
6. **Organize your assets** in the right sidebar

### Example Conversations

```
You: "I want to create a portrait photo workflow"
AI: "I'll help you create a portrait photo workflow! For high-quality portraits,
I recommend using SDXL with specific LoRAs. Let me build this for you..."

You: "Can you suggest models for fantasy landscapes?"
AI: "For fantasy landscapes, I recommend: ..."
```

### Workflow Features

The AI can generate workflows for:
- **Text-to-Image**: Basic image generation
- **Image-to-Image**: Transforming existing images
- **Inpainting**: Editing parts of images
- **Upscaling**: Enhancing image resolution
- **Video Generation**: Creating video from images
- **Style Transfer**: Applying artistic styles
- **ControlNet**: Guided generation with structural inputs

## 🔧 Technical Details

### Technology Stack
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Prisma ORM** with SQLite database
- **z-ai-web-dev-sdk** for LLM integration
- **shadcn/ui** components for UI
- **Tailwind CSS** for styling

### Workflow Format

Workflows are generated in ComfyUI-compatible JSON format:

```json
{
  "name": "workflow_name",
  "description": "brief description",
  "prompt": "full generation prompt",
  "nodes": [
    {
      "id": "node_id",
      "type": "KSampler|CheckpointLoaderSimple|CLIPTextEncode|...",
      "pos": [x, y],
      "size": [width, height],
      "inputs": {},
      "outputs": {},
      "widgets_values": []
    }
  ],
  "links": [
    {"from": "node_id", "to": "node_id", "fromSlot": 0, "toSlot": 0}
  ]
}
```

### Using Generated Workflows

1. **Copy the workflow JSON** from the chat or save it
2. **Import into ComfyUI** using the workflow menu
3. **Adjust parameters** as needed
4. **Execute** to generate your images
5. **Save results** to your project folders

## 📁 Project Structure

```
/home/z/my-project/
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Main application
│   │   ├── api/
│   │   │   └── comfyui/
│   │   │       ├── chat/route.ts            # AI chat endpoint
│   │   │       ├── assets/route.ts          # Asset management
│   │   │       └── folders/route.ts         # Folder management
│   ├── components/
│   │   ├── comfyui/
│   │   │   ├── chat-panel.tsx               # Chat interface
│   │   │   ├── workflow-canvas.tsx          # Workflow visualization
│   │   │   └── asset-sidebar.tsx            # Asset organization
│   │   └── ui/                              # shadcn components
│   └── lib/
│       └── db.ts                            # Database client
├── prisma/
│   └── schema.prisma                        # Database schema
└── worklog.md                               # Development log
```

## 🎨 Design Philosophy

This tool is built to feel like an IDE for creative AI:

- **Conversation-First**: Start with ideas, not technical details
- **Iterative**: Refine through dialogue, like pair programming
- **Visual**: See your workflow evolve in real-time
- **Organized**: Keep everything in project folders
- **Transparent**: Understand costs and tradeoffs

## 🔮 Future Enhancements

Potential features to add:
- Direct ComfyUI API integration for one-click execution
- Real-time workflow execution preview
- Collaborative project sharing
- Version control for workflows
- Advanced prompt optimization
- Integration with HuggingFace model hub
- Cost tracking and budget management
- Workflow templates library

## 🤝 Contributing Ideas

Want to extend this? Consider:
- Adding more workflow templates
- Integrating specific ComfyUI custom nodes
- Building a workflow marketplace
- Adding video generation support
- Creating workflow comparison tools
- Implementing A/B testing for prompts

## 📝 Notes

- Workflows are generated as JSON that can be imported into ComfyUI
- The AI assistant learns from conversation context
- All conversation history is saved to the database
- Assets are organized in folder structures
- Model suggestions include download sources

---

Built with Next.js, TypeScript, and z-ai-web-dev-sdk
Inspired by coding agents like Cursor and GitHub Copilot
