# Bolt's Journal ⚡

## 2025-05-17 - [Initial Profiling]
**Learning:** Disk I/O is a silent killer. Reading 100KB+ JSON files on every request adds unnecessary latency and wear. Connection handshakes for AI services also add up.
**Action:** Implement memory caching for static data and connection pooling for external APIs.

## 2025-05-18 - [Frontend I/O and Rendering]
**Learning:** In a vanilla JS app, frequent `localStorage` access with `JSON.parse` can cause frame drops during heavy UI updates. Redundant library initialization (like `marked`) inside hot functions (like `formatText`) adds significant CPU overhead.
**Action:** Always implement a caching layer for `localStorage` and move library configurations to the module level.

## 2025-05-21 - [Multiplayer Payload & Logic]
**Learning:** Frequent WebSocket broadcasts (like `progress_updated`) can become a bottleneck if the payload contains redundant large lists (like `mastered_ids`) or if the server performs O(N) completion checks on every O(1) update.
**Action:** Always sanitize room state before broadcasting to remove internal/large fields. Gate game-completion loops behind status flags (e.g., `if finished:`) to avoid redundant iterations.
