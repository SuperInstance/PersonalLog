# PersonalLog Accessibility Guide

## Overview

PersonalLog is committed to providing an accessible experience for all users, regardless of ability. This guide documents the accessibility features implemented and how to use them.

## WCAG 2.1 Compliance

PersonalLog aims to meet **WCAG 2.1 Level AA** standards across all features.

### Key Accessibility Features

- ✅ Full keyboard navigation
- ✅ Screen reader support
- ✅ Focus management
- ✅ Semantic HTML
- ✅ ARIA labels and roles
- ✅ Skip links
- ✅ Live regions for dynamic content
- ✅ Reduced motion support
- ✅ High contrast mode support
- ✅ Text scaling up to 200%
- ✅ Focus indicators
- ✅ Error handling and announcements

---

## Keyboard Navigation

### Global Shortcuts

PersonalLog provides comprehensive keyboard shortcuts for all major functions:

| Shortcut | Action |
|----------|--------|
| `Tab` / `Shift+Tab` | Navigate between interactive elements |
| `Enter` / `Space` | Activate buttons, links, and selectable items |
| `Escape` | Close modals, drawers, and cancel actions |
| `⌘K` / `Ctrl+K` | New conversation |
| `⌘N` / `Ctrl+N` | Next conversation |
| `⌘P` / `Ctrl+P` | Previous conversation |
| `⌘/` / `Ctrl+/` | Open keyboard shortcuts help |
| `⌘Enter` / `Ctrl+Enter` | Send message |
| `⌘.` / `Ctrl+.` | Open settings |

### Navigation Patterns

1. **Tab Order**: Logical tab order follows the visual layout (left-to-right, top-to-bottom)
2. **Focus Trapping**: Modals trap focus within their boundaries
3. **Focus Restoration**: Focus returns to the triggering element after closing a modal
4. **Skip Links**: Press `Tab` on page load to access "Skip to main content" link

### Keyboard-Specific Features

- **Focus Visible**: Clear focus indicators only show for keyboard navigation (not mouse)
- **Auto-Focus**: Modals automatically focus the first interactive element
- **Escape Handlers**: All overlays close with `Escape` key
- **Shortcuts Modal**: Press `⌘/` to see all available shortcuts

---

## Screen Reader Support

### Semantic Structure

PersonalLog uses semantic HTML5 landmarks for easy navigation:

- **`<nav>`**: Main navigation (AppNav)
- **`<main>`**: Primary content area
- **`<aside>`**: Sidebar (ConversationList)
- **`<header>`**: Page headers and conversation info
- **`<footer>`**: Status and metadata information

### ARIA Labels and Roles

#### Navigation
- Main nav: `role="navigation" aria-label="Main navigation"`
- Nav items: `role="menuitem"` with `aria-current="page"` for active page
- Mobile menu toggle: `aria-expanded` and `aria-controls`

#### Conversations
- Conversation list: `role="region" aria-label="Conversation list"`
- Conversation items: `role="listitem"` with descriptive `aria-label`
- Search input: `aria-label="Search conversations" aria-controls="conversation-list"`

#### Messages
- Message container: `role="log" aria-live="polite"`
- Message bubbles: `role="article"` with descriptive `aria-label`
- System messages: `role="status"`
- Failed messages: `role="alert" aria-live="assertive"`

#### Forms
- Input areas: `role="form" aria-label="Message composer"`
- Textarea: `aria-label` + `aria-describedby` for hints
- Buttons: Clear `aria-label` for icon-only buttons
- Toggle switches: `role="switch" aria-checked`

### Live Regions

PersonalLog uses ARIA live regions to announce dynamic content:

```tsx
// Polite updates (non-urgent)
<div role="status" aria-live="polite" aria-atomic="true" />

// Assertive updates (urgent errors)
<div role="alert" aria-live="assertive" aria-atomic="true" />
```

**Announced Events**:
- New messages arriving
- Message send status (success/failure)
- Loading state changes
- Error messages
- Progress updates

### Screen Reader Testing

Tested with:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

---

## Visual Accessibility

### Color Contrast

All text meets **WCAG AA** contrast requirements:
- Normal text: Minimum 4.5:1 contrast ratio
- Large text (18pt+): Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio

### Themes

Both light and dark themes maintain accessibility:
- Light theme: High contrast dark text on light backgrounds
- Dark theme: Carefully tuned to maintain contrast ratios
- No reliance on color alone to convey information

### Text Sizing

- Base font size: 16px (prevents zoom on mobile)
- Scalable up to **200%** without breaking layout
- Responsive text sizing across breakpoints
- Maximum line width: 70 characters for readability

### Focus Indicators

Clear, visible focus indicators for keyboard navigation:
- 2px solid outline with offset
- High contrast ring color
- Only shows for keyboard navigation (not mouse clicks)
- Custom focus ring for dark mode

### Reduced Motion

Respects `prefers-reduced-motion` setting:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

All animations disabled for users who prefer reduced motion.

### High Contrast Mode

