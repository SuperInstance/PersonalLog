/**
 * Note Management Service
 *
 * Handles CRUD operations for notes and note files
 * Supports markdown editing, file attachments, and organization
 */

import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export interface Note {
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

export interface NoteFile {
  id: string;
  noteId: string;
  name: string;
  type: 'markdown' | 'image' | 'pdf' | 'audio' | 'video' | 'other';
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  sourceType: 'manual' | 'asr_transcript' | 'paste' | 'import';
  sourceUrl?: string;
  audioDuration?: number;
  transcriptionText?: string;
}

export interface NoteWithFiles extends Note {
  files: NoteFile[];
}

// ============================================
// NOTE CRUD OPERATIONS
// ============================================

export async function getAllNotes(options: {
  projectId?: string;
  folder?: string;
  tags?: string[];
  searchQuery?: string;
} = {}): Promise<NoteWithFiles[]> {
  const where: any = {};

  if (options.projectId) {
    where.projectId = options.projectId;
  }

  if (options.folder) {
    where.folder = options.folder;
  }

  if (options.tags && options.tags.length > 0) {
    where.tags = {
      hasSome: options.tags
    };
  }

  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { content: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } }
    ];
  }

  const notes = await db.note.findMany({
    where,
    orderBy: [
      { isPinned: 'desc' },
      { updatedAt: 'desc' }
    ],
    include: {
      files: true
    }
  });

  return notes.map(note => ({
    ...note,
    tags: note.tags ? JSON.parse(note.tags) : []
  }));
}

export async function getNoteById(id: string): Promise<NoteWithFiles | null> {
  const note = await db.note.findUnique({
    where: { id },
    include: {
      files: true
    }
  });

  if (!note) return null;

  return {
    ...note,
    tags: note.tags ? JSON.parse(note.tags) : []
  };
}

export async function createNote(data: {
  title: string;
  content: string;
  description?: string;
  tags?: string[];
  folder?: string;
  projectId?: string;
  isPinned?: boolean;
}): Promise<NoteWithFiles> {
  const note = await db.note.create({
    data: {
      title: data.title,
      content: data.content,
      description: data.description,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      folder: data.folder,
      projectId: data.projectId,
      isPinned: data.isPinned || false,
      wordCount: countWords(data.content)
    }
  });

  return {
    ...note,
    tags: data.tags || []
  };
}

export async function updateNote(id: string, data: {
  title?: string;
  content?: string;
  description?: string;
  tags?: string[];
  folder?: string;
  isPinned?: boolean;
}): Promise<NoteWithFiles | null> {
  const note = await db.note.findUnique({
    where: { id }
  });

  if (!note) return null;

  const updateData: any = {
    updatedAt: new Date()
  };

  if (data.title !== undefined) {
    updateData.title = data.title;
  }

  if (data.content !== undefined) {
    updateData.content = data.content;
    updateData.wordCount = countWords(data.content);
  }

  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  if (data.tags !== undefined) {
    updateData.tags = JSON.stringify(data.tags);
  }

  if (data.folder !== undefined) {
    updateData.folder = data.folder;
  }

  if (data.isPinned !== undefined) {
    updateData.isPinned = data.isPinned;
  }

  const updated = await db.note.update({
    where: { id },
    data: updateData
  });

  return {
    ...updated,
    tags: updated.tags ? JSON.parse(updated.tags) : []
  };
}

export async function deleteNote(id: string): Promise<boolean> {
  try {
    await db.note.delete({
      where: { id }
    });
    return true;
  } catch (error) {
    console.error('Failed to delete note:', error);
    return false;
  }
}

// ============================================
// FILE MANAGEMENT
// ============================================

export async function addFileToNote(data: {
  noteId: string;
  name: string;
  type: 'markdown' | 'image' | 'pdf' | 'audio' | 'video' | 'other';
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  sourceType: 'manual' | 'asr_transcript' | 'paste' | 'import';
  sourceUrl?: string;
  audioDuration?: number;
  transcriptionText?: string;
}): Promise<NoteFile> {
  const file = await db.noteFile.create({
    data: {
      noteId: data.noteId,
      name: data.name,
      type: data.type,
      filePath: data.filePath,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      audioDuration: data.audioDuration,
      transcriptionText: data.transcriptionText
    }
  });

  await db.note.update({
    where: { id: data.noteId },
    data: { updatedAt: new Date() }
  });

  return file;
}

export async function updateNoteFile(id: string, data: {
  name?: string;
  filePath?: string;
  transcriptionText?: string;
}): Promise<NoteFile | null> {
  const file = await db.noteFile.findUnique({
    where: { id }
  });

  if (!file) return null;

  const updated = await db.noteFile.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date()
    }
  });

  return updated;
}

export async function deleteNoteFile(id: string): Promise<boolean> {
  try {
    await db.noteFile.delete({
      where: { id }
    });
    return true;
  } catch (error) {
    console.error('Failed to delete note file:', error);
    return false;
  }
}

// ============================================
// AUTO-SPLITTING LOGIC
// ============================================

