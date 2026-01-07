'use client';

/**
 * Recovery Wizard Component
 *
 * Multi-step wizard for guided backup restoration with:
 * - Backup selection
 * - Preview and verification
 * - Category selection
 * - Progress tracking
 * - Safety confirmations
 *
 * @module components/settings
 */

import { useState, useEffect } from 'react';
import {
  Check,
  AlertTriangle,
  Download,
  Upload,
  FileText,
  Settings,
  Database,
  BarChart3,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Info,
  Shield,
  Clock,
  HardDrive
} from 'lucide-react';
import {
  Backup,
  RestorePreview,
  RestoreResult,
  RestoreProgress,
  RestoreBackupOptions,
  BackupCategory,
  previewRestore,
  restoreFromBackup,
  checkBackupIntegrity,
  generateIntegrityReport
} from '@/lib/backup';
import { IntegrityReport } from '@/lib/backup/integrity';

type WizardStep = 'select' | 'preview' | 'categories' | 'confirm' | 'progress' | 'complete' | 'error';

interface RecoveryWizardProps {
  /** Available backups to choose from */
  backups: Backup[];
  /** Called when restore is complete */
  onComplete?: (result: RestoreResult) => void;
  /** Called when wizard is cancelled */
  onCancel?: () => void;
  /** Whether to show the wizard */
  isOpen: boolean;
}

interface WizardState {
  step: WizardStep;
  selectedBackup: Backup | null;
  preview: RestorePreview | null;
  integrityReport: IntegrityReport | null;
  selectedCategories: BackupCategory[];
  options: RestoreBackupOptions;
  progress: RestoreProgress | null;
  result: RestoreResult | null;
  error: string | null;
}

/**
 * RecoveryWizard provides a step-by-step restore experience
 */
