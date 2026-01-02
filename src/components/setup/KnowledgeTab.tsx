'use client'

/**
 * Knowledge Tab
 *
 * Manage context files and knowledge base for the AI contact.
 */

import { Plus, FileText, Trash2 } from 'lucide-react'
import { type ContextFile } from '@/lib/wizard/models'

interface KnowledgeTabProps {
  contextFiles: ContextFile[]
  onRemoveFile: (fileId: string) => void
  newFileName: string
  onNewFileNameChange: (name: string) => void
  newFileContent: string
  onNewFileContentChange: (content: string) => void
  onAddFile: () => void
}

export function KnowledgeTab({
  contextFiles,
  onRemoveFile,
  newFileName,
  onNewFileNameChange,
  newFileContent,
  onNewFileContentChange,
  onAddFile,
}: KnowledgeTabProps) {
  return (
    <div className="space-y-6">
      {/* Existing Files */}
      {contextFiles.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Knowledge Base
          </h3>
          <div className="space-y-2">
            {contextFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {file.content.length} chars • {file.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New File */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Add Context File
        </h3>
        <div className="space-y-4">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => onNewFileNameChange(e.target.value)}
            placeholder="File name (e.g., Product Guidelines)"
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
          />
          <textarea
            value={newFileContent}
            onChange={(e) => onNewFileContentChange(e.target.value)}
            placeholder="Paste the content to use as context..."
            rows={4}
            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
          />
          <div className="flex items-center gap-2">
            <select
              value="knowledge"
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
            >
              <option value="knowledge">Knowledge</option>
              <option value="style">Style Guide</option>
              <option value="instruction">Instructions</option>
            </select>
            <button
              onClick={onAddFile}
              disabled={!newFileName.trim() || !newFileContent.trim()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add File
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 Context files are automatically included when this AI is in a conversation. Use them to give the AI specialized knowledge or specific instructions.
        </p>
      </div>
    </div>
  )
}
