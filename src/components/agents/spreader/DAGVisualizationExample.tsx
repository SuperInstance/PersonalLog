/**
 * DAG Visualization Example
 *
 * Demo component showing how to use the DAG visualization with simulated execution.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { DAGVisualizationDashboard } from './DAGVisualization'
import { DAGNode, DAGExecutionState, createDAGNode } from '@/lib/agents/spreader/dag'

export function DAGVisualizationExample() {
  const [nodes, setNodes] = useState<DAGNode[]>([])
  const [executionState, setExecutionState] = useState<Map<string, DAGExecutionState>>(new Map())
  const [isExecuting, setIsExecuting] = useState(false)

  // Create sample DAG
  useEffect(() => {
    const sampleNodes: DAGNode[] = [
      createDAGNode('task1', 'Design Database Schema', [], {
        estimatedDuration: 5,
        priority: 'high'
      }),
      createDAGNode('task2', 'Design API Architecture', [], {
        estimatedDuration: 8,
        priority: 'high'
      }),
      createDAGNode('task3', 'Implement Database', ['task1'], {
        estimatedDuration: 15,
        priority: 'high'
      }),
      createDAGNode('task4', 'Implement API', ['task2'], {
        estimatedDuration: 20,
        priority: 'high'
      }),
      createDAGNode('task5', 'Create Frontend Components', ['task2'], {
        estimatedDuration: 12,
        priority: 'normal'
      }),
      createDAGNode('task6', 'Integration Testing', ['task3', 'task4', 'task5'], {
        estimatedDuration: 10,
        priority: 'normal'
      }),
      createDAGNode('task7', 'Documentation', ['task6'], {
        estimatedDuration: 5,
        priority: 'low'
      }),
      createDAGNode('task8', 'Deployment', ['task6'], {
        estimatedDuration: 3,
        priority: 'high'
      })
    ]

    setNodes(sampleNodes)

    // Initialize execution state
    const initialState = new Map<string, DAGExecutionState>()
    sampleNodes.forEach(node => {
      initialState.set(node.id, {
        status: 'pending',
        retries: 0
      })
    })
    setExecutionState(initialState)
  }, [])

  // Simulate DAG execution
  const startExecution = () => {
    setIsExecuting(true)

    // Define execution order (rounds)
    const executionRounds = [
      ['task1', 'task2'], // Round 1: Start independent tasks
      ['task3', 'task4', 'task5'], // Round 2: Tasks that depend on round 1
      ['task6'], // Round 3: Integration testing
      ['task7', 'task8'] // Round 4: Documentation and deployment
    ]

    let roundIndex = 0
    let taskIndex = 0

    const executeNextTask = () => {
      if (roundIndex >= executionRounds.length) {
        setIsExecuting(false)
        return
      }

      const currentRound = executionRounds[roundIndex]

      if (taskIndex >= currentRound.length) {
        // Move to next round
        roundIndex++
        taskIndex = 0

        if (roundIndex >= executionRounds.length) {
          setIsExecuting(false)
          return
        }

        // Start next round after a delay
        setTimeout(executeNextTask, 500)
        return
      }

      const taskId = currentRound[taskIndex]

      // Mark task as running
      setExecutionState(prev => {
        const next = new Map(prev)
        const currentState = next.get(taskId)
        if (currentState) {
          next.set(taskId, {
            ...currentState,
            status: 'running',
            startTime: Date.now()
          })
        }
        return next
      })

      // Simulate task completion
      const duration = nodes.find(n => n.id === taskId)?.estimatedDuration || 3
      setTimeout(() => {
        setExecutionState(prev => {
          const next = new Map(prev)
          const currentState = next.get(taskId)
          if (currentState) {
            next.set(taskId, {
              ...currentState,
              status: 'complete',
              endTime: Date.now(),
              result: { summary: `Task ${taskId} completed successfully` }
            })
          }
          return next
        })

        // Execute next task
        taskIndex++
        setTimeout(executeNextTask, 300)
      }, duration * 1000)
    }

    executeNextTask()
  }

  const resetExecution = () => {
    const resetState = new Map<string, DAGExecutionState>()
    nodes.forEach(node => {
      resetState.set(node.id, {
        status: 'pending',
        retries: 0
      })
    })
    setExecutionState(resetState)
    setIsExecuting(false)
  }

  const simulateFailure = () => {
    // Randomly fail a running task
    const runningTasks = Array.from(executionState.entries())
      .filter(([_, state]) => state.status === 'running')

    if (runningTasks.length > 0) {
      const [taskId, _] = runningTasks[Math.floor(Math.random() * runningTasks.length)]

      setExecutionState(prev => {
        const next = new Map(prev)
        const currentState = next.get(taskId)
        if (currentState) {
          next.set(taskId, {
            ...currentState,
            status: 'failed',
            endTime: Date.now(),
            error: new Error('Simulated failure for demonstration')
          })
        }
        return next
      })
    }
  }

  // Calculate statistics
  const stats = {
    total: nodes.length,
    pending: Array.from(executionState.values()).filter(s => s.status === 'pending').length,
    running: Array.from(executionState.values()).filter(s => s.status === 'running').length,
    complete: Array.from(executionState.values()).filter(s => s.status === 'complete').length,
    failed: Array.from(executionState.values()).filter(s => s.status === 'failed').length
  }

  const percentage = stats.total > 0
    ? Math.round(((stats.complete + stats.failed) / stats.total) * 100)
    : 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            DAG Visualization Demo
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time task dependency visualization with execution tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startExecution}
            disabled={isExecuting || stats.complete + stats.failed === stats.total}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {isExecuting ? 'Executing...' : 'Start Execution'}
          </button>
          <button
            onClick={simulateFailure}
            disabled={!isExecuting || stats.running === 0}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Simulate Failure
          </button>
          <button
            onClick={resetExecution}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>Progress: {percentage}%</span>
        <span>
          {stats.complete}/{stats.total} tasks completed
        </span>
      </div>

      {/* DAG Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: '600px' }}>
        <DAGVisualizationDashboard
          nodes={nodes}
          executionState={executionState}
          onNodeClick={(nodeId) => {
            console.log('Clicked node:', nodeId)
          }}
        />
      </div>

      {/* Task list */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Task List
        </h3>
        <div className="space-y-2">
          {nodes.map(node => {
            const state = executionState.get(node.id)
            const statusColors: Record<string, string> = {
              pending: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
              running: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
              complete: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
              failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }

            const statusColor = statusColors[state?.status || 'pending'] || statusColors.pending

            return (
              <div
                key={node.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className={cn('px-2 py-1 rounded text-xs font-medium capitalize', statusColor)}>
                    {state?.status || 'pending'}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {node.task}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {node.dependencies.length > 0
                        ? `Depends on: ${node.dependencies.join(', ')}`
                        : 'No dependencies'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {node.estimatedDuration}s · {node.priority} priority
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
