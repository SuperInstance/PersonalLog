/**
 * WebGPU Mock for CI/CD Testing
 *
 * Provides a complete WebGPU API mock that simulates WebGPU behavior
 * in environments without real GPU support. This enables testing in CI/CD
 * pipelines while maintaining realistic behavior.
 */

export class MockGPUBuffer implements GPUBuffer {
  readonly label: string;
  private data: ArrayBuffer;
  private _size: number;
  private _usage: number;
  private _mappedAtCreation: boolean;

  constructor(descriptor: GPUBufferDescriptor) {
    this.label = descriptor.label || '';
    this._size = descriptor.size;
    this._usage = descriptor.usage;
    this._mappedAtCreation = descriptor.mappedAtCreation || false;
    this.data = new ArrayBuffer(descriptor.size);

    if (this._mappedAtCreation) {
      // Pre-fill with zeros
      new Uint8Array(this.data).fill(0);
    }
  }

  get size(): number {
    return this._size;
  }

  get usage(): number {
    return this._usage;
  }

  get mapState(): GPUBufferMapState {
    return this._mappedAtCreation ? 'mapped' : 'unmapped';
  }

  async mapAsync(mode: GPUMapMode, offset = 0, size?: number): Promise<void> {
    // Simulate async mapping
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  getMappedRange(offset = 0, size?: number): ArrayBuffer {
    return this.data.slice(offset, size ? offset + size : undefined);
  }

  unmap(): void {
    // Simulate unmap
  }

  destroy(): void {
    this.data = new ArrayBuffer(0);
  }

  // Helper method to get buffer data for testing
  getData(): ArrayBuffer {
    return this.data.slice();
  }

  // Helper method to set buffer data for testing
  setData(data: ArrayBuffer): void {
    this.data = data.slice(0, this._size);
  }
}

export class MockGPUTexture implements GPUTexture {
  readonly label: string;
  private _width: number;
  private _height: number;
  private _depthOrArrayLayers: number;
  private _mipLevelCount: number;
  private _sampleCount: number;
  private _dimension: GPUTextureDimension;
  private _format: GPUTextureFormat;
  private _usage: number;

  constructor(descriptor: GPUTextureDescriptor) {
    this.label = descriptor.label || '';
    this._width = descriptor.size.width;
    this._height = descriptor.size.height;
    this._depthOrArrayLayers = descriptor.size.depthOrArrayLayers || 1;
    this._mipLevelCount = descriptor.mipLevelCount || 1;
    this._sampleCount = descriptor.sampleCount || 1;
    this._dimension = descriptor.dimension || '2d';
    this._format = descriptor.format;
    this._usage = descriptor.usage;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get depthOrArrayLayers(): number {
    return this._depthOrArrayLayers;
  }

  get mipLevelCount(): number {
    return this._mipLevelCount;
  }

  get sampleCount(): number {
    return this._sampleCount;
  }

  get dimension(): GPUTextureDimension {
    return this._dimension;
  }

  get format(): GPUTextureFormat {
    return this._format;
  }

  get usage(): number {
    return this._usage;
  }

  createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView {
    return new MockGPUTextureView(descriptor || {});
  }

  destroy(): void {
    // Simulate cleanup
  }
}

export class MockGPUTextureView implements GPUTextureView {
  readonly label: string;

  constructor(descriptor: GPUTextureViewDescriptor) {
    this.label = descriptor.label || '';
  }
}

export class MockGPUSampler implements GPUSampler {
  readonly label: string;

  constructor(descriptor: GPUSamplerDescriptor = {}) {
    this.label = descriptor.label || '';
  }
}

export class MockGPUShaderModule implements GPUShaderModule {
  readonly label: string;
  private _code: string;

  constructor(descriptor: GPUShaderModuleDescriptor) {
    this.label = descriptor.label || '';
    this._code = descriptor.code;
  }

  get compilationInfo(): Promise<GPUCompilationInfo> {
    return Promise.resolve({
      messages: [],
    } as GPUCompilationInfo);
  }

  get code(): string {
    return this._code;
  }
}

type MockBindGroupEntry = GPUBindGroupEntry & {
  resource: MockGPUBuffer | MockGPUTexture | MockGPUSampler | MockGPUTextureView;
};

export class MockGPUBindGroup implements GPUBindGroup {
  readonly label: string;
  private entries: MockBindGroupEntry[];

