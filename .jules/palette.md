## 2026-05-17 - [Accessible Modal Focus & Keyboard Support]
**Learning:** In a Vanilla JS app where modals are toggled by adding/removing CSS classes (e.g., '.visible'), manual focus management and global keyboard listeners are necessary since the 'dialog' element's native behaviors aren't used.
**Action:** Always save the 'document.activeElement' before opening a modal and restore it upon closure. Use 'setTimeout' or direct '.focus()' on the close button to ensure keyboard users are not lost in the background DOM.

## 2025-05-24 - [Accessible Live Notifications]
**Learning:** In a dynamic Vanilla JS environment, toast notifications are often missed by screen readers if the container isn't pre-configured with ARIA live regions.
**Action:** Ensure the toast container has `aria-live="polite"` and `aria-atomic="true"`. Dynamically created toasts should be assigned `role="status"` (for info/success) or `role="alert"` (for errors) to trigger immediate announcement.

## 2025-05-24 - [Interactive Badge Accessibility]
**Learning:** Elements styled as "badges" that trigger actions (like copying text) are invisible to keyboard and screen reader users unless explicitly marked as interactive.
**Action:** Apply `role="button"`, `tabindex="0"`, and `aria-label` to badges intended for interaction. Implement `onkeydown` listeners to support 'Enter' and 'Space' keys alongside `onclick`.

## 2025-05-24 - [Programmatic Focus for Dynamic Content]
**Learning:** When content is dynamically replaced (e.g., transitioning to a new question), screen readers may stay focused on the previous location or lose context. Programmatic focus is required to guide the user.
**Action:** Use `tabindex="-1"` on the main content container and call `.focus()` whenever the content is updated to ensure screen readers announce the new state immediately.

## 2025-05-24 - [Manual ARIA Synchronization & Focus States]
**Learning:** In a Vanilla JS app where UI state is toggled via CSS classes (e.g., `.selected-mode`), ARIA attributes (like `aria-checked` or `aria-pressed`) must be manually updated in the same event handlers to maintain screen reader accuracy.
**Action:** Always pair class toggles with `.setAttribute('aria-checked', ...)` calls. For interactive `div`s, use `:focus-visible` to provide clear keyboard focus indicators without affecting mouse users.

## 2025-05-24 - [Modal Focus Trap & Backdrop Interaction]
**Learning:** Standard modals in Vanilla JS require explicit focus trapping to be fully accessible. Without it, keyboard users can "tab out" of the modal into the background content, which is disorienting and breaks the modal paradigm.
**Action:** Implement a focus trap by listening for the 'Tab' key and cycling focus between the first and last focusable elements of the modal. Always add a backdrop click listener for parity with modern UX expectations.

## 2025-05-25 - [Accessibility for Sequential Progress Indicators]
**Learning:** Progress dots or "step-dots" generated in Vanilla JS are often just empty spans. Without ARIA, screen reader users have no way of knowing how many questions are in a batch or which one is active.
**Action:** Always include an `aria-label` describing the step and its status (e.g., "Question 3 (Completed)") and use `aria-current="step"` on the active element.

## 2025-05-25 - [Dynamic Keyboard Shortcuts for Productivity]
**Learning:** For a study application, keyboard shortcuts like 'S' for skip or 'Ctrl+Enter' for submission are critical for a "flow state." However, they must be guarded against visibility and input focus to prevent accidental triggers.
**Action:** Implement global listeners that check `window.getComputedStyle(btn).display !== 'none'` and avoid triggering when the user is already focused on an input or textarea (unless specifically intended, like Ctrl+Enter).

## 2026-05-26 - Improving Shortcut Discoverability & Selection States
**Learning:** Keyboard shortcuts ('S' for skip, 'Enter' for next, 'Ctrl+Enter' for theory) are powerful but invisible. Users often miss them unless they read documentation. Additionally, toggle buttons (like batch size or timed session) in Vanilla JS environments often lack proper ARIA communication for their "pressed" state, making them inaccessible to screen readers.
**Action:** Always include subtle <kbd> hints in the UI for keyboard-driven actions (hiding them on mobile). Use 'aria-pressed' and 'aria-label' on toggle buttons and ensure the JS handlers update these attributes during DOM manipulation to maintain accessibility.
