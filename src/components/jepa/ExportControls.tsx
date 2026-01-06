/**
 * JEPA Export Controls Component
 *
 * Provides UI for exporting transcripts in various formats.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Download, Copy, FileText, CheckCircle2, Loader2 } from 'lucide-react'

import {
  formatTranscriptToMarkdown,
  formatMessagesToMarkdown,
  downloadMarkdownFile,
  copyMarkdownToClipboard,
  generateTranscriptFilename,
} from '@/lib/jepa/markdown-formatter'

import { JEPA_Transcript } from '@/types/jepa'
import { Message } from '@/types/conversation'

interface ExportControlsProps {
  // Either provide a transcript or messages
  transcript?: JEPA_Transcript
  messages?: Message[]
  sessionId: string
  disabled?: boolean
  className?: string
  onExportComplete?: (format: string) => void
}

type ExportStatus = 'idle' | 'copying' | 'downloading' | 'success'

export function ExportControls({
  transcript,
  messages,
  sessionId,
  disabled = false,
  className = '',
  onExportComplete,
}: ExportControlsProps) {
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [lastFormat, setLastFormat] = useState<string>('')

  // Generate markdown content
  const getMarkdown = useCallback(() => {
    if (transcript) {
      const { markdown } = formatTranscriptToMarkdown(transcript, {
        includeTimestamps: true,
        includeSpeakerNames: true,
        includeMetadata: true,
        includeAudioLinks: false,
        timestampFormat: 'hh:mm:ss',
        separator: 'line',
        includeConfidence: false,
      })
      return markdown
    } else if (messages) {
      const { markdown } = formatMessagesToMarkdown(messages, sessionId, {
        includeTimestamps: true,
        includeSpeakerNames: true,
        includeMetadata: true,
        includeAudioLinks: false,
        timestampFormat: 'hh:mm:ss',
        separator: 'line',
        includeConfidence: false,
      })
      return markdown
    }
    return ''
  }, [transcript, messages, sessionId])

  // Generate filename
  const getFilename = useCallback((format: string) => {
    const date = new Date().toISOString().split('T')[0]
    return generateTranscriptFilename(sessionId, date, format as 'md' | 'txt')
  }, [sessionId])

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      setStatus('copying')
      const markdown = getMarkdown()
      await copyMarkdownToClipboard(markdown)

      setStatus('success')
      setLastFormat('clipboard')

      console.log('✓ Transcript copied to clipboard')

      onExportComplete?.('clipboard')

      // Reset status after 2 seconds
      setTimeout(() => setStatus('idle'), 2000)
    } catch (error) {
      setStatus('idle')
      console.error('Failed to copy transcript:', error)
    }
  }, [getMarkdown, onExportComplete])

  // Handle download as markdown
  const handleDownloadMarkdown = useCallback(async () => {
    try {
      setStatus('downloading')
      const markdown = getMarkdown()
      const filename = getFilename('md')
      await downloadMarkdownFile(markdown, filename)

      setStatus('success')
      setLastFormat('markdown')

      console.log(`✓ Transcript downloaded as ${filename}`)

      onExportComplete?.('markdown')

      // Reset status after 2 seconds
      setTimeout(() => setStatus('idle'), 2000)
    } catch (error) {
      setStatus('idle')
      console.error('Failed to download transcript:', error)
    }
  }, [getMarkdown, getFilename, onExportComplete])

  // Handle download as plain text
  const handleDownloadText = useCallback(async () => {
    try {
      setStatus('downloading')

      // Strip markdown formatting for plain text
      let markdown = getMarkdown()
      const text = markdown
        .replace(/^#{1,6}\s/gm, '') // Remove headers
        .replace(/\*\*/g, '') // Remove bold
        .replace(/\*/g, '') // Remove italic
        .replace(/---/g, '') // Remove separators
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
        .replace(/^\s*$/gm, '') // Remove empty lines
        .trim()

      const filename = getFilename('txt')
      await downloadMarkdownFile(text, filename)

      setStatus('success')
      setLastFormat('text')

      console.log(`✓ Transcript downloaded as ${filename}`)

      onExportComplete?.('text')

      setTimeout(() => setStatus('idle'), 2000)
    } catch (error) {
      setStatus('idle')
      console.error('Failed to download text:', error)
    }
  }, [getMarkdown, getFilename, onExportComplete])

  const isButtonDisabled = disabled || status !== 'idle'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Quick copy button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        disabled={isButtonDisabled}
        className="gap-2"
        aria-label="Copy transcript to clipboard"
      >
        {status === 'copying' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === 'success' && lastFormat === 'clipboard' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span>Copy</span>
      </Button>

      {/* Export as Markdown */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadMarkdown}
        disabled={isButtonDisabled}
        className="gap-2"
        aria-label="Download transcript as Markdown"
      >
        {status === 'downloading' && lastFormat === 'markdown' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === 'success' && lastFormat === 'markdown' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span>Markdown</span>
      </Button>

      {/* Export as Plain Text */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadText}
        disabled={isButtonDisabled}
        className="gap-2"
        aria-label="Download transcript as plain text"
      >
        {status === 'downloading' && lastFormat === 'text' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === 'success' && lastFormat === 'text' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span>Plain Text</span>
      </Button>
    </div>
  )
}

/**
 * Compact version with just export button
 */
export function ExportButton({
  transcript,
  messages,
  sessionId,
  disabled = false,
  className = '',
}: Omit<ExportControlsProps, 'onExportComplete'>) {
  const [status, setStatus] = useState<'idle' | 'exporting' | 'success'>('idle')

  const handleExport = useCallback(async () => {
    try {
      setStatus('exporting')

      const markdown = transcript
        ? formatTranscriptToMarkdown(transcript).markdown
        : messages
          ? formatMessagesToMarkdown(messages, sessionId).markdown
          : ''

      const date = new Date().toISOString().split('T')[0]
      const filename = generateTranscriptFilename(sessionId, date, 'md')

      await downloadMarkdownFile(markdown, filename)

      setStatus('success')
      console.log(`✓ Transcript exported as ${filename}`)

      setTimeout(() => setStatus('idle'), 2000)
    } catch (error) {
      setStatus('idle')
      console.error('Export failed:', error)
    }
  }, [transcript, messages, sessionId])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || status !== 'idle'}
      className={className}
      aria-label="Export transcript"
    >
      {status === 'exporting' ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : status === 'success' ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      <span>
        {status === 'exporting'
          ? 'Exporting...'
          : status === 'success'
            ? 'Exported!'
            : 'Export'}
      </span>
    </Button>
  )
}
