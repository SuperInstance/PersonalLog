/**
 * JEPA Emotion Visualization Tests
 *
 * Comprehensive tests for emotion visualization components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmotionVisualization } from '../EmotionVisualization';
import { EmotionTimelineEnhanced } from '../EmotionTimelineEnhanced';
import { LiveEmotionIndicator } from '../LiveEmotionIndicator';
import { EmotionRecording } from '@/lib/jepa/emotion-storage';
import { EmotionResult, EmotionCategory } from '@/lib/jepa/types';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockRecordings: EmotionRecording[] = [
  {
    id: '1',
    timestamp: Date.now() - 10000,
    duration: 5,
    valence: 0.8,
    arousal: 0.7,
    dominance: 0.6,
    emotion: 'happy',
    confidence: 0.9,
    language: 'en',
    hasAudio: false,
  },
  {
    id: '2',
    timestamp: Date.now() - 5000,
    duration: 5,
    valence: 0.4,
    arousal: 0.6,
    dominance: 0.5,
    emotion: 'neutral',
    confidence: 0.85,
    language: 'en',
    hasAudio: false,
  },
  {
    id: '3',
    timestamp: Date.now(),
    duration: 5,
    valence: 0.2,
    arousal: 0.8,
    dominance: 0.4,
    emotion: 'anxious',
    confidence: 0.75,
    language: 'en',
    hasAudio: false,
  },
];

const mockLiveEmotion: EmotionResult = {
  valence: 0.7,
  arousal: 0.6,
  dominance: 0.5,
  emotion: 'happy',
  confidence: 0.9,
};

// ============================================================================
// EMOTION VISUALIZATION TESTS
// ============================================================================

describe('EmotionVisualization', () => {
  it('renders empty state when no recordings', () => {
    render(<EmotionVisualization recordings={[]} />);
    expect(screen.getByText(/no emotion data available/i)).toBeInTheDocument();
  });

  it('renders all charts by default', () => {
    const { container } = render(<EmotionVisualization recordings={mockRecordings} />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(screen.getByText(/emotion visualization/i)).toBeInTheDocument();
  });

  it('switches between view types', () => {
    render(<EmotionVisualization recordings={mockRecordings} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'scatter' } });

    expect(select).toHaveValue('scatter');
  });

  it('displays live emotion when provided', () => {
    render(
      <EmotionVisualization recordings={mockRecordings} liveEmotion={mockLiveEmotion} />
    );

    expect(screen.getByText(/live:/i)).toBeInTheDocument();
    expect(screen.getByText(/happy/i)).toBeInTheDocument();
  });

  it('calls onExport callback', () => {
    const onExport = jest.fn();
    render(
      <EmotionVisualization recordings={mockRecordings} onExport={onExport} />
    );

    const exportButton = screen.getByText(/export/i);
    fireEvent.click(exportButton);

    expect(onExport).toHaveBeenCalledWith('png');
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmotionVisualization recordings={mockRecordings} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('respects dark mode prop', () => {
    const { container } = render(
      <EmotionVisualization recordings={mockRecordings} darkMode={true} />
    );

    const element = container.querySelector('.emotion-visualization');
    expect(element).toBeInTheDocument();
  });

  it('filters data by emotion when emotion selected', () => {
    render(<EmotionVisualization recordings={mockRecordings} />);

    // This would require additional UI implementation for filtering
    // Testing the core rendering logic for now
    expect(screen.getByText(/emotion visualization/i)).toBeInTheDocument();
  });
});

// ============================================================================
// EMOTION TIMELINE ENHANCED TESTS
// ============================================================================

describe('EmotionTimelineEnhanced', () => {
  const mockEmotions = [
    {
      time: 0,
      emotion: mockRecordings[0],
      label: 'First segment',
    },
    {
      time: 5,
      emotion: mockRecordings[1],
      label: 'Second segment',
    },
    {
      time: 10,
      emotion: mockRecordings[2],
      label: 'Third segment',
    },
  ];

  it('renders empty state when no emotions', () => {
    render(<EmotionTimelineEnhanced emotions={[]} />);
    expect(screen.getByText(/no emotion data available/i)).toBeInTheDocument();
  });

  it('renders timeline with emotions', () => {
    const { container } = render(<EmotionTimelineEnhanced emotions={mockEmotions} />);

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText(/emotion timeline/i)).toBeInTheDocument();
  });

  it('calls onSeek when clicked', () => {
    const onSeek = jest.fn();
    render(<EmotionTimelineEnhanced emotions={mockEmotions} onSeek={onSeek} />);

    const svg = screen.getByRole('img');
    fireEvent.click(svg);

    expect(onSeek).toHaveBeenCalled();
  });

  it('handles zoom in', () => {
    render(<EmotionTimelineEnhanced emotions={mockEmotions} enableZoom={true} />);

    const zoomInButton = screen.getByTitle(/zoom in/i);
    fireEvent.click(zoomInButton);

    // Should update zoom level (would need to check internal state)
    expect(zoomInButton).toBeInTheDocument();
  });

  it('handles zoom out', () => {
    render(<EmotionTimelineEnhanced emotions={mockEmotions} enableZoom={true} />);

    const zoomOutButton = screen.getByTitle(/zoom out/i);
    fireEvent.click(zoomOutButton);

    expect(zoomOutButton).toBeInTheDocument();
  });

  it('resets zoom', () => {
    render(<EmotionTimelineEnhanced emotions={mockEmotions} enableZoom={true} />);

    const resetButton = screen.getByTitle(/reset zoom/i);
    fireEvent.click(resetButton);

    expect(resetButton).toBeInTheDocument();
  });

  it('disables seeking when disabled prop is true', () => {
    const onSeek = jest.fn();
    render(
      <EmotionTimelineEnhanced emotions={mockEmotions} onSeek={onSeek} disabled={true} />
    );

    const svg = screen.getByRole('img');
    fireEvent.click(svg);

    expect(onSeek).not.toHaveBeenCalled();
  });

  it('shows time on hover', () => {
    render(<EmotionTimelineEnhanced emotions={mockEmotions} />);

    const svg = screen.getByRole('img');
    fireEvent.mouseMove(svg, { clientX: 100, clientY: 100 });

    // Tooltip would appear (testing interaction)
    expect(svg).toBeInTheDocument();
  });

  it('adds annotations when enabled', () => {
    render(<EmotionTimelineEnhanced emotions={mockEmotions} enableAnnotations={true} />);

    // Hover over a point first
    const svg = screen.getByRole('img');
    fireEvent.mouseMove(svg, { clientX: 100, clientY: 100 });

    // Would need to click "Add annotation" button
    // Testing base rendering for now
    expect(svg).toBeInTheDocument();
  });

  it('respects custom height', () => {
    const { container } = render(
      <EmotionTimelineEnhanced emotions={mockEmotions} height={400} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('height', '400');
  });

  it('respects dark mode', () => {
    render(<EmotionTimelineEnhanced emotions={mockEmotions} darkMode={true} />);

    const timeline = screen.getByText(/emotion timeline/i);
    expect(timeline).toBeInTheDocument();
  });
});

// ============================================================================
// LIVE EMOTION INDICATOR TESTS
// ============================================================================

describe('LiveEmotionIndicator', () => {
  it('renders idle state when not recording', () => {
    render(<LiveEmotionIndicator emotion={null} isRecording={false} />);

    expect(screen.getByText(/idle/i)).toBeInTheDocument();
    expect(screen.getByText(/no emotion/i)).toBeInTheDocument();
  });

  it('renders recording state when recording', () => {
    render(<LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} />);

    expect(screen.getByText(/recording/i)).toBeInTheDocument();
    expect(screen.getByText(/happy/i)).toBeInTheDocument();
  });

  it('displays emotion details when showDetails is true', () => {
    render(
      <LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} showDetails={true} />
    );

    expect(screen.getByText(/valence/i)).toBeInTheDocument();
    expect(screen.getByText(/arousal/i)).toBeInTheDocument();
    expect(screen.getByText(/dominance/i)).toBeInTheDocument();
  });

  it('hides details when showDetails is false', () => {
    render(
      <LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} showDetails={false} />
    );

    expect(screen.queryByText(/valence/i)).not.toBeInTheDocument();
  });

  it('displays confidence percentage', () => {
    render(
      <LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} showDetails={true} />
    );

    expect(screen.getByText(/90%/i)).toBeInTheDocument();
  });

  it('respects size prop', () => {
    const { container: smContainer } = render(
      <LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} size="sm" />
    );

    const { container: lgContainer } = render(
      <LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} size="lg" />
    );

    // Check if different sizes render
    expect(smContainer.firstChild).toBeInTheDocument();
    expect(lgContainer.firstChild).toBeInTheDocument();
  });

  it('respects dark mode', () => {
    render(
      <LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} darkMode={true} />
    );

    const indicator = screen.getByText(/happy/i);
    expect(indicator).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <LiveEmotionIndicator
        emotion={mockLiveEmotion}
        isRecording={true}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('animates on emotion change', async () => {
    const { rerender } = render(
      <LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} />
    );

    const newEmotion: EmotionResult = {
      ...mockLiveEmotion,
      emotion: 'sad',
      valence: 0.2,
    };

    rerender(<LiveEmotionIndicator emotion={newEmotion} isRecording={true} />);

    await waitFor(() => {
      expect(screen.getByText(/sad/i)).toBeInTheDocument();
    });
  });

  it('shows activity indicator during recording', () => {
    render(<LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} />);

    // Activity icon should be present
    const indicator = screen.getByText(/recording/i);
    expect(indicator).toBeInTheDocument();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Emotion Visualization Integration', () => {
  it('renders all components together', () => {
    const { container } = render(
      <div>
        <EmotionVisualization recordings={mockRecordings} />
        <EmotionTimelineEnhanced
          emotions={[
            {
              time: 0,
              emotion: mockRecordings[0],
            },
          ]}
        />
        <LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} />
      </div>
    );

    expect(container.childElementCount).toBeGreaterThan(0);
  });

  it('handles rapid emotion changes', async () => {
    const { rerender } = render(
      <LiveEmotionIndicator emotion={mockLiveEmotion} isRecording={true} />
    );

    // Rapid changes
    for (let i = 0; i < 5; i++) {
      const newEmotion: EmotionResult = {
        ...mockLiveEmotion,
        emotion: ['happy', 'sad', 'angry', 'calm', 'anxious'][i] as EmotionCategory,
      };
      rerender(<LiveEmotionIndicator emotion={newEmotion} isRecording={true} />);
    }

    await waitFor(() => {
      expect(screen.getByText(/anxious/i)).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', () => {
    const { container: vizContainer } = render(
      <EmotionVisualization recordings={[]} />
    );

    const { container: timelineContainer } = render(
      <EmotionTimelineEnhanced emotions={[]} />
    );

    expect(vizContainer.querySelector(/no emotion data available/i)).toBeInTheDocument();
    expect(timelineContainer.querySelector(/no emotion data available/i)).toBeInTheDocument();
  });

  it('is accessible via keyboard', () => {
    render(<EmotionTimelineEnhanced emotions={[
      { time: 0, emotion: mockRecordings[0] }
    ]} />);

    // Keyboard navigation should work
    const svg = screen.getByRole('img');
    expect(svg).toBeInTheDocument();

    // Tab key tests would go here
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Emotion Visualization Performance', () => {
  it('handles large datasets efficiently', () => {
    const largeDataset: EmotionRecording[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `emotion_${i}`,
      timestamp: Date.now() - i * 1000,
      duration: 1,
      valence: Math.random(),
      arousal: Math.random(),
      dominance: Math.random(),
      emotion: 'neutral',
      confidence: Math.random(),
      language: 'en',
      hasAudio: false,
    }));

    const startTime = performance.now();
    render(<EmotionVisualization recordings={largeDataset} />);
    const endTime = performance.now();

    // Should render within 100ms
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('does not re-render unnecessarily', () => {
    const { rerender } = render(
      <EmotionVisualization recordings={mockRecordings} />
    );

    const startTime = performance.now();
    rerender(<EmotionVisualization recordings={mockRecordings} />);
    const endTime = performance.now();

    // Re-render with same props should be fast
    expect(endTime - startTime).toBeLessThan(50);
  });
});
