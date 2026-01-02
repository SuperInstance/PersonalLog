'use client'

/**
 * PersonalLog - Forum Page
 *
 * Self-populated discussion forum powered by knowledge graph.
 * AI generates posts based on your journal entries, notes, and patterns.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Sparkles,
  TrendingUp,
  Hash,
  User,
  Bot,
  Clock,
  ThumbsUp,
  Eye,
  ArrowLeft,
  Plus,
} from 'lucide-react'

interface ForumPost {
  id: string
  title: string
  content: string
  author: 'user' | 'ai'
  category: ForumCategory
  tags: string[]
  createdAt: string
  replyTo?: string
  metadata: {
    views: number
    likes: number
    aiGenerated: boolean
    relatedTopics: string[]
  }
}

type ForumCategory = 'topics' | 'questions' | 'insights' | 'actions' | 'connections'

const CATEGORIES: Array<{ value: ForumCategory; label: string; icon: string }> = [
  { value: 'topics', label: 'Topics', icon: '💬' },
  { value: 'questions', label: 'Questions', icon: '❓' },
  { value: 'insights', label: 'Insights', icon: '💡' },
  { value: 'actions', label: 'Actions', icon: '✅' },
  { value: 'connections', label: 'Connections', icon: '🔗' },
]

export default function ForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | null>(null)
  const [trending, setTrending] = useState<Array<{ topic: string; count: number }>>([])

  useEffect(() => {
    loadForum()
  }, [selectedCategory])

  const loadForum = async () => {
    // In production, fetch from API
    const mockPosts: ForumPost[] = [
      {
        id: '1',
        title: 'Discussion: Productivity',
        content: `This topic discussion was automatically generated because "Productivity" has been mentioned 12 times in your journal and notes.

**Recent mentions:**
- "Had a really productive day today, finished the project ahead of schedule"
- "Productivity was low today, struggled to focus on the task at hand"
- "Trying out a new productivity technique: the Pomodoro method"

**Related posts:**
Discuss your thoughts, questions, and insights about Productivity here. As you continue to write about this topic, this post will be updated with relevant connections.`,
        author: 'ai',
        category: 'topics',
        tags: ['productivity', 'tips', 'habits'],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        metadata: {
          views: 24,
          likes: 5,
          aiGenerated: true,
          relatedTopics: ['focus', 'time-management'],
        },
      },
      {
        id: '2',
        title: 'Question: How can I stay more focused?',
        content: `I often find myself getting distracted when I need to work on important tasks. What are some strategies that have worked for you?`,
        author: 'user',
        category: 'questions',
        tags: ['question', 'focus', 'productivity'],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        metadata: {
          views: 18,
          likes: 3,
          aiGenerated: false,
          relatedTopics: ['productivity'],
        },
      },
      {
        id: '3',
        title: 'Insight: Emotional Awareness',
        content: `This insight was automatically detected based on 8 occurrences in your writing.

**Pattern:** emotional awareness

**What this might mean:**
This pattern appears regularly in your journal entries. You tend to reflect on how you feel and what causes certain emotions.

**Questions to explore:**
- In what situations does this pattern appear?
- Is this pattern helpful or limiting?
- What would happen if this pattern changed?

**Recent examples:**
- "I'm feeling really happy today after the good news"
- "Noticed I was feeling anxious before the presentation"
- "Taking time to reflect on my emotions helps me understand myself better"`,
        author: 'ai',
        category: 'insights',
        tags: ['pattern', 'insight', 'emotional'],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        metadata: {
          views: 31,
          likes: 7,
          aiGenerated: true,
          relatedTopics: ['mindfulness', 'self-care'],
        },
      },
    ]

    setPosts(selectedCategory
      ? mockPosts.filter(p => p.category === selectedCategory)
      : mockPosts
    )

    setTrending([
      { topic: 'Productivity', count: 12 },
      { topic: 'Focus', count: 8 },
      { topic: 'Health', count: 6 },
      { topic: 'Learning', count: 5 },
    ])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHrs / 24)

    if (diffHrs < 1) return 'Just now'
    if (diffHrs < 24) return `${diffHrs}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-orange-950">
      {/* Header */}
      <header className="border-b bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Forum
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">AI-populated discussions</p>
              </div>
            </div>
            <Link
              href="/forum/new"
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Post</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Category Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  !selectedCategory
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Posts
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.value
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Posts */}
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          post.author === 'ai'
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                            : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        }`}
                      >
                        {post.author === 'ai' ? (
                          <Bot className="w-5 h-5 text-white" />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {post.title}
                          </h3>
                          {post.metadata.aiGenerated && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full">
                              AI-generated
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(post.createdAt)}</span>
                          <span>•</span>
                          <span className="capitalize">{post.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line mb-4">
                    {post.content}
                  </p>

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/forum?tag=${tag}`}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Hash className="w-3 h-3" />
                          {tag}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{post.metadata.views}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{post.metadata.likes}</span>
                      </div>
                    </div>
                    <Link
                      href={`/forum/${post.id}`}
                      className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium"
                    >
                      View Discussion →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {posts.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No posts yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                  Start journaling to see AI-generated discussions appear here!
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* About */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                AI-Populated Forum
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                This forum is automatically populated by AI as you journal and take notes. The more you write, the richer the discussions become.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  <span>Topics emerge when mentioned 3+ times</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  <span>Questions are tracked for AI answers</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  <span>Patterns are detected automatically</span>
                </div>
              </div>
            </div>

            {/* Trending Topics */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Trending Topics
              </h3>
              <div className="space-y-3">
                {trending.map((topic) => (
                  <Link
                    key={topic.topic}
                    href={`/forum?tag=${topic.topic.toLowerCase()}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <span className="text-slate-700 dark:text-slate-300">{topic.topic}</span>
                    <span className="text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full">
                      {topic.count} mentions
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Categories
              </h3>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-500">
                      {posts.filter(p => p.category === cat.value).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
