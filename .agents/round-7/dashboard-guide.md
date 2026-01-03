# Optimization Dashboard - User Guide

## Overview

The Optimization Dashboard at `/settings/optimization` provides a comprehensive interface for monitoring, managing, and applying performance optimizations to PersonalLog.

## Dashboard Sections

### 1. Status Cards (Top Row)

Four real-time metrics displayed as cards:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ ⚡ Status        │  │ ⚙️ Rules Applied │  │ ✓ Health Score   │  │ 🕐 Last Run      │
│                 │  │                 │  │                 │  │                 │
│ Active          │  │ 3               │  │ 88%             │  │ 2m ago          │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Metrics:**
- **Status**: Active (monitoring) or Inactive
- **Rules Applied**: Number of successful optimizations
- **Health Score**: Overall system health (0-100%)
- **Last Run**: Time since last optimization check

### 2. Optimization Controls

Configure how optimizations are applied:

```
Optimization Strategy
┌───────────────┬───────────────┬───────────────┐
│ Conservative  │   Balanced    │  Aggressive   │
│ Safe changes  │ Moderate      │ Maximum perf  │
│ only          │ changes       │               │
└───────────────┴───────────────┴───────────────┘

☑ Auto-Apply Optimizations
Automatically apply suggested optimizations

[ ▶ Run Optimization Now ]  [ ↻ Reset All ]  [ 🗑 Clear History ]
```

**Strategies:**
- **Conservative**: Only safe, proven optimizations (<30% risk)
- **Balanced**: Moderate improvements with good safety (default)
- **Aggressive**: Maximum performance, higher risk tolerance

### 3. Applied Optimizations

History of optimizations that have been applied:

```
┌──────────────────────────────────────────────────────────────┐
│ ✓ Reduce Vector Batch Size                    2m ago          │
│   Decreases batch size for vector operations to save memory  │
│   ✓ 15% memory    ✓ 12% latency    15% improvement          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ ✓ Increase Cache Size                         1h ago          │
│   Cache hit rate below target, increasing cache size         │
│   ✓ 35% hit rate   ✓ 8% memory     35% improvement          │
└──────────────────────────────────────────────────────────────┘
```

**Information Shown:**
- Optimization name and timestamp
- Description of what was changed
- Performance improvements (colored badges)
- Percentage improvement

### 4. Recommended Optimizations (NEW!)

AI-powered suggestions with one-click application:

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🎯 Recommended Optimizations (3)                                    │
│    AI-powered suggestions to improve performance                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ 🎯 [HIGH]   Enable Streaming                         [Apply]  │  │
│ │                                                                  │  │
│ │ API latency (2400ms) exceeds threshold (2000ms). Streaming     │  │
│ │ will improve perceived response time.                           │  │
│ │                                                                  │  │
│ │ Expected: +25%    Confidence: 88%    Risk: 10%    < 1 min      │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ 🎯 [MEDIUM] Increase Cache Size                      [Apply]  │  │
│ │                                                                  │  │
│ │ Cache hit rate (65%) below target (70%). Increasing cache      │  │
│ │ size will improve hit rate.                                     │  │
│ │                                                                  │  │
│ │ Expected: +35%    Confidence: 92%    Risk: 15%    < 1 min      │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ 🎯 [HIGH] Lower Virtual Scroll Threshold              [Apply]  │  │
│ │                                                                  │  │
│ │ Frame rate (42 fps) below target (50 fps). Virtual scrolling   │  │
│ │ will dramatically reduce rendering load.                        │  │
│ │                                                                  │  │
│ │ Expected: +40%    Confidence: 91%    Risk: 10%    < 5 min      │  │
│ └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Recommendation Details:**
- **Priority Badge**: HIGH (red), MEDIUM (amber), LOW (gray)
- **Action Name**: Human-readable optimization name
- **Reasoning**: Why this optimization is suggested
- **Expected Improvement**: Quantified benefit
- **Confidence**: How confident the system is (0-100%)
- **Risk Level**: Potential downside (0-100%)
- **Estimated Time**: How long to apply
- **Apply Button**: One-click application

### 5. Performance Profiles (NEW!)

