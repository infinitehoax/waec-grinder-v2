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
## 2025-05-21 - [Multiplayer Payload & Logic]
**Learning:** Frequent WebSocket broadcasts (like `progress_updated`) can become a bottleneck if the payload contains redundant large lists (like `mastered_ids`) or if the server performs O(N) completion checks on every O(1) update.
**Action:** Always sanitize room state before broadcasting to remove internal/large fields. Gate game-completion loops behind status flags (e.g., `if finished:`) to avoid redundant iterations.

## 2025-05-24 - [Atomic Storage Operations]
**Learning:** Every `localStorage.setItem` call is a synchronous disk write. In high-frequency loops (like question grading), multiple sequential writes for the same subject data object (stats, queues, global counts) multiply I/O latency.
**Action:** Consolidate multiple related storage updates into a single atomic "transaction" (using a helper like `updateSubjectData`). This reduces Disk I/O by ~75% during core loops.

## 2025-05-27 - [Data Pre-Processing & Indexed Lookups]
**Learning:** Performing data transformations (like dictionary merging and tagging) inside high-frequency game loops adds unnecessary CPU overhead. On the frontend, iterating over ALL `localStorage` keys for every session start becomes a bottleneck as the user's data grows.
**Action:** Shift question metadata tagging (like `_type` and `_subject`) to the initial backend cache load. Maintain subject-level indices (e.g., `wg_subjects_started`) to enable O(1) or O(subjects) lookups instead of O(total_keys) scans.
