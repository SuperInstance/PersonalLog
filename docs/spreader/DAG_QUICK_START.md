# DAG Task Dependencies - Quick Start Guide

## What Are Task Dependencies?

The Spreader agent now supports defining execution order between tasks. When you say "Spread this", you can specify which tasks depend on others. The agent will automatically:
- Figure out the execution order
- Run independent tasks in parallel
- Wait for dependencies before starting dependents
- Detect and report circular dependencies

## Basic Syntax

### No Dependencies (Parallel Execution)
```
Spread this: Research auth, Design DB, Write API
```
All three tasks start immediately and run in parallel.

### Simple Dependency Chain
```
Spread this: Design DB (1), Design API (2) depends on 1, Design UI (3) depends on 2
```
Execution order:
1. DB runs first
2. API waits for DB, then runs
3. UI waits for API, then runs

### Multiple Dependencies
```
Spread this: Setup project (1), Design DB (2) depends on 1, Design API (3) depends on 2,
Design UI (4) depends on 3, Write tests (5) depends on 3
```
Tasks 4 and 5 run in parallel after task 3 completes.

### Diamond Dependency
```
Spread this: Design DB (1), Create schema (2) depends on 1, Seed data (3) depends on 2,
Build API (4) depends on 2, Create UI (5) depends on 4
```
Tasks 3 and 4 run in parallel after task 2 completes.

## Response Format

When you use dependencies, Spreader shows the execution plan:

```
📊 Creating 5 conversations with dependencies:

Execution order:

Level 0 (parallel):
  - [1] Setup project

Level 1 (parallel):
  - [2] Design DB

Level 2 (parallel):
  - [3] Seed data
  - [4] Build API

Level 3 (parallel):
  - [5] Create UI

💡 Tasks will execute in order. Dependent tasks wait for their prerequisites.

✅ Spawned 5 conversations in 4 levels.
```

## Error Handling

### Circular Dependency
```
Spread this: Task A (1) depends on 2, Task B (2) depends on 1

❌ Invalid task dependencies:
Circular dependency detected. Could not resolve execution order.

Cycle: 1 → 2 → 1
```

Fix: Remove the circular reference by reorganizing tasks.

### Missing Dependency
```
Spread this: Task A (1), Task B (2) depends on 3

❌ Invalid task dependencies:
Node '2' depends on non-existent node '3'
```

Fix: Use valid task IDs or define the missing task.

## Best Practices

### 1. Use Clear Task Numbers
```
Good: Setup DB (1), Create schema (2), Seed data (3)
Bad: Setup DB, Create schema, Seed data  # Auto-generated IDs less clear
```

### 2. Group Related Tasks
```
Spread this:
  (1) Setup database
  (2) Create user table depends on 1
  (3) Create post table depends on 1
  (4) Seed users depends on 2
  (5) Seed posts depends on 3
```

### 3. Avoid Deep Chains
```
Good: Parallelize when possible
Bad: Task (1) depends on 2, (2) depends on 3, ... (10) depends on 9
```

### 4. Check for Independence
```
If tasks don't actually depend on each other, don't add dependencies:
Spread this: Write tests (1), Write docs (2)  # These can run in parallel!
```

## Examples by Use Case

### Software Development
```
Spread this:
  (1) Design database schema
  (2) Implement API endpoints depends on 1
  (3) Create frontend UI depends on 2
  (4) Write unit tests depends on 2
  (5) Deploy to staging depends on 3
```

### Research Project
```
Spread this:
  (1) Literature review
  (2) Data collection depends on 1
  (3) Data analysis depends on 2
  (4) Draft paper depends on 3
  (5) Create presentation depends on 4
```

### Content Creation
```
Spread this:
  (1) Research topic
  (2) Create outline depends on 1
  (3) Write section A depends on 2
  (4) Write section B depends on 2
  (5) Write section C depends on 2
  (6) Edit and finalize depends on 3,4,5
```

### System Setup
```
Spread this:
  (1) Install dependencies
  (2) Configure database depends on 1
  (3) Setup environment variables depends on 1
  (4) Run migrations depends on 2
  (5) Seed database depends on 4
  (6) Start server depends on 5
```

## Migration from Simple Tasks

### Before (No Dependencies)
```
Spread this: Research auth, Design DB, Write API
```
All tasks run in parallel.

### After (With Dependencies)
```
Spread this: Research auth (1), Design DB (2) depends on 1, Write API (3) depends on 2
```
Tasks run in order.

### Hybrid (Some Dependencies)
```
Spread this: Research auth (1), Research UI (2), Design DB (3) depends on 1,
Write API (4) depends on 3, Write UI code (5) depends on 2
```
Tasks 1, 2 run in parallel.
Tasks 3 waits for 1.
Task 4 waits for 3.
Task 5 waits for 2.

## FAQ

**Q: Can I have a task depend on multiple tasks?**
A: Yes! Use comma-separated IDs: `Task C (3) depends on 1, 2`

**Q: What happens if a task fails?**
A: Currently, all tasks spawn. In production, dependents would wait or fail.

**Q: Can I change dependencies after spawning?**
A: Not yet. For now, cancel and respawn with corrected dependencies.

**Q: Is there a limit to task depth?**
A: No, but deeper chains reduce parallelism benefits.

**Q: Can I see a visual graph of dependencies?**
A: Not yet, but it's planned. The text-based execution plan shows the structure.

## Getting Help

Say `Help` to Spreader to see all commands and syntax examples.

---

**Status**: Production ready
**Agent**: Spreader v1.0 with DAG dependencies
**Last Updated**: 2025-01-06
