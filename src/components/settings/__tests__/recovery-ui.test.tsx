/**
 * Recovery UI Component Tests
 *
 * Tests for RecoveryWizard, BackupList, and BackupPreview components
 * covering wizard flow, backup browsing, error states, and accessibility.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RecoveryWizard } from '../RecoveryWizard'
import { BackupList } from '../BackupList'
import { BackupPreview } from '../BackupPreview'
import { Backup } from '@/lib/backup'

// Mock backup data
const mockBackups: Backup[] = [
  {
    id: 'backup-1',
    timestamp: '2025-01-07T10:00:00Z',
    type: 'full',
    status: 'completed',
    size: 10000000,
    compressedSize: 3000000,
    compression: 'gzip',
    encryption: 'none',
    checksum: 'abc123',
    version: '1.0.0',
    appVersion: '1.0.0',
    isAutomatic: false,
    name: 'Full Backup',
    description: 'Complete backup of all data',
    tags: ['full', 'manual'],
    data: {
      conversations: [
        {
          id: 'conv-1',
          title: 'Test Conversation',
          type: 'chat',
          createdAt: '2025-01-07T10:00:00Z',
          updatedAt: '2025-01-07T10:00:00Z',
          messages: [
            {
              id: 'msg-1',
              conversationId: 'conv-1',
              type: 'user',
              author: { type: 'user', name: 'Test User' },
              content: { text: 'Hello' },
              timestamp: '2025-01-07T10:00:00Z'
            }
          ],
          aiContacts: [],
          settings: {
            responseMode: 'balanced',
            compactOnLimit: true,
            compactStrategy: 'summary'
          },
          metadata: {
            messageCount: 1,
            totalTokens: 10,
            hasMedia: false,
            tags: [],
            pinned: false,
            archived: false
          }
        }
      ],
      knowledge: [],
      settings: {
        preferences: { theme: 'light' },
        featureFlags: {},
        hardware: undefined,
        intelligence: undefined,
        optimization: undefined
      },
      analytics: { events: [], statistics: undefined },
      personalization: {}
    }
  },
  {
    id: 'backup-2',
    timestamp: '2025-01-06T10:00:00Z',
    type: 'incremental',
    status: 'completed',
    size: 5000000,
    compressedSize: 1500000,
    compression: 'gzip',
    encryption: 'none',
    checksum: 'def456',
    version: '1.0.0',
    appVersion: '1.0.0',
    isAutomatic: true,
    name: 'Incremental Backup',
    description: 'Incremental backup since last full',
    tags: ['incremental', 'auto'],
    data: {
      conversations: [],
      knowledge: [],
      settings: {},
      analytics: {},
      personalization: {}
    }
  }
]

// Mock functions
const mockOnRestore = vi.fn()
const mockOnDownload = vi.fn()
const mockOnDelete = vi.fn()
const mockOnPreview = vi.fn()
const mockOnComplete = vi.fn()
const mockOnCancel = vi.fn()

// Mock the backup module
vi.mock('@/lib/backup', async () => {
  const actual = await vi.importActual<any>('@/lib/backup')
  return {
    ...actual,
    previewRestore: vi.fn(() => Promise.resolve({
      backupId: 'backup-1',
      backupName: 'Full Backup',
      backupDate: '2025-01-07T10:00:00Z',
      backupSize: 3000000,
      backupType: 'full' as const,
      itemsToRestore: {
        conversations: 1,
        messages: 1,
        knowledge: 0,
        settings: 1,
        analytics: 0,
        personalization: 0
      },
      willOverwrite: false,
      preRestoreBackup: true,
      estimatedDuration: 5000
    })),
    restoreFromBackup: vi.fn(() => Promise.resolve({
      success: true,
      itemsRestored: {
        conversations: 1,
        messages: 1,
        knowledge: 0,
        settings: 1,
        analytics: 0,
        personalization: 0
      },
      errors: [],
      timestamp: '2025-01-07T10:00:00Z',
      duration: 5000,
      backupId: 'backup-1',
      preRestoreBackupCreated: true,
      preRestoreBackupId: 'pre-backup-1'
    })),
    generateIntegrityReport: vi.fn(() => Promise.resolve({
      status: 'healthy' as const,
      score: 100,
      totalItems: 2,
      validItems: 2,
      corruptedItems: 0,
      missingItems: 0,
      errorsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      topIssues: [],
      recommendations: ['Backup integrity is good. Safe to restore.'],
      canRestore: true
    }))
  }
})

describe('RecoveryWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should not render when isOpen is false', () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={false}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.queryByText('Recovery Wizard')).not.toBeInTheDocument()
    })

    it('should render wizard when isOpen is true', () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={true}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Recovery Wizard')).toBeInTheDocument()
      expect(screen.getByText('Step 1 of 5: Select Backup')).toBeInTheDocument()
    })
  })

  describe('Backup Selection Step', () => {
    it('should display all available backups', () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={true}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByText('Full Backup')).toBeInTheDocument()
      expect(screen.getByText('Incremental Backup')).toBeInTheDocument()
    })

    it('should filter backups by search query', async () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={true}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search backups/i)
      await userEvent.type(searchInput, 'Full')

      expect(screen.getByText('Full Backup')).toBeInTheDocument()
      expect(screen.queryByText('Incremental Backup')).not.toBeInTheDocument()
    })

    it('should select a backup and proceed to preview', async () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={true}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      const backupCard = screen.getByText('Full Backup').closest('button')
      await userEvent.click(backupCard!)

      await waitFor(() => {
        expect(screen.getByText('Step 2 of 5: Preview & Verify')).toBeInTheDocument()
      })
    })
  })

  describe('Preview Step', () => {
    it('should display backup preview with integrity status', async () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={true}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      // Select a backup
      const backupCard = screen.getByText('Full Backup').closest('button')
      await userEvent.click(backupCard!)

      await waitFor(() => {
        expect(screen.getByText('Integrity Check')).toBeInTheDocument()
        expect(screen.getByText('Score: 100/100')).toBeInTheDocument()
      })
    })

    it('should show items to restore', async () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={true}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      const backupCard = screen.getByText('Full Backup').closest('button')
      await userEvent.click(backupCard!)

      await waitFor(() => {
        expect(screen.getByText('Items to Restore')).toBeInTheDocument()
        expect(screen.getByText('1', { selector: '.text-2xl' })).toBeInTheDocument()
      })
    })

    it('should allow navigation back to select step', async () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={true}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      const backupCard = screen.getByText('Full Backup').closest('button')
      await userEvent.click(backupCard!)

      await waitFor(() => {
        expect(screen.getByText('Step 2 of 5')).toBeInTheDocument()
      })

      const backButton = screen.getByText(/back/i)
      await userEvent.click(backButton)

      expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
    })
  })

  describe('Category Selection Step', () => {
    it('should allow selecting individual categories', async () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={true}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      // Navigate to categories step
      const backupCard = screen.getByText('Full Backup').closest('button')
      await userEvent.click(backupCard!)

      await waitFor(() => {
        const continueButton = screen.getAllByText(/continue/i)[1]
        if (continueButton) {
          userEvent.click(continueButton)
        }
      })

      await waitFor(() => {
        expect(screen.getByText('Choose What to Restore')).toBeInTheDocument()
      })

      // Click on conversations
      const conversationsButton = screen.getByText(/conversations/i).closest('button')
      await userEvent.click(conversationsButton!)

      expect(within(conversationsButton!).getByRole('checkbox')).toBeChecked()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={true}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /close wizard/i })).toBeInTheDocument()
    })

    it('should trap focus within modal', () => {
      render(
        <RecoveryWizard
          backups={mockBackups}
          isOpen={true}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      )

      const modal = screen.getByRole('dialog')
      expect(modal).toHaveFocus()
    })
  })
})

describe('BackupList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render list of backups', () => {
    render(
      <BackupList
        backups={mockBackups}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    )

    expect(screen.getByText('Full Backup')).toBeInTheDocument()
    expect(screen.getByText('Incremental Backup')).toBeInTheDocument()
  })

  it('should display backup count', () => {
    render(
      <BackupList
        backups={mockBackups}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    )

    expect(screen.getByText('2 backups')).toBeInTheDocument()
  })

  it('should filter backups by search', async () => {
    render(
      <BackupList
        backups={mockBackups}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    )

    const searchInput = screen.getByPlaceholderText(/search backups/i)
    await userEvent.type(searchInput, 'Full')

    expect(screen.getByText('1 backup')).toBeInTheDocument()
    expect(screen.getByText('Full Backup')).toBeInTheDocument()
    expect(screen.queryByText('Incremental Backup')).not.toBeInTheDocument()
  })

  it('should call onRestore when restore button is clicked', async () => {
    render(
      <BackupList
        backups={mockBackups}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    )

    const restoreButtons = screen.getAllByText('Restore')
    await userEvent.click(restoreButtons[0])

    expect(mockOnRestore).toHaveBeenCalledWith(mockBackups[0])
  })

  it('should call onDownload when download button is clicked', async () => {
    render(
      <BackupList
        backups={mockBackups}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    )

    const downloadButtons = screen.getAllByTitle('Download')
    await userEvent.click(downloadButtons[0])

    expect(mockOnDownload).toHaveBeenCalledWith(mockBackups[0])
  })

  it('should call onDelete when delete button is clicked', async () => {
    render(
      <BackupList
        backups={mockBackups}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    )

    const deleteButtons = screen.getAllByTitle('Delete')
    await userEvent.click(deleteButtons[0])

    expect(mockOnDelete).toHaveBeenCalledWith(mockBackups[0])
  })

  it('should expand backup details when clicked', async () => {
    render(
      <BackupList
        backups={mockBackups}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    )

    const expandButtons = screen.getAllByLabelText(/expand details/i)
    await userEvent.click(expandButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Content Summary')).toBeInTheDocument()
      expect(screen.getByText(/conversations/i)).toBeInTheDocument()
    })
  })

  it('should sort backups by date', async () => {
    render(
      <BackupList
        backups={mockBackups}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    )

    // Should be sorted by date descending by default
    const backupCards = screen.getAllByText(/backup/i)
    expect(backupCards[0]).toHaveTextContent('Full Backup') // Most recent
  })
})

describe('BackupPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render backup preview modal', () => {
    render(
      <BackupPreview
        backup={mockBackups[0]}
        onClose={mockOnCancel}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
      />
    )

    expect(screen.getByText('Full Backup')).toBeInTheDocument()
    expect(screen.getByText(/complete backup of all data/i)).toBeInTheDocument()
  })

  it('should display tabs for different data categories', () => {
    render(
      <BackupPreview
        backup={mockBackups[0]}
        onClose={mockOnCancel}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
      />
    )

    expect(screen.getByText(/conversations/i)).toBeInTheDocument()
    expect(screen.getByText(/knowledge/i)).toBeInTheDocument()
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
    expect(screen.getByText(/analytics/i)).toBeInTheDocument()
    expect(screen.getByText(/personalization/i)).toBeInTheDocument()
  })

  it('should display conversation data in conversations tab', () => {
    render(
      <BackupPreview
        backup={mockBackups[0]}
        onClose={mockOnCancel}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
      />
    )

    expect(screen.getByText('Test Conversation')).toBeInTheDocument()
    expect(screen.getByText('1 messages')).toBeInTheDocument()
  })

  it('should close when close button is clicked', async () => {
    render(
      <BackupPreview
        backup={mockBackups[0]}
        onClose={mockOnCancel}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close preview/i })
    await userEvent.click(closeButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should call onRestore when restore button is clicked', async () => {
    render(
      <BackupPreview
        backup={mockBackups[0]}
        onClose={mockOnCancel}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
      />
    )

    const restoreButton = screen.getByText(/restore this backup/i)
    await userEvent.click(restoreButton)

    expect(mockOnRestore).toHaveBeenCalled()
  })

  it('should call onDownload when download button is clicked', async () => {
    render(
      <BackupPreview
        backup={mockBackups[0]}
        onClose={mockOnCancel}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
      />
    )

    const downloadButton = screen.getByText(/download/i)
    await userEvent.click(downloadButton)

    expect(mockOnDownload).toHaveBeenCalled()
  })

  it('should filter items by search query', async () => {
    render(
      <BackupPreview
        backup={mockBackups[0]}
        onClose={mockOnCancel}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
      />
    )

    const searchInput = screen.getByPlaceholderText(/search items/i)
    await userEvent.type(searchInput, 'Test')

    await waitFor(() => {
      expect(screen.getByText('Test Conversation')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <BackupPreview
          backup={mockBackups[0]}
          onClose={mockOnCancel}
          onRestore={mockOnRestore}
          onDownload={mockOnDownload}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /close preview/i })).toBeInTheDocument()
    })

    it('should allow tab navigation between tabs', async () => {
      render(
        <BackupPreview
          backup={mockBackups[0]}
          onClose={mockOnCancel}
          onRestore={mockOnRestore}
          onDownload={mockOnDownload}
        />
      )

      const knowledgeTab = screen.getByText(/knowledge/i)
      await userEvent.click(knowledgeTab)

      expect(screen.getByText('No knowledge entries in this backup')).toBeInTheDocument()
    })
  })
})

describe('Error Handling', () => {
  it('should show empty state when no backups exist', () => {
    render(
      <BackupList
        backups={[]}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    )

    expect(screen.getByText('No backups found')).toBeInTheDocument()
  })

  it('should show empty state when search has no results', async () => {
    render(
      <BackupList
        backups={mockBackups}
        onRestore={mockOnRestore}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
      />
    )

    const searchInput = screen.getByPlaceholderText(/search backups/i)
    await userEvent.type(searchInput, 'NonExistent')

    expect(screen.getByText('No backups found')).toBeInTheDocument()
  })
})