  constructor(descriptor: GPUBindGroupDescriptor) {
    this.label = descriptor.label || '';
    this.entries = descriptor.layout.entries.map((layout, index) => ({
      ...descriptor.entries[index],
      resource: descriptor.entries[index].resource as any,
    }));
  }

  getBindGroupResources(): (MockGPUBuffer | MockGPUTexture | MockGPUSampler)[] {
    return this.entries.map(e => e.resource);
  }
}

export class MockGPUBindGroupLayout implements GPUBindGroupLayout {
  readonly label: string;
  entries: GPUBindGroupLayoutEntry[];

  constructor(descriptor: GPUBindGroupLayoutDescriptor) {
    this.label = descriptor.label || '';
    this.entries = descriptor.entries;
  }
}

export class MockGPUPipelineLayout implements GPUPipelineLayout {
  readonly label: string;
  private bindGroupLayouts: MockGPUBindGroupLayout[];

  constructor(descriptor: GPUPipelineLayoutDescriptor) {
    this.label = descriptor.label || '';
    this.bindGroupLayouts = descriptor.bindGroupLayouts as MockGPUBindGroupLayout[];
  }

  getBindGroupLayout(index: number): MockGPUBindGroupLayout {
    return this.bindGroupLayouts[index];
  }
}

export class MockGPUComputePipeline implements GPUComputePipeline {
  readonly label: string;
  private _layout: MockGPUPipelineLayout;
  private _computeStage: GPUProgrammableStage;

  constructor(descriptor: GPUComputePipelineDescriptor) {
    this.label = descriptor.label || '';
    this._layout = descriptor.layout as MockGPUPipelineLayout;
    this._computeStage = descriptor.compute;
  }

  getBindGroupLayout(index: number): GPUBindGroupLayout {
    return this._layout.getBindGroupLayout(index);
  }

  getComputeStage(): GPUProgrammableStage {
    return this._computeStage;
  }
}

export class MockGPUCommandBuffer implements GPUCommandBuffer {
  readonly label: string;

  constructor(label: string = '') {
    this.label = label;
  }
}

export class MockGPUCommandEncoder implements GPUCommandEncoder {
  readonly label: string;
  private commandBuffers: MockGPUCommandBuffer[] = [];

  constructor(descriptor: GPUCommandEncoderDescriptor = {}) {
    this.label = descriptor.label || '';
  }

  beginComputePass(descriptor?: GPUComputePassDescriptor): GPUComputePassEncoder {
    return new MockGPUComputePassEncoder(descriptor || {});
  }

  beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder {
    throw new Error('Render pass not implemented in mock');
  }

  copyBufferToBuffer(
    source: GPUBuffer,
    sourceOffset: number,
    destination: GPUBuffer,
    destinationOffset: number,
    size: number
  ): void {
    const srcBuffer = source as MockGPUBuffer;
    const dstBuffer = destination as MockGPUBuffer;

    const srcData = srcBuffer.getData();
    const dstData = dstBuffer.getData();

    const srcView = new Uint8Array(srcData, sourceOffset, size);
    const dstView = new Uint8Array(dstData, destinationOffset, size);
    dstView.set(srcView);

    dstBuffer.setData(dstData);
  }

  finish(descriptor?: GPUCommandBufferDescriptor): GPUCommandBuffer {
    const buffer = new MockGPUCommandBuffer(descriptor?.label || '');
    this.commandBuffers.push(buffer);
    return buffer;
  }
}

export class MockGPUComputePassEncoder implements GPUComputePassEncoder {
  readonly label: string;
  private pipeline: MockGPUComputePipeline | null = null;
  private bindGroups: (MockGPUBindGroup | null)[] = [];

  constructor(descriptor: GPUComputePassDescriptor) {
    this.label = '';
  }

  setPipeline(pipeline: GPUComputePipeline): void {
    this.pipeline = pipeline as MockGPUComputePipeline;
  }

  setBindGroup(index: number, bindGroup: GPUBindGroup): void {
    this.bindGroups[index] = bindGroup as MockGPUBindGroup;
  }

  dispatchWorkgroups(x: number, y?: number, z?: number): void {
    // Simulate dispatch
  }

  dispatchWorkgroupsIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void {
    // Simulate indirect dispatch
  }

  end(): void {
    // End compute pass
  }

  pushDebugGroup(groupLabel: string): void {
    // Debug group
  }

