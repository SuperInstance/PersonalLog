# Emotion Visualization Dashboard - Integration Guide

## Quick Start

### 1. Basic Dashboard Setup

```tsx
// app/jepa/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { EmotionVisualization } from '@/components/jepa/EmotionVisualization';
import { getEmotionsByDateRange } from '@/lib/jepa/emotion-storage';

export default function EmotionAnalyticsPage() {
  const [recordings, setRecordings] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadEmotions();
  }, []);

  async function loadEmotions() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last week
    const data = await getEmotionsByDateRange(startDate, endDate);
    setRecordings(data);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Emotion Analytics</h1>

        <EmotionVisualization
          recordings={recordings}
          darkMode={darkMode}
          animated={true}
          chartHeight={300}
          onExport={handleExport}
          className="mt-6"
        />
      </div>
    </div>
  );
}
```

### 2. Live Recording with Real-Time Visualization

```tsx
// app/jepa/live/page.tsx
'use client';

import { useState } from 'react';
import { LiveEmotionIndicator } from '@/components/jepa/LiveEmotionIndicator';
import { EmotionTimelineEnhanced } from '@/components/jepa/EmotionTimelineEnhanced';
import { Button } from '@/components/ui/Button';
import { Mic, MicOff } from 'lucide-react';

export default function LiveRecordingPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [emotionTimeline, setEmotionTimeline] = useState([]);

  const handleStartRecording = async () => {
    setIsRecording(true);
    // Start audio capture and emotion analysis
    // Update currentEmotion state as emotions are detected
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setCurrentEmotion(null);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Live Indicator */}
      <div className="p-6 border-b">
        <LiveEmotionIndicator
          emotion={currentEmotion}
          isRecording={isRecording}
          showDetails={true}
          size="lg"
          darkMode={true}
        />
      </div>

      {/* Controls */}
      <div className="p-6 flex justify-center gap-4">
        <Button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          variant={isRecording ? 'destructive' : 'default'}
          size="lg"
        >
          {isRecording ? <MicOff /> : <Mic />}
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
      </div>

      {/* Timeline */}
      <div className="flex-1 p-6 overflow-auto">
        <EmotionTimelineEnhanced
          emotions={emotionTimeline}
          onSeek={(time) => console.log('Seek to', time)}
          enableZoom={true}
          enableAnnotations={true}
          height={400}
          darkMode={true}
        />
      </div>
    </div>
  );
}
```

### 3. Complete Dashboard with All Views

```tsx
// app/jepa/dashboard/page.tsx
'use client';

import { useState } from 'react';
import {
  EmotionVisualization,
  EmotionTimelineEnhanced,
  LiveEmotionIndicator,
} from '@/components/jepa';
import { Tabs, TabsList, Tab, TabsPanel } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';

export default function EmotionDashboard() {
  const [recordings, setRecordings] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [liveEmotion, setLiveEmotion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeView, setActiveView] = useState('overview');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Emotion Intelligence Dashboard</h1>

          {/* Live Status */}
          <LiveEmotionIndicator
            emotion={liveEmotion}
            isRecording={isRecording}
            showDetails={false}
            size="sm"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList className="mb-6">
            <Tab value="overview">Overview</Tab>
            <Tab value="timeline">Timeline</Tab>
            <Tab value="patterns">Patterns</Tab>
          </TabsList>

          {/* Overview Tab */}
          <TabsPanel value="overview">
            <EmotionVisualization
              recordings={recordings}
              darkMode={true}
              animated={true}
            />
          </TabsPanel>

          {/* Timeline Tab */}
          <TabsPanel value="timeline">
            <Card>
              <EmotionTimelineEnhanced
                emotions={timeline}
                enableZoom={true}
                enableAnnotations={true}
                height={500}
                darkMode={true}
              />
            </Card>
          </TabsPanel>

          {/* Patterns Tab */}
          <TabsPanel value="patterns">
            <EmotionVisualization
              recordings={recordings}
              selectedType="radar"
              darkMode={true}
            />
          </TabsPanel>
        </Tabs>
      </main>
    </div>
  );
}
```

## Advanced Usage

### Custom Color Schemes

```tsx
import {
  EMOTION_COLORS,
  getEmotionColor,
} from '@/lib/jepa/emotion-chart-utils';

// Override default colors
const customColors = {
  ...EMOTION_COLORS,
  happy: '#FFD700',    // Gold instead of green
  excited: '#FF6B6B',  // Coral instead of orange
};

// Use custom colors in your components
```

### Data Aggregation

```tsx
import {
  groupEmotionsByPeriod,
  calculateEmotionDistribution,
} from '@/lib/jepa/emotion-chart-utils';

// Group by hour for daily patterns
const hourlyData = groupEmotionsByPeriod(recordings, 'hour');

// Group by day for weekly patterns
const dailyData = groupEmotionsByPeriod(recordings, 'day');

// Get emotion distribution
const distribution = calculateEmotionDistribution(recordings);
```

### Export Functionality

```tsx
import {
  downloadEmotions,
  exportEmotionsCSV,
  exportEmotionsJSON,
} from '@/lib/jepa/emotion-storage';

// Export as CSV
async function handleExportCSV() {
  await downloadEmotions(recordings, 'csv');
}

// Export as JSON
async function handleExportJSON() {
  await downloadEmotions(recordings, 'json');
}

// Custom export
const csv = await exportEmotionsCSV(recordings);
const json = await exportEmotionsJSON(recordings);
```

