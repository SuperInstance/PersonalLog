/**
 * Merge Conflict Resolution UI
 *
 * Provides an interface for users to review and resolve merge conflicts
 * when child conversation results are merged into the parent.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MergeConflict, ConflictResolution } from '@/lib/agents/spread/merge-types';

interface MergeConflictResolverProps {
  conflicts: MergeConflict[];
  onResolve: (resolutions: ConflictResolution[] | null) => void;
  parentSchema?: any;
  childSchema?: any;
}

interface ResolvedPreview {
  schema: any;
  resolutions: ConflictResolution[];
}

export function MergeConflictResolver({
  conflicts,
  onResolve,
  parentSchema,
  childSchema,
}: MergeConflictResolverProps) {
  const [selectedResolutions, setSelectedResolutions] = useState<
    Map<string, string>
  >(new Map());
  const [customValues, setCustomValues] = useState<Map<string, any>>(new Map());
  const [preview, setPreview] = useState<ResolvedPreview | null>(null);
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(
    new Set()
  );

  // Update preview when resolutions change
  useEffect(() => {
    if (selectedResolutions.size > 0) {
      const newPreview = applyResolutions(conflicts, selectedResolutions, customValues);
      setPreview(newPreview);
    } else {
      setPreview(null);
    }
  }, [selectedResolutions, customValues, conflicts]);

  const handleResolutionChange = (
    conflictId: string,
    resolution: string
  ) => {
    const newResolutions = new Map(selectedResolutions);
    newResolutions.set(conflictId, resolution);
    setSelectedResolutions(newResolutions);
  };

  const handleCustomValueChange = (conflictId: string, value: any) => {
    const newCustomValues = new Map(customValues);
    newCustomValues.set(conflictId, value);
    setCustomValues(newCustomValues);
  };

  const toggleExpand = (conflictId: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedConflicts(newExpanded);
  };

  const handleApply = () => {
    if (!preview) return;

    const resolutions: ConflictResolution[] = [];
    for (const [conflictId, resolution] of selectedResolutions.entries()) {
      resolutions.push({
        conflictId,
        resolution,
        customValue: customValues.get(conflictId),
      });
    }

    onResolve(resolutions);
  };

  const handleCancel = () => {
    onResolve(null);
  };

  const handleAutoResolve = () => {
    // Apply auto-resolve suggestions
    const newResolutions = new Map<string, string>();
    for (const conflict of conflicts) {
      // Use first suggestion as default
      if (conflict.suggestions && conflict.suggestions.length > 0) {
        newResolutions.set(conflict.id, conflict.options[0]);
      }
    }
    setSelectedResolutions(newResolutions);
  };

  const groupedConflicts = groupConflictsBySeverity(conflicts);

  return (
    <div className="merge-conflict-resolver">
      <div className="resolver-header">
        <h3>Resolve Merge Conflicts</h3>
        <div className="conflict-summary">
          <span className="count critical">
            {groupedConflicts.critical.length} Critical
          </span>
          <span className="count warning">
            {groupedConflicts.warning.length} Warning
          </span>
          <span className="count info">
            {groupedConflicts.info.length} Info
          </span>
        </div>
      </div>

      <div className="conflicts-list">
        {conflicts.map((conflict) => (
          <ConflictCard
            key={conflict.id}
            conflict={conflict}
            selectedResolution={selectedResolutions.get(conflict.id)}
            customValue={customValues.get(conflict.id)}
            expanded={expandedConflicts.has(conflict.id)}
            onResolutionChange={(resolution) =>
              handleResolutionChange(conflict.id, resolution)
            }
            onCustomValueChange={(value) =>
              handleCustomValueChange(conflict.id, value)
            }
            onToggleExpand={() => toggleExpand(conflict.id)}
          />
        ))}
      </div>

      {preview && (
        <div className="preview-section">
          <h4>Preview</h4>
          <pre className="preview-code">
            {JSON.stringify(preview.schema, null, 2)}
          </pre>
        </div>
      )}

      <div className="resolver-actions">
        <button
          onClick={handleApply}
          disabled={!preview || selectedResolutions.size === 0}
          className="btn-apply"
        >
          Apply Resolutions ({selectedResolutions.size}/{conflicts.length})
        </button>
        <button
          onClick={handleAutoResolve}
          className="btn-auto"
          disabled={conflicts.length === 0}
        >
          Auto-Resolve
        </button>
        <button onClick={handleCancel} className="btn-cancel">
          Cancel Merge
        </button>
      </div>
    </div>
  );
}

interface ConflictCardProps {
  conflict: MergeConflict;
  selectedResolution?: string;
  customValue?: any;
  expanded: boolean;
  onResolutionChange: (resolution: string) => void;
  onCustomValueChange: (value: any) => void;
  onToggleExpand: () => void;
}

function ConflictCard({
  conflict,
  selectedResolution,
  customValue,
  expanded,
  onResolutionChange,
  onCustomValueChange,
  onToggleExpand,
}: ConflictCardProps) {
  return (
    <div
      className={`conflict-card ${conflict.severity} ${expanded ? 'expanded' : ''}`}
    >
      <div className="conflict-header" onClick={onToggleExpand}>
        <div className="conflict-info">
          <span className={`conflict-type ${conflict.type}`}>
            {conflict.type}
          </span>
          <span className="conflict-location">{conflict.location}</span>
        </div>
        <div className="conflict-meta">
          <span className={`severity-badge ${conflict.severity}`}>
            {conflict.severity}
          </span>
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {expanded && (
        <div className="conflict-body">
          <p className="conflict-description">{conflict.description}</p>

          {(conflict.parentValue !== undefined ||
            conflict.childValue !== undefined) && (
            <div className="values-comparison">
              {conflict.parentValue !== undefined && (
                <div className="value-box parent">
                  <strong>Parent:</strong>
                  <code>{JSON.stringify(conflict.parentValue)}</code>
                </div>
              )}
              {conflict.childValue !== undefined && (
                <div className="value-box child">
                  <strong>Child:</strong>
                  <code>{JSON.stringify(conflict.childValue)}</code>
                </div>
              )}
            </div>
          )}

          <div className="resolution-options">
            <label className="option-label">Resolve by:</label>
            <div className="options-list">
              {conflict.options.map((option) => (
                <label key={option} className="option-radio">
                  <input
                    type="radio"
                    name={conflict.id}
                    value={option}
                    checked={selectedResolution === option}
                    onChange={(e) => onResolutionChange(e.target.value)}
                  />
                  <span className="option-text">{formatOption(option)}</span>
                </label>
              ))}
            </div>
          </div>

          {conflict.suggestions && conflict.suggestions.length > 0 && (
            <div className="suggestions">
              <strong>Suggestions:</strong>
              <ul>
                {conflict.suggestions.map((suggestion, i) => (
                  <li
                    key={i}
                    className="suggestion-item"
                    onClick={() => onResolutionChange(conflict.options[i])}
                  >
                    <span className="suggestion-bullet">→</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedResolution === 'ask-user' && (
            <div className="custom-value-input">
              <label>Custom Value:</label>
              <textarea
                value={customValue || ''}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    onCustomValueChange(parsed);
                  } catch {
                    onCustomValueChange(e.target.value);
                  }
                }}
                placeholder="Enter custom value (JSON or text)"
                rows={3}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions

function groupConflictsBySeverity(conflicts: MergeConflict[]) {
  return {
    critical: conflicts.filter((c) => c.severity === 'critical'),
    warning: conflicts.filter((c) => c.severity === 'warning'),
    info: conflicts.filter((c) => c.severity === 'info'),
  };
}

function formatOption(option: string): string {
  return option
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function applyResolutions(
  conflicts: MergeConflict[],
  resolutions: Map<string, string>,
  customValues: Map<string, any>
): ResolvedPreview {
  const schema: any = {
    COMPLETED: [],
    NEXT: [],
    DECISIONS: {},
    TECHNICAL_SPECS: {},
  };

  // Apply resolutions
  for (const conflict of conflicts) {
    const resolution = resolutions.get(conflict.id);
    if (!resolution) continue;

    switch (resolution) {
      case 'keep-child':
        if (conflict.childValue !== undefined) {
          applyValueToSchema(schema, conflict.location, conflict.childValue);
        }
        break;

      case 'merge-both':
        const merged = {
          _merged: true,
          parent: conflict.parentValue,
          child: conflict.childValue,
        };
        applyValueToSchema(schema, conflict.location, merged);
        break;

      case 'ask-user':
        const custom = customValues.get(conflict.id);
        if (custom !== undefined) {
          applyValueToSchema(schema, conflict.location, custom);
        }
        break;

      // 'keep-parent' and others: no action needed
    }
  }

  const resolutionList: ConflictResolution[] = [];
  for (const [conflictId, resolution] of resolutions.entries()) {
    resolutionList.push({
      conflictId,
      resolution,
      customValue: customValues.get(conflictId),
    });
  }

  return { schema, resolutions: resolutionList };
}

function applyValueToSchema(schema: any, location: string, value: any) {
  const path = location.split('.');
  let current = schema;

  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) {
      current[path[i]] = {};
    }
    current = current[path[i]];
  }

  current[path[path.length - 1]] = value;
}