  popDebugGroup(): void {
    // Pop debug group
  }

  insertDebugMarker(markerLabel: string): void {
    // Debug marker
  }
}

export class MockGPUQueue implements GPUQueue {
  readonly label: string;
  private submittedBuffers: MockGPUCommandBuffer[] = [];

  constructor(label: string = '') {
    this.label = label;
  }

  submit(commandBuffers: GPUCommandBuffer[]): void {
    this.submittedBuffers.push(...(commandBuffers as MockGPUCommandBuffer[]));
  }

  async onSubmittedWorkDone(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  writeBuffer(
    buffer: GPUBuffer,
    bufferOffset: number,
    data: ArrayBufferView | ArrayBuffer,
    dataOffset?: number,
    size?: number
  ): void {
    const mockBuffer = buffer as MockGPUBuffer;
    const srcData = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const dstData = mockBuffer.getData();

    const srcView = dataOffset
      ? srcData.slice(dataOffset, size ? dataOffset + size : undefined)
      : srcData;

    const dstView = new Uint8Array(dstData, bufferOffset, srcView.length);
    dstView.set(new Uint8Array(srcView));

    mockBuffer.setData(dstData);
  }

  writeTexture(
    destination: GPUImageCopyTexture,
    data: ArrayBufferView | ArrayBuffer,
    dataLayout: GPUImageDataLayout,
    size: GPUExtent3D
  ): void {
    throw new Error('Texture write not implemented in mock');
  }

  copyExternalImageToTexture(
    source: GPUImageCopyExternalImage,
    destination: GPUImageCopyTexture,
    copySize: GPUExtent3D
  ): void {
    throw new Error('External image copy not implemented in mock');
  }
}

export class MockGPUDevice implements GPUDevice {
  readonly label: string;
  private _queue: MockGPUQueue;
  private _lost: boolean = false;

  constructor(descriptor: GPUDeviceDescriptor = {}) {
    this.label = descriptor.label || '';
    this._queue = new MockGPUQueue();
  }

  get queue(): MockGPUQueue {
    return this._queue;
  }

  get lost(): Promise<GPUDeviceLostInfo> {
    return Promise.resolve({
      reason: this._lost ? 'Mock device lost' : undefined,
    } as GPUDeviceLostInfo);
  }

  features: Set<string> = new Set([
    'texture-compression-bc',
    'texture-compression-etc2',
    'timestamp-query',
    'pipeline-statistics-query',
  ]);

  limits: GPUSupportedLimits = {
    maxTextureDimension2D: 8192,
    maxTextureDimension3D: 2048,
    maxTextureArrayLayers: 256,
    maxBindGroups: 4,
    maxDynamicUniformBuffersPerPipelineLayout: 8,
    maxDynamicStorageBuffersPerPipelineLayout: 4,
    maxSampledTexturesPerShaderStage: 16,
    maxSamplersPerShaderStage: 16,
    maxStorageBuffersPerShaderStage: 8,
    maxStorageTexturesPerShaderStage: 4,
    maxUniformBuffersPerShaderStage: 12,
    maxUniformBufferBindingSize: 16384,
    maxStorageBufferBindingSize: 128000000,
    minUniformBufferOffsetAlignment: 256,
    minStorageBufferOffsetAlignment: 256,
    maxVertexBuffers: 8,
    maxVertexAttributes: 16,
    maxVertexBufferArrayStride: 2048,
    maxInterStageShaderComponents: 128,
    maxComputeWorkgroupStorageSize: 16352,
    maxComputeInvocationsPerWorkgroup: 256,
    maxComputeWorkgroupSizeX: 256,
    maxComputeWorkgroupSizeY: 256,
    maxComputeWorkgroupSizeZ: 64,
    maxComputeWorkgroupsPerDimension: 65535,
  };

  destroy(): void {
    this._lost = true;
  }

  createBuffer(descriptor: GPUBufferDescriptor): MockGPUBuffer {
    return new MockGPUBuffer(descriptor);
  }

  createTexture(descriptor: GPUTextureDescriptor): MockGPUTexture {
    return new MockGPUTexture(descriptor);
  }

  createSampler(descriptor?: GPUSamplerDescriptor): MockGPUSampler {
    return new MockGPUSampler(descriptor || {});
  }

