## 2026-05-17 - [Accessible Modal Focus & Keyboard Support]
**Learning:** In a Vanilla JS app where modals are toggled by adding/removing CSS classes (e.g., '.visible'), manual focus management and global keyboard listeners are necessary since the 'dialog' element's native behaviors aren't used.
**Action:** Always save the 'document.activeElement' before opening a modal and restore it upon closure. Use 'setTimeout' or direct '.focus()' on the close button to ensure keyboard users are not lost in the background DOM.

## 2025-05-24 - [Accessible Live Notifications]
**Learning:** In a dynamic Vanilla JS environment, toast notifications are often missed by screen readers if the container isn't pre-configured with ARIA live regions.
**Action:** Ensure the toast container has `aria-live="polite"` and `aria-atomic="true"`. Dynamically created toasts should be assigned `role="status"` (for info/success) or `role="alert"` (for errors) to trigger immediate announcement.

## 2025-05-24 - [Interactive Badge Accessibility]
**Learning:** Elements styled as "badges" that trigger actions (like copying text) are invisible to keyboard and screen reader users unless explicitly marked as interactive.
**Action:** Apply `role="button"`, `tabindex="0"`, and `aria-label` to badges intended for interaction. Implement `onkeydown` listeners to support 'Enter' and 'Space' keys alongside `onclick`.
