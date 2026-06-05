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

## 2025-05-28 - [Indexed Storage Lookups]
**Learning:** Even simple UI counters (like `getSubjectsWithMasteryCount`) can become performance bottlenecks if they rely on `localStorage.length` and `localStorage.key(i)` iterations. In applications with many stored items, this O(N) scan causes noticeable UI jank.
**Action:** Always prefer indexed lookups using a tracking key (like `wg_subjects_started`) to bound the search space to relevant items only.

## 2026-05-27 - [Side-Effect Prevention & Connection Pooling]
**Learning:** `random.shuffle()` in Python operates in-place. Mutating data directly from a shared in-memory cache leads to unexpected state changes across sessions. Additionally, repeated outbound API calls (like to Trophy) incur significant overhead due to constant TCP/TLS handshakes.
**Action:** Always create a copy (e.g., `list(data)`) before performing in-place mutations on cached objects. Implement `requests.Session()` for service-level connection pooling to minimize network latency.

## 2025-06-01 - [Algorithmic Optimization in Storage]
**Learning:** Using `Array.prototype.includes()` inside a `filter()` loop results in O(N*M) complexity. For large question banks, this causes noticeable lag when starting sessions or draining batches.
**Action:** Convert lookup arrays to `Set` objects before entering loops to achieve O(1) lookups, reducing the overall complexity to O(N+M).

## 2025-06-02 - [Conditional Cloning in Storage]
**Learning:** Automatic deep cloning (via `structuredClone`) on every storage access prevents side effects but adds significant CPU overhead when question pools are large. In many cases, the retrieved data is immediately mapped or transformed, making the clone redundant.
**Action:** Implement an optional `clone` parameter in storage accessors. Pass `clone=false` when the caller immediately performs a transformation (like `.map()` or `.filter()`) that creates new object instances, saving CPU cycles without risking cache corruption.

## 2026-06-04 - [Parallel I/O for Multi-Part Tasks]
**Learning:** Sequential execution of multiple I/O-bound tasks (like AI grading for each sub-question) multiplies latency and leads to a poor user experience. For a 3-part question, wait time can exceed 10 seconds if handled serially.
**Action:** Utilize `Promise.all` in the frontend to parallelize independent API requests. This reduces total wait time to approximately the duration of the single slowest request. Ensure the UI provides concurrent feedback for all parallel tracks to maintain responsiveness.
