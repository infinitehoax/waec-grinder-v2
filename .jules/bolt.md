# Bolt's Journal

## 2025-05-23 - Atomic Storage Updates
**Learning:** Redundant `localStorage` I/O (Disk I/O) is a major bottleneck in Vanilla JS apps that persist state frequently. Consolidating multiple state changes (queues, stats, mastery) into a single read-modify-write cycle significantly improves responsiveness.
**Action:** Always encapsulate state logic within the `Storage` module and provide high-level atomic methods for frequent operations like recording question results or draining batches.

## 2025-05-23 - Performance Cloning
**Learning:** `structuredClone` is significantly faster than `JSON.parse(JSON.stringify())` for deep cloning in modern environments.
**Action:** Use `structuredClone` with a fallback for object cloning in performance-critical paths like in-memory caches.

## 2025-05-23 - Single Source of Truth for Stats
**Learning:** Maintaining redundant counters for UI statistics (like "Mastered" count) separately from the actual data collections leads to synchronization bugs.
**Action:** Derive UI statistics directly from the lengths or properties of the primary data arrays/objects in the storage layer to ensure they are always consistent with the underlying state.
