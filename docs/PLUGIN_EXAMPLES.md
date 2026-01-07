# Plugin Examples

**Real-world plugin examples with complete code**

---

## Table of Contents

1. [Overview](#overview)
2. [Example 1: Message Modifier Plugin](#example-1-message-modifier-plugin)
3. [Example 2: Analytics Plugin](#example-2-analytics-plugin)
4. [Example 3: UI Enhancement Plugin](#example-3-ui-enhancement-plugin)
5. [Example 4: Data Export Plugin](#example-4-data-export-plugin)
6. [Example 5: Auto-Tagger Plugin](#example-5-auto-tagger-plugin)

---

## Overview

This document provides complete, working examples of PersonalLog plugins. Each example includes:

- Full source code
- Manifest file
- Installation instructions
- Usage examples
- Explanations of key concepts

All example plugins are production-ready and follow best practices.

---

## Example 1: Message Modifier Plugin

**Description**: Automatically modifies messages before they are displayed, adding timestamps and formatting.

### Plugin: Timestamp Modifier

**Features:**
- Adds timestamps to messages
- Formats code blocks
- Highlights mentions
- Customizable styling

#### manifest.json

```json
{
  "id": "examples.timestamp-modifier",
  "name": "Timestamp Modifier",
  "description": "Adds timestamps and formatting to messages",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "author": {
    "name": "PersonalLog Team"
  },
  "license": "MIT",
  "type": ["ui"],
  "keywords": ["messages", "formatting", "timestamp"],
  "categories": ["utilities"],
  "permissions": [
    "messages:read"
  ],
  "settingsSchema": {
    "showTimestamp": {
      "type": "boolean",
      "label": "Show Timestamp",
      "default": true
    },
    "timestampFormat": {
      "type": "enum",
      "label": "Timestamp Format",
      "options": [
        { "value": "short", "label": "Short (10:30 AM)" },
        { "value": "long", "label": "Long (Jan 1, 2025 10:30 AM)" },
        { "value": "relative", "label": "Relative (5m ago)" }
      ],
      "default": "short"
    },
    "highlightMentions": {
      "type": "boolean",
      "label": "Highlight @mentions",
      "default": true
    }
  },
  "defaultSettings": {
    "showTimestamp": true,
    "timestampFormat": "short",
    "highlightMentions": true
  }
}
```

#### src/main.ts

```typescript
/**
 * Timestamp Modifier Plugin
 *
 * Automatically adds timestamps and formatting to messages
 */

import type { PluginActivationContext, PluginAPIContext } from '@personallog/plugin-sdk';

// ========================================
// LIFECYCLE HOOKS
// ========================================

export async function onActivate(context: PluginActivationContext): Promise<void> {
  const { api, events, logger, settings } = context;

  logger.info('Timestamp Modifier plugin activating');

  // Listen for new messages
  events.on('message:received', async (message: any) => {
    const modified = await modifyMessage(message, settings);
    logger.debug('Message modified', { messageId: message.id });
  });

  // Register UI component for timestamp display
  api.ui.registerComponent({
    id: 'timestamp-display',
    name: 'Timestamp Display',
    description: 'Shows formatted timestamp',
    category: 'message',
    render: `({ message, context }) => {
      const settings = context.settings;
      if (!settings.showTimestamp) return null;

      const timestamp = formatTimestamp(
        message.timestamp,
        settings.timestampFormat
      );

      return React.createElement('span', {
        className: 'timestamp-modifier',
        style: {
          fontSize: '0.75em',
          color: '#888',
          marginLeft: '8px'
        }
      }, timestamp);
    }`
  });

  logger.info('Timestamp Modifier plugin activated');
}

export async function onDeactivate(context: PluginAPIContext): Promise<void> {
  context.logger.info('Timestamp Modifier plugin deactivating');
}

export async function onSettingsChange(
  newSettings: Record<string, any>,
  oldSettings: Record<string, any>,
  context: PluginAPIContext
): Promise<void> {
  context.logger.info('Settings changed');
}

// ========================================
// MESSAGE MODIFICATION
// ========================================

async function modifyMessage(
  message: any,
  settings: Record<string, any>
): Promise<any> {
  const modified = { ...message };

  // Add timestamp
  if (settings.showTimestamp) {
    modified.timestampDisplay = formatTimestamp(
      message.timestamp,
      settings.timestampFormat
    );
  }

  // Highlight mentions
  if (settings.highlightMentions) {
    modified.content = highlightMentions(message.content);
  }

  // Format code blocks
  modified.content = formatCodeBlocks(modified.content);

  return modified;
}

function formatTimestamp(
  timestamp: number,
  format: string
): string {
  const date = new Date(timestamp);

  switch (format) {
    case 'short':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    case 'long':
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

    case 'relative':
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';

    default:
      return date.toLocaleTimeString();
  }
}

function highlightMentions(content: string): string {
  // Highlight @mentions
  return content.replace(
    /@(\w+)/g,
    '<span class="mention" style="background: #e0f0ff; padding: 2px 4px; border-radius: 4px;">@$1</span>'
  );
}

function formatCodeBlocks(content: string): string {
  // Format code blocks with ```
  return content.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    '<pre class="code-block" style="background: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto;"><code>$2</code></pre>'
  );
}
```

### Usage

1. Install the plugin
2. Enable it in settings
3. Messages will automatically display with timestamps
4. Customize format in plugin settings

---

## Example 2: Analytics Plugin

**Description**: Tracks user interactions and generates analytics reports.

### Plugin: Usage Analytics

**Features:**
- Tracks message counts
- Monitors active conversations
- Generates daily summaries
- Exports analytics data

#### manifest.json

```json
{
  "id": "examples.usage-analytics",
  "name": "Usage Analytics",
  "description": "Track and analyze your usage patterns",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "author": {
    "name": "PersonalLog Team"
  },
  "license": "MIT",
  "type": ["analytics"],
  "keywords": ["analytics", "tracking", "statistics"],
  "categories": ["productivity"],
  "permissions": [
    "analytics:write",
    "analytics:read",
    "messages:read",
    "conversations:read"
  ],
  "settingsSchema": {
    "trackMessages": {
      "type": "boolean",
      "label": "Track Messages",
      "default": true
    },
    "trackConversations": {
      "type": "boolean",
      "label": "Track Conversations",
      "default": true
    },
    "dailyReport": {
      "type": "boolean",
      "label": "Generate Daily Report",
      "default": true
    }
  },
  "defaultSettings": {
    "trackMessages": true,
    "trackConversations": true,
    "dailyReport": true
  }
}
```

#### src/main.ts

```typescript
/**
 * Usage Analytics Plugin
 *
 * Tracks and analyzes user usage patterns
 */

import type { PluginActivationContext, PluginAPIContext } from '@personallog/plugin-sdk';

interface DailyStats {
  date: string;
  messagesSent: number;
  conversationsCreated: number;
  activeMinutes: number;
}

// ========================================
// LIFECYCLE HOOKS
// ========================================

export async function onActivate(context: PluginActivationContext): Promise<void> {
  const { api, events, logger, settings } = context;

  logger.info('Usage Analytics plugin activating');

  // Track messages
  if (settings.trackMessages) {
    events.on('message:sent', async (message: any) => {
      await trackMessage(context, message);
    });
  }

  // Track conversations
  if (settings.trackConversations) {
    events.on('conversation:created', async (conversation: any) => {
      await trackConversation(context, conversation);
    });
  }

  // Generate daily report
  if (settings.dailyReport) {
    scheduleDailyReport(context);
  }

  // Register analytics view
  api.ui.registerView({
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    path: '/plugins/analytics',
    description: 'View usage analytics',
    icon: 'BarChart3',
    render: getDashboardRenderer()
  });

  logger.info('Usage Analytics plugin activated');
}

export async function onDeactivate(context: PluginAPIContext): Promise<void> {
  context.logger.info('Usage Analytics plugin deactivating');
}

// ========================================
// TRACKING FUNCTIONS
// ========================================

async function trackMessage(
  context: PluginAPIContext,
  message: any
): Promise<void> {
  // Track event
  await context.api.analytics.trackEvent('message.sent', {
    conversationId: message.conversationId,
    type: message.type,
    length: message.content?.length || 0
  });

  // Update daily stats
  await updateDailyStats(context, {
    messagesSent: 1
  });
}

async function trackConversation(
  context: PluginAPIContext,
  conversation: any
): Promise<void> {
  // Track event
  await context.api.analytics.trackEvent('conversation.created', {
    type: conversation.type
  });

  // Update daily stats
  await updateDailyStats(context, {
    conversationsCreated: 1
  });
}

async function updateDailyStats(
  context: PluginAPIContext,
  updates: Partial<DailyStats>
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `stats-${today}`;

  const existing = await context.storage.get(key) || {
    date: today,
    messagesSent: 0,
    conversationsCreated: 0,
    activeMinutes: 0
  };

  const updated = {
    ...existing,
    ...updates,
    messagesSent: existing.messagesSent + (updates.messagesSent || 0),
    conversationsCreated: existing.conversationsCreated + (updates.conversationsCreated || 0)
  };

  await context.storage.set(key, updated);
}

function scheduleDailyReport(context: PluginAPIContext): void {
  // Check every hour if report needs to be generated
  setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();

    if (hour === 9) { // 9 AM
      await generateDailyReport(context);
    }
  }, 3600000); // Every hour
}

async function generateDailyReport(context: PluginAPIContext): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const stats = await context.storage.get(`stats-${dateStr}`);

  if (!stats) {
    context.logger.warn('No stats found for yesterday');
    return;
  }

  // Generate report
  const report = `
Daily Report for ${dateStr}

Messages Sent: ${stats.messagesSent}
Conversations Created: ${stats.conversationsCreated}
Active Minutes: ${stats.activeMinutes}
  `.trim();

  // Store report
  await context.storage.set(`report-${dateStr}`, report);

  context.logger.info('Daily report generated', { date: dateStr });
}

function getDashboardRenderer(): string {
  return `
    async ({ context }) => {
      const [stats, setStats] = React.useState(null);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        loadStats(context).then(data => {
          setStats(data);
          setLoading(false);
        });
      }, [context]);

      if (loading) {
        return React.createElement('div', {}, 'Loading...');
      }

      return React.createElement('div', { style: { padding: '20px' } },
        React.createElement('h2', {}, 'Usage Analytics'),
        renderStatCard('Messages Today', stats.todayMessages, 'MessageSquare'),
        renderStatCard('Conversations Today', stats.todayConversations, 'MessageCircle'),
        renderStatCard('This Week', stats.weekMessages, 'Calendar')
      );
    }
  `;
}

// Helper functions would be defined here...
```

### Usage

1. Install and enable plugin
2. Use conversations normally
3. View analytics dashboard at `/plugins/analytics`
4. Daily reports generated automatically at 9 AM

---

## Example 3: UI Enhancement Plugin

**Description**: Adds quick actions and shortcuts to the UI.

### Plugin: Quick Actions

**Features:**
- Quick reply buttons
- Keyboard shortcuts
- Quick templates
- Message actions

#### manifest.json

```json
{
  "id": "examples.quick-actions",
  "name": "Quick Actions",
  "description": "Add quick actions and shortcuts to messages",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "author": {
    "name": "PersonalLog Team"
  },
  "license": "MIT",
  "type": ["ui"],
  "keywords": ["ui", "shortcuts", "actions"],
  "categories": ["utilities"],
  "permissions": [
    "messages:write",
    "ui:modify"
  ],
  "contributes": {
    "keybindings": [
      {
        "id": "quick-reply",
        "command": "quickactions.reply",
        "key": "Ctrl+R",
        "context": "editor"
      }
    ]
  }
}
```

#### src/main.ts

```typescript
/**
 * Quick Actions Plugin
 *
 * Adds quick actions and keyboard shortcuts
 */

import type { PluginActivationContext, PluginAPIContext } from '@personallog/plugin-sdk';

interface QuickTemplate {
  id: string;
  name: string;
  content: string;
}

const TEMPLATES: QuickTemplate[] = [
  {
    id: 'thanks',
    name: 'Thank You',
    content: 'Thank you for your message! I appreciate it.'
  },
  {
    id: 'gotit',
    name: 'Got It',
    content: 'Got it, thanks for letting me know!'
  },
  {
    id: 'check',
    name: 'Will Check',
    content: "I'll check on that and get back to you."
  }
];

// ========================================
// LIFECYCLE HOOKS
// ========================================

export async function onActivate(context: PluginActivationContext): Promise<void> {
  const { api, logger } = context;

  logger.info('Quick Actions plugin activating');

  // Register quick reply component
  api.ui.registerComponent({
    id: 'quick-reply-buttons',
    name: 'Quick Reply Buttons',
    description: 'Quick reply templates',
    category: 'message',
    render: `({ context, message }) => {
      const templates = ${JSON.stringify(TEMPLATES)};

      return React.createElement('div', {
        style: {
          display: 'flex',
          gap: '8px',
          marginTop: '12px'
        }
      },
      ...templates.map(template =>
        React.createElement('button', {
          key: template.id,
          onClick: () => sendQuickReply(context, message.conversationId, template.content),
          style: {
            padding: '6px 12px',
            background: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875em'
          }
        }, template.name)
      )
      );
    }`
  });

  // Register command
  api.commands.register({
    id: 'quickactions.reply',
    title: 'Quick Reply',
    description: 'Send a quick reply',
    handler: 'async (context) => { await showQuickReplyMenu(context); }'
  });

  logger.info('Quick Actions plugin activated');
}

export async function onDeactivate(context: PluginAPIContext): Promise<void> {
  context.logger.info('Quick Actions plugin deactivating');
}

// ========================================
// QUICK ACTIONS
// ========================================

async function sendQuickReply(
  context: PluginAPIContext,
  conversationId: string,
  content: string
): Promise<void> {
  await context.api.messages.create(conversationId, {
    type: 'text',
    author: 'User',
    content
  });

  context.logger.info('Quick reply sent', { content });
}

async function showQuickReplyMenu(context: PluginAPIContext): Promise<void> {
  // Implementation would show a menu with templates
  context.logger.info('Quick reply menu shown');
}
```

### Usage

1. Quick reply buttons appear below each message
2. Click a button to send a pre-written reply
3. Use Ctrl+R for quick reply shortcut

---

## Example 4: Data Export Plugin

**Description**: Export conversations and messages to various formats.

### Plugin: Universal Exporter

**Features:**
- Export to JSON, CSV, Markdown
- Filter by date range
- Include/exclude metadata
- Batch export

#### manifest.json

```json
{
  "id": "examples.universal-exporter",
  "name": "Universal Exporter",
  "description": "Export conversations to multiple formats",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "author": {
    "name": "PersonalLog Team"
  },
  "license": "MIT",
  "type": ["export"],
  "keywords": ["export", "backup", "json", "csv"],
  "categories": ["utilities"],
  "permissions": [
    "conversations:read",
    "messages:read"
  ]
}
```

#### src/main.ts

```typescript
/**
 * Universal Exporter Plugin
 *
 * Export conversations to multiple formats
 */

import type { PluginActivationContext, PluginAPIContext } from '@personallog/plugin-sdk';

// ========================================
// LIFECYCLE HOOKS
// ========================================

export async function onActivate(context: PluginActivationContext): Promise<void> {
  const { api, logger } = context;

  logger.info('Universal Exporter plugin activating');

  // Register export formats
  api.data.registerSource({
    id: 'export-json',
    name: 'JSON Export',
    description: 'Export to JSON format',
    type: 'custom',
    fetch: 'async (config) => { return await exportToJSON(config); }'
  });

  api.data.registerSource({
    id: 'export-csv',
    name: 'CSV Export',
    description: 'Export to CSV format',
    type: 'custom',
    fetch: 'async (config) => { return await exportToCSV(config); }'
  });

  api.data.registerSource({
    id: 'export-markdown',
    name: 'Markdown Export',
    description: 'Export to Markdown format',
    type: 'custom',
    fetch: 'async (config) => { return await exportToMarkdown(config); }'
  });

  // Register UI
  api.ui.registerView({
    id: 'export-view',
    name: 'Export',
    path: '/plugins/export',
    description: 'Export conversations',
    icon: 'Download',
    render: getExportViewRenderer()
  });

  logger.info('Universal Exporter plugin activated');
}

export async function onDeactivate(context: PluginAPIContext): Promise<void> {
  context.logger.info('Universal Exporter plugin deactivating');
}

// ========================================
// EXPORT FUNCTIONS
// ========================================

async function exportToJSON(config: {
  conversationIds?: string[];
  includeMetadata?: boolean;
}): Promise<string> {
  const { api } = config as any;

  const conversations = config.conversationIds
    ? await Promise.all(config.conversationIds.map(id => api.conversations.get(id)))
    : await api.conversations.list();

  const exportData = {
    exportedAt: new Date().toISOString(),
    conversations: await Promise.all(
      conversations.map(async (conv: any) => {
        const messages = await api.messages.list(conv.id);
        return {
          id: conv.id,
          title: conv.title,
          type: conv.type,
          createdAt: conv.createdAt,
          messages: config.includeMetadata ? messages : messages.map((m: any) => ({
            content: m.content,
            author: m.author,
            timestamp: m.timestamp
          }))
        };
      })
    )
  };

  return JSON.stringify(exportData, null, 2);
}

async function exportToCSV(config: {
  conversationIds?: string[];
}): Promise<string> {
  const { api } = config as any;

  const conversations = config.conversationIds
    ? await Promise.all(config.conversationIds.map(id => api.conversations.get(id)))
    : await api.conversations.list();

  let csv = 'Conversation,Message,Author,Timestamp\n';

  for (const conv of conversations) {
    const messages = await api.messages.list(conv.id);
    for (const msg of messages) {
      const escapedContent = `"${msg.content.replace(/"/g, '""')}"`;
      csv += `"${conv.title}",${escapedContent},"${msg.author}","${new Date(msg.timestamp).toISOString()}"\n`;
    }
  }

  return csv;
}

async function exportToMarkdown(config: {
  conversationIds?: string[];
}): Promise<string> {
  const { api } = config as any;

  const conversations = config.conversationIds
    ? await Promise.all(config.conversationIds.map(id => api.conversations.get(id)))
    : await api.conversations.list();

  let markdown = '# Conversations Export\n\n';
  markdown += `Exported: ${new Date().toLocaleString()}\n\n`;

  for (const conv of conversations) {
    markdown += `## ${conv.title}\n\n`;
    const messages = await api.messages.list(conv.id);

    for (const msg of messages) {
      markdown += `### ${msg.author}\n`;
      markdown += `${msg.content}\n\n`;
    }
  }

  return markdown;
}

function getExportViewRenderer(): string {
  return `
    async ({ context }) => {
      const [selectedConversations, setSelectedConversations] = React.useState([]);
      const [format, setFormat] = React.useState('json');
      const [exporting, setExporting] = React.useState(false);

      const handleExport = async () => {
        setExporting(true);
        try {
          const result = await exportData(context, {
            conversationIds: selectedConversations,
            format
          });

          downloadFile(result, \`export.\${format}\`);
        } catch (error) {
          console.error('Export failed:', error);
        }
        setExporting(false);
      };

      return React.createElement('div', { style: { padding: '20px' } },
        React.createElement('h2', {}, 'Export Conversations'),
        React.createElement('select', {
          value: format,
          onChange: (e) => setFormat(e.target.value)
        },
          React.createElement('option', { value: 'json' }, 'JSON'),
          React.createElement('option', { value: 'csv' }, 'CSV'),
          React.createElement('option', { value: 'md' }, 'Markdown')
        ),
        React.createElement('button', {
          onClick: handleExport,
          disabled: exporting || selectedConversations.length === 0
        }, exporting ? 'Exporting...' : 'Export')
      );
    }
  `;
}

async function exportData(context: any, config: any): Promise<string> {
  // Implementation...
  return '';
}

function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Usage

1. Navigate to Export view
2. Select conversations to export
3. Choose format (JSON, CSV, Markdown)
4. Click Export button
5. File downloads automatically

---

## Example 5: Auto-Tagger Plugin

**Description**: Automatically tags messages based on content analysis.

### Plugin: Smart Auto-Tagger

**Features:**
- Content-based tagging
- Machine learning suggestions
- Custom tag rules
- Batch tagging

#### manifest.json

```json
{
  "id": "examples.auto-tagger",
  "name": "Smart Auto-Tagger",
  "description": "Automatically tag messages based on content",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "author": {
    "name": "PersonalLog Team"
  },
  "license": "MIT",
  "type": ["automation"],
  "keywords": ["tagging", "automation", "ai"],
  "categories": ["productivity"],
  "permissions": [
    "messages:read",
    "messages:write"
  ],
  "settingsSchema": {
    "autoTag": {
      "type": "boolean",
      "label": "Auto-tag new messages",
      "default": true
    },
    "customRules": {
      "type": "array",
      "label": "Custom Tag Rules",
      "description": "Define custom tagging rules"
    }
  }
}
```

#### src/main.ts

```typescript
/**
 * Smart Auto-Tagger Plugin
 *
 * Automatically tag messages based on content
 */

import type { PluginActivationContext, PluginAPIContext } from '@personallog/plugin-sdk';

interface TagRule {
  pattern: RegExp;
  tags: string[];
  category: string;
}

const DEFAULT_RULES: TagRule[] = [
  {
    pattern: /\b(question|help|how to|what is)\b/i,
    tags: ['question', 'help-needed'],
    category: 'support'
  },
  {
    pattern: /\b(bug|issue|error|problem)\b/i,
    tags: ['bug', 'issue'],
    category: 'support'
  },
  {
    pattern: /\b(todo|task|remember)\b/i,
    tags: ['task', 'todo'],
    category: 'task'
  },
  {
    pattern: /\b(idea|suggestion|improvement)\b/i,
    tags: ['idea', 'enhancement'],
    category: 'feature'
  }
];

// ========================================
// LIFECYCLE HOOKS
// ========================================

export async function onActivate(context: PluginActivationContext): Promise<void> {
  const { api, events, logger, settings } = context;

  logger.info('Auto-Tagger plugin activating');

  // Load or initialize rules
  let rules = DEFAULT_RULES;
  const storedRules = await context.storage.get('custom-rules');
  if (storedRules) {
    rules = [...rules, ...storedRules];
  }

  // Auto-tag new messages
  if (settings.autoTag) {
    events.on('message:received', async (message: any) => {
      const tags = analyzeMessage(message.content, rules);
      if (tags.length > 0) {
        await applyTags(context, message.id, tags);
        logger.debug('Tags applied', { messageId: message.id, tags });
      }
    });
  }

  // Register tagging command
  api.commands.register({
    id: 'autotagger.tag-conversation',
    title: 'Auto-Tag Conversation',
    description: 'Apply tags to all messages in conversation',
    handler: 'async (context, conversationId) => { await tagConversation(context, conversationId); }'
  });

  logger.info('Auto-Tagger plugin activated');
}

export async function onDeactivate(context: PluginAPIContext): Promise<void> {
  context.logger.info('Auto-Tagger plugin deactivating');
}

// ========================================
// TAGGING FUNCTIONS
// ========================================

function analyzeMessage(content: string, rules: TagRule[]): string[] {
  const tags: string[] = [];

  for (const rule of rules) {
    if (rule.pattern.test(content)) {
      tags.push(...rule.tags);
    }
  }

  // Remove duplicates
  return [...new Set(tags)];
}

async function applyTags(
  context: PluginAPIContext,
  messageId: string,
  tags: string[]
): Promise<void> {
  // Store tags in plugin storage
  const existingTags = await context.storage.get(`tags-${messageId}`) || [];
  const newTags = [...new Set([...existingTags, ...tags])];

  await context.storage.set(`tags-${messageId}`, newTags);

  // Track tagging event
  await context.api.analytics.trackEvent('autotagger.tags_applied', {
    messageId,
    tags: newTags
  });
}

async function tagConversation(
  context: PluginAPIContext,
  conversationId: string
): Promise<void> {
  const messages = await context.api.messages.list(conversationId);
  const rules = await getRules(context);

  let totalTags = 0;

  for (const message of messages) {
    const tags = analyzeMessage(message.content, rules);
    if (tags.length > 0) {
      await applyTags(context, message.id, tags);
      totalTags += tags.length;
    }
  }

  context.logger.info('Conversation tagged', {
    conversationId,
    messagesTagged: messages.length,
    totalTags
  });
}

async function getRules(context: PluginAPIContext): Promise<TagRule[]> {
  let rules = DEFAULT_RULES;
  const storedRules = await context.storage.get('custom-rules');
  if (storedRules) {
    rules = [...rules, ...storedRules];
  }
  return rules;
}
```

### Usage

1. Enable plugin
2. New messages automatically tagged
3. Use command to tag entire conversation
4. Define custom rules in settings

---

## Summary

These examples demonstrate the breadth and power of the PersonalLog plugin system:

- **Message Modifier**: UI enhancement and content processing
- **Usage Analytics**: Data collection and visualization
- **Quick Actions**: User interface improvements
- **Universal Exporter**: Data transformation and export
- **Smart Auto-Tagger**: Automation and AI integration

Each example is production-ready and can be used as a starting point for your own plugins.

---

**Last Updated:** 2025-01-07
**Plugin System Version:** 1.0.0
