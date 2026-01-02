# Agent 2 Briefing: Code Organization Specialist

**Focus:** Split large files, extract shared components, create patterns

---

## Your Mission

Break down large components into smaller, manageable pieces and extract reusable patterns.

---

## Analysis Phase

Read these files to understand current structure:
1. `/mnt/c/users/casey/PersonalLog/src/app/setup/page.tsx` (995 lines)
2. `/mnt/c/users/casey/PersonalLog/src/app/setup/edit/[id]/page.tsx` (696 lines)
3. `/mnt/c/users/casey/PersonalLog/src/app/(messenger)/page.tsx`

Identify logical groupings for extraction.

---

## Implementation Tasks

### Task 1: Split Setup Page
**File:** `/mnt/c/users/casey/PersonalLog/src/app/setup/page.tsx`

Extract into separate components:
```
src/components/setup/
  ├── SetupWizard.tsx       # Main orchestrator
  ├── SetupProgress.tsx      # Progress indicator
  ├── WelcomeStep.tsx        # Step 1
  ├── ModulesStep.tsx        # Step 2
  ├── ConfigureStep.tsx      # Step 3
  └── CompleteStep.tsx       # Step 4
```

### Task 2: Split Edit Page
**File:** `/mnt/c/users/casey/PersonalLog/src/app/setup/edit/[id]/page.tsx`

Extract:
```
src/components/setup/
  ├── AgentEditor.tsx        # Main editor
  ├── TabNavigation.tsx      # Tab switcher
  ├── PersonalityTab.tsx     # Personality config
  ├── SystemPromptTab.tsx    # System prompt
  ├── KnowledgeTab.tsx       # Knowledge base
  └── AdvancedTab.tsx        # Advanced settings
```

### Task 3: Extract Form Components
**Create:** `src/components/ui/form/`

Reusable form components:
- `Input.tsx` - Text input with label, error, helper
- `Textarea.tsx` - Textarea with auto-resize
- `Select.tsx` - Select dropdown
- `Toggle.tsx` - Switch/toggle
- `Slider.tsx` - Range slider
- `FieldGroup.tsx` - Field container with label/error

### Task 4: Create Button Library
**Create:** `src/components/ui/Button.tsx`

Consistent button API:
```tsx
<Button variant="primary|secondary|danger|ghost" size="sm|md|lg">
  {children}
</Button>
```

### Task 5: Extract Conversation Components
**Create:** `src/components/conversations/`

From messenger page, extract:
- `ConversationSidebar.tsx`
- `ConversationListItem.tsx`
- `NewConversationButton.tsx`

---

## Guidelines

- Each component should be under 200 lines
- Single responsibility per component
- Props interfaces clearly defined
- Export from index files for clean imports

---

## Output

Create summary at: `/mnt/c/users/casey/PersonalLog/.agents/phase-3/agent-2-summary.md`

---

**Aim for components that are easy to understand and test.**
