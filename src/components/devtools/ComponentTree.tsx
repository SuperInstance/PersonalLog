/**
 * Component Tree - React Component Inspector
 *
 * @component components/devtools/ComponentTree
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Box, Component, Search, RefreshCw } from 'lucide-react';

interface ComponentNode {
  name: string;
  props?: Record<string, any>;
  state?: any;
  hooks?: any;
  children?: ComponentNode[];
}

export function ComponentTree() {
  const [components, setComponents] = useState<ComponentNode[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Simulate component tree (in real implementation, would use React DevTools)
  useEffect(() => {
    const mockTree: ComponentNode[] = [
      {
        name: 'App',
        props: {},
        children: [
          {
            name: 'Layout',
            props: { variant: 'default' },
            children: [
              {
                name: 'Sidebar',
                props: { collapsed: false },
                children: [
                  { name: 'Navigation', props: { items: 5 } },
                  { name: 'UserInfo', props: { user: 'current' } },
                ],
              },
              {
                name: 'MainContent',
                props: {},
                children: [
                  {
                    name: 'Messenger',
                    props: { conversationId: '123' },
                    children: [
                      { name: 'ConversationList', props: {} },
                      { name: 'ChatArea', props: {} },
                      { name: 'MessageInput', props: {} },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'DevToolsPanel',
            props: { isOpen: true, activeTab: 'components' },
          },
        ],
      },
    ];

    setComponents(mockTree);
  }, []);

  // Render component node
  const renderNode = (node: ComponentNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return null;

    return (
      <div key={`${node.name}-${depth}`} style={{ marginLeft: `${depth * 16}px` }}>
        <button
          onClick={() => setSelectedComponent(node)}
          className={`w-full text-left px-2 py-1 text-xs hover:bg-muted rounded transition-colors flex items-center gap-2 ${
            selectedComponent === node ? 'bg-muted' : ''
          }`}
        >
          {hasChildren ? (
            <Component className="w-3 h-3 text-blue-500" />
          ) : (
            <Box className="w-3 h-3 text-gray-500" />
          )}

          <span className="font-mono">{node.name}</span>

          {node.props && Object.keys(node.props).length > 0 && (
            <span className="text-muted-foreground">
              ({Object.keys(node.props).length} props)
            </span>
          )}
        </button>

        {hasChildren && node.children!.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Component Tree */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree */}
        <div className="w-1/2 overflow-auto p-2 border-r border-border">
          <div className="space-y-0.5">
            {components.map((node) => renderNode(node))}
          </div>
        </div>

        {/* Details */}
        <div className="w-1/2 overflow-auto p-4">
          {selectedComponent ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">{selectedComponent.name}</h4>
              </div>

              {selectedComponent.props && Object.keys(selectedComponent.props).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2">Props</h4>
                  <div className="text-xs font-mono bg-muted p-2 rounded space-y-1">
                    {Object.entries(selectedComponent.props).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-muted-foreground">{key}:</span>{' '}
                        <span className="text-blue-500">
                          {typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedComponent.state && (
                <div>
                  <h4 className="text-xs font-semibold mb-2">State</h4>
                  <div className="text-xs font-mono bg-muted p-2 rounded">
                    <pre>{JSON.stringify(selectedComponent.state, null, 2)}</pre>
                  </div>
                </div>
              )}

              {selectedComponent.hooks && (
                <div>
                  <h4 className="text-xs font-semibold mb-2">Hooks</h4>
                  <div className="text-xs font-mono bg-muted p-2 rounded">
                    <pre>{JSON.stringify(selectedComponent.hooks, null, 2)}</pre>
                  </div>
                </div>
              )}

              {selectedComponent.children && selectedComponent.children.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2">Children</h4>
                  <div className="text-xs">
                    {selectedComponent.children.map((child, index) => (
                      <div key={index} className="text-muted-foreground">
                        • {child.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              Select a component to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
