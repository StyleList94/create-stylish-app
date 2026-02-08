# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLI tool (`create-stylish-app`) that scaffolds JavaScript web applications from templates. Published on npm, invoked via `pnpm create stylish-app`, `npx create-stylish-app`, etc.

## Development

**No build step** — the entire CLI is a single ES module file (`index.js`), shipped directly to npm.

**No test framework** — no automated tests exist.

**No lint/format config** — no ESLint or Prettier configuration.

Install dependencies:

```bash
pnpm install
```

Test locally (creates a real project directory — clean up after):

```bash
node index.js my-app -t next
# after testing: rm -rf my-app
```

Test as an installed CLI:

```bash
pnpm link --global
create-stylish-app my-app -t react
```

## Publishing

Automated via GitHub Actions on release creation (OIDC auth, no npm token needed).

Release steps:

1. Bump `version` in `package.json`
2. Commit (e.g., `chore(release): vX.Y.Z`)
3. Create a GitHub release — this triggers the publish workflow

## Updating Templates

Update `TEMPLATE_VERSION` constant in `index.js` to match the latest tag from [`stylish-app-kit` releases](https://github.com/StyleList94/stylish-app-kit/releases).

## Architecture

Single-file CLI (`index.js`, ~380 lines) with this flow:

1. **Parse args** — Commander.js parses `[app-name]` and `-t, --template` option
2. **Interactive prompts** — `@clack/prompts` fills in missing app name and template selection
3. **Download** — Fetches tarball from `StyleList94/stylish-app-kit` GitHub repo at a pinned tag (`TEMPLATE_VERSION` constant)
4. **Extract** — Extracts the matching template directory from the tarball using `tar`
5. **Configure** — Rewrites `package.json` with project name and version `0.1.0`
6. **Install** — Runs the detected package manager's install command (detects npm/pnpm/yarn/bun via `npm_config_user_agent`)
7. **Git init** — Creates initial commit on `main` branch

### Template System

Templates live in a separate repo (`StyleList94/stylish-app-kit`) and are fetched as a tarball from a pinned git tag. The `TEMPLATE_MAP` constant maps CLI template names to directory names in that repo:

| CLI name    | Directory in stylish-app-kit |
| ----------- | ---------------------------- |
| `next`      | `next-app`                   |
| `react`     | `react-app`                  |
| `astro`     | `astro-app`                  |
| `ethereum`  | `ethereum-dapp`              |
| `extension` | `extension`                  |
| `ui`        | `ui-kit`                     |

## Key Constants

- `TEMPLATE_VERSION` — pinned git tag for template downloads (currently `v1.0.1`)
- `TARBALL_URL` — constructed from `TEMPLATE_VERSION`, points to GitHub codeload
- `TEMPLATE_MAP` — CLI template name → repo directory mapping

## Conventions

- ES modules (`"type": "module"` in package.json)
- Node.js >= 20.19.0 required
- Package manager: pnpm (lockfile is `pnpm-lock.yaml`)
- Only `index.js` is published to npm (via `"files"` field)

## Gotchas

- `process.chdir(appPath)` is called mid-execution — all operations after template extraction run inside the new project directory
- For non-pnpm package managers, the template's `pnpm-lock.yaml` is deleted before `install`
- Tarball extraction uses `strip: 3` to skip `stylish-app-kit-{version}/templates/{dir}/` prefix
- `buildPackageJson` removes `description` and `author` fields from the template's package.json via destructuring