Supports `prefers-contrast: high`:
- Borders use currentColor for maximum contrast
- Ensures all interactive elements are clearly visible

---

## Cognitive Accessibility

### Clear Language

- Simple, straightforward UI labels
- Consistent terminology throughout
- Short, descriptive button text
- Clear error messages with actionable steps

### Consistent Navigation

- Same navigation structure across all pages
- Predictable interaction patterns
- Consistent icon usage
- Standard keyboard shortcuts

### Help and Documentation

- **Keyboard Shortcuts Help**: Press `⌘/` anytime
- **Inline hints**: Contextual help text near complex features
- **Status messages**: Clear feedback for all actions
- **Error recovery**: Guided steps to fix errors

### Time-Based Interactions

No time-limited interactions that cannot be:
- Paused
- Stopped
- Extended
- Adjusted

---

## Assistive Technology Compatibility

### Screen Magnifiers

- Layout remains usable at 200%+ zoom
- Text doesn't overlap or become unreadable
- Horizontal scrolling minimized
- Responsive design adapts to viewport

### Voice Control

- All buttons have clear labels
- Semantic HTML enables voice navigation
- Keyboard-accessible features work with voice commands
- Focus management works with speech control

### Alternative Input Devices

- Touch targets: Minimum 44×44px (mobile)
- Switch access: Full keyboard navigation support
- Eye tracking: Clear focus indicators and logical tab order

---

## Testing Accessibility

### Automated Testing

Run accessibility audits:

```bash
# Lighthouse CI
npm run lighthouse

# Axe-core testing
npm run test:a11y

# Pa11y CI
npm run test:pa11y
```

### Manual Testing Checklist

- [ ] Navigate entire app with keyboard only
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Verify all interactive elements have focus indicators
- [ ] Check color contrast with contrast checker
- [ ] Test with browser zoom at 200%
- [ ] Verify skip links work
- [ ] Test all modals trap focus
- [ ] Check form error messages are announced
- [ ] Verify reduced motion disables animations
- [ ] Test with high contrast mode

### Browser DevTools

Use Chrome DevTools Lighthouse:
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select "Accessibility" only
4. Click "Analyze page load"
5. Review accessibility score and issues

---

## Accessibility Best Practices (For Developers)

### Component Guidelines

When adding new components:

1. **Semantic HTML**: Use appropriate elements (`<button>`, `<nav>`, etc.)
2. **ARIA Attributes**: Add roles, labels, and states as needed
3. **Keyboard Accessible**: Ensure all interactions work with keyboard
4. **Focus Management**: Handle focus for dynamic content
5. **Screen Reader Testing**: Test with actual screen readers

```tsx
// Example: Accessible Button
<button
  type="button"
  role="button"
  aria-label="Close dialog"
  aria-pressed={false}
  onClick={handleClose}
  onKeyDown={(e) => e.key === 'Escape' && handleClose()}
>
  <XIcon />
</button>
```

### Form Accessibility

```tsx
// Example: Accessible Input
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  required
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby={hasError ? 'email-error' : undefined}
/>
{hasError && (
  <span id="email-error" role="alert">
    {errorMessage}
  </span>
)}
```

### Modal Accessibility

```tsx
// Example: Accessible Modal
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Modal description</p>
  <button onClick={onClose}>Close</button>
</div>
```

---

## Known Limitations

### Currently Working On

- **Color Contrast Audit**: Verifying all custom themes meet AA standards
- **Video Content**: No video content yet, will need captions when added
- **Audio Messages**: Will need transcripts when implemented

### Third-Party Limitations

- AI provider responses may not always be formatted accessibly
- External knowledge base documents vary in accessibility

---

## Accessibility Statement

PersonalLog is committed to continuous accessibility improvement. We:

1. Test with real assistive technology users
2. Monitor WCAG guideline updates
3. Fix accessibility issues in priority order
4. Train developers on accessibility best practices
5. Welcome accessibility feedback

### Reporting Issues

Found an accessibility issue? Please report it:

- **GitHub Issues**: https://github.com/SuperInstance/PersonalLog/issues
- **Label**: `accessibility`
- **Include**: Browser, assistive technology, steps to reproduce

---

## Resources

### Learn More

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)
- [MDN Accessibility Documentation](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Testing Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [VoiceOver (macOS)](https://www.apple.com/accessibility/voiceover/)

---

## Changelog

### Round 10 (Polish & Perfection)
- ✅ Comprehensive ARIA labels and roles
- ✅ Keyboard navigation improvements
- ✅ Reduced motion support
- ✅ High contrast mode support
- ✅ Live regions for dynamic content
- ✅ Skip links implementation
- ✅ Focus management system
- ✅ Screen reader testing

### Future Improvements
- [ ] Accessibility audit of all themes
- [ ] Automated accessibility testing in CI
- [ ] Accessibility statement page
- [ ] Video captions (when video is added)
- [ ] Audio transcripts (when audio is added)

---

**Last Updated**: 2026-01-03
**WCAG Level**: AA (Target)
**Status**: Active Development