export function RecoveryWizard({ backups, onComplete, onCancel, isOpen }: RecoveryWizardProps) {
  const [state, setState] = useState<WizardState>({
    step: 'select',
    selectedBackup: null,
    preview: null,
    integrityReport: null,
    selectedCategories: ['all'],
    options: {
      createPreRestoreBackup: true,
      verifyBeforeRestore: true,
      overwrite: false
    },
    progress: null,
    result: null,
    error: null
  });

  const [isLoading, setIsLoading] = useState(false);

  // Reset state when wizard opens/closes
  useEffect(() => {
    if (isOpen) {
      setState({
        step: 'select',
        selectedBackup: null,
        preview: null,
        integrityReport: null,
        selectedCategories: ['all'],
        options: {
          createPreRestoreBackup: true,
          verifyBeforeRestore: true,
          overwrite: false
        },
        progress: null,
        result: null,
        error: null
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle backup selection
  const handleSelectBackup = async (backup: Backup) => {
    setIsLoading(true);
    setState(prev => ({ ...prev, selectedBackup: backup, error: null }));

    try {
      // Load preview
      const preview = await previewRestore(backup.id);
      const integrityReport = await generateIntegrityReport(backup);

      setState(prev => ({
        ...prev,
        step: 'preview',
        preview,
        integrityReport
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load backup preview'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle category selection
  const handleCategoryToggle = (category: BackupCategory) => {
    setState(prev => {
      if (category === 'all') {
        return {
          ...prev,
          selectedCategories: ['all']
        };
      }

      const isSelected = prev.selectedCategories.includes(category);
      const hasAll = prev.selectedCategories.includes('all');

      if (hasAll) {
        // Switch from 'all' to specific category
        return {
          ...prev,
          selectedCategories: [category]
        };
      }

      if (isSelected) {
        // Remove category
        const newCategories = prev.selectedCategories.filter(c => c !== category);
        return {
          ...prev,
          selectedCategories: newCategories.length > 0 ? newCategories : ['all']
        };
      } else {
        // Add category
        return {
          ...prev,
          selectedCategories: [...prev.selectedCategories, category]
        };
      }
    });
  };

  // Proceed to next step
  const handleNext = () => {
    setState(prev => {
      const stepFlow: Record<WizardStep, WizardStep> = {
        select: 'preview',
        preview: 'categories',
        categories: 'confirm',
        confirm: 'progress',
        progress: 'complete',
        complete: 'select',
        error: 'select'
      };
      return {
        ...prev,
        step: stepFlow[prev.step]
      };
    });
  };

  // Go back to previous step
  const handleBack = () => {
    setState(prev => {
      const stepBack: Record<WizardStep, WizardStep> = {
        select: 'select',
        preview: 'select',
        categories: 'preview',
        confirm: 'categories',
        progress: 'confirm',
        complete: 'select',
        error: 'select'
      };
      return {
        ...prev,
        step: stepBack[prev.step]
      };
    });
  };

  // Confirm and start restore
  const handleConfirmRestore = async () => {
    if (!state.selectedBackup) return;

    setIsLoading(true);
    setState(prev => ({ ...prev, step: 'progress', error: null }));

    try {
      const result = await restoreFromBackup(state.selectedBackup.id, {
        ...state.options,
        categories: state.selectedCategories,
        onProgress: (progress) => {
          setState(prev => ({ ...prev, progress }));
        }
      });

      setState(prev => ({
        ...prev,
        step: result.success ? 'complete' : 'error',
        result
      }));

      if (result.success && onComplete) {
        onComplete(result);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        step: 'error',
        error: error instanceof Error ? error.message : 'Restore failed'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Get current step number
  const getStepNumber = (): number => {
    const stepOrder: WizardStep[] = ['select', 'preview', 'categories', 'confirm', 'progress', 'complete'];
    const index = stepOrder.indexOf(state.step);
    return index >= 0 ? index + 1 : 1;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Recovery Wizard
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Step {getStepNumber()} of 5: {getStepTitle(state.step)}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close wizard"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    step <= getStepNumber()
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {state.step === 'select' && (
            <SelectBackupStep
              backups={backups}
              selectedBackup={state.selectedBackup}
              onSelect={handleSelectBackup}
              isLoading={isLoading}
            />
          )}

          {state.step === 'preview' && state.preview && state.integrityReport && (
            <PreviewStep
              preview={state.preview}
              integrityReport={state.integrityReport}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {state.step === 'categories' && state.preview && (
            <CategoriesStep
              preview={state.preview}
              selectedCategories={state.selectedCategories}
              onCategoryToggle={handleCategoryToggle}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {state.step === 'confirm' && state.preview && (
            <ConfirmStep
              preview={state.preview}
              options={state.options}
              selectedCategories={state.selectedCategories}
              onConfirm={handleConfirmRestore}
              onBack={handleBack}
              isLoading={isLoading}
            />
          )}

          {state.step === 'progress' && (
            <ProgressStep
              progress={state.progress}
              result={state.result}
            />
          )}

          {state.step === 'complete' && state.result && (
            <CompleteStep
              result={state.result}
              onClose={handleCancel}
            />
          )}

          {state.step === 'error' && (
            <ErrorStep
              error={state.error || 'An unknown error occurred'}
              onRetry={handleConfirmRestore}
              onClose={handleCancel}
            />
          )}

          {state.error && state.step !== 'error' && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">{state.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function getStepTitle(step: WizardStep): string {
  const titles: Record<WizardStep, string> = {
    select: 'Select Backup',
    preview: 'Preview & Verify',
    categories: 'Choose Categories',
    confirm: 'Confirm Restore',
    progress: 'Restoring Data',
    complete: 'Restore Complete',
    error: 'Restore Failed'
  };
  return titles[step];
}

interface SelectBackupStepProps {
  backups: Backup[];
  selectedBackup: Backup | null;
  onSelect: (backup: Backup) => void;
  isLoading: boolean;
}

function SelectBackupStep({ backups, selectedBackup, onSelect, isLoading }: SelectBackupStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');

  // Filter and sort backups
  const filteredBackups = backups
    .filter(backup => {
      const query = searchQuery.toLowerCase();
      return (
        backup.name.toLowerCase().includes(query) ||
        backup.description?.toLowerCase().includes(query) ||
        backup.tags.some(tag => tag.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return b.compressedSize - a.compressedSize;
      }
    });

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Select a Backup to Restore
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Choose from your existing backups. You'll be able to preview the contents and select which categories to restore before confirming.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search backups by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          <option value="date">Sort by Date</option>
          <option value="name">Sort by Name</option>
          <option value="size">Sort by Size</option>
        </select>
      </div>

      {/* Backup List */}
      <div className="space-y-3">
        {filteredBackups.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
            <HardDrive className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">No backups found</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'Create a backup first'}
            </p>
          </div>
        ) : (
          filteredBackups.map((backup) => (
            <BackupCard
              key={backup.id}
              backup={backup}
              isSelected={selectedBackup?.id === backup.id}
              onSelect={() => onSelect(backup)}
              isLoading={isLoading}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface BackupCardProps {
  backup: Backup;
  isSelected: boolean;
  onSelect: () => void;
  isLoading: boolean;
}

function BackupCard({ backup, isSelected, onSelect, isLoading }: BackupCardProps) {
  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (date: string): string => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <button
      onClick={onSelect}
      disabled={isLoading}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{backup.name}</h3>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              backup.type === 'full'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}>
              {backup.type}
            </span>
            {backup.isAutomatic && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                Auto
              </span>
            )}
          </div>
          {backup.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{backup.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(backup.timestamp)}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-4 h-4" />
              {formatBytes(backup.compressedSize)}
            </span>
            {backup.compression === 'gzip' && (
              <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                Compressed
              </span>
            )}
          </div>
          {backup.tags.length > 0 && (
            <div className="flex gap-2 mt-3">
              {backup.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <ArrowRight className={`w-5 h-5 text-slate-400 transition-transform ${
          isSelected ? 'rotate-(-45deg)' : ''
        }`} />
      </div>
    </button>
  );
}

interface PreviewStepProps {
  preview: RestorePreview;
  integrityReport: IntegrityReport;
  onNext: () => void;
  onBack: () => void;
}

function PreviewStep({ preview, integrityReport, onNext, onBack }: PreviewStepProps) {
  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Backup Info */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {preview.backupName}
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600 dark:text-slate-400">Date</span>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {new Date(preview.backupDate).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Size</span>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {formatBytes(preview.backupSize)}
            </p>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Type</span>
            <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
              {preview.backupType}
            </p>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Duration</span>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              ~{Math.ceil(preview.estimatedDuration / 1000)}s
            </p>
          </div>
        </div>
      </div>

      {/* Integrity Status */}
      <div className={`rounded-lg p-4 border-2 ${
        integrityReport.canRestore
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className={`w-6 h-6 ${
              integrityReport.canRestore ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`} />
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                Integrity Check
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Score: {integrityReport.score}/100
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(integrityReport.status)}`}>
            {integrityReport.status.charAt(0).toUpperCase() + integrityReport.status.slice(1)}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-600 dark:text-slate-400">Valid Items</span>
            <p className="font-semibold text-green-700 dark:text-green-300">{integrityReport.validItems}</p>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Corrupted</span>
            <p className="font-semibold text-red-700 dark:text-red-300">{integrityReport.corruptedItems}</p>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Total Items</span>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{integrityReport.totalItems}</p>
          </div>
        </div>

        {/* Recommendations */}
        {integrityReport.recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Recommendations:</p>
            <ul className="text-sm space-y-1">
              {integrityReport.recommendations.map((rec, i) => (
                <li key={i} className="text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Items to Restore */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Items to Restore
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <ItemCard
            icon={<FileText className="w-5 h-5" />}
            label="Conversations"
            count={preview.itemsToRestore.conversations}
            color="blue"
          />
          <ItemCard
            icon={<FileText className="w-5 h-5" />}
            label="Messages"
            count={preview.itemsToRestore.messages}
            color="blue"
          />
          <ItemCard
            icon={<Database className="w-5 h-5" />}
            label="Knowledge"
            count={preview.itemsToRestore.knowledge}
            color="purple"
          />
          <ItemCard
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            count={preview.itemsToRestore.settings}
            color="slate"
          />
          <ItemCard
            icon={<BarChart3 className="w-5 h-5" />}
            label="Analytics"
            count={preview.itemsToRestore.analytics}
            color="green"
          />
          <ItemCard
            icon={<Sparkles className="w-5 h-5" />}
            label="Personalization"
            count={preview.itemsToRestore.personalization}
            color="pink"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!integrityReport.canRestore}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
    </div>
  );
}

interface ItemCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: 'blue' | 'purple' | 'slate' | 'green' | 'pink';
}

function ItemCard({ icon, label, count, color }: ItemCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    slate: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800'
  };

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div className="flex-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
      </div>
    </div>
  );
}

interface CategoriesStepProps {
  preview: RestorePreview;
  selectedCategories: BackupCategory[];
  onCategoryToggle: (category: BackupCategory) => void;
  onNext: () => void;
  onBack: () => void;
}

function CategoriesStep({ preview, selectedCategories, onCategoryToggle, onNext, onBack }: CategoriesStepProps) {
  const categories: { id: BackupCategory; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'all', label: 'All Data', icon: <Database className="w-5 h-5" />, count: 0 },
    { id: 'conversations', label: 'Conversations', icon: <FileText className="w-5 h-5" />, count: preview.itemsToRestore.conversations },
    { id: 'knowledge', label: 'Knowledge Base', icon: <Database className="w-5 h-5" />, count: preview.itemsToRestore.knowledge },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, count: preview.itemsToRestore.settings },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, count: preview.itemsToRestore.analytics },
    { id: 'personalization', label: 'Personalization', icon: <Sparkles className="w-5 h-5" />, count: preview.itemsToRestore.personalization }
  ];

  const isSelected = (category: BackupCategory): boolean => {
    if (selectedCategories.includes('all')) return true;
    return selectedCategories.includes(category);
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Choose What to Restore
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Select the categories you want to restore. You can restore everything or choose specific categories.
            </p>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 gap-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryToggle(category.id)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              isSelected(category.id)
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`${isSelected(category.id) ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500'}`}>
                {category.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{category.label}</p>
                {category.id !== 'all' && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{category.count} items</p>
                )}
              </div>
              {isSelected(category.id) && (
                <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
          <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
    </div>
  );
}

interface ConfirmStepProps {
  preview: RestorePreview;
  options: RestoreBackupOptions;
  selectedCategories: BackupCategory[];
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}

function ConfirmStep({ preview, options, selectedCategories, onConfirm, onBack, isLoading }: ConfirmStepProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="space-y-6">
      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Important: Data Will Be Overwritten
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              This operation will modify your current data. Please review carefully before proceeding.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Restore Summary</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Backup</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{preview.backupName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Date</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {new Date(preview.backupDate).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Categories</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {selectedCategories.includes('all') ? 'All' : selectedCategories.join(', ')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Pre-restore backup</span>
            <span className={`font-medium ${options.createPreRestoreBackup ? 'text-green-700 dark:text-green-300' : 'text-slate-500'}`}>
              {options.createPreRestoreBackup ? 'Yes (automatic)' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Verification</span>
            <span className={`font-medium ${options.verifyBeforeRestore ? 'text-green-700 dark:text-green-300' : 'text-slate-500'}`}>
              {options.verifyBeforeRestore ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation */}
      <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          I understand that this will overwrite my current data and I have reviewed the restore options
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 inline mr-2" />
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={!confirmed || isLoading}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
        >
          {isLoading ? (
            <>Starting Restore...</>
          ) : (
            <>
              <Check className="w-4 h-4 inline mr-2" />
              Start Restore
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface ProgressStepProps {
  progress: RestoreProgress | null;
  result: RestoreResult | null;
}

function ProgressStep({ progress, result }: ProgressStepProps) {
  if (!progress && !result) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Initializing restore...</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Restore Complete!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {progress?.message || 'Processing...'}
          </span>
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {progress?.progress || 0}%
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress?.progress || 0}%` }}
          />
        </div>
      </div>

      {/* Stage Info */}
      {progress?.category && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Currently restoring: <span className="font-semibold capitalize">{progress.category}</span>
          </p>
        </div>
      )}

      {/* Estimated Time */}
      {progress && progress.progress > 0 && progress.progress < 100 && (
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          Please wait, do not close this window...
        </div>
      )}
    </div>
  );
}

interface CompleteStepProps {
  result: RestoreResult;
  onClose: () => void;
}

function CompleteStep({ result, onClose }: CompleteStepProps) {
  const totalRestored = Object.values(result.itemsRestored).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Restore Complete!
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Successfully restored {totalRestored} items
        </p>
      </div>

      {/* Stats */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Restored Items</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600 dark:text-slate-400">Conversations</span>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{result.itemsRestored.conversations}</p>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Messages</span>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{result.itemsRestored.messages}</p>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Knowledge</span>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{result.itemsRestored.knowledge}</p>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Settings</span>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{result.itemsRestored.settings}</p>
          </div>
        </div>
      </div>

      {/* Pre-restore Backup */}
      {result.preRestoreBackupCreated && result.preRestoreBackupId && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Pre-restore Backup Created
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Your previous data was backed up before the restore. You can find it in your backups list.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Errors (if any) */}
      {result.errors.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Some items had issues
          </h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            {result.errors.slice(0, 5).map((error, i) => (
              <li key={i}>• {error.message}</li>
            ))}
            {result.errors.length > 5 && (
              <li className="italic">...and {result.errors.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Duration */}
      <div className="text-center text-sm text-slate-500 dark:text-slate-400">
        Completed in {(result.duration / 1000).toFixed(1)} seconds
      </div>

      {/* Action */}
      <button
        onClick={onClose}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
      >
        Done
      </button>
    </div>
  );
}

interface ErrorStepProps {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}

function ErrorStep({ error, onRetry, onClose }: ErrorStepProps) {
  return (
    <div className="space-y-6">
      {/* Error Message */}
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Restore Failed
        </h3>
        <p className="text-slate-600 dark:text-slate-400">{error}</p>
      </div>

      {/* Help */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">What to do next:</h4>
        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
          <li>• Check that the backup file is not corrupted</li>
          <li>• Make sure you have enough storage space</li>
          <li>• Try refreshing the page and attempting again</li>
          <li>• Contact support if the problem persists</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Close
        </button>
        <button
          onClick={onRetry}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          <ArrowRight className="w-4 h-4 inline mr-2" />
          Try Again
        </button>
      </div>
    </div>
  );
}
