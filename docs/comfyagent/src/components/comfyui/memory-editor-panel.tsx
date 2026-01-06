'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Edit, Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserMemory {
  id: string;
  category: 'style' | 'technique' | 'preference' | 'workflow';
  key: string;
  value: string;
  confidence: number;
  source: 'user_explicit' | 'ai_learned' | 'observation';
  useCount: number;
  successRate?: number;
  lastUsed: Date;
}

export default function MemoryEditorPanel() {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [editingMemory, setEditingMemory] = useState<UserMemory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newMemory, setNewMemory] = useState({
    key: '',
    category: 'preference' as UserMemory['category'],
    value: '',
    confidence: 1.0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const response = await fetch('/api/comfyui/memory/user');
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
  };

  const createMemory = async () => {
    if (!newMemory.key || !newMemory.value) {
      toast({
        title: 'Incomplete Data',
        description: 'Please fill in both key and value',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/comfyui/memory/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newMemory.key,
          category: newMemory.category,
          value: newMemory.value,
          confidence: newMemory.confidence,
          source: 'user_explicit'
        })
      });

      if (response.ok) {
        toast({
          title: 'Memory Created',
          description: 'Your preference has been saved'
        });
        setNewMemory({ key: '', category: 'preference', value: '', confidence: 1.0 });
        setIsCreating(false);
        loadMemories();
      } else {
        throw new Error('Failed to create memory');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create memory',
        variant: 'destructive'
      });
    }
  };

  const updateMemory = async () => {
    if (!editingMemory) return;

    try {
      const response = await fetch('/api/comfyui/memory/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMemory.id,
          key: editingMemory.key,
          category: editingMemory.category,
          value: editingMemory.value,
          confidence: editingMemory.confidence
        })
      });

      if (response.ok) {
        toast({
          title: 'Memory Updated',
          description: 'Your preference has been updated'
        });
        setEditingMemory(null);
        loadMemories();
      } else {
        throw new Error('Failed to update memory');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update memory',
        variant: 'destructive'
      });
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      const response = await fetch(`/api/comfyui/memory/user?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Memory Deleted',
          description: 'The memory has been removed'
        });
        loadMemories();
      } else {
        throw new Error('Failed to delete memory');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete memory',
        variant: 'destructive'
      });
    }
  };

  const resetMemory = async (id: string) => {
    try {
      const response = await fetch(`/api/comfyui/memory/user/${id}/reset`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: 'Memory Reset',
          description: 'Confidence has been reset to 0.5'
        });
        loadMemories();
      }
    } catch (error) {
      console.error('Failed to reset memory:', error);
    }
  };

  const filteredMemories = memories.filter(memory =>
    filter === 'all' || memory.category === filter
  );

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    if (confidence >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span className="text-sm font-medium">User Memory (Your Creative Patterns)</span>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Memory
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Memory</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newMemory.category} onValueChange={(v) => setNewMemory({ ...newMemory, category: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="style">Style</SelectItem>
                      <SelectItem value="technique">Technique</SelectItem>
                      <SelectItem value="preference">Preference</SelectItem>
                      <SelectItem value="workflow">Workflow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Key (e.g., preferred_model, color_scheme)</Label>
                  <Input
                    value={newMemory.key}
                    onChange={(e) => setNewMemory({ ...newMemory, key: e.target.value })}
                    placeholder="Enter key name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Value (e.g., SDXL, warm_colors)</Label>
                  <Textarea
                    value={newMemory.value}
                    onChange={(e) => setNewMemory({ ...newMemory, value: e.target.value })}
                    placeholder="Enter the value"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confidence ({newMemory.confidence.toFixed(2)})</Label>
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newMemory.confidence}
                    onChange={(e) => setNewMemory({ ...newMemory, confidence: parseFloat(e.target.value) })}
                  />
                </div>

                <Button onClick={createMemory} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Memory
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b space-y-2">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({memories.length})
          </Button>
          <Button
            variant={filter === 'style' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('style')}
          >
            Style ({memories.filter(m => m.category === 'style').length})
          </Button>
          <Button
            variant={filter === 'technique' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('technique')}
          >
            Technique ({memories.filter(m => m.category === 'technique').length})
          </Button>
          <Button
            variant={filter === 'preference' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('preference')}
          >
            Preference ({memories.filter(m => m.category === 'preference').length})
          </Button>
          <Button
            variant={filter === 'workflow' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('workflow')}
          >
            Workflow ({memories.filter(m => m.category === 'workflow').length})
          </Button>
        </div>
      </div>

      {/* Memory List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No memories found in this category</p>
              <p className="text-sm mt-2">
                Add memories to help the AI learn your preferences
              </p>
            </div>
          ) : (
            filteredMemories.map((memory) => (
              <Card key={memory.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{memory.category}</Badge>
                      <Badge
                        variant="secondary"
                        className={`${getConfidenceColor(memory.confidence)} text-white`}
                      >
                        {(memory.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                      {memory.source === 'user_explicit' && (
                        <Badge variant="default">User Set</Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{memory.key}</p>
                      <p className="text-sm text-muted-foreground">{memory.value}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Used {memory.useCount} times</span>
                      {memory.successRate !== null && (
                        <span>Success rate: {(memory.successRate * 100).toFixed(0)}%</span>
                      )}
                      <span>
                        Last used: {new Date(memory.lastUsed).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingMemory(memory)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Memory</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                              value={editingMemory?.category}
                              onValueChange={(v) => editingMemory && setEditingMemory({ ...editingMemory!, category: v as any })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="style">Style</SelectItem>
                                <SelectItem value="technique">Technique</SelectItem>
                                <SelectItem value="preference">Preference</SelectItem>
                                <SelectItem value="workflow">Workflow</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Key</Label>
                            <Input
                              value={editingMemory?.key}
                              onChange={(e) => editingMemory && setEditingMemory({ ...editingMemory!, key: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Value</Label>
                            <Textarea
                              value={editingMemory?.value}
                              onChange={(e) => editingMemory && setEditingMemory({ ...editingMemory!, value: e.target.value })}
                              className="min-h-[80px]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Confidence ({editingMemory?.confidence.toFixed(2)})</Label>
                            <Input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={editingMemory?.confidence}
                              onChange={(e) => editingMemory && setEditingMemory({ ...editingMemory!, confidence: parseFloat(e.target.value) })}
                            />
                          </div>

                          <Button onClick={updateMemory} className="w-full">
                            <Save className="w-4 h-4 mr-2" />
                            Update Memory
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => resetMemory(memory.id)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMemory(memory.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
