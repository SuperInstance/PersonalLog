# Tutorial 1: GPU Profiling Basics
## Real-Time GPU Performance Monitoring in the Browser

**Duration:** 30 minutes
**Level:** Beginner
**Prerequisites:** Basic JavaScript knowledge

---

## Learning Objectives

After this tutorial, you will be able to:
- ✅ Understand what GPU profiling is and why it matters
- ✅ Set up GPU profiler in your browser
- ✅ Monitor GPU performance in real-time
- ✅ Detect memory leaks before they crash your app
- ✅ Optimize GPU performance for your applications

---

## Prerequisites

### Before You Start
- **Browser:** Chrome 113+, Edge 113+, Safari 18.2+, or Firefox Nightly
- **WebGPU:** Enable WebGPU in your browser (if not already enabled)
- **JavaScript:** Basic understanding of JavaScript
- **Terminal:** Comfortable running commands in terminal

### Check Your Setup
```bash
# Verify WebGPU support
npx @superinstance/gpu-detect

# Expected output:
# ✅ WebGPU is available
# GPU: [Your GPU Name]
```

### Install Dependencies
```bash
# Create new project
mkdir gpu-profiling-tutorial
cd gpu-profiling-tutorial

# Initialize npm project
npm init -y

# Install GPU profiler
npm install @superinstance/gpu-profiler
```

---

## Tutorial Outline

### Part 1: What is GPU Profiling? (5 minutes)
- Definition and importance
- When to use GPU profiling
- Browser-based vs traditional tools

### Part 2: Basic Setup (5 minutes)
- Installation and initialization
- Your first GPU profile
- Understanding the metrics

### Part 3: Real-Time Monitoring (8 minutes)
- Setting up live monitoring
- Reading GPU metrics
- Performance dashboards

### Part 4: Memory Analysis (7 minutes)
- Tracking GPU memory usage
- Detecting memory leaks
- Fixing memory issues

### Part 5: Optimization Tips (5 minutes)
- Common GPU bottlenecks
- Optimization strategies
- Best practices

---

## Part 1: What is GPU Profiling? (5 minutes)

### Definition

**GPU Profiling** is measuring and analyzing how your GPU performs computations.

### Why It Matters

**Without Profiling:**
- ❌ Guessing at performance issues
- ❌ Random optimization attempts
- ❌ Crashes from memory leaks
- ❌ Poor user experience

**With Profiling:**
- ✅ Data-driven optimization
- ✅ Targeted improvements
- ✅ Proactive leak detection
- ✅ Smooth 60 FPS experience

### When to Use GPU Profiling

- **3D Rendering:** Games, visualizations, 3D models
- **Machine Learning:** Inference, training, tensor operations
- **Video Processing:** Encoding, decoding, filters
- **Scientific Computing:** Simulations, data analysis
- **Any GPU-Intensive Task:** If you use the GPU, profile it!

### Browser-Based vs Traditional Tools

| Feature | Browser-Based | Traditional |
|---------|--------------|-------------|
| **Setup** | 2 minutes | 30+ minutes |
| **Cost** | Free | $500+/year |
| **Privacy** | 100% local | Telemetry |
| **Platform** | Any with browser | Platform-specific |
| **WebGPU** | Native support | Limited support |

---

## Part 2: Basic Setup (5 minutes)

### Step 1: Create Your Project

```bash
# Create directory
mkdir my-first-gpu-profile
cd my-first-gpu-profile

# Initialize
npm init -y

# Install GPU profiler
npm install @superinstance/gpu-profiler
```

### Step 2: Create HTML File

Create `index.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <title>GPU Profiling Tutorial</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
    #metrics {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .metric {
      margin: 10px 0;
      font-size: 18px;
    }
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background: #0056b3;
    }
  </style>
</head>
<body>
  <h1>GPU Profiling Basics</h1>

  <button id="startBtn">Start Profiling</button>
  <button id="stopBtn">Stop Profiling</button>

  <div id="metrics">
    <div class="metric">Status: <span id="status">Not started</span></div>
    <div class="metric">FPS: <span id="fps">-</span></div>
    <div class="metric">Frame Time: <span id="frameTime">-</span></div>
    <div class="metric">GPU Utilization: <span id="gpuUtil">-</span></div>
    <div class="metric">VRAM: <span id="vram">-</span></div>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

### Step 3: Create JavaScript File

Create `app.js`:
```javascript
import { GPUProfiler } from '@superinstance/gpu-profiler';

// Initialize profiler
const profiler = new GPUProfiler({
  updateInterval: 16, // 60 FPS
  enableMetrics: ['fps', 'frameTime', 'gpu.utilization', 'memory']
});

// UI elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const fpsEl = document.getElementById('fps');
const frameTimeEl = document.getElementById('frameTime');
const gpuUtilEl = document.getElementById('gpuUtil');
const vramEl = document.getElementById('vram');

