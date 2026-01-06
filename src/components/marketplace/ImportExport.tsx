/**
 * Import/Export Component
 *
 * Interface for importing and exporting agent definitions.
 */

'use client';

import { useState, useCallback } from 'react';
import { Upload, Download, FileJson, FileText, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface ImportExportProps {
  /** Callback when agents are imported */
  onImport: (files: File[]) => Promise<void>;

  /** Callback when agents are exported */
  onExport: (format: 'json' | 'yaml', agentIds: string[]) => Promise<void>;

  /** Available agents for export */
  availableAgents: Array<{ id: string; name: string; icon: string }>;

  /** Custom className */
  className?: string;
}

type ExportFormat = 'json' | 'yaml';
type ImportStatus = 'idle' | 'importing' | 'success' | 'error';

export function ImportExport({
  onImport,
  onExport,
  availableAgents,
  className = '',
}: ImportExportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.name.endsWith('.json') || file.name.endsWith('.yaml') || file.name.endsWith('.yml')
      );

      if (files.length === 0) {
        setImportStatus('error');
        setImportMessage('No valid agent files found. Please upload .json or .yaml files.');
        return;
      }

      setImportStatus('importing');
      setImportMessage(`Importing ${files.length} file${files.length > 1 ? 's' : ''}...`);

      try {
        await onImport(files);
        setImportStatus('success');
        setImportMessage(`Successfully imported ${files.length} agent${files.length > 1 ? 's' : ''}!`);
      } catch (error) {
        setImportStatus('error');
        setImportMessage(error instanceof Error ? error.message : 'Import failed');
      }

      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 3000);
    }
  }, [onImport]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);

      setImportStatus('importing');
      setImportMessage(`Importing ${files.length} file${files.length > 1 ? 's' : ''}...`);

      try {
        await onImport(files);
        setImportStatus('success');
        setImportMessage(`Successfully imported ${files.length} agent${files.length > 1 ? 's' : ''}!`);
      } catch (error) {
        setImportStatus('error');
        setImportMessage(error instanceof Error ? error.message : 'Import failed');
      }

      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 3000);
    }
  };

  const handleToggleAgent = (agentId: string) => {
    const newSelected = new Set(selectedAgents);
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId);
    } else {
      newSelected.add(agentId);
    }
    setSelectedAgents(newSelected);
    setSelectAll(newSelected.size === availableAgents.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAgents(new Set());
    } else {
      setSelectedAgents(new Set(availableAgents.map((a) => a.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleExport = async () => {
    if (selectedAgents.size === 0) {
      setImportStatus('error');
      setImportMessage('Please select at least one agent to export');
      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 3000);
      return;
    }

    try {
      await onExport(exportFormat, Array.from(selectedAgents));
      setImportStatus('success');
      setImportMessage(`Exported ${selectedAgents.size} agent${selectedAgents.size > 1 ? 's' : ''}!`);
    } catch (error) {
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : 'Export failed');
    }

    setTimeout(() => {
      setImportStatus('idle');
      setImportMessage('');
    }, 3000);
  };

  return (
    <div className={cn('space-y-8', className)}>
      {/* Import Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Import Agents
        </h2>

        <div
          className={cn(
            'relative border-2 border-dashed rounded-xl p-8 transition-all',
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {/* Drop Zone Content */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Drop agent files here
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Supports JSON and YAML formats
            </p>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json,.yaml,.yml"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" size="sm">
                Browse Files
              </Button>
            </label>
          </div>

          {/* Status Message */}
          {importStatus !== 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl">
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                {importStatus === 'importing' && (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {importMessage}
                    </span>
                  </>
                )}

                {importStatus === 'success' && (
                  <>
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {importMessage}
                    </span>
                  </>
                )}

                {importStatus === 'error' && (
                  <>
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {importMessage}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Export Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Export Agents
        </h2>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          {/* Format Selection */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Export Format
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Choose the file format for exported agents
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExportFormat('json')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  exportFormat === 'json'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                <FileJson className="w-4 h-4" />
                JSON
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('yaml')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  exportFormat === 'yaml'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                <FileText className="w-4 h-4" />
                YAML
              </button>
            </div>
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select All ({availableAgents.length})
              </span>
            </label>

            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={selectedAgents.size === 0}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export {selectedAgents.size} Agent{selectedAgents.size !== 1 ? 's' : ''}
            </Button>
          </div>

          {/* Agent List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableAgents.map((agent) => (
              <label
                key={agent.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedAgents.has(agent.id)}
                  onChange={() => handleToggleAgent(agent.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />

                <span className="text-2xl">{agent.icon}</span>

                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">
                  {agent.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 dark:text-blue-100">
          <p className="font-medium mb-1">About Import/Export</p>
          <p className="text-blue-700 dark:text-blue-300">
            Import agent definitions from files to install custom agents. Export your agents
            to backup or share them with others. Agents are exported in a standard format that
            can be imported by any PersonalLog instance.
          </p>
        </div>
      </div>
    </div>
  );
}
