/**
 * Web Audio API mock for jsdom.
 *
 * jsdom does not implement any of the Web Audio API. The product code under
 * test (src/lib/jepa/*) uses AudioContext/OfflineAudioContext purely as
 * buffer factories (createBuffer + getChannelData; the DSP is done in plain
 * JS on the channel arrays), so a faithful in-memory implementation of that
 * surface is enough to run the real math in tests.
 *
 * Semantics implemented per spec:
 *  - AudioBuffer#getChannelData(ch) returns the SAME live Float32Array on
 *    every call (mutations are visible across calls).
 *  - createBuffer allocates zero-filled channel arrays.
 *  - duration === length / sampleRate.
 *
 * The AudioBuffer constructor accepting an init dict is not in the spec
 * (browsers require createBuffer), but src/lib/jepa/audio-preprocessing.ts
 * constructs AudioBuffer directly, so the mock supports both paths.
 */

interface AudioBufferInit {
  numberOfChannels: number
  length: number
  sampleRate: number
}

class MockAudioBuffer implements AudioBuffer {
  readonly numberOfChannels: number
  readonly length: number
  readonly sampleRate: number
  private readonly channels: Float32Array[]

  constructor(init: AudioBufferInit) {
    this.numberOfChannels = init.numberOfChannels
    this.length = init.length
    this.sampleRate = init.sampleRate
    this.channels = []
    for (let i = 0; i < init.numberOfChannels; i++) {
      this.channels.push(new Float32Array(init.length))
    }
  }

  get duration(): number {
    return this.length / this.sampleRate
  }

  getChannelData(channel: number): Float32Array {
    if (channel < 0 || channel >= this.numberOfChannels) {
      throw new DOMException(
        `IndexSizeError: channel index ${channel} out of range`,
        'IndexSizeError'
      )
    }
    return this.channels[channel]
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset = 0): void {
    destination.set(
      this.getChannelData(channelNumber).subarray(bufferOffset, bufferOffset + destination.length)
    )
  }

  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset = 0): void {
    this.getChannelData(channelNumber).set(source, bufferOffset)
  }
}

function createBuffer(
  numberOfChannels: number,
  length: number,
  sampleRate: number
): AudioBuffer {
  if (numberOfChannels < 1 || length < 1) {
    throw new DOMException('NotSupportedError: invalid buffer dimensions', 'NotSupportedError')
  }
  return new MockAudioBuffer({ numberOfChannels, length, sampleRate })
}

class MockAudioContext implements AudioContext {
  readonly sampleRate: number
  readonly state: AudioContextState = 'running'
  readonly currentTime = 0
  readonly baseLatency = 0

  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate ?? 44100
  }

  createBuffer = createBuffer

  async close(): Promise<void> {
    // state transitions are not modeled; close() resolves as the real one does
  }

  // Node-creation methods are not needed by the code under test; assert loudly
  // if something new starts depending on them rather than silently passing.
  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.reject(new Error('decodeAudioData is not implemented in the test mock'))
  }
}

class MockOfflineAudioContext implements OfflineAudioContext {
  readonly numberOfChannels: number
  readonly length: number
  readonly sampleRate: number

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels
    this.length = length
    this.sampleRate = sampleRate
  }

  createBuffer = createBuffer

  startRendering(): Promise<AudioBuffer> {
    // The code under test only uses OfflineAudioContext as a buffer factory;
    // it never renders a graph. Fail loudly if that changes.
    return Promise.reject(new Error('startRendering is not implemented in the test mock'))
  }
}

export function installWebAudioMock(): void {
  if (typeof globalThis.AudioContext === 'undefined') {
    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext
  }
  if (typeof globalThis.OfflineAudioContext === 'undefined') {
    globalThis.OfflineAudioContext =
      MockOfflineAudioContext as unknown as typeof OfflineAudioContext
  }
  if (typeof globalThis.AudioBuffer === 'undefined') {
    globalThis.AudioBuffer = MockAudioBuffer as unknown as typeof AudioBuffer
  }
}

installWebAudioMock()
