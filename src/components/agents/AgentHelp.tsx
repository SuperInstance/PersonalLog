'use client'

/**
 * AgentHelp Component
 *
 * Simple guide for creating and managing AI agents.
 * Explains: Vibe-coding, Templates, Marketplace, Import
 */

import { useState } from 'react'
import { X, Sparkles, Grid3x3, Store, Upload, BookOpen, ChevronRight, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

type HelpTab = 'overview' | 'vibe-coding' | 'templates' | 'marketplace' | 'import'

interface HelpSection {
  id: HelpTab
  title: string
  icon: React.ElementType
  description: string
}

const helpSections: HelpSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: BookOpen,
    description: 'Learn about AI agents and how to use them',
  },
  {
    id: 'vibe-coding',
    title: 'Vibe-Coding',
    icon: Sparkles,
    description: 'Create custom agents through conversation',
  },
  {
    id: 'templates',
    title: 'Templates',
    icon: Grid3x3,
    description: 'Quick-start with pre-built configurations',
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    icon: Store,
    description: 'Discover community-created agents',
  },
  {
    id: 'import',
    title: 'Import & Export',
    icon: Upload,
    description: 'Share and transfer agent files',
  },
]

interface AgentHelpProps {
  /** Whether to show the help */
  isOpen: boolean
  /** Callback when help is closed */
  onClose: () => void
}

