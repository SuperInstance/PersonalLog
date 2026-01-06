'use client';

import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Workflow, MousePointer, Settings, Image as ImageIcon } from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: string;
  pos: [number, number];
  size: [number, number];
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  widgets_values?: any[];
}

interface WorkflowLink {
  from: string;
  to: string;
  fromSlot: number;
  toSlot: number;
}

interface WorkflowCanvasProps {
  workflowData: any;
}

export default function WorkflowCanvas({ workflowData }: WorkflowCanvasProps) {
  if (!workflowData) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4 max-w-md">
          <Workflow className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <div>
            <h3 className="text-lg font-semibold">No Workflow Yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Start a conversation with the AI assistant to begin building your ComfyUI workflow.
              Describe what you want to create and I'll help you set up the perfect workflow!
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline">Image Generation</Badge>
            <Badge variant="outline">Video Creation</Badge>
            <Badge variant="outline">Image Editing</Badge>
            <Badge variant="outline">Style Transfer</Badge>
          </div>
        </div>
      </div>
    );
  }

  const nodes = workflowData.nodes || [];
  const links = workflowData.links || [];

  return (
    <div className="h-full flex flex-col bg-muted/30">
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {/* Workflow Info */}
          <Card className="p-4 bg-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{workflowData.name || 'Untitled Workflow'}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {workflowData.description || 'No description'}
                </p>
              </div>
              <Badge variant="secondary">{nodes.length} nodes</Badge>
            </div>
          </Card>

          {/* Nodes Visualization */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Workflow Nodes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {nodes.map((node: WorkflowNode, index: number) => (
                <Card
                  key={node.id}
                  className="p-4 bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {node.type.includes('Loader') && <ImageIcon className="w-4 h-4 text-primary" />}
                      {node.type.includes('KSampler') && <Workflow className="w-4 h-4 text-primary" />}
                      <Badge variant="outline" className="text-xs">
                        {node.type}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  </div>

                  {node.inputs && Object.keys(node.inputs).length > 0 && (
                    <div className="space-y-1 mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Inputs:</p>
                      {Object.entries(node.inputs).slice(0, 3).map(([key, value]) => (
                        <p key={key} className="text-xs text-muted-foreground">
                          {key}: {String(value).slice(0, 20)}
                          {String(value).length > 20 && '...'}
                        </p>
                      ))}
                    </div>
                  )}

                  {node.widgets_values && node.widgets_values.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Parameters:</p>
                      {node.widgets_values.slice(0, 2).map((value: any, idx: number) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          {typeof value === 'object' ? JSON.stringify(value).slice(0, 20) : String(value)}
                          {String(value).length > 20 && '...'}
                        </p>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Connections */}
          {links.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <MousePointer className="w-4 h-4" />
                  Node Connections
                </h4>
                <Card className="p-4 bg-card">
                  <div className="space-y-2">
                    {links.slice(0, 10).map((link: WorkflowLink, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline">{link.from}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline">{link.to}</Badge>
                      </div>
                    ))}
                    {links.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">
                        ...and {links.length - 10} more connections
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* Prompt Preview */}
          {workflowData.prompt && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Generation Prompt</h4>
                <Card className="p-4 bg-card">
                  <p className="text-sm text-muted-foreground">{workflowData.prompt}</p>
                </Card>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
