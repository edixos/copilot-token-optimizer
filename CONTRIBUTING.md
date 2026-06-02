# Contributing to Copilot Token Optimizer

This project adapts the documentation-optimization workflow for GitHub Copilot. Contributions are welcome in four main areas:

- framework examples
- CLI behavior
- helper scripts in `templates/hooks/`
- documentation and setup prompts

---

## Reporting Issues

Before opening a new issue, check [existing issues](https://github.com/nadimtuhin/copilot-token-optimizer/issues).

When filing a bug, include:

- what command you ran
- expected behavior
- actual behavior
- framework or stack involved
- minimal reproduction if possible

## Local Development

```bash
npm install
npm test
```

If you change CLI behavior, add or update tests in `tests/`.

## Framework Example Contributions

Framework examples live in `examples/`. New examples should explain how to tailor the generated `.github/copilot-instructions.md`, `.copilot/`, and `docs/learnings/` structure for a specific stack.

Each example should include:

- project context and common stack
- directory structure guidance
- top 5 common mistakes
- quick-start commands
- suggested `docs/learnings/` topics
- framework-specific testing notes

Still useful additions:

- Rust (Actix or Axum)
- Phoenix
- ASP.NET Core

## Documentation Changes

Good documentation changes usually do one of these:

- remove ambiguity from setup steps
- improve Copilot-specific wording
- tighten token guidance
- fix broken cross-references
- add clearer examples for real-world repos

## Helper Script Changes

The scripts in `templates/hooks/` are optional Copilot helper scripts, not native GitHub Copilot hooks. If you change them:

- keep them portable shell scripts
- preserve the `# EVENT:` and `# DESCRIPTION:` metadata headers
- document any new environment variables
- explain how the script fits a Copilot workflow

## Pull Requests

1. Fork the repository.
2. Create a focused branch.
3. Add tests for behavior changes.
4. Run `npm test`.
5. Open a PR with a clear summary and any before/after token data if relevant.

## Style Notes

- Keep `.github/copilot-instructions.md` guidance concise.
- Prefer linked deep dives over repeating details in multiple files.
- Keep token estimates directional and realistic rather than overly precise.
- Match the existing project style unless a change clearly improves clarity.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
