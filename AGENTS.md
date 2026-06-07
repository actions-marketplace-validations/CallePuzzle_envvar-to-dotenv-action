# Agent Guide for `envvar-to-dotenv-action`

> This guide was created from the actual project files. It is intended for AI coding agents that need to understand, modify, build, test, or release this project.

## Project Overview

`envvar-to-dotenv-action` is a **GitHub Action** that appends one or more environment variables to a dotenv (`.env`) file. It supports three modes of operation:

1. **Single variable** — `variableName`
2. **Comma-separated list** — `variableNames`
3. **Regex filter** — `variableNamesByFilter` (all matching environment variables are written; if the regex contains a capture group, the captured portion becomes the key)

- **Repository**: `CallePuzzle/envvar-to-dotenv-action`
- **Version**: `0.1.0`
- **License**: `GPL-3.0-only`
- **Runtime**: Node 20 (`action.yml` specifies `using: 'node20'`, `.github/workflows/test.yml` uses `node-version: "20.x"`)

## Technology Stack

- **Language**: TypeScript (target `es6`, module `commonjs`)
- **Package manager**: [Bun](https://bun.sh/) (lockfile is `bun.lock`)
- **Bundler**: [`@vercel/ncc`](https://github.com/vercel/ncc) — compiles the TypeScript source into a single `dist/index.js` that the action executes
- **GitHub Actions SDK**: `@actions/core` for input handling, logging, secret masking, and exporting variables
- **Dotenv parsing**: `dotenv` (only `dotenv.parse` is used to read existing files)
- **Test framework**: Jest with `ts-jest`, running in the Node environment
- **Linter**: [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) — high-performance JavaScript/TypeScript linter
- **Release automation**: `semantic-release` via `cycjimmy/semantic-release-action@v3`, configured in `.releaserc.yaml`

## Project Structure

```
.
├── action.yml                          # GitHub Action metadata and inputs
├── package.json                        # Scripts, dependencies, devDependencies
├── bun.lock                            # Bun lockfile
├── tsconfig.json                       # TypeScript compiler options
├── jest.config.js                      # Jest preset: ts-jest, node environment
├── .oxlintrc.json                      # Oxlint configuration
├── .releaserc.yaml                     # semantic-release plugins
├── src/
│   ├── main.ts                         # Entry point: reads inputs and dispatches
│   ├── write.ts                        # Core write logic: mask, export, merge, write
│   ├── writeVariableName.ts            # Single variable handler
│   ├── writeVariableNames.ts           # Comma-separated variables handler
│   └── writeVariableNamesByFilter.ts   # Regex filter handler
├── __tests__/
│   ├── main.test.ts                    # Jest test suite
│   ├── .env                            # Generated during tests (gitignored)
│   └── results/
│       ├── variable-name.env           # Expected output for single-variable tests
│       └── variable-names.env          # Expected output for multi-variable/regex tests
├── dist/
│   └── index.js                        # Compiled bundle (must be committed)
└── .github/workflows/
    ├── test.yml                        # CI: install, test, build, run action
    └── release.yaml                    # CD: semantic-release on merge to main
```

## Action Inputs (`action.yml`)

| Input | Required | Default | Purpose |
|-------|----------|---------|---------|
| `variableName` | No | — | Name of a single environment variable to write |
| `variableNames` | No | — | Comma-separated list of environment variables to write |
| `variableNamesByFilter` | No | — | Regex to filter environment variables; matching variables are written |
| `envPath` | No | `.env` | Path to the dotenv file to write or update |

## Build and Development Commands

The project is designed to be used with **Bun**, but the scripts in `package.json` invoke `npx`, so either Bun or npm can run them as long as dependencies are installed.

```bash
# Install dependencies (CI uses --frozen-lockfile)
bun install --frozen-lockfile

# Run the Jest test suite
bun run test
# or
npx jest

# Build the single-file bundle into dist/index.js
bun run build
# or
npx ncc build src/main.ts -o dist

# Run the linter
bun run lint
# or
npx oxlint .

# Run the linter with auto-fix
bun run lint:fix
# or
npx oxlint --fix .
```

**Important**: After any source change, you must run `bun run build` and commit the updated `dist/index.js`, because `action.yml` points directly at the bundled file.

## Testing Instructions

- Tests live in `__tests__/main.test.ts`.
- Jest is configured via `jest.config.js` with the `ts-jest` preset and `testEnvironment: 'node'`.
- `@actions/core` is mocked (`jest.mock('@actions/core')`), so tests do not emit GitHub Actions commands.
- The test suite sets `process.env.KEY1`, `process.env.KEY2`, `process.env.PRE_KEY1`, and `process.env.PRE_KEY2`.
- `beforeEach` deletes `__tests__/.env` if it exists.
- `afterEach` reads the expected fixture from `__tests__/results/` and compares it byte-for-byte with the generated `__tests__/.env`.

### Fixture files

| Fixture | Expected content |
|---------|------------------|
| `__tests__/results/variable-name.env` | `KEY1=VALUE1` |
| `__tests__/results/variable-names.env` | `KEY1=VALUE1\nKEY2=VALUE2` |

### Running tests locally

```bash
bun install --frozen-lockfile
bun run test
```

## CI/CD

### Pull-request workflow (`.github/workflows/test.yml`)

Triggered on pull requests to `main`:

1. Checkout the code (`actions/checkout@v4`)
2. Set up Node 20 (`actions/setup-node@v4`)
3. Cache `node_modules` using `bun.lock`
4. Set up Bun (`oven-sh/setup-bun@v2`, latest version)
5. `bun install --frozen-lockfile`
6. `bun run test`
7. `bun run build`
8. Exercise the local action with `variableName`, `variableNames`, and `variableNamesByFilter`
9. Print `.env` after each run

### Release workflow (`.github/workflows/release.yaml`)

Triggered on pushes to `main`:

1. Checkout the code
2. Run `cycjimmy/semantic-release-action@v3` with `GITHUB_TOKEN`

Release behavior is controlled by `.releaserc.yaml`:

```yaml
branches:
  - main
plugins:
  - '@semantic-release/commit-analyzer'
  - '@semantic-release/release-notes-generator'
  - '@semantic-release/github'
```

## Code Style Guidelines

- **Indentation**: 4 spaces (observed in all `src/*.ts` files)
- **Quotes**: single quotes for strings and imports
- **Semicolons**: present at end of statements
- **Interfaces**: each module defines a small local `interface` for its inputs; no shared types package
- **Imports**: `import * as core from '@actions/core'` and explicit named imports from sibling modules
- **File naming**: camelCase for source files (`writeVariableName.ts`, etc.)
- **Strict TypeScript**: `tsconfig.json` enables `strict`, `noImplicitAny`, and `esModuleInterop`
- **Linter**: Oxlint is configured via `package.json` scripts. Keep new code consistent with the existing 4-space, single-quote style and ensure it passes `bun run lint`

## Security Considerations

- **Secrets masking**: `write.ts` calls `core.setSecret(variable.value)` before writing, so GitHub Actions masks the value in logs.
- **Variable export**: `write.ts` also calls `core.exportVariable(variable.key, variable.value)`, which re-exports the variable to subsequent workflow steps.
- **File writes**: the action reads the existing dotenv file (if any), merges new values on top, and rewrites the entire file. Be careful with file permissions and paths when running locally or in self-hosted runners.
- **Regex input**: `variableNamesByFilter` is passed directly to `new RegExp(...)`. It is treated as user input from the workflow definition; there is no additional escaping. Ensure any changes preserve this behavior or explicitly sanitize if required.
- **Committed bundle**: `dist/index.js` is the executable artifact. Because it is committed to the repository, review the generated diff after every build to avoid shipping unintended code.
- **Gitignored artifacts**: `node_modules`, `.idea`, and `__tests__/results/.env` are ignored. Do not commit test-generated `.env` files because they may contain secret-like values during CI runs.

## Quick Reference for Agents

| Task | Command |
|------|---------|
| Install deps | `bun install --frozen-lockfile` |
| Run tests | `bun run test` |
| Build bundle | `bun run build` |
| Run linter | `bun run lint` |
| Fix linter issues | `bun run lint:fix` |
| Rebuild after source edits | `bun run build` + commit `dist/index.js` |
| Run action locally in CI | Use the steps in `.github/workflows/test.yml` |