Real-time performance metrics for operations:

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Performance Profiles                                      │
│    Real-time performance metrics                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────┐  ┌─────────────────────────┐   │
│ │ API / Response          │  │ Component / Render      │   │
│ │                  245ms  │  │                  12ms   │   │
│ │                         │  │                         │   │
│ │ Min: 180ms  P95: 380ms │  │ Min: 8ms   P95: 18ms   │   │
│ │ Max: 520ms             │  │ Max: 25ms              │   │
│ └─────────────────────────┘  └─────────────────────────┘   │
│                                                             │
│ ┌─────────────────────────┐  ┌─────────────────────────┐   │
│ │ API / Chat             │  │ API / Knowledge         │   │
│ │                  890ms  │  │                 1.2s    │   │
│ │                         │  │                         │   │
│ │ Min: 450ms P95: 1.5s   │  │ Min: 800ms P95: 1.8s   │   │
│ │ Max: 2.3s              │  │ Max: 3.1s              │   │
│ └─────────────────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Color Coding:**
- 🟢 **Green**: < 100ms (excellent)
- 🟡 **Amber**: 100-500ms (good)
- 🔴 **Red**: > 500ms (needs optimization)

**Statistics:**
- **Min**: Fastest operation
- **P95**: 95th percentile (typical worst case)
- **Max**: Slowest operation

### 6. Available Rules

All optimization rules that can be applied:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Available Rules (18)                                     │
│    Optimization rules that can be applied                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ Reduce Vector Batch  │  │ Enable Aggressive    │        │
│ │ Size            [HIGH]│  │ Caching        [HIGH]│        │
│ │ Decreases batch size │  │ Enables aggressive   │        │
│ │ for vector ops...    │  │ caching for...       │        │
│ │                      │  │                      │        │
│ │ performance • 15risk │  │ performance • 10risk │        │
│ └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│ ┌──────────────────────┐  ┌──────────────────────┐        │
│ │ Enable Virtual       │  │ Reduce Memory Cache  │        │
│ │ Scrolling      [MED] │  │ Limit          [MED] │        │
│ │ Enables virtual...   │  │ Reduces memory...    │        │
│ │                      │  │                      │        │
│ │ performance • 10risk │  │ resources • 20risk   │        │
│ └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Rule Information:**
- **Name**: Human-readable rule name
- **Priority Badge**: HIGH, MEDIUM, LOW
- **Description**: What the rule does
- **Category**: performance, quality, resources
- **Risk Level**: 0-100

## Usage Workflow

### First Time Setup

1. **Visit Dashboard**
   ```
   Navigate to Settings → Optimization
   ```

2. **Review Current Status**
   - Check health score
   - Review applied optimizations
   - Scan recommendations

3. **Choose Strategy**
   - Conservative for production
   - Balanced for daily use
   - Aggressive for testing

### Applying Optimizations

#### Manual Application

1. **Run Full Scan**
   ```
   Click "Run Optimization Now"
   ```

2. **Review Opportunities**
   - System detects issues
   - Shows top priorities
   - Estimates improvements

3. **Apply Suggestions**
   - Click "Apply" on recommendations
   - System applies changes
   - Monitors effectiveness

#### Automatic Application

1. **Enable Auto-Apply**
   ```
   Toggle "Auto-Apply Optimizations"
   ```

2. **Set Strategy**
   - Choose risk tolerance
   - System auto-applies safe optimizations
   - Monitors for regressions

### Monitoring Performance

1. **Check Profiles**
   - Review operation timings
   - Identify bottlenecks
   - Track improvements

2. **View History**
   - See past optimizations
   - Measure impact
   - Rollback if needed

### Advanced Usage

1. **Manual Configuration**
   ```typescript
   import { autoTuner } from '@/lib/optimization';

   // Update specific config
   autoTuner.updateConfig('cacheMaxSize', 2500);
   ```

2. **Custom Tuning**
   ```typescript
   import { configTuner } from '@/lib/optimization';

   // Tune with custom objectives
   await configTuner.autoTune('cacheMaxSize', {
     objective: {
       metric: 'cache-size',
       direction: 'maximize',
       weight: 1.0,
     },
     exploration: 'bayesian',
   });
   ```

