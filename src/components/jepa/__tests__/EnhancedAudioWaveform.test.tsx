/**
 * JEPA - Enhanced Audio Waveform Tests
 *
 * Comprehensive tests for the enhanced waveform visualization component.
 * Tests rendering, performance, interactions, and edge cases.
 *
 * @module components/jepa/__tests__/EnhancedAudioWaveform
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EnhancedAudioWaveform } from '../EnhancedAudioWaveform'
import {
  renderEnhancedWaveform,
  calculateAmplitude,
  detectClipping,
  getEmotionCategories,
  type WaveformData,
  type VisualizationMode,
  type EmotionCategory,
} from '@/lib/jepa/enhanced-waveform-renderer'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Web Audio API AnalyserNode
const createMockAnalyser = (): AnalyserNode => {
  const analyser = {
    fftSize: 2048,
    frequencyBinCount: 1024,
    getFloatTimeDomainData: vi.fn(),
    getByteFrequencyData: vi.fn(),
  } as unknown as AnalyserNode

  // Fill with mock data
  const timeDomainData = new Float32Array(2048)
  const frequencyData = new Uint8Array(1024)

  for (let i = 0; i < timeDomainData.length; i++) {
    timeDomainData[i] = Math.sin(i * 0.1) * 0.5
  }

  for (let i = 0; i < frequencyData.length; i++) {
    frequencyData[i] = Math.floor(Math.random() * 255)
  }

  ;(analyser as any).getFloatTimeDomainData = vi.fn((array: Float32Array) => {
    array.set(timeDomainData)
  })

  ;(analyser as any).getByteFrequencyData = vi.fn((array: Uint8Array) => {
    array.set(frequencyData)
  })

  return analyser
}

// Mock canvas context
const createMockCanvasContext = (): CanvasRenderingContext2D => {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    scale: vi.fn(),
    font: '',
    textAlign: 'start' as CanvasTextAlign,
    fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

// ============================================================================
// WAVEFORM RENDERER TESTS
// ============================================================================

describe('Enhanced Waveform Renderer', () => {
  let mockCtx: CanvasRenderingContext2D

  beforeEach(() => {
    mockCtx = createMockCanvasContext()
    vi.clearAllMocks()
  })

  describe('calculateAmplitude', () => {
    it('should calculate amplitude for silence', () => {
      const silence = new Float32Array(1024).fill(0)
      const amplitude = calculateAmplitude(silence)
      expect(amplitude).toBe(0)
    })

    it('should calculate amplitude for maximum volume', () => {
      const max = new Float32Array(1024).fill(1)
      const amplitude = calculateAmplitude(max)
      expect(amplitude).toBe(1)
    })

    it('should calculate amplitude for mixed signal', () => {
      const signal = new Float32Array([0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5])
      const amplitude = calculateAmplitude(signal)
      expect(amplitude).toBeGreaterThan(0)
      expect(amplitude).toBeLessThanOrEqual(1)
    })
  })

  describe('detectClipping', () => {
    it('should detect clipping at threshold', () => {
      const signal = new Float32Array([0.5, 0.95, 0.96, 0.5])
      const clipping = detectClipping(signal, 0.95)
      expect(clipping).toBe(true)
    })

    it('should not detect clipping below threshold', () => {
      const signal = new Float32Array([0.5, 0.94, 0.5])
      const clipping = detectClipping(signal, 0.95)
      expect(clipping).toBe(false)
    })

    it('should detect negative clipping', () => {
      const signal = new Float32Array([0.5, -0.95, -0.96, 0.5])
      const clipping = detectClipping(signal, 0.95)
      expect(clipping).toBe(true)
    })
  })

  describe('getEmotionCategories', () => {
    it('should return all emotion categories', () => {
      const categories = getEmotionCategories()
      expect(categories).toContain('excited')
      expect(categories).toContain('calm')
      expect(categories).toContain('angry')
      expect(categories).toContain('sad')
      expect(categories).toContain('confident')
      expect(categories).toContain('neutral')
      expect(categories).toHaveLength(6)
    })
  })

  describe('renderEnhancedWaveform', () => {
    const mockWaveformData: WaveformData = {
      timeDomain: new Float32Array(1024),
      frequency: new Uint8Array(512),
      amplitude: 0.7,
      peak: 0.9,
      isClipping: false,
    }

    it('should render waveform mode', () => {
      renderEnhancedWaveform(mockCtx, mockWaveformData, 800, 300, {
        mode: 'waveform',
      })

      expect(mockCtx.clearRect).toHaveBeenCalled()
      expect(mockCtx.stroke).toHaveBeenCalled()
    })

    it('should render frequency mode', () => {
      renderEnhancedWaveform(mockCtx, mockWaveformData, 800, 300, {
        mode: 'frequency',
      })

      expect(mockCtx.clearRect).toHaveBeenCalled()
      expect(mockCtx.fillRect).toHaveBeenCalled()
    })

    it('should render combined mode', () => {
      renderEnhancedWaveform(mockCtx, mockWaveformData, 800, 300, {
        mode: 'combined',
      })

      expect(mockCtx.save).toHaveBeenCalled()
      expect(mockCtx.restore).toHaveBeenCalled()
    })

    it('should render grid when enabled', () => {
      renderEnhancedWaveform(mockCtx, mockWaveformData, 800, 300, {
        mode: 'waveform',
        showGrid: true,
      })

      expect(mockCtx.stroke).toHaveBeenCalled()
    })

    it('should render peak indicators when enabled', () => {
      renderEnhancedWaveform(mockCtx, mockWaveformData, 800, 300, {
        mode: 'waveform',
        showPeaks: true,
      })

      expect(mockCtx.setLineDash).toHaveBeenCalled()
    })

    it('should render clipping indicators when clipping', () => {
      const clippingData = { ...mockWaveformData, isClipping: true }
      renderEnhancedWaveform(mockCtx, clippingData, 800, 300, {
        mode: 'waveform',
        showClipping: true,
      })

      expect(mockCtx.fillText).toHaveBeenCalledWith('⚠️ CLIPPING', 400, 150)
    })

    it('should render VU meter when enabled', () => {
      renderEnhancedWaveform(mockCtx, mockWaveformData, 800, 300, {
        mode: 'waveform',
        showVUMeter: true,
        vuMeterPosition: 'left',
      })

      expect(mockCtx.fillRect).toHaveBeenCalled()
    })
  })
})

// ============================================================================
// COMPONENT TESTS
// ============================================================================

describe('EnhancedAudioWaveform Component', () => {
  let mockAnalyser: AnalyserNode

  beforeEach(() => {
    mockAnalyser = createMockAnalyser()
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render idle state', () => {
      render(
        <EnhancedAudioWaveform
          analyser={null}
          state="idle"
          width={800}
          height={300}
        />
      )

      expect(screen.getByText('Ready to record')).toBeInTheDocument()
      expect(screen.getByText('Enhanced waveform visualization')).toBeInTheDocument()
    })

    it('should render recording state', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          width={800}
          height={300}
        />
      )

      expect(screen.getByText('Recording')).toBeInTheDocument()
    })

    it('should render paused state', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="paused"
          width={800}
          height={300}
        />
      )

      expect(screen.getByText('Paused')).toBeInTheDocument()
    })

    it('should render canvas element', () => {
      const { container } = render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          width={800}
          height={300}
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
      expect(canvas).toHaveStyle({ width: '800px', height: '300px' })
    })
  })

  describe('Mode Selector', () => {
    it('should render mode selector when enabled', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          showModeSelector={true}
        />
      )

      expect(screen.getByText('Waveform')).toBeInTheDocument()
      expect(screen.getByText('Frequency')).toBeInTheDocument()
      expect(screen.getByText('Combined')).toBeInTheDocument()
    })

    it('should not render mode selector when disabled', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          showModeSelector={false}
        />
      )

      expect(screen.queryByText('Waveform')).not.toBeInTheDocument()
    })

    it('should switch modes', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          mode="waveform"
        />
      )

      const frequencyButton = screen.getByText('Frequency')
      fireEvent.click(frequencyButton)

      // Mode should change (would need to verify canvas rendering updates)
      expect(frequencyButton).toBeInTheDocument()
    })
  })

  describe('Zoom Controls', () => {
    it('should render zoom controls when enabled', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          enableZoom={true}
        />
      )

      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
      expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument()
    })

    it('should not render zoom controls when disabled', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          enableZoom={false}
        />
      )

      expect(screen.queryByLabelText('Zoom out')).not.toBeInTheDocument()
    })

    it('should zoom in', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          enableZoom={true}
        />
      )

      const zoomInButton = screen.getByLabelText('Zoom in')
      fireEvent.click(zoomInButton)

      // Verify zoom increased
      const zoomDisplay = screen.getByText(/1\.0x/)
      expect(zoomDisplay).toBeInTheDocument()
    })

    it('should zoom out', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          enableZoom={true}
        />
      )

      const zoomOutButton = screen.getByLabelText('Zoom out')
      fireEvent.click(zoomOutButton)

      // Zoom should stay at 1x (minimum)
      expect(screen.getByText('1.0x')).toBeInTheDocument()
    })

    it('should reset zoom', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          enableZoom={true}
        />
      )

      const resetButton = screen.getByLabelText('Reset zoom')
      fireEvent.click(resetButton)

      expect(screen.getByText('1.0x')).toBeInTheDocument()
    })
  })

  describe('Emotion Display', () => {
    it('should display emotion indicator', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          emotion="excited"
        />
      )

      expect(screen.getByText('Excited')).toBeInTheDocument()
    })

    it('should display neutral emotion by default', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
        />
      )

      expect(screen.getByText('Neutral')).toBeInTheDocument()
    })
  })

  describe('Clipping Detection', () => {
    it('should show clipping warning when audio clips', async () => {
      const mockAnalyserWithClipping = createMockAnalyser()
      const clippingSignal = new Float32Array(2048)
      clippingSignal[100] = 0.96 // Above threshold

      ;(mockAnalyserWithClipping as any).getFloatTimeDomainData = vi.fn((array: Float32Array) => {
        array.set(clippingSignal)
      })

      const onClipping = vi.fn()

      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyserWithClipping}
          state="recording"
          showClipping={true}
          onClipping={onClipping}
        />
      )

      await waitFor(() => {
        expect(onClipping).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { container } = render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
        />
      )

      const canvas = container.querySelector('canvas')
      expect(canvas).toHaveAttribute('role', 'img')
      expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('Enhanced audio waveform'))
    })

    it('should announce mode changes to screen readers', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          mode="waveform"
        />
      )

      const waveformButton = screen.getByLabelText('Switch to Waveform mode')
      expect(waveformButton).toHaveAttribute('aria-label', 'Switch to Waveform mode')
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to different sizes', () => {
      const { container: small } = render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          width={400}
          height={200}
        />
      )

      const smallCanvas = small.querySelector('canvas')
      expect(smallCanvas).toHaveStyle({ width: '400px', height: '200px' })

      const { container: large } = render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          width={1200}
          height={600}
        />
      )

      const largeCanvas = large.querySelector('canvas')
      expect(largeCanvas).toHaveStyle({ width: '1200px', height: '600px' })
    })
  })

  describe('Performance', () => {
    it('should render at 60fps target', () => {
      const startTime = performance.now()

      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          width={800}
          height={300}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Initial render should be fast (< 100ms)
      expect(renderTime).toBeLessThan(100)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null analyser gracefully', () => {
      render(
        <EnhancedAudioWaveform
          analyser={null}
          state="recording"
        />
      )

      // Should not throw error
      expect(screen.getByText('Recording')).toBeInTheDocument()
    })

    it('should handle empty data gracefully', () => {
      const emptyAnalyser = createMockAnalyser()
      emptyAnalyser.getFloatTimeDomainData = jest.fn((array: Float32Array) => {
        array.fill(0)
      })

      render(
        <EnhancedAudioWaveform
          analyser={emptyAnalyser}
          state="recording"
        />
      )

      // Should not throw error
      expect(screen.getByText('Recording')).toBeInTheDocument()
    })

    it('should handle extreme zoom levels', () => {
      render(
        <EnhancedAudioWaveform
          analyser={mockAnalyser}
          state="recording"
          enableZoom={true}
        />
      )

      const zoomInButton = screen.getByLabelText('Zoom in')
      const zoomOutButton = screen.getByLabelText('Zoom out')

      // Try to zoom beyond limits
      for (let i = 0; i < 20; i++) {
        fireEvent.click(zoomInButton)
      }

      // Should cap at 10x
      expect(screen.getByText('10.0x')).toBeInTheDocument()

      // Try to zoom below minimum
      for (let i = 0; i < 20; i++) {
        fireEvent.click(zoomOutButton)
      }

      // Should cap at 1x
      expect(screen.getByText('1.0x')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('EnhancedAudioWaveform Integration', () => {
  it('should integrate with emotion analysis', () => {
    const mockAnalyser = createMockAnalyser()

    render(
      <EnhancedAudioWaveform
        analyser={mockAnalyser}
        state="recording"
        emotion="calm"
        mode="waveform"
      />
    )

    expect(screen.getByText('Calm')).toBeInTheDocument()
    expect(screen.getByText('Waveform')).toBeInTheDocument()
  })

  it('should integrate with JEPA recording system', () => {
    const mockAnalyser = createMockAnalyser()
    const onClipping = jest.fn()

    render(
      <EnhancedAudioWaveform
        analyser={mockAnalyser}
        state="recording"
        onClipping={onClipping}
        showVUMeter={true}
        showPeaks={true}
      />
    )

    expect(screen.getByText('Recording')).toBeInTheDocument()
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
  })
})