// Start profiling
startBtn.addEventListener('click', async () => {
  await profiler.start();
  statusEl.textContent = 'Running';

  // Listen for updates
  profiler.on('update', (metrics) => {
    fpsEl.textContent = metrics.fps.toFixed(1);
    frameTimeEl.textContent = `${metrics.frameTime.toFixed(1)}ms`;
    gpuUtilEl.textContent = `${metrics.gpu.utilization}%`;
    vramEl.textContent = `${metrics.memory.used}MB / ${metrics.memory.total}MB`;
  });
});

// Stop profiling
stopBtn.addEventListener('click', async () => {
  await profiler.stop();
  statusEl.textContent = 'Stopped';
});
```

### Step 4: Run Your First Profile

```bash
# Start local server
npx serve .

# Open browser
# Navigate to http://localhost:3000
```

### Expected Output

When you click "Start Profiling":
```
Status: Running
FPS: 60.0
Frame Time: 16.5ms
GPU Utilization: 12%
VRAM: 128MB / 8192MB
```

**Congratulations!** You've run your first GPU profile. 🎉

---

## Part 3: Real-Time Monitoring (8 minutes)

### Understanding the Metrics

#### 1. FPS (Frames Per Second)
- **What it measures:** How many frames render per second
- **Good:** 60 FPS (16.67ms per frame)
- **Acceptable:** 30 FPS (33.33ms per frame)
- **Poor:** Below 30 FPS

#### 2. Frame Time
- **What it measures:** Time to render one frame
- **Good:** Below 16.67ms (60 FPS)
- **Warning:** Above 33.33ms (30 FPS)
- **Critical:** Above 50ms (20 FPS)

#### 3. GPU Utilization
- **What it measures:** Percentage of GPU capacity used
- **Underutilized:** Below 50% (CPU bound)
- **Optimal:** 70-90% (balanced)
- **Overutilized:** Above 95% (GPU bottleneck)

#### 4. VRAM Usage
- **What it measures:** Video RAM memory usage
- **Monitor for:** Steady increases (memory leaks)
- **Optimal:** Stable over time
- **Warning:** Continuous growth

### Exercise 1: Create a Performance Dashboard

Create a visual dashboard that shows metrics in real-time:

```javascript
import { GPUProfiler } from '@superinstance/gpu-profiler';

const profiler = new GPUProfiler({
  updateInterval: 16,
  enableMetrics: ['fps', 'frameTime', 'gpu.utilization', 'memory']
});

// Enable built-in dashboard
profiler.enableDashboard(document.body, {
  position: 'top-right',
  theme: 'dark'
});

await profiler.start();
```

**Exercise:**
1. Run the dashboard
2. Move your mouse around (see FPS change)
3. Resize the window (see frame time spike)
4. Watch GPU utilization fluctuate

### Exercise 2: Detect Performance Issues

```javascript
profiler.on('alert', (alert) => {
  if (alert.type === 'FPS_LOW') {
    console.warn('⚠️ Low FPS detected!');
    console.log(`Current: ${alert.current}, Threshold: ${alert.threshold}`);
  }
  if (alert.type === 'MEMORY_LEAK') {
    console.error('🚨 Memory leak detected!');
    console.log(`Growth rate: ${alert.growthRate}MB/sec`);
  }
});
```

**Exercise:**
1. Add alert listeners to your code
2. Trigger a performance issue (e.g., heavy computation)
3. Watch the alerts fire
4. Log the details

---

## Part 4: Memory Analysis (7 minutes)

### Understanding GPU Memory

**VRAM (Video RAM):** Dedicated memory for GPU

**Types of GPU Memory:**
- Textures: Image data (2D, 3D textures)
- Buffers: Vertex data, index data, compute buffers
- Shaders: GPU programs
- Samplers: Texture sampling parameters

### Detecting Memory Leaks

**What is a Memory Leak?**
- Memory that's allocated but never freed
- Causes crashes and performance degradation
- Common in WebGPU applications

**Automatic Leak Detection**

```javascript
const profiler = new GPUProfiler({
  leakDetection: {
    enabled: true,
    threshold: 100,    // Alert if VRAM grows by 100MB
    window: 5000       // Check over 5 seconds
  }
});

