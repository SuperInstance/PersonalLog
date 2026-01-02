# Keyboard & Accessibility Quick Reference

## Global Keyboard Shortcuts

| Shortcut | Action | When Available |
|----------|--------|----------------|
| `Cmd+K` / `Ctrl+K` | New conversation | Always |
| `Cmd+/` / `Ctrl+/` | Focus search | Always |
| `Cmd+.` / `Ctrl+.` | Open settings | Always |
| `Escape` | Close modals/drawers | When modal open |
| `Cmd+N` / `Ctrl+N` | Next conversation | In messenger |
| `Cmd+P` / `Ctrl+P` | Previous conversation | In messenger |
| `Cmd+Enter` / `Ctrl+Enter` | Send message | In chat input |

## Quick Import Examples

```tsx
// Keyboard shortcuts
import { useKeyboardShortcuts, presetShortcuts } from '@/hooks/useKeyboardShortcuts'

// Focus management
import { useFocus } from '@/components/providers/KeyboardNavigationProvider'
import { useFocusTrap, useFocusRestoration } from '@/hooks/useFocusTrap'

// Live announcements
import { useLiveAnnouncer, useToastAnnouncer } from '@/components/ui/LiveAnnouncer'
```

## Common Patterns

### Add a Keyboard Shortcut

```tsx
useKeyboardShortcuts({
  shortcuts: [
    {
      key: 's',
      metaKey: true,
      ctrlKey: true,
      handler: () => handleSave(),
      description: 'Save document'
    }
  ]
})
```

### Announce to Screen Readers

```tsx
const { announce } = useLiveAnnouncer()

// Success
announce('Document saved successfully', 'status')

// Error
announce('Failed to save document', 'alert')

// Progress
announceProgress(50, 100, 'Uploading')
```

### Focus Trap in Modal

```tsx
const modalRef = useRef<HTMLDivElement>(null)

useFocusTrap({
  container: modalRef,
  enabled: isOpen,
  autoFocus: true,
  onEscape: onClose
})
```

## Testing

1. **Keyboard Navigation Test:**
   - Press Tab to navigate through UI
   - Press Shift+Tab for reverse navigation
   - Verify focus rings appear on keyboard nav
   - Verify focus rings DON'T appear on mouse clicks

2. **Screen Reader Test:**
   - Enable VoiceOver (Mac) or NVDA (Windows)
   - Press Tab once to see skip links
   - Activate skip link to jump to main content
   - Verify announcements are spoken

3. **Focus Trap Test:**
   - Open a modal
   - Press Tab repeatedly
   - Verify focus stays within modal
   - Press Escape to close
   - Verify focus returns to trigger element

## Browser DevTools

### Check Focus Order
1. Open Chrome DevTools
2. Go to Elements tab
3. Press Tab through the page
4. Watch for focus indicator in DevTools

### Check ARIA Attributes
1. Open Chrome DevTools
2. Go to Accessibility tab
3. Inspect element
4. View ARIA attributes and roles

### Check Keyboard Listeners
1. Open React DevTools
2. Inspect components
3. Look for useKeyboardShortcuts hooks
4. Verify registered shortcuts

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible and clear
- [ ] Skip links present and functional
- [ ] Form fields have labels
- [ ] Error messages announced
- [ ] Loading states announced
-- [ ] Modals trap focus
- [ ] Focus restored after modal close
- [ ] Color contrast sufficient (WCAG AA)
- [ ] Text resizable to 200%
- [ ] No seizure-inducing content

## Troubleshooting

**Problem:** Focus rings not showing
- **Solution:** Check if `:focus-visible` is implemented in CSS
- **Alternative:** Use KeyboardNavigationProvider

**Problem:** Screen reader not announcing
- **Solution:** Ensure element has `role="status"` or `role="alert"`
- **Alternative:** Use useLiveAnnouncer hook

**Problem:** Focus escaping modal
- **Solution:** Use useFocusTrap with enabled={isOpen}
- **Check:** Ensure modal has all focusable elements

**Problem:** Keyboard shortcuts not working
- **Solution:** Check if typing in input field (shortcuts disabled)
- **Alternative:** Add `ignoreInputs: false` to shortcut config

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Focus-Visible Polyfill](https://github.com/WICG/focus-visible)
- [React Accessibility Docs](https://react.dev/learn/accessibility)
