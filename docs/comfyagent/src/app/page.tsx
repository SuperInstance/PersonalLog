'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { MessageSquare, Workflow, FolderOpen, Sparkles } from 'lucide-react';
import ChatPanel from '@/components/comfyui/chat-panel';
import WorkflowCanvas from '@/components/comfyui/workflow-canvas';
import AssetSidebar from '@/components/comfyui/asset-sidebar';

export default function ComfyUIPage() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [workflowData, setWorkflowData] = useState<any>(null);

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b bg-card px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">ComfyUI Vibe Agent</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderOpen className="h-4 w-4" />
            <span>Project: {selectedProject || 'None'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Chat */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <div className="h-full flex flex-col border-r bg-card">
              <div className="p-3 border-b flex items-center gap-2 bg-muted/50">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium">AI Assistant</span>
              </div>
              <ChatPanel
                projectId={selectedProject}
                onWorkflowUpdate={setWorkflowData}
                onCreateProject={setSelectedProject}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Center Panel - Workflow Canvas */}
          <ResizablePanel defaultSize={45} minSize={35}>
            <div className="h-full flex flex-col bg-background">
              <div className="p-3 border-b flex items-center gap-2 bg-muted/50">
                <Workflow className="h-4 w-4" />
                <span className="text-sm font-medium">Workflow Canvas</span>
              </div>
              <WorkflowCanvas workflowData={workflowData} />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel - Assets */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <div className="h-full flex flex-col border-l bg-card">
              <div className="p-3 border-b flex items-center gap-2 bg-muted/50">
                <FolderOpen className="h-4 w-4" />
                <span className="text-sm font-medium">Project Assets</span>
              </div>
              <AssetSidebar projectId={selectedProject} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      {/* Footer */}
      <footer className="h-8 border-t bg-muted/30 px-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>ComfyUI Vibe Agent - Conversational Workflow Builder</span>
        <span>Connected to Local ComfyUI</span>
      </footer>
    </div>
  );
}
