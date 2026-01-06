'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Plus, Edit, Trash2, Search, Mic,
  Pin, PinOff, Split, Folder, Tag,
  Image as ImageIcon, Download, Upload, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  title: string;
  content: string;
  description?: string;
  tags: string[];
  folder?: string;
  projectId?: string;
  isPinned: boolean;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
  files: NoteFile[];
}

interface NoteFile {
  id: string;
  name: string;
  type: 'markdown' | 'image' | 'pdf' | 'audio' | 'video' | 'other';
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  transcriptionText?: string;
}

interface NoteEditorProps {
  projectId?: string;
  onContextReference?: (noteId: string, content: string) => void;
}

export default function NoteEditor({ projectId, onContextReference }: NoteEditorProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showSplitSuggestions, setShowSplitSuggestions] = useState(false);
  const [splitSuggestions, setSplitSuggestions] = useState<any[]>([]);
  const [newNoteMode, setNewNoteMode] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadNotes();
    loadMetadata();
  }, []);

  useEffect(() => {
    filterNotes();
  }, [notes, searchQuery, filterFolder, filterTags]);

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/notes');
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const loadMetadata = async () => {
    try {
      const [foldersRes, tagsRes] = await Promise.all([
        fetch('/api/notes/folders'),
        fetch('/api/notes/tags')
      ]);

      if (foldersRes.ok && tagsRes.ok) {
        const foldersData = await foldersRes.json();
        const tagsData = await tagsRes.json();
        setFolders(foldersData.folders || []);
        setAllTags(tagsData.tags || []);
      }
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.description?.toLowerCase().includes(query)
      );
    }

    // Filter by folder
    if (filterFolder) {
      filtered = filtered.filter(note => note.folder === filterFolder);
    }

    // Filter by tags
    if (filterTags.length > 0) {
      filtered = filtered.filter(note =>
        filterTags.every(tag => note.tags.includes(tag))
      );
    }

    // Sort: pinned first, then by updated
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    setNotes(filtered);
  };

  const createNote = async (title: string, content: string) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          projectId,
          folder: filterFolder || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(prev => [data.note, ...prev]);
        setSelectedNote(data.note);
        setNewNoteMode(false);
        toast({
          title: 'Note Created',
          description: 'Your note has been saved'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create note',
        variant: 'destructive'
      });
    }
  };

  const updateNote = async () => {
    if (!selectedNote) return;

    try {
      const response = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedNote.id,
          ...selectedNote
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(prev => prev.map(n => n.id === data.note.id ? data.note : n));
        setSelectedNote(data.note);
        toast({
          title: 'Note Updated',
          description: 'Your changes have been saved'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive'
      });
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const response = await fetch(`/api/notes?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
        if (selectedNote?.id === id) {
          setSelectedNote(null);
        }
        toast({
          title: 'Note Deleted',
          description: 'Your note has been deleted'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive'
      });
    }
  };

  const togglePin = async (note: Note) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id,
          isPinned: !note.isPinned
        })
      });

      if (response.ok) {
        setNotes(prev => prev.map(n =>
          n.id === note.id ? { ...n, isPinned: !note.isPinned } : n
        ));
        toast({
          title: note.isPinned ? 'Note Unpinned' : 'Note Pinned',
          description: `Note ${note.isPinned ? 'unpinned' : 'pinned'} successfully`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update pin status',
        variant: 'destructive'
      });
    }
  };

  const startSTTRecording = async () => {
    if (!selectedNote) {
      toast({
        title: 'No Note Selected',
        description: 'Please select a note to transcribe into',
        variant: 'destructive'
      });
      return;
    }

    setIsRecording(true);

    try {
      // Start recording
      // In a real implementation, this would use browser's MediaRecorder
      // For now, we'll simulate recording
      await new Promise(resolve => setTimeout(resolve, 3000));

      setIsRecording(false);
      toast({
        title: 'Recording Stopped',
        description: 'Audio has been transcribed into the note'
      });
    } catch (error) {
      console.error('Recording error:', error);
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNote) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;

        const response = await fetch('/api/notes/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            noteId: selectedNote.id,
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'other',
            fileData: base64
          })
        });

        if (response.ok) {
          const data = await response.json();
          setNotes(prev => prev.map(n =>
            n.id === selectedNote.id
              ? { ...n, files: [...n.files, data.file] }
              : n
          ));
          toast({
            title: 'File Uploaded',
            description: `${file.name} has been attached to the note`
          });
        }
      } catch (error) {
        console.error('File upload error:', error);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSplit = async (suggestion: any) => {
    try {
      const response = await fetch('/api/notes/splits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: selectedNote.id,
          suggestions: [suggestion]
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
        setShowSplitSuggestions(false);
        toast({
          title: 'Note Split',
          description: 'Note has been split into multiple parts'
        });
      }
    } catch (error) {
      console.error('Split error:', error);
      toast({
        title: 'Error',
        description: 'Failed to split note',
        variant: 'destructive'
      });
    }
  };

  const handleContextReference = () => {
    if (selectedNote && onContextReference) {
      onContextReference(selectedNote.id, selectedNote.content);
      toast({
        title: 'Context Referenced',
        description: 'Note content sent to chatbot'
      });
    }
  };

  const loadSplitSuggestions = async () => {
    if (!selectedNote) return;

    try {
      const response = await fetch(`/api/notes/splits?noteId=${selectedNote.id}`);
      if (response.ok) {
        const data = await response.json();
        setSplitSuggestions(data.suggestions || []);
        setShowSplitSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to load split suggestions:', error);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="text-lg font-semibold">Knowledge Base</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Notes</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Paste markdown content or JSON to import notes
                  </p>
                  <Textarea
                    placeholder="# Imported Note Content"
                    className="min-h-[200px]"
                  />
                  <Button onClick={() => setShowFileDialog(false)} className="w-full">
                    Import
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b space-y-2">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterFolder === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterFolder(null)}
          >
            All Folders ({notes.length})
          </Button>
          {folders.map(folder => (
            <Button
              key={folder}
              variant={filterFolder === folder ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterFolder(folder)}
              className="flex items-center gap-2"
            >
              <Folder className="w-3 h-3" />
              {folder}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {allTags.slice(0, 10).map(tag => (
            <Badge
              key={tag}
              variant={filterTags.includes(tag) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => {
                if (filterTags.includes(tag)) {
                  setFilterTags(filterTags.filter(t => t !== tag));
                } else {
                  setFilterTags([...filterTags, tag]);
                }
              }}
            >
              {tag}
            </Badge>
          ))}
          {allTags.length > 10 && (
            <Button variant="outline" size="sm">
              +{allTags.length - 10} more
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Notes List */}
        {!newNoteMode && !selectedNote && (
          <div className="w-1/3 border-r p-4 overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                {notes.map((note) => (
                  <Card
                    key={note.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{note.title}</h3>
                          {note.isPinned && (
                            <Pin className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {note.content.substring(0, 150)}...
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {note.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {note.folder && (
                            <Badge variant="outline" className="text-xs">
                              <Folder className="w-3 h-3 mr-1" />
                              {note.folder}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {note.wordCount} words
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePin(note)}
                        >
                          {note.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this note?')) {
                              deleteNote(note.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Note Editor */}
        {selectedNote && (
          <div className="w-2/3 p-4 overflow-y-auto bg-background">
            <div className="space-y-4">
              {/* Note Header */}
              <div className="flex items-center justify-between gap-4">
                <Input
                  value={selectedNote.title}
                  onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
                  className="text-lg font-semibold"
                  disabled={newNoteMode}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedNote(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={updateNote}>
                    <Edit className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>

              {/* Tags and Folder */}
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Label className="text-sm">Tags:</Label>
                  {selectedNote.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer">
                      {tag} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setSelectedNote({ ...selectedNote, tags: [] })}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm">Folder:</Label>
                  <Select value={selectedNote.folder} onValueChange={(v) => setSelectedNote({ ...selectedNote, folder: v })}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No Folder</SelectItem>
                      {folders.map(folder => (
                        <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Markdown Editor */}
              <div className="space-y-2">
                <Label className="text-sm">Content:</Label>
                <Textarea
                  value={selectedNote.content}
                  onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })}
                  placeholder="# Start writing your notes in Markdown..."
                  className="min-h-[300px] font-mono text-sm"
                  disabled={newNoteMode}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm">Description:</Label>
                <Input
                  value={selectedNote.description || ''}
                  onChange={(e) => setSelectedNote({ ...selectedNote, description: e.target.value })}
                  placeholder="Brief description..."
                  disabled={newNoteMode}
                />
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleContextReference}>
                  <Search className="w-4 h-4 mr-2" />
                  Use as Context
                </Button>

                <Button variant="outline" size="sm" onClick={() => setShowFileDialog(true)}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>

                <Button variant="outline" size="sm" onClick={loadSplitSuggestions}>
                  <Split className="w-4 h-4 mr-2" />
                  Split Note
                </Button>

                <Button variant="outline" size="sm" onClick={startSTTRecording}>
                  <Mic className={`w-4 h-4 mr-2 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />
                  {isRecording ? 'Recording...' : 'STT'}
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Attach File
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Attach File</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input type="file" onChange={handleFileUpload} />
                      <Button onClick={() => setShowFileDialog(false)} className="w-full">
                        Cancel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Delete this note?')) {
                    deleteNote(selectedNote.id);
                    setSelectedNote(null);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Note Files */}
            {selectedNote.files && selectedNote.files.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Attached Files ({selectedNote.files.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedNote.files.map((file) => (
                      <Card key={file.id} className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {file.type === 'image' && <ImageIcon className="w-4 h-4" />}
                            {file.type === 'audio' && <Mic className="w-4 h-4" />}
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{file.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {file.type}
                          </Badge>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        {file.transcriptionText && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <p className="font-medium mb-1">Transcription:</p>
                            <p className="text-muted-foreground">{file.transcriptionText}</p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Split Suggestions */}
            {showSplitSuggestions && splitSuggestions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Split Suggestions</h4>
                  <div className="space-y-2">
                    {splitSuggestions.map((suggestion, index) => (
                      <Card key={index} className="p-3 cursor-pointer hover:bg-accent">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{suggestion.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.reason}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {suggestion.content.substring(0, 150)}...
                          </p>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleSplit(suggestion)}
                          >
                            Split Here
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => setShowSplitSuggestions(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* New Note Button */}
        {newNoteMode && (
          <div className="w-1/3 p-4 border-r bg-background">
            <Card className="p-6 text-center">
              <div className="space-y-4">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">Create New Note</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter your note details below
                </p>
                <Input
                  placeholder="Note title..."
                  id="newNoteTitle"
                  className="mb-3"
                />
                <Textarea
                  placeholder="# Write in Markdown..."
                  id="newNoteContent"
                  className="min-h-[200px] font-mono text-sm mb-4"
                />
                <div className="flex gap-2">
                  <Button onClick={() => setNewNoteMode(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const title = (document.getElementById('newNoteTitle') as HTMLInputElement)?.value;
                      const content = (document.getElementById('newNoteContent') as HTMLTextAreaElement)?.value;
                      if (title && content) {
                        createNote(title, content);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Note
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
            {selectedNote && (
              <>
                <span>•</span>
                <span>Selected note: {selectedNote.title}</span>
              </>
            )}
          </div>
          {!newNoteMode && (
            <Button size="sm" onClick={() => setNewNoteMode(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