  createShaderModule(descriptor: GPUShaderModuleDescriptor): MockGPUShaderModule {
    return new MockGPUShaderModule(descriptor);
  }

  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): MockGPUPipelineLayout {
    return new MockGPUPipelineLayout(descriptor);
  }

  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): MockGPUBindGroupLayout {
    return new MockGPUBindGroupLayout(descriptor);
  }

  createBindGroup(descriptor: GPUBindGroupDescriptor): MockGPUBindGroup {
    return new MockGPUBindGroup(descriptor);
  }

  createComputePipeline(descriptor: GPUComputePipelineDescriptor): MockGPUComputePipeline {
    return new MockGPUComputePipeline(descriptor);
  }

  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline {
    throw new Error('Render pipeline not implemented in mock');
  }

  createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): MockGPUCommandEncoder {
    return new MockGPUCommandEncoder(descriptor || {});
  }

  createRenderBundleEncoder(descriptor: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder {
    throw new Error('Render bundle encoder not implemented in mock');
  }

  createQuerySet(descriptor: GPUQuerySetDescriptor): GPUQuerySet {
    throw new Error('Query set not implemented in mock');
  }

  async importExternalTexture(source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas | ImageBitmap | VideoFrame): Promise<GPUExternalTexture> {
    throw new Error('External texture import not implemented in mock');
  }

  pushErrorScope(filter: GPUErrorFilter): void {
    // Error scope management
  }

  popErrorScope(): Promise<GPUError|null> {
    return Promise.resolve(null);
  }

  hasFeature(feature: string): boolean {
    return this.features.has(feature);
  }
}

export class MockGPUAdapter implements GPUAdapter {
  readonly name: string = 'Mock GPU Adapter';
  readonly vendor: string = 'Mock Vendor';

  features: GPUAdapterFeatures = new Set([
    'texture-compression-bc',
    'texture-compression-etc2',
    'timestamp-query',
  ]);

  limits: GPUSupportedLimits = {
    maxTextureDimension2D: 8192,
    maxTextureDimension3D: 2048,
    maxTextureArrayLayers: 256,
    maxBindGroups: 4,
    maxDynamicUniformBuffersPerPipelineLayout: 8,
    maxDynamicStorageBuffersPerPipelineLayout: 4,
    maxSampledTexturesPerShaderStage: 16,
    maxSamplersPerShaderStage: 16,
    maxStorageBuffersPerShaderStage: 8,
    maxStorageTexturesPerShaderStage: 4,
    maxUniformBuffersPerShaderStage: 12,
    maxUniformBufferBindingSize: 16384,
    maxStorageBufferBindingSize: 128000000,
    minUniformBufferOffsetAlignment: 256,
    minStorageBufferOffsetAlignment: 256,
    maxVertexBuffers: 8,
    maxVertexAttributes: 16,
    maxVertexBufferArrayStride: 2048,
    maxInterStageShaderComponents: 128,
    maxComputeWorkgroupStorageSize: 16352,
    maxComputeInvocationsPerWorkgroup: 256,
    maxComputeWorkgroupSizeX: 256,
    maxComputeWorkgroupSizeY: 256,
    maxComputeWorkgroupSizeZ: 64,
    maxComputeWorkgroupsPerDimension: 65535,
  };

  isFallbackAdapter: boolean = false;

  async requestDevice(descriptor?: GPUDeviceDescriptor): Promise<MockGPUDevice> {
    return new MockGPUDevice(descriptor);
  }

  async requestAdapterInfo(): Promise<GPUAdapterInfo> {
    return {
      architecture: 'mock-architecture',
      description: 'Mock GPU Adapter for Testing',
      device: 'mock-device',
      vendor: this.vendor,
    };
  }

  hasFeature(feature: GPUFeatureName): boolean {
    return this.features.has(feature);
  }
}

/**
 * Setup global WebGPU mock
 */
export function setupWebGPUMock(): void {
  if (typeof navigator !== 'undefined' && !navigator.gpu) {
    (navigator as any).gpu = {
      adapter: null,
      requestAdapter: async () => new MockGPUAdapter(),
    };
  }
}

/**
 * Create a complete mock device with all necessary components
 */
export function createMockDevice(): MockGPUDevice {
  return new MockGPUDevice({ label: 'Test Device' });
}

/**
 * Create mock buffers with test data
 */
export function createMockBufferWithData(device: MockGPUDevice, data: Float32Array): MockGPUBuffer {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  new Float32Array(buffer.getData()).set(data);
  buffer.unmap();

  return buffer;
}
