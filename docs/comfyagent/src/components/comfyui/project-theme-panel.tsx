'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Sparkles, Type, Layout, Layers, Droplet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ThemeSettings {
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  artStyle: string;
  mood: string;
  composition: string;
  lighting: string;
  projectType: string;
  targetAudience: string;
  medium: string;
}

interface ProjectThemePanelProps {
  projectId: string | null;
  onThemeUpdate?: (theme: ThemeSettings) => void;
}

const PREDEFINED_THEMES = [
  { name: 'cyberpunk', colors: ['#00ff41', '#ff00ff', '#00ffff'] },
  { name: 'fantasy', colors: ['#8B4513', '#FFD700', '#4B0082'] },
  { name: 'minimalist', colors: ['#000000', '#333333', '#666666'] },
  { name: 'nature', colors: ['#228B22', '#8B4513', '#87CEEB'] },
  { name: 'retro', colors: ['#FF6B6B', '#4ECDC4', '#FFE66D'] },
  { name: 'dark', colors: ['#1a1a1a', '#2d2d2d', '#404040'] },
];

const ART_STYLES = [
  'photorealistic', 'anime', 'oil painting', 'watercolor',
  'digital art', '3D render', 'concept art', 'illustration'
];

const MOODS = [
  'uplifting', 'dark', 'mysterious', 'peaceful',
  'energetic', 'melancholic', 'dramatic', 'playful'
];

const COMPOSITIONS = [
  'centered', 'rule of thirds', 'dynamic', 'symmetrical',
  'asymmetrical', 'golden ratio', 'depth layers', 'minimalist'
];

const LIGHTING = [
  'natural', 'dramatic', 'flat', 'soft',
  'volumetric', 'rim lighting', 'high contrast', 'low key'
];

const PROJECT_TYPES = [
  'video_game', 'book_art', 'brand', 'personal', 'client_work'
];

const AUDIENCES = [
  'children', 'teens', 'adults', 'all_ages'
];

const MEDIUMS = [
  'digital', 'print', 'social_media', 'animation', 'vr/ar'
];

export default function ProjectThemePanel({ projectId, onThemeUpdate }: ProjectThemePanelProps) {
  const [theme, setTheme] = useState<ThemeSettings>({
    theme: '',
    primaryColor: '#000000',
    secondaryColor: '#666666',
    accentColor: '#ffffff',
    artStyle: '',
    mood: '',
    composition: '',
    lighting: '',
    projectType: '',
    targetAudience: '',
    medium: ''
  });

  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      loadTheme();
    }
  }, [projectId]);

  const loadTheme = async () => {
    try {
      const response = await fetch(`/api/comfyui/project/theme?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.theme) {
          setTheme(data.theme);
        }
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const applyPredefinedTheme = (themeName: string, colors: string[]) => {
    setTheme(prev => ({
      ...prev,
      theme: themeName,
      primaryColor: colors[0] || prev.primaryColor,
      secondaryColor: colors[1] || prev.secondaryColor,
      accentColor: colors[2] || prev.accentColor
    }));
    setHasChanges(true);
  };

  const updateTheme = (field: keyof ThemeSettings, value: string) => {
    setTheme(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const saveTheme = async () => {
    if (!projectId) {
      toast({
        title: 'No Project Selected',
        description: 'Please select a project first',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/comfyui/project/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, theme })
      });

      if (response.ok) {
        toast({
          title: 'Theme Saved',
          description: 'Your project theme has been updated'
        });
        setHasChanges(false);
        onThemeUpdate?.(theme);
      } else {
        throw new Error('Failed to save theme');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save theme',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          <span className="text-sm font-medium">Project Theme & Filters</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Predefined Themes */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Quick Themes
          </Label>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_THEMES.map(preset => (
              <Button
                key={preset.name}
                variant={theme.theme === preset.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => applyPredefinedTheme(preset.name, preset.colors)}
                className="flex items-center gap-2"
              >
                <div className="flex gap-1">
                  {preset.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Custom Colors */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Droplet className="w-4 h-4" />
            Color Palette
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Primary</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => updateTheme('primaryColor', e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e) => updateTheme('primaryColor', e.target.value)}
                  className="flex-1 h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Secondary</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={theme.secondaryColor}
                  onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                  className="flex-1 h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Accent</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.accentColor}
                  onChange={(e) => updateTheme('accentColor', e.target.value)}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={theme.accentColor}
                  onChange={(e) => updateTheme('accentColor', e.target.value)}
                  className="flex-1 h-10"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Art Style & Mood */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Art Style
              </Label>
              <Select value={theme.artStyle} onValueChange={(v) => updateTheme('artStyle', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  {ART_STYLES.map(style => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Mood
              </Label>
              <Select value={theme.mood} onValueChange={(v) => updateTheme('mood', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  {MOODS.map(mood => (
                    <SelectItem key={mood} value={mood}>
                      {mood}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Composition & Lighting */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Composition</Label>
              <Select value={theme.composition} onValueChange={(v) => updateTheme('composition', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select composition" />
                </SelectTrigger>
                <SelectContent>
                  {COMPOSITIONS.map(comp => (
                    <SelectItem key={comp} value={comp}>
                      {comp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lighting</Label>
              <Select value={theme.lighting} onValueChange={(v) => updateTheme('lighting', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lighting" />
                </SelectTrigger>
                <SelectContent>
                  {LIGHTING.map(light => (
                    <SelectItem key={light} value={light}>
                      {light}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Project Context */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Project Type</Label>
              <Select value={theme.projectType} onValueChange={(v) => updateTheme('projectType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={theme.targetAudience} onValueChange={(v) => updateTheme('targetAudience', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map(aud => (
                    <SelectItem key={aud} value={aud}>
                      {aud.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Medium</Label>
            <Select value={theme.medium} onValueChange={(v) => updateTheme('medium', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select medium" />
              </SelectTrigger>
              <SelectContent>
                {MEDIUMS.map(med => (
                  <SelectItem key={med} value={med}>
                    {med}
                  </SelectItem>
                ))}
                </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Theme Preview */}
        {theme.theme && (
          <>
            <Separator />
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span className="font-medium">Current Theme</span>
                </div>
                <Badge variant="secondary">{theme.theme}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(theme).filter(([key]) => key !== 'theme').map(([key, value]) => (
                  value && (
                    <div key={key} className="text-muted-foreground">
                      <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                      {value}
                    </div>
                  )
                ))}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-2">
        <Button
          onClick={saveTheme}
          disabled={!hasChanges || !projectId}
          className="w-full"
        >
          Save Theme Settings
        </Button>
      </div>
    </div>
  );
}
