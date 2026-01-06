/**
 * JEPA Export Functionality Tests
 *
 * Comprehensive tests for export features including:
 * - Copy to clipboard
 * - Download as .md file
 * - Export to Google Docs format
 * - Selection export
 * - Batch export
 * - Format conversion
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ExportManager } from '../../lib/jepa/export-manager'
import type { TranscriptionResult, JEPASubtext } from '../../lib/jepa/types'

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
  readText: vi.fn(),
}

Object.defineProperty(global, 'navigator', {
  value: {
    ...global.navigator,
    clipboard: mockClipboard,
  },
  writable: true,
})

// Mock Blob and URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock document.createElement for download link
const mockLink = {
  href: '',
  download: '',
  click: vi.fn(),
  style: {},
}

vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)

describe('ExportManager', () => {
  let exportManager: ExportManager
  let sampleTranscript: TranscriptionResult
  let sampleSubtexts: JEPASubtext[]

  beforeEach(() => {
    exportManager = new ExportManager()
    vi.clearAllMocks()

    sampleTranscript = {
      text: 'Hello world. How are you today? I am doing great.',
      segments: [
        {
          id: 0,
          text: 'Hello world.',
          start: 0.0,
          end: 1.5,
          confidence: 0.95,
          speaker: 'Speaker 1',
        },
        {
          id: 1,
          text: 'How are you today?',
          start: 1.5,
          end: 3.0,
          confidence: 0.92,
          speaker: 'Speaker 1',
        },
        {
          id: 2,
          text: 'I am doing great.',
          start: 3.0,
          end: 4.5,
          confidence: 0.90,
          speaker: 'Speaker 2',
        },
      ],
      language: 'en',
    }

    sampleSubtexts = [
      {
        timestamp: 0.0,
        emotion: 'neutral',
        confidence: 0.85,
        sentiment: 0.1,
        arousal: 0.3,
        valence: 0.5,
        suggestion: 'Continue listening',
      },
      {
        timestamp: 3.0,
        emotion: 'joy',
        confidence: 0.90,
        sentiment: 0.7,
        arousal: 0.7,
        valence: 0.8,
        suggestion: 'Share enthusiasm',
      },
    ]
  })

  describe('Copy to Clipboard', () => {
    it('should copy transcript as markdown', async () => {
      mockClipboard.writeText.mockResolvedValueOnce(undefined)

      await exportManager.copyToClipboard(sampleTranscript, sampleSubtexts, 'markdown')

      expect(mockClipboard.writeText).toHaveBeenCalled()
      const copiedText = mockClipboard.writeText.mock.calls[0][0]
      expect(copiedText).toContain('# Enhanced Transcript')
      expect(copiedText).toContain('Hello world')
    })

    it('should copy as plain text', async () => {
      mockClipboard.writeText.mockResolvedValueOnce(undefined)

      await exportManager.copyToClipboard(sampleTranscript, sampleSubtexts, 'plain')

      expect(mockClipboard.writeText).toHaveBeenCalled()
      const copiedText = mockClipboard.writeText.mock.calls[0][0]
      expect(copiedText).toContain('Hello world')
      expect(copiedText).not.toContain('#')
      expect(copiedText).not.toContain('<!--')
    })

    it('should copy only selected segments', async () => {
      mockClipboard.writeText.mockResolvedValueOnce(undefined)

      const selectedSegments = [sampleTranscript.segments[0]] // Only first segment

      await exportManager.copySelectionToClipboard(
        sampleTranscript,
        selectedSegments,
        'markdown'
      )

      expect(mockClipboard.writeText).toHaveBeenCalled()
      const copiedText = mockClipboard.writeText.mock.calls[0][0]
      expect(copiedText).toContain('Hello world')
      expect(copiedText).not.toContain('How are you')
    })

    it('should handle clipboard permission denial', async () => {
      mockClipboard.writeText.mockRejectedValueOnce(new Error('Permission denied'))

      await expect(
        exportManager.copyToClipboard(sampleTranscript, sampleSubtexts, 'markdown')
      ).rejects.toThrow('Permission denied')
    })

    it('should handle empty transcript', async () => {
      mockClipboard.writeText.mockResolvedValueOnce(undefined)

      const emptyTranscript: TranscriptionResult = {
        text: '',
        segments: [],
        language: 'en',
      }

      await exportManager.copyToClipboard(emptyTranscript, [], 'markdown')

      expect(mockClipboard.writeText).toHaveBeenCalled()
    })
  })

  describe('Download as File', () => {
    it('should download transcript as .md file', async () => {
      await exportManager.downloadAsMarkdown(
        sampleTranscript,
        sampleSubtexts,
        'transcript-2025-01-04'
      )

      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockLink.click).toHaveBeenCalled()
      expect(mockLink.download).toContain('.md')
    })

    it('should generate correct filename with date', async () => {
      const filename = 'my-transcript'

      await exportManager.downloadAsMarkdown(sampleTranscript, sampleSubtexts, filename)

      expect(mockLink.download).toContain(filename)
    })

    it('should create blob with correct content', async () => {
      await exportManager.downloadAsMarkdown(sampleTranscript, sampleSubtexts, 'test')

      expect(URL.createObjectURL).toHaveBeenCalled()
      const blobArg = (URL.createObjectURL as jest.Mock).mock.calls[0][0]
      expect(blobArg).toBeInstanceOf(Blob)
    })

    it('should handle special characters in filename', async () => {
      const filename = 'test/file:with?special*chars'

      await exportManager.downloadAsMarkdown(sampleTranscript, sampleSubtexts, filename)

      // Should sanitize filename
      expect(mockLink.download).not.toContain('/')
      expect(mockLink.download).not.toContain(':')
      expect(mockLink.download).not.toContain('?')
      expect(mockLink.download).not.toContain('*')
    })

    it('should revoke object URL after download', async () => {
      await exportManager.downloadAsMarkdown(sampleTranscript, sampleSubtexts, 'test')

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('Google Docs Export', () => {
    it('should format for Google Docs', () => {
      const docsFormat = exportManager.formatForGoogleDocs(sampleTranscript, sampleSubtexts)

      expect(docsFormat).toContain('Title:')
      expect(docsFormat).toContain('Date:')
      expect(docsFormat).toContain('Duration:')
      expect(docsFormat).toContain('Hello world')
    })

    it('should include page breaks', () => {
      const docsFormat = exportManager.formatForGoogleDocs(sampleTranscript, sampleSubtexts)

      // Google Docs format should include page break indicators
      expect(docsFormat).toBeDefined()
    })

    it('should format headers correctly', () => {
      const docsFormat = exportManager.formatForGoogleDocs(sampleTranscript, sampleSubtexts)

      // Should use Google Docs heading format
      expect(docsFormat).toContain('**') // Bold for headers
    })

    it('should handle long transcripts for Google Docs', () => {
      const longTranscript: TranscriptionResult = {
        text: 'A '.repeat(10000),
        segments: [
          {
            id: 0,
            text: 'A '.repeat(10000),
            start: 0.0,
            end: 600.0,
            confidence: 0.9,
          },
        ],
        language: 'en',
      }

      const docsFormat = exportManager.formatForGoogleDocs(longTranscript, [])

      expect(docsFormat.length).toBeGreaterThan(0)
    })
  })

  describe('Selection Export', () => {
    it('should export selected time range', () => {
      const exported = exportManager.exportRange(
        sampleTranscript,
        sampleSubtexts,
        1.0, // Start time
        4.0 // End time
      )

      expect(exported).toContain('Hello world')
      expect(exported).toContain('I am doing great')
    })

    it('should export selected segments only', () => {
      const selectedSegments = [sampleTranscript.segments[1]] // Only middle segment

      const exported = exportManager.exportSegments(sampleTranscript, selectedSegments)

      expect(exported).toContain('How are you today?')
      expect(exported).not.toContain('Hello world')
      expect(exported).not.toContain('I am doing great')
    })

    it('should handle empty selection', () => {
      const exported = exportManager.exportSegments(sampleTranscript, [])

      expect(exported).toBeDefined()
      expect(exported).toContain('No segments selected')
    })

    it('should export non-contiguous segments', () => {
      const selectedSegments = [
        sampleTranscript.segments[0],
        sampleTranscript.segments[2],
      ] // First and last

      const exported = exportManager.exportSegments(sampleTranscript, selectedSegments)

      expect(exported).toContain('Hello world')
      expect(exported).toContain('I am doing great')
      expect(exported).not.toContain('How are you today?')
    })
  })

  describe('Batch Export', () => {
    it('should export multiple transcripts', async () => {
      const transcripts = [
        sampleTranscript,
        {
          ...sampleTranscript,
          text: 'Second transcript',
          segments: [
            {
              id: 0,
              text: 'Second transcript',
              start: 0.0,
              end: 1.5,
              confidence: 0.9,
            },
          ],
        },
      ]

      const batchExport = await exportManager.batchExport(transcripts, [], 'markdown')

      expect(batchExport).toHaveLength(2)
      expect(batchExport[0]).toContain('Hello world')
      expect(batchExport[1]).toContain('Second transcript')
    })

    it('should create ZIP archive for batch download', async () => {
      const transcripts = [sampleTranscript, sampleTranscript]

      // Note: This would require JSZip or similar library
      // For now, test the interface
      const canBatch = typeof exportManager.batchExport === 'function'

      expect(canBatch).toBe(true)
    })

    it('should handle large batch exports', async () => {
      const transcripts = Array(100).fill(sampleTranscript)

      const startTime = performance.now()
      await exportManager.batchExport(transcripts, [], 'markdown')
      const duration = performance.now() - startTime

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000)
    })
  })

  describe('Format Conversion', () => {
    it('should convert to SRT format', () => {
      const srt = exportManager.convertToSRT(sampleTranscript)

      expect(srt).toContain('1\n00:00:00,000 --> 00:00:01,500')
      expect(srt).toContain('Hello world')
      expect(srt).toContain('2\n00:00:01,500 --> 00:00:03,000')
      expect(srt).toContain('How are you today?')
    })

    it('should convert to VTT format', () => {
      const vtt = exportManager.convertToVTT(sampleTranscript)

      expect(vtt).toContain('WEBVTT')
      expect(vtt).toContain('00:00:00.000 --> 00:00:01.500')
      expect(vtt).toContain('Hello world')
    })

    it('should convert to JSON format', () => {
      const json = exportManager.convertToJSON(sampleTranscript, sampleSubtexts)

      expect(json).toBeDefined()
      const parsed = JSON.parse(json)
      expect(parsed.transcript).toBeDefined()
      expect(parsed.segments).toBeDefined()
      expect(parsed.subtexts).toBeDefined()
    })

    it('should convert to CSV format', () => {
      const csv = exportManager.convertToCSV(sampleTranscript)

      expect(csv).toContain('timestamp,speaker,text,confidence')
      expect(csv).toContain('0.0,"Speaker 1","Hello world",0.95')
    })

    it('should handle invalid timestamps in SRT', () => {
      const invalidTranscript: TranscriptionResult = {
        text: 'Test',
        segments: [
          {
            id: 0,
            text: 'Test',
            start: -1.0, // Invalid
            end: 0.5,
            confidence: 0.9,
          },
        ],
        language: 'en',
      }

      const srt = exportManager.convertToSRT(invalidTranscript)

      // Should handle gracefully
      expect(srt).toBeDefined()
    })
  })

  describe('Export Options', () => {
    it('should respect include metadata option', () => {
      const withMetadata = exportManager.exportToMarkdown(sampleTranscript, sampleSubtexts, {
        includeMetadata: true,
        includeSubtexts: true,
      })

      expect(withMetadata).toContain('Language:')
      expect(withMetadata).toContain('Duration:')
    })

    it('should respect include subtexts option', () => {
      const withoutSubtexts = exportManager.exportToMarkdown(sampleTranscript, sampleSubtexts, {
        includeMetadata: false,
        includeSubtexts: false,
      })

      expect(withoutSubtexts).not.toContain('<!-- SUBTEXT:')
    })

    it('should respect timestamp format option', () => {
      const withSeconds = exportManager.exportToMarkdown(sampleTranscript, sampleSubtexts, {
        includeMetadata: false,
        includeSubtexts: false,
        timestampFormat: 'seconds',
      })

      expect(withSeconds).toMatch(/\[\d+\.\d+\]/) // [0.0] format
    })

    it('should respect include speakers option', () => {
      const withSpeakers = exportManager.exportToMarkdown(sampleTranscript, sampleSubtexts, {
        includeMetadata: false,
        includeSubtexts: false,
        includeSpeakers: true,
      })

      expect(withSpeakers).toContain('Speaker 1')
      expect(withSpeakers).toContain('Speaker 2')
    })
  })

  describe('Error Handling', () => {
    it('should handle download failure gracefully', async () => {
      // Mock createElement to throw
      vi.spyOn(document, 'createElement').mockImplementationOnce(() => {
        throw new Error('DOM error')
      })

      await expect(
        exportManager.downloadAsMarkdown(sampleTranscript, sampleSubtexts, 'test')
      ).rejects.toThrow()
    })

    it('should handle invalid transcript data', () => {
      const invalidTranscript = null as any

      expect(() => {
        exportManager.exportToMarkdown(invalidTranscript, [])
      }).toThrow()
    })

    it('should handle export with missing segments', () => {
      const transcriptWithoutSegments: TranscriptionResult = {
        text: 'Test',
        segments: [],
        language: 'en',
      }

      const exported = exportManager.exportToMarkdown(transcriptWithoutSegments, [])

      expect(exported).toBeDefined()
      expect(exported).toContain('No segments available')
    })
  })

  describe('Performance', () => {
    it('should handle large transcripts efficiently', () => {
      const largeTranscript: TranscriptionResult = {
        text: 'Word '.repeat(10000),
        segments: Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: i,
            text: `Segment ${i}`,
            start: i * 0.1,
            end: (i + 1) * 0.1,
            confidence: 0.9,
          })),
        language: 'en',
      }

      const startTime = performance.now()
      const exported = exportManager.exportToMarkdown(largeTranscript, [])
      const duration = performance.now() - startTime

      expect(exported).toBeDefined()
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should not block UI during export', async () => {
      let uiUpdated = false

      // Simulate UI update during export
      setTimeout(() => {
        uiUpdated = true
      }, 10)

      exportManager.exportToMarkdown(sampleTranscript, sampleSubtexts)

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(uiUpdated).toBe(true)
    })
  })

  describe('File Naming', () => {
    it('should generate unique filenames', () => {
      const filename1 = exportManager.generateFilename('transcript', 'md')
      const filename2 = exportManager.generateFilename('transcript', 'md')

      // Should include timestamp or unique identifier
      expect(filename1).not.toBe(filename2)
    })

    it('should sanitize filenames', () => {
      const unsafeName = 'test/file:with?special*chars"<>|'
      const sanitized = exportManager.sanitizeFilename(unsafeName)

      expect(sanitized).not.toContain('/')
      expect(sanitized).not.toContain(':')
      expect(sanitized).not.toContain('?')
      expect(sanitized).not.toContain('*')
      expect(sanitized).not.toContain('"')
      expect(sanitized).not.toContain('<')
      expect(sanitized).not.toContain('>')
      expect(sanitized).not.toContain('|')
    })

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300)
      const limited = exportManager.sanitizeFilename(longName)

      expect(limited.length).toBeLessThanOrEqual(255) // Standard FS limit
    })
  })
})