export function AgentHelp({ isOpen, onClose }: AgentHelpProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<HelpTab>('overview')

  const handleNavigate = (path: string) => {
    router.push(path)
    onClose()
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewContent onNavigate={handleNavigate} />
      case 'vibe-coding':
        return <VibeCodingContent onNavigate={handleNavigate} />
      case 'templates':
        return <TemplatesContent />
      case 'marketplace':
        return <MarketplaceContent onNavigate={handleNavigate} />
      case 'import':
        return <ImportContent />
      default:
        return <OverviewContent onNavigate={handleNavigate} />
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      showCloseButton={true}
      className="animate-fade-in"
    >
      <div className="flex h-[80vh]">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 px-2">
            Agent Help
          </h2>
          <nav className="space-y-1">
            {helpSections.map((section) => {
              const Icon = section.icon
              const isActive = activeTab === section.id

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{section.title}</div>
                    <div className="text-xs opacity-70">{section.description}</div>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </Modal>
  )
}

function OverviewContent({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          AI Agents Overview
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          AI agents are specialized assistants that can help you with specific tasks. Each agent has unique
          capabilities, personality, and expertise.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Ways to Create Agents
        </h3>

        <MethodCard
          icon={Sparkles}
          title="Vibe-Coding"
          description="Describe what you need in plain English, and let AI build a custom agent for you through conversation."
          action="Try Vibe-Coding"
          onClick={() => onNavigate('/vibe-coding')}
        />

        <MethodCard
          icon={Grid3x3}
          title="Templates"
          description="Choose from our collection of pre-built templates designed for common use cases."
          action="Browse Templates"
          onClick={() => onNavigate('#')}
        />

        <MethodCard
          icon={Store}
          title="Marketplace"
          description="Explore agents created by the community and install them with one click."
          action="Visit Marketplace"
          onClick={() => onNavigate('/marketplace')}
        />

        <MethodCard
          icon={Upload}
          title="Import"
          description="Import agent files from other sources or transfer agents between devices."
          action="Learn to Import"
          onClick={() => {}}
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Hardware Requirements
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Some agents require specific hardware capabilities. Your system's hardware is automatically detected,
          and incompatible agents will be marked accordingly.
        </p>
      </div>
    </div>
  )
}

function VibeCodingContent({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          Vibe-Coding: Create Agents by Chatting
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Vibe-coding is the easiest way to create custom AI agents. Just describe what you want,
          answer a few questions, and get a personalized agent in minutes.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          How It Works
        </h3>

        <StepCard
          number={1}
          title="Describe Your Needs"
          description="Tell us what you want your agent to do in plain English. Be specific about tasks, tone, and any special requirements."
        />

        <StepCard
          number={2}
          title="Answer Questions"
          description="We'll ask 2-3 clarifying questions to understand your requirements better. This helps us create the perfect agent for you."
        />

        <StepCard
          number={3}
          title="Review & Customize"
          description="We'll generate an agent draft based on your answers. You can review, edit, and refine it before activating."
        />

        <StepCard
          number={4}
          title="Activate & Use"
          description="Once you're happy with the result, activate your agent and start using it immediately in conversations!"
        />
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
          Tips for Best Results
        </h4>
        <ul className="text-sm text-purple-800 dark:text-purple-300 space-y-1">
          <li>• Be specific about what you want the agent to do</li>
          <li>• Mention the tone or personality you prefer</li>
          <li>• Describe how it should handle errors or uncertainty</li>
          <li>• Feel free to use examples or point to existing agents</li>
        </ul>
      </div>

      <Button
        variant="default"
        size="lg"
        onClick={() => onNavigate('/vibe-coding')}
        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        Start Creating
      </Button>
    </div>
  )
}

function TemplatesContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          Agent Templates
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Templates are pre-built agent configurations optimized for specific use cases.
          They're the fastest way to get started with AI agents.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Available Templates
        </h3>

        <TemplateCard
          icon="📚"
          name="Research Assistant"
          description="Concise, fact-focused responses with web search capabilities. Perfect for academic research and fact-checking."
          category="Productivity"
        />

        <TemplateCard
          icon="🎨"
          name="Creative Writer"
          description="Imaginative storytelling with detailed descriptions. Great for creative projects, stories, and content creation."
          category="Creative"
        />

        <TemplateCard
          icon="🔧"
          name="Code Reviewer"
          description="Technical analysis with constructive feedback. Ideal for developers who want code reviews and improvements."
          category="Technical"
        />

        <TemplateCard
          icon="💼"
          name="Business Analyst"
          description="Professional insights and data-driven recommendations. Perfect for business decisions and strategic planning."
          category="Business"
        />

        <TemplateCard
          icon="📝"
          name="Writing Coach"
          description="Helps improve writing clarity and style. Great for editing, proofreading, and enhancing written content."
          category="Productivity"
        />

        <TemplateCard
          icon="🎓"
          name="Study Companion"
          description="Patient explanations with learning-focused approach. Ideal for students and lifelong learners."
          category="Education"
        />
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
          Using Templates
        </h4>
        <ol className="text-sm text-green-800 dark:text-green-300 space-y-1 list-decimal list-inside">
          <li>Click the grid icon in the agents section</li>
          <li>Browse available templates by category</li>
          <li>Click "Use Template" on any template</li>
          <li>The agent is instantly available in your agent list!</li>
        </ol>
      </div>
    </div>
  )
}

function MarketplaceContent({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          Agent Marketplace
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Discover and install agents created by the community. The marketplace is a growing
          collection of specialized agents for every use case.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Marketplace Features
        </h3>

        <FeatureCard
          title="Browse & Discover"
          description="Search by category, popularity, rating, or recency. Find the perfect agent for your needs."
        />

        <FeatureCard
          title="Ratings & Reviews"
          description="See what others think about an agent before installing. Read detailed reviews and ratings."
        />

        <FeatureCard
          title="One-Click Install"
          description="Install agents instantly with a single click. No setup required."
        />

        <FeatureCard
          title="Version History"
          description="Track changes and updates. Agents are continuously improved by their creators."
        />

        <FeatureCard
          title="Hardware Compatibility"
          description="Automatic compatibility checking shows which agents work with your system."
        />
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
        <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
          Community Guidelines
        </h4>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          All marketplace agents are reviewed for quality and safety. Report any issues
          to help maintain a safe and helpful community.
        </p>
      </div>

      <Button
        variant="default"
        size="lg"
        onClick={() => onNavigate('/marketplace')}
        className="w-full"
      >
        <Store className="w-5 h-5 mr-2" />
        Visit Marketplace
      </Button>
    </div>
  )
}

function ImportContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          Import & Export Agents
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Share your custom agents with others or import agents from external sources.
          Transfer agents between devices easily.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Exporting Agents
        </h3>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <ol className="text-sm text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside">
            <li>Find the agent in your agent list</li>
            <li>Click the download icon next to the agent</li>
            <li>Choose the export format (JSON or YAML)</li>
            <li>Save the file to your device</li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Importing Agents
        </h3>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <ol className="text-sm text-slate-700 dark:text-slate-300 space-y-2 list-decimal list-inside">
            <li>Click the upload icon in the agents section</li>
            <li>Select a JSON or YAML file from your device</li>
            <li>Review the agent details</li>
            <li>Confirm to add the agent to your collection</li>
          </ol>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Supported Formats
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <FormatCard name="JSON" description="Most common format. Easy to read and edit." />
          <FormatCard name="YAML" description="More compact. Great for version control." />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Use Cases
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Share custom agents with friends or colleagues</li>
          <li>• Backup your agent configurations</li>
          <li>• Transfer agents between devices</li>
          <li>• Contribute agents to the community</li>
        </ul>
      </div>
    </div>
  )
}

// Helper components

function MethodCard({
  icon: Icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: React.ElementType
  title: string
  description: string
  action: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-md group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {title}
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{description}</p>
          <span className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1">
            {action}
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </button>
  )
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
        {number}
      </div>
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{title}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  )
}

function TemplateCard({
  icon,
  name,
  description,
  category,
}: {
  icon: string
  name: string
  description: string
  category: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100">{name}</h4>
          <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
            {category}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
        <div className="w-2 h-2 bg-blue-500 rounded-full" />
      </div>
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{title}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  )
}

function FormatCard({ name, description }: { name: string; description: string }) {
  return (
    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{name}</h4>
      <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  )
}