3. **Get Recommendations**
   ```typescript
   import { recommender } from '@/lib/optimization';

   const recs = await recommender.suggest({
     context: 'my_custom_context',
     constraints: {
       maxMemoryMB: 100,
       minFrameRate: 60,
     },
   });
   ```

## Safety Features

### Rollback Protection

- All changes store previous values
- Auto-rollback on regression (>10% degradation)
- 30-second effectiveness monitoring
- Manual rollback always available

### Risk Assessment

Each optimization shows:
- **Risk Level**: 0-100%
- **Confidence**: 0-100%
- **Expected Impact**: Quantified
- **Dependencies**: Required changes

### Validation

- Statistical significance testing
- Sample size requirements
- Performance thresholds
- Constraint validation

## Tips & Best Practices

### For Best Performance

1. **Start with Balanced Strategy**
   - Good balance of safety and performance
   - Most optimizations are low-risk
   - Monitor for a day before going aggressive

2. **Enable Auto-Apply**
   - Safe optimizations apply automatically
   - System learns from history
   - Reduces manual intervention

3. **Review Regularly**
   - Check dashboard weekly
   - Review new recommendations
   - Monitor performance profiles

4. **Test Before Production**
   - Try aggressive strategy in dev
   - Measure improvements
   - Roll back if issues

### For Maximum Safety

1. **Use Conservative Strategy**
   - Only proven optimizations
   - Low risk tolerance
   - Slower but safer

2. **Disable Auto-Apply**
   - Review all changes
   - Manual approval only
   - Full control

3. **Monitor Closely**
   - Check after each optimization
   - Review effectiveness
   - Roll back immediately if issues

### For Maximum Performance

1. **Use Aggressive Strategy**
   - All optimizations considered
   - Higher risk tolerance
   - Maximum improvements

2. **Enable Auto-Apply**
   - Hands-free optimization
   - Continuous improvement
   - Automatic tuning

3. **Let It Run**
   - System learns over time
   - Adapts to patterns
   - Self-optimizing

## Troubleshooting

### No Recommendations Showing

**Cause**: Performance is good!

**Solution**:
- System only suggests when needed
- Check health score (should be high)
- Review performance profiles

### Optimizations Not Applying

**Cause**: Auto-apply disabled or risk too high

**Solution**:
- Enable auto-apply for safe changes
- Lower risk tolerance
- Apply manually

### Performance Degraded

**Cause**: Optimization didn't work as expected

**Solution**:
- System auto-rolls back after 30s
- Or manually rollback from history
- Try different optimization

### High Memory Usage

**Cause**: Cache too large or memory leak

**Solution**:
- Apply "Reduce Cache Limit" recommendation
- Enable compression
- Prune old data

### Slow API Responses

**Cause**: Network, server, or configuration

**Solution**:
- Apply "Enable Streaming" recommendation
- Increase timeout
- Add retry logic

## FAQ

**Q: How often does the system check for optimizations?**

A: Every 30 seconds when active. Can also run manually.

**Q: Can I undo an optimization?**

A: Yes! All changes are reversible. Click "Reset All" or rollback individual items from history.

**Q: What if an optimization makes things worse?**

A: The system automatically rolls back after detecting >10% degradation within 30 seconds.

**Q: How much overhead does monitoring add?**

A: Minimal (<1% CPU, ~2MB memory). Profiling is lightweight and asynchronous.

**Q: Can I customize the optimization targets?**

A: Yes! Use the `configTuner` API for custom objectives and constraints.

**Q: Are my settings persisted?**

A: Yes! All configurations are saved to localStorage and survive page reloads.

**Q: Can I export/import optimization settings?**

A: Not in the UI yet, but you can access via localStorage key `personallog-config`.

**Q: How does the system learn?**

A: Tracks effectiveness of optimizations, adapts strategy based on success/failure rate.

**Q: What's the difference between strategies?**

A:
- Conservative: Only <30% risk optimizations
- Balanced: Medium risk tolerance (default)
- Aggressive: All optimizations considered

**Q: Can I use this in production?**

A: Yes! Start with Conservative strategy, enable auto-apply for safe optimizations only.

## Support

For issues or questions:
1. Check browser console for errors
2. Review optimization history
3. Try resetting to defaults
4. File issue on GitHub

---

**Enjoy your self-optimizing PersonalLog!** 🚀
