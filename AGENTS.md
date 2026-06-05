# 🤖 Agent Instructions: PR & Commit Naming Convention

To maintain organized release notes and automated versioning, all contributions MUST follow these naming conventions.

## 📚 Mandatory Prefixes

Every commit message and Pull Request title must start with one of the following prefixes followed by a colon and a space:

### 🚀 For Features:
- `feat:` (e.g., `feat: added AI caching for faster theory grading`)
- `add:` (e.g., `add: new math rendering support`)
- `New:` (e.g., `New: multiplayer mode lobby`)

### 🐛 For Bugs:
- `fix:` (e.g., `fix: resolved issue where failed queue duplicated questions`)
- `bug:` (e.g., `bug: corrected syntax error in JSON loader`)
- `patch:` (e.g., `patch: fixed timer not resetting`)

### 📝 For Other/Maintenance:
- `docs:` (e.g., `docs: updated README with new API instructions`)
- `chore:` (e.g., `chore: refactored CSS styling`)
- `test:` (e.g., `test: added playwright UI tests`)

## 🚫 Enforcement
- **CI Blocking**: Pull Requests with non-compliant titles will be automatically blocked by GitHub Actions.
- **Agent Duty**: As an AI agent, you MUST ensure your own commit messages and PR titles strictly adhere to these rules.
