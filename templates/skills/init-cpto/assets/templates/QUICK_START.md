# Quick Start — [PROJECT_NAME]

> Essential commands for daily development.

---

## Prerequisites

```bash
# [Install / setup steps required before dev]
```

## Development

```bash
[dev-command]          # Start local dev server / run locally
[watch-command]        # File watch mode (if applicable)
```

## Testing

```bash
[test-command]         # Run all tests
[test-single]          # Run a single test / package
[test-coverage]        # Tests with coverage report
```

## Build

```bash
[build-command]        # Build binary / production bundle
[lint-command]         # Lint check
[format-command]       # Format code
[typecheck-command]    # Type check (if applicable)
```

## Code Generation

```bash
[generate-command]     # Regenerate types / protos / API clients
# Run this whenever: [condition — e.g., CRD types change / openapi.json changes]
```

## Pre-Commit / Pre-MR Gate

```bash
[gate-command]         # Full gate — run before every push
```

## Common Local Workflows

### [Workflow 1 — e.g., "Add a new feature"]

```bash
# Step 1: [command]
# Step 2: [command]
# Step 3: [gate command]
```

### [Workflow 2 — e.g., "Update generated code"]

```bash
# Step 1: [command]
# Step 2: [command]
```

## Corporate Proxy

```bash
source ~/Renault/.proxies   # If any network command silently fails
```
