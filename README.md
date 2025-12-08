# Create Stylish App

Create a new Stylish JavaScript web app.

## App Template

All templates are available from [stylish-app-kit](https://github.com/StyleList94/stylish-app-kit):

- `next` - Next.js App
- `react` - React App (Vite)
- `astro` - Astro App
- `ethereum` - Ethereum DApp
- `extension` - Chrome Extension
- `ui` - UI Kit

## Getting Started

```bash
# pnpm
pnpm create stylish-app [app-name] [-t template-name]

# npm
npx create-stylish-app [app-name] [-t template-name]

# yarn
yarn create stylish-app [app-name] [-t template-name]
```

## Options

- `-t, --template <template-name>` - Template to use (`next`, `react`, `astro`, `ethereum`, `extension`, `ui`)

## Example

```bash
# interactive mode
pnpm create stylish-app

# with app name only (select template interactively)
pnpm create stylish-app my-app

# with template flag
pnpm create stylish-app my-app -t react
```
