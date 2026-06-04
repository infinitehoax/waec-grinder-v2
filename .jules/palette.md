## 2025-05-15 - Vanilla JS ARIA Sync & Module Exposure
**Learning:** In Vanilla JS, dynamic UI state changes (like toggling host settings) require manual ARIA attribute synchronization to remain accessible. Additionally, when using ES modules, objects must be explicitly attached to `window` to be accessible from inline HTML `onclick` handlers.
**Action:** Use `Lobby.updateSubjectUI(this)` and ensure `window.Lobby` is assigned in the template. Synchronize `aria-pressed` in all toggle handlers.
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

## 2025-05-27 - [Redundant Progress Indicators]
**Learning:** When using visual progress bars alongside textual summaries (e.g., "12/55 mastered"), the bar itself provides redundant information that can clutter screen reader output if not handled.
**Action:** Apply `aria-hidden="true"` to the visual progress bar container. Ensure the textual summary is descriptive enough to stand alone for accessibility users while the bar provides "at-a-glance" value for visual users.
## 2025-05-27 - [Contextual Selection & Keyboard Visibility]
**Learning:** For bulk selection lists (like subject selection), providing global controls (All/None) and contextual metadata (counts/mastery) significantly reduces cognitive load. Using ':focus-within' on container labels for checkboxes ensures that keyboard users have a clear visual indicator of their current position even when the native checkbox is small.
**Action:** Always include global batch controls for long lists. Use ':focus-within' to provide container-level focus states for interactive items that wrap smaller inputs.

## 2025-05-28 - [Dynamic Form Experience & Asynchronous Feedback]
**Learning:** In a study-heavy Vanilla JS app, fixed-height textareas for theory questions create friction. Implementing auto-resizing textareas via 'scrollHeight' improves focus. Additionally, because LLM-backed features (like AI grading or explanations) have variable latency, using 'aria-busy' and 'showToast' is critical to prevent users from feeling stuck during the "thinking" phase.
**Action:** Always implement auto-resize for large text inputs using 'element.style.height = element.scrollHeight + "px"'. Use 'aria-busy="true"' on trigger buttons during API calls to maintain accessibility.

## 2025-05-28 - [Report Card Accessibility & Visual Delight]
**Learning:** Decorative elements in report cards (like topic progress bars) can clutter screen reader output if not hidden. Furthermore, subtle CSS transforms (e.g., 'translateY') during question transitions provide a necessary "layer" of delight that makes the app feel more premium without adding weight.
**Action:** Apply 'aria-hidden="true"' to purely visual progress indicators when a textual equivalent (e.g., "5/10") is present. Use subtle vertical transforms on '.transitioning' states to improve the feel of navigational flow.

## 2025-05-30 - [Visual Progress in Compressed Lists]
**Learning:** When adding visual progress indicators to compressed list items (like subject selection), using flex containers with explicit constraints (min-width/max-width) ensures layout stability across different screen sizes. Combining this with 'aria-hidden="true"' and a parent 'aria-label' maintains WCAG compliance without cluttering the accessibility tree with redundant percentage announcements.
**Action:** Use 'min-width' on sibling labels and 'max-width' on progress bars within flex containers to prevent layout shifting during dynamic content rendering.

## 2025-06-01 - [Semantic Form & State Communication]
**Learning:** In Jinja2-based Vanilla JS apps, form labels often lose association if 'for' attributes aren't explicitly paired with 'id's. Additionally, for single-selection lists styled as buttons (like OBJ options), using 'aria-pressed' provides an immediate accessibility win by communicating the 'selected' state to screen readers without a full radio-group refactor.
**Action:** Always verify label-input pairing in templates. Use 'aria-pressed' and 'aria-current' for dynamic selection and navigation states.

## 2025-06-05 - [Theory Draft Persistence & Auto-save]
**Learning:** In essay-heavy interfaces, user data loss during navigation (especially in CBT/Exam modes) is a major friction point. Persisting drafts to local storage on every keystroke (`oninput`) provides a fail-safe against accidental navigation or refreshes.
**Action:** Implement `oninput` handlers for long-form text inputs that synchronize the DOM state with the underlying storage model (`Storage.saveBatch`) in real-time.