## Performance Tips

### 1. Lazy Load Historical Data

```tsx
const [displayCount, setDisplayCount] = useState(100);
const displayedRecordings = recordings.slice(0, displayCount);

// Load more on scroll
useEffect(() => {
  const handleScroll = () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      setDisplayCount(prev => prev + 100);
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

### 2. Memoize Expensive Computations

```tsx
import { useMemo } from 'react';

const chartData = useMemo(() => {
  return recordingsToChartData(recordings);
}, [recordings]);

const radarData = useMemo(() => {
  return calculateEmotionDistribution(recordings);
}, [recordings]);
```

### 3. Virtualize Large Lists

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: recordings.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

## Styling Customization

### Tailwind Integration

```tsx
<EmotionVisualization
  recordings={recordings}
  className="shadow-xl rounded-2xl"
  chartHeight={400}
/>

<EmotionTimelineEnhanced
  emotions={timeline}
  className="border-2 border-purple-500"
  height={300}
/>

<LiveEmotionIndicator
  emotion={currentEmotion}
  isRecording={true}
  className="bg-gradient-to-r from-purple-500 to-pink-500"
/>
```

### Custom CSS

```css
/* Custom emotion timeline styles */
.emotion-timeline-enhanced .emotion-region {
  transition: all 0.3s ease;
}

.emotion-timeline-enhanced:hover .emotion-region {
  filter: brightness(1.1);
}

/* Custom live indicator pulse */
@keyframes custom-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

.live-emotion-indicator .pulse-ring {
  animation: custom-pulse 1s ease-in-out infinite;
}
```

## Error Handling

```tsx
import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function EmotionDashboard() {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
          Error loading emotion data
        </h2>
        <p className="text-sm text-red-700 dark:text-red-300 mt-2">
          {error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <EmotionVisualization recordings={recordings} />
    </ErrorBoundary>
  );
}
```

## Testing Examples

```tsx
import { render, screen } from '@testing-library/react';
import { EmotionVisualization } from '@/components/jepa/EmotionVisualization';

describe('EmotionDashboard', () => {
  it('renders visualization with data', () => {
    const mockRecordings = [
      {
        id: '1',
        timestamp: Date.now(),
        valence: 0.8,
        arousal: 0.7,
        dominance: 0.6,
        emotion: 'happy',
        confidence: 0.9,
      },
    ];

    render(
      <EmotionVisualization
        recordings={mockRecordings}
        darkMode={false}
      />
    );

    expect(screen.getByText(/emotion visualization/i)).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<EmotionVisualization recordings={[]} />);

    expect(screen.getByText(/no emotion data available/i)).toBeInTheDocument();
  });
});
```

## Accessibility Features

### Keyboard Navigation

```tsx
<EmotionVisualization
  recordings={recordings}
  onKeyDown={(e) => {
    // Handle keyboard shortcuts
    switch (e.key) {
      case 'ArrowLeft':
        // Navigate to previous emotion
        break;
      case 'ArrowRight':
        // Navigate to next emotion
        break;
      case 'Enter':
        // Select emotion
        break;
    }
  }}
/>
```

### Screen Reader Support

```tsx
<EmotionVisualization
  recordings={recordings}
  aria-label="Emotion visualization dashboard"
  role="region"
>
  {/* Screen reader announcements */}
  <div aria-live="polite" aria-atomic="true">
    Showing {recordings.length} emotion recordings
  </div>
</EmotionVisualization>
```

## Integration with Existing JEPA Components

```tsx
import { AudioCapture } from '@/lib/jepa/audio-capture';
import { EmotionInferencePipeline } from '@/lib/jepa/emotion-inference';
import { LiveEmotionIndicator } from '@/components/jepa/LiveEmotionIndicator';

function JEPARecordingIntegration() {
  const [emotion, setEmotion] = useState(null);

  useEffect(() => {
    const pipeline = new EmotionInferencePipeline();
    const audioCapture = getAudioCapture();

    // Analyze emotion in real-time
    audioCapture.onAudioData(async (audioBuffer) => {
      const result = await pipeline.analyzeEmotion(audioBuffer);
      setEmotion(result);
    });

    return () => {
      pipeline.dispose();
    };
  }, []);

  return <LiveEmotionIndicator emotion={emotion} isRecording={true} />;
}
```

## Next Steps

1. **Add to JEPA Page**: Integrate into `/app/jepa/page.tsx`
2. **Create Analytics Route**: Build `/app/jepa/analytics/page.tsx`
3. **Add Export Options**: Implement CSV/JSON export buttons
4. **Customize Colors**: Adjust for brand guidelines
5. **Add Filters**: By date range, emotion type, confidence level
6. **Implement Search**: Find specific emotion patterns
7. **Add Social Sharing**: Share emotion insights
8. **Build Reports**: PDF generation for emotion summaries

## Support

For issues or questions:
- Check `/src/lib/jepa/emotion-chart-utils.ts` for utility functions
- Review component JSDoc comments for prop documentation
- See test files in `/src/components/jepa/__tests__/`
- Refer to main summary in `.agents/round-21/agent-3-summary.md`
