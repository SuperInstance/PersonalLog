'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wand2, Search, Zap, Layers, Star, Info, ChevronRight, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import template types and data
type TemplateCategory = 'portraits' | 'landscapes' | 'characters' | 'objects' | 'environments' | 'style_transfer' | 'inpainting' | 'upscaling' | 'video' | 'animation';
type TemplateStyle = 'photorealistic' | 'anime' | 'fantasy' | 'cyberpunk' | 'minimalist' | 'oil_painting' | 'watercolor' | 'digital_art' | '3d_render' | 'concept_art';

interface WorkflowTemplate {
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

interface TemplateBrowserProps {
  onApplyTemplate?: (template: WorkflowTemplate) => void;
}

const CATEGORIES: Array<{ value: TemplateCategory; label: string; icon: any }> = [
  { value: 'portraits', label: 'Portraits', icon: ImageIcon },
  { value: 'landscapes', label: 'Landscapes', icon: Layers },
  { value: 'characters', label: 'Characters', icon: Sparkles },
  { value: 'objects', label: 'Objects', icon: ImageIcon },
  { value: 'environments', label: 'Environments', icon: Layers },
  { value: 'style_transfer', label: 'Style Transfer', icon: Wand2 },
  { value: 'inpainting', label: 'Inpainting', icon: ImageIcon },
  { value: 'upscaling', label: 'Upscaling', icon: ImageIcon },
  { value: 'video', label: 'Video', icon: ImageIcon },
  { value: 'animation', label: 'Animation', icon: ImageIcon },
];

const STYLES: Array<{ value: TemplateStyle; label: string }> = [
  { value: 'photorealistic', label: 'Photorealistic' },
  { value: 'anime', label: 'Anime' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'oil_painting', label: 'Oil Painting' },
  { value: 'watercolor', label: 'Watercolor' },
  { value: 'digital_art', label: 'Digital Art' },
  { value: '3d_render', label: '3D Render' },
  { value: 'concept_art', label: 'Concept Art' },
];

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner', color: 'bg-green-500' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-500' },
  { value: 'advanced', label: 'Advanced', color: 'bg-orange-500' },
];

const COSTS = {
  low: { label: 'Low', color: 'bg-blue-500' },
  medium: { label: 'Medium', color: 'bg-purple-500' },
  high: { label: 'High', color: 'bg-red-500' },
};

export default function TemplateBrowser({ onApplyTemplate }: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<TemplateStyle | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory, selectedStyle, selectedDifficulty]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/comfyui/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflow templates',
        variant: 'destructive'
      });
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (selectedStyle) {
      filtered = filtered.filter(t => t.style === selectedStyle);
    }

    if (selectedDifficulty) {
      filtered = filtered.filter(t => t.difficulty === selectedDifficulty);
    }

    setFilteredTemplates(filtered);
  };

  const applyTemplate = (template: WorkflowTemplate) => {
    onApplyTemplate?.(template);
    toast({
      title: 'Template Applied',
      description: `"${template.name}" has been applied to the workflow canvas`
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    const diff = difficulty as keyof typeof COSTS;
    return COSTS[diff]?.color || 'bg-gray-500';
  };

  const getCostColor = (cost: string) => {
    const cost = cost as keyof typeof COSTS;
    return COSTS[cost]?.color || 'bg-gray-500';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            <span className="text-sm font-medium">Workflow Templates</span>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All Categories
          </Button>
          {CATEGORIES.map(cat => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              className="flex items-center gap-2"
            >
              <cat.icon className="w-3 h-3" />
              {cat.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedStyle === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStyle(null)}
          >
            All Styles
          </Button>
          {STYLES.map(style => (
            <Button
              key={style.value}
              variant={selectedStyle === style.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStyle(style.value)}
            >
              {style.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedDifficulty === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDifficulty(null)}
          >
            All Levels
          </Button>
          {DIFFICULTIES.map(diff => (
            <Button
              key={diff.value}
              variant={selectedDifficulty === diff.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDifficulty(diff.value)}
              className="flex items-center gap-2"
            >
              <div className={`w-2 h-2 rounded-full ${diff.color}`} />
              {diff.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Template List */}
      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Wand2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium mb-2">No templates found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search terms
              </p>
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedTemplate(template)}>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{template.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <Dialog open={isPreviewOpen && selectedTemplate?.id === template.id} onOpenChange={setIsPreviewOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Info className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Wand2 className="w-5 h-5" />
                            {template.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                          <div>
                            <h4 className="font-medium mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </div>

                          {template.prompt && (
                            <div>
                              <h4 className="font-medium mb-2">Prompt</h4>
                              <div className="p-3 bg-muted rounded text-sm">
                                {template.prompt}
                              </div>
                            </div>
                          )}

                          {template.tips && template.tips.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Tips & Best Practices
                              </h4>
                              <ul className="space-y-2 text-sm">
                                {template.tips.map((tip, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <Separator />

                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-xs text-muted-foreground">Category</span>
                                <Badge variant="outline">{template.category}</Badge>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Style</span>
                                <Badge variant="outline">{template.style}</Badge>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-xs text-muted-foreground">Difficulty</span>
                                <Badge
                                  variant="secondary"
                                  className={`text-white ${getDifficultyColor(template.difficulty)}`}
                                >
                                  {template.difficulty}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Est. Cost</span>
                                <Badge
                                  variant="secondary"
                                  className={`text-white ${getCostColor(template.estimatedCost)}`}
                                >
                                  {template.estimatedCost}
                                </Badge>
                              </div>
                            </div>

                            {template.recommendedModels && template.recommendedModels.length > 0 && (
                              <div>
                                <span className="text-xs text-muted-foreground">Recommended Models</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {template.recommendedModels.map((model, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {model}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {template.tags && template.tags.length > 0 && (
                              <div>
                                <span className="text-xs text-muted-foreground">Tags</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {template.tags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <Separator />

                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                              Close
                            </Button>
                            <Button onClick={() => { applyTemplate(template); setIsPreviewOpen(false); }}>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Apply Template
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button size="sm" onClick={() => applyTemplate(template)}>
                      Apply
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {template.category && (
                      <Badge variant="outline" className="text-xs">{template.category}</Badge>
                    )}
                    {template.style && (
                      <Badge variant="secondary" className="text-xs">{template.style}</Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className={`text-white text-xs ${getDifficultyColor(template.difficulty)}`}
                    >
                      {template.difficulty}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredTemplates.length} of {templates.length} templates
          </span>
          {searchQuery || selectedCategory || selectedStyle || selectedDifficulty ? (
            <Button variant="ghost" size="sm" onClick={() => {
              setSearchQuery('');
              setSelectedCategory(null);
              setSelectedStyle(null);
              setSelectedDifficulty(null);
            }}>
              Clear Filters
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
