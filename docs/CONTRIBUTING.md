# 👩‍💻 Contributing to WAEC Grinder

Thank you for helping improve the WAEC Grinder! This project follows strict conventions to maintain code quality and automated workflows.

---

## 📜 Coding Standards

- **Language**: Vanilla JavaScript, CSS, and HTML only for the frontend. **No frameworks** (React, Vue, Tailwind, etc.) unless explicitly approved.
- **Backend**: Python 3.x with Flask and Flask-SocketIO.
- **Formatting**:
  - JS: Use ES6 modules.
  - CSS: Use CSS variables defined in `variables.css`.
  - JSON: Ensure all question data follows the schema in [TEACHER_FORMAT.md](TEACHER_FORMAT.md).

---

## 🏷️ Commit & PR Naming Convention

We use a mandatory prefix system for all commits and Pull Request titles. Non-compliant PRs will be blocked by CI.

### 🚀 Features
- `feat:` - New features (e.g., `feat: added AI caching`)
- `add:` - Adding new resources/files (e.g., `add: math rendering support`)
- `New:` - Significant new modules (e.g., `New: multiplayer lobby`)

### 🐛 Bug Fixes
- `fix:` - General bug fixes
- `bug:` - Specific bug resolutions
- `patch:` - Small tweaks and hotfixes

### 📝 Maintenance
- `docs:` - Documentation updates
- `chore:` - Refactoring, dependencies, and cleanup
- `test:` - Adding or updating tests

---

## 🧪 Testing

Always run the full test suite before submitting a PR:

```bash
python3 tests/run_all_tests.py
```

### Adding New Tests
- **Unit Tests**: Place in `tests/` with `test_*.py` prefix.
- **UI Tests**: Use Playwright and place in `tests/` with `verify_*.py` prefix.

---

## 🤖 Agent Instructions

If you are an AI agent working on this repository:
1. Always read `AGENTS.md` at the root.
2. Follow the mandatory naming conventions for all outputs.
3. Update `.jules/bolt.md` (performance) or `.jules/palette.md` (UI/UX) if you make significant changes in those areas.