profiler.on('memoryLeak', (report) => {
  console.error('Memory leak detected!');
  console.log(`Growth rate: ${report.growthRate}MB/sec`);
  console.log(`Sources:`, report.sources);
});
```

### Exercise 3: Intentional Memory Leak

Create a memory leak to see detection in action:

```javascript
// LEAKY CODE - Don't use in production!
async function createMemoryLeak() {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  let textures = [];

  // Create new texture every frame (never destroy them!)
  setInterval(() => {
    const texture = device.createTexture({
      size: [1024, 1024],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    textures.push(texture); // Never freed!
  }, 16); // 60 times per second

  // Watch VRAM grow!
}
```

**Expected Result:**
```
⚠️ Memory Leak Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Growth Rate: 45.2 MB/sec
Duration: 5.3 seconds
Accumulated: 239.6 MB

Likely Sources:
• Texture allocations (73%)
• Buffer objects (21%)
• Shader modules (6%)

Recommendation: Call .destroy() on unused resources
```

### Exercise 4: Fix the Memory Leak

```javascript
// CORRECT CODE - Properly manages memory
async function noMemoryLeak() {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const MAX_TEXTURES = 10;
  let textures = [];

  setInterval(() => {
    // Create new texture
    const texture = device.createTexture({
      size: [1024, 1024],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    textures.push(texture);

    // Destroy old textures if we have too many
    if (textures.length > MAX_TEXTURES) {
      const oldTexture = textures.shift();
      oldTexture.destroy(); // Properly free memory!
    }
  }, 16);
}
```

**Result:** Stable VRAM usage, no leaks!

---

## Part 5: Optimization Tips (5 minutes)

### Common GPU Bottlenecks

#### 1. Too Many Draw Calls
**Problem:** Each draw call has overhead
**Solution:** Batch objects together
```javascript
// Before: 1000 draw calls
objects.forEach(obj => renderer.draw(obj));

// After: 1 draw call (instanced rendering)
renderer.drawInstanced(objects);
```

#### 2. Large Textures
**Problem:** Large textures consume VRAM
**Solution:** Use compressed textures or resize
```javascript
// Before: 4096x4096 texture (64MB)
const texture = createTexture({ size: [4096, 4096] });

// After: 1024x1024 texture (4MB)
const texture = createTexture({ size: [1024, 1024] });
```

#### 3. Fragment Shader Complexity
**Problem:** Complex shaders slow down rendering
**Solution:** Simplify shader code
```javascript
// Before: Complex calculations per pixel
fragColor = complexFunction(uv, time, texture, normals);

// After: Pre-calculate where possible
fragColor = simpleFunction(uv, preCalculatedData);
```

### Optimization Workflow

1. **Profile:** Measure performance
2. **Identify:** Find bottleneck (CPU vs GPU)
3. **Optimize:** Apply targeted fix
4. **Verify:** Profile again to confirm improvement

### Exercise 5: Optimize Rendering

```javascript
// 1. Profile before optimization
const before = await profiler.getMetrics();
console.log('Before:', before);

// 2. Apply optimization
// Example: Reduce texture size
// Example: Batch draw calls
// Example: Simplify shaders

// 3. Profile after optimization
const after = await profiler.getMetrics();
console.log('After:', after);

// 4. Calculate improvement
const improvement = {
  fps: after.fps - before.fps,
  frameTime: before.frameTime - after.frameTime
};
console.log('Improvement:', improvement);
```

---

## Recap & Next Steps

### What You Learned
✅ What GPU profiling is and why it matters
✅ How to set up GPU profiler in your browser
✅ Real-time monitoring of GPU metrics
✅ Detecting and fixing memory leaks
✅ Basic GPU optimization techniques

### Next Steps
1. **Practice:** Profile your own WebGPU applications
2. **Explore:** Read the full documentation
3. **Advanced:** Learn about shader profiling
4. **Share:** Teach others what you learned

### Resources
- **Documentation:** docs.gpu-profiler.dev
- **GitHub:** github.com/SuperInstance/browser-gpu-profiler
- **Examples:** github.com/SuperInstance/browser-gpu-profiler/tree/main/examples
- **Community:** Discord: discord.gg/superinstance

### Exercises Completed
- ✅ Exercise 1: Create a Performance Dashboard
- ✅ Exercise 2: Detect Performance Issues
- ✅ Exercise 3: Intentional Memory Leak
- ✅ Exercise 4: Fix the Memory Leak
- ✅ Exercise 5: Optimize Rendering

---

## Q&A Preparation

### Common Questions

**Q: Does profiling slow down my app?**
**A:** Less than 2% overhead. Negligible for most applications.

**Q: Can I use this in production?**
**A:** Yes! It's designed for production use.

**Q: What if WebGPU isn't available?**
**A:** The profiler will fall back to CPU-based metrics with reduced functionality.

**Q: How do I profile shaders specifically?**
**A:** See our advanced shader profiling tutorial (coming soon).

---

## Troubleshooting

### Issue: "WebGPU not supported"
**Solution:**
- Update browser to latest version
- Enable WebGPU flags in `chrome://flags`
- Try Chrome 113+ or Safari 18.2+

### Issue: Profiler shows 0 FPS
**Solution:**
- Ensure you're actually rendering something
- Check that profiler is started
- Verify WebGPU device is created

### Issue: Memory leak not detected
**Solution:**
- Adjust leak detection threshold
- Increase monitoring window
- Ensure leak grows fast enough to trigger

---

## Completion Certificate

🎉 **Congratulations!** You've completed the GPU Profiling Basics tutorial!

You now have the skills to:
- Profile GPU performance in real-time
- Detect memory leaks before crashes
- Optimize GPU rendering
- Deliver smooth 60 FPS experiences

**Keep profiling and keep optimizing!** 🚀
