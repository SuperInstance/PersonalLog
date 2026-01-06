'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FolderOpen, Image as ImageIcon, FileImage, Download, Plus, Search, Trash2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'prompt' | 'workflow';
  path: string;
  size?: string;
  createdAt: string;
  prompt?: string;
}

interface Folder {
  id: string;
  name: string;
  assets: Asset[];
}

interface AssetSidebarProps {
  projectId: string | null;
}

export default function AssetSidebar({ projectId }: AssetSidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      loadAssets();
    }
  }, [projectId]);

  const loadAssets = async () => {
    try {
      const response = await fetch(`/api/comfyui/assets?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/comfyui/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          projectId,
        }),
      });

      if (response.ok) {
        const newFolder = await response.json();
        setFolders((prev) => [...prev, newFolder]);
        setNewFolderName('');
        setIsCreatingFolder(false);
        toast({
          title: 'Success',
          description: 'Folder created successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    }
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.assets.some(asset =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const currentFolder = selectedFolder
    ? folders.find(f => f.id === selectedFolder)
    : null;

  if (!projectId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <div>
            <p className="text-sm text-muted-foreground">
              Create or select a project to manage assets
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search & Create */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreatingFolder(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Folders List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {!selectedFolder ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-3">Folders</p>
              {filteredFolders.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No folders yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a folder to organize your assets
                  </p>
                </div>
              ) : (
                filteredFolders.map((folder) => (
                  <Card
                    key={folder.id}
                    className="p-3 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{folder.name}</span>
                      </div>
                      <Badge variant="secondary">{folder.assets.length}</Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFolder(null)}
                className="mb-3"
              >
                ← Back to Folders
              </Button>

              {/* Folder Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{currentFolder?.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentFolder?.assets.length} assets
                  </p>
                </div>
              </div>

              {/* Assets List */}
              {currentFolder?.assets.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No assets yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate images to populate this folder
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentFolder?.assets.map((asset) => (
                    <Card key={asset.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {asset.type === 'image' && (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{asset.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(asset.createdAt).toLocaleDateString()}
                            </p>
                            {asset.prompt && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {asset.prompt}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