export interface SplitSuggestion {
  title: string;
  content: string;
  reason: string;
  startIndex: number;
  endIndex: number;
}

export async function suggestSplits(noteId: string): Promise<SplitSuggestion[]> {
  const note = await getNoteById(noteId);
  if (!note) return [];

  const suggestions: SplitSuggestion[] = [];
  const content = note.content;
  const lines = content.split('\n');

  let currentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('##') || line.startsWith('###')) {
      if (i > 0 && currentStart < i) {
        const sectionContent = lines.slice(currentStart, i).join('\n').trim();
        if (sectionContent.length > 200) {
          suggestions.push({
            title: `Section ${suggestions.length + 1}`,
            content: sectionContent,
            reason: 'Markdown header section detected',
            startIndex: currentStart,
            endIndex: i
          });
        }
      }

      currentStart = i;
    }
  }

  if (content.length > 3000) {
    const chunkSize = 1000;
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunkEnd = Math.min(i + chunkSize, content.length);
      suggestions.push({
        title: `Part ${suggestions.length + 1}`,
        content: content.substring(i, chunkEnd),
        reason: 'Document exceeds 3000 characters, splitting by chunks',
        startIndex: i,
        endIndex: chunkEnd
      });
    }
  }

  const paragraphs = content.split(/\n\n+/);

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    const startIndex = content.indexOf(para, currentStart);

    if (para.length > 500 && i < paragraphs.length - 1) {
      if (startIndex !== i) {
        suggestions.push({
          title: `Topic ${suggestions.length + 1}`,
          content: para,
          reason: 'Long paragraph detected',
          startIndex,
          endIndex: startIndex + para.length
        });
        currentStart = i;
      }
    }
  }

  return suggestions;
}

export async function splitNote(noteId: string, suggestions: Array<{
  title: string;
  content: string;
}>): Promise<NoteWithFiles[]> {
  const originalNote = await getNoteById(noteId);
  if (!originalNote) return [];

  const createdNotes: NoteWithFiles[] = [];

  for (const suggestion of suggestions) {
    const newNote = await createNote({
      title: `${originalNote.title} - ${suggestion.title}`,
      content: suggestion.content,
      description: `Split from: ${originalNote.title}`,
      folder: originalNote.folder,
      projectId: originalNote.projectId,
      tags: [...originalNote.tags, 'split']
    });

    createdNotes.push(newNote);
  }

  await deleteNote(noteId);

  return createdNotes;
}

export async function mergeNotes(noteIds: string[], title: string): Promise<NoteWithFiles | null> {
  if (noteIds.length === 0) return null;

  const notes = await Promise.all(
    noteIds.map(id => getNoteById(id))
  );

  const validNotes = notes.filter((n): n is Note => n !== null);

  if (validNotes.length === 0) return null;

  const mergedContent = validNotes.map((note, index) => {
    return `## ${note.title}\n\n${note.content}`;
  }).join('\n\n---\n\n');

  const mergedNote = await createNote({
    title,
    content: mergedContent,
    description: `Merged from ${validNotes.length} notes`,
    tags: validNotes.flatMap(n => n.tags)
  });

  await Promise.all(noteIds.map(id => deleteNote(id)));

  return mergedNote;
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

export async function searchNotes(query: string, options: {
  projectId?: string;
  folder?: string;
  tags?: string[];
  limit?: number;
} = {}): Promise<NoteWithFiles[]> {
  const searchTerms = query.toLowerCase().split(/\s+/);
  const notes = await getAllNotes(options);
  const results: NoteWithFiles[] = [];

  for (const note of notes) {
    let relevanceScore = 0;
    const content = `${note.title} ${note.content} ${note.description || ''}`.toLowerCase();

    for (const term of searchTerms) {
      if (content.includes(term)) {
        relevanceScore += 1;

        if (note.title.toLowerCase().includes(term)) {
          relevanceScore += 2;
        }

        for (const tag of note.tags) {
          if (tag.toLowerCase().includes(term)) {
            relevanceScore += 1.5;
          }
        }
      }
    }

    if (relevanceScore > 0) {
      results.push({
        ...note,
        relevance: relevanceScore
      });
    }
  }

  results.sort((a: any, b: any) => b.relevance - a.relevance);

  return options.limit ? results.slice(0, options.limit) : results;
}

export function formatContentPreview(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

export async function getAllFolders(): Promise<string[]> {
  const notes = await db.note.findMany({
    where: {
      folder: { not: null }
    },
    select: {
      folder: true
    }
  });

  const folders = new Set<string>();
  notes.forEach(note => {
    if (note.folder) {
      folders.add(note.folder);
    }
  });

  return Array.from(folders).sort();
}

export async function getAllTags(): Promise<string[]> {
  const notes = await db.note.findMany({
    where: {
      tags: { not: null }
    },
    select: {
      tags: true
    }
  });

  const tagSet = new Set<string>();
  notes.forEach(note => {
    if (note.tags) {
      const tags = JSON.parse(note.tags);
      tags.forEach(tag => tagSet.add(tag));
    }
  });

  return Array.from(tagSet).sort();
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}
