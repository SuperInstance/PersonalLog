/**
 * Message Inspector - Debug UI for agent communication
 *
 * Shows real-time message history and allows inspection of agent communication.
 */

'use client';

import { useState, useEffect } from 'react';
import { agentEventBus } from '@/lib/agents/communication/event-bus';
import { MessageType, type AgentMessage } from '@/lib/agents/communication/types';

export function MessageInspector() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [filter, setFilter] = useState({
    from: '',
    to: '',
    type: '' as MessageType | '',
    minPriority: '' as 'low' | 'normal' | 'high' | ''
  });
  const [stats, setStats] = useState(agentEventBus.getStats());
  const [subscribers, setSubscribers] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<AgentMessage | null>(null);

  // Update messages and stats
  const updateData = () => {
    const filtered = agentEventBus.getHistory(
      filter.from || filter.to || filter.type || filter.minPriority
        ? {
            from: filter.from || undefined,
            to: filter.to || undefined,
            type: filter.type || undefined,
            minPriority: filter.minPriority || undefined
          }
        : undefined
    );
    setMessages(filtered);
    setStats(agentEventBus.getStats());
    setSubscribers(agentEventBus.getSubscribers());
  };

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(updateData, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filter]);

  // Initial load
  useEffect(() => {
    updateData();
  }, []);

  // Send test message
  const sendTestMessage = () => {
    const payload: Record<string, unknown> = {
      test: true,
      timestamp: Date.now()
    };

    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: 'test-sender', type: 'agent' },
      to: filter.to ? { agentId: filter.to, type: 'agent' } : { agentId: 'broadcast', type: 'broadcast' },
      type: (filter.type as MessageType) || MessageType.AGENT_STATUS,
      payload: payload as any, // Allow any payload type for testing
      timestamp: Date.now(),
      priority: filter.minPriority || 'normal',
      status: 'pending'
    });
    updateData();
  };

  // Clear history
  const clearHistory = () => {
    agentEventBus.clearHistory();
    updateData();
  };

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'normal':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  return (
    <div className="message-inspector p-4 bg-gray-900 text-white rounded-lg font-mono text-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Agent Communication Monitor</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded ${autoRefresh ? 'bg-green-600' : 'bg-gray-600'}`}
          >
            {autoRefresh ? '🔄 Auto' : '⏸️ Paused'}
          </button>
          <button onClick={updateData} className="px-3 py-1 bg-blue-600 rounded">
            🔄 Refresh
          </button>
          <button onClick={clearHistory} className="px-3 py-1 bg-red-600 rounded">
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-4 p-3 bg-gray-800 rounded">
        <div>
          <div className="text-gray-400 text-xs">Total Sent</div>
          <div className="text-2xl font-bold text-blue-400">{stats.totalSent}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Total Received</div>
          <div className="text-2xl font-bold text-green-400">{stats.totalReceived}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Subscribers</div>
          <div className="text-2xl font-bold text-purple-400">{subscribers.length}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Messages in History</div>
          <div className="text-2xl font-bold text-yellow-400">{messages.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 p-3 bg-gray-800 rounded">
        <div className="grid grid-cols-5 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">From Agent</label>
            <select
              value={filter.from}
              onChange={(e) => setFilter({ ...filter, from: e.target.value })}
              className="w-full px-2 py-1 bg-gray-700 rounded text-white"
            >
              <option value="">All Agents</option>
              <option value="jepa-v1">JEPA</option>
              <option value="spreader-v1">Spreader</option>
              <option value="test-sender">Test Sender</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">To Agent</label>
            <select
              value={filter.to}
              onChange={(e) => setFilter({ ...filter, to: e.target.value })}
              className="w-full px-2 py-1 bg-gray-700 rounded text-white"
            >
              <option value="">All Agents</option>
              <option value="broadcast">Broadcast</option>
              <option value="jepa-v1">JEPA</option>
              <option value="spreader-v1">Spreader</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Message Type</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value as MessageType | '' })}
              className="w-full px-2 py-1 bg-gray-700 rounded text-white"
            >
              <option value="">All Types</option>
              {Object.values(MessageType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Min Priority</label>
            <select
              value={filter.minPriority}
              onChange={(e) => setFilter({ ...filter, minPriority: e.target.value as any })}
              className="w-full px-2 py-1 bg-gray-700 rounded text-white"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Actions</label>
            <button
              onClick={sendTestMessage}
              className="w-full px-2 py-1 bg-green-600 rounded text-white hover:bg-green-700"
            >
              Send Test
            </button>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No messages found</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded cursor-pointer transition-colors ${
                selectedMessage?.id === msg.id
                  ? 'bg-blue-900'
                  : 'bg-gray-800 hover:bg-gray-750'
              } ${msg.priority === 'high' ? 'border-l-4 border-red-500' : ''}`}
              onClick={() => setSelectedMessage(msg)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getPriorityIcon(msg.priority)}</span>
                <span className="text-lg">{getStatusIcon(msg.status)}</span>
                <span className="text-gray-400 text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                <span className="font-bold text-blue-400">{msg.from.agentId}</span>
                <span className="text-gray-400">→</span>
                <span className="font-bold text-green-400">{msg.to.agentId}</span>
                <span className="text-purple-400">:</span>
                <span className="text-yellow-400">{msg.type}</span>
                {msg.correlationId && (
                  <span className="text-xs text-gray-500" title={msg.correlationId}>
                    🔗
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 truncate">{JSON.stringify(msg.payload)}</div>
            </div>
          ))
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Message Details</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Message ID</label>
                <div className="text-sm font-mono break-all">{selectedMessage.id}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">From</label>
                  <div className="text-sm">{selectedMessage.from.agentId}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">To</label>
                  <div className="text-sm">{selectedMessage.to.agentId}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400">Type</label>
                  <div className="text-sm text-yellow-400">{selectedMessage.type}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Priority</label>
                  <div className="text-sm">
                    {getPriorityIcon(selectedMessage.priority)} {selectedMessage.priority}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Status</label>
                  <div className="text-sm">
                    {getStatusIcon(selectedMessage.status)} {selectedMessage.status}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">Timestamp</label>
                <div className="text-sm">{new Date(selectedMessage.timestamp).toLocaleString()}</div>
              </div>

              {selectedMessage.correlationId && (
                <div>
                  <label className="text-xs text-gray-400">Correlation ID</label>
                  <div className="text-sm font-mono break-all">{selectedMessage.correlationId}</div>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400">Payload</label>
                <pre className="mt-1 p-3 bg-gray-900 rounded text-xs overflow-auto">
                  {JSON.stringify(selectedMessage.payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
