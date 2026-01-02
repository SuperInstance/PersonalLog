/**
 * Knowledge Browser Page
 *
 * Browse, search, edit, and manage your knowledge base.
 * Includes checkpoint management and LoRA export.
 */

import { KnowledgeBrowser } from '@/components/knowledge/KnowledgeBrowser'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Knowledge Base - PersonalLog',
  description: 'Browse and manage your AI knowledge base with checkpoints and LoRA export',
}

export default function KnowledgePage() {
  return (
    <div className="flex flex-col h-screen">
      <KnowledgeBrowser className="flex-1" />
    </div>
  )
}
