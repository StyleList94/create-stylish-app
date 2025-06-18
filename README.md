# Create Stylish App

Create a new Stylish JavaScript web app.

## App Template

- [Next.js App](https://github.com/StyleList94/stylish-next-app): `next`
- [Ethereum DApp](https://github.com/StyleList94/stylish-ethereum-dapp): `ethereum`
- [React App](https://github.com/StyleList94/stylish-react-app): `react`
- [Chrome Extensions](https://github.com/StyleList94/stylish-extension): `extension`
- [Pure(Webpack) React App](https://github.com/StyleList94/stylish-pure-react-app): `pure-react`
- [Vanilla App](https://github.com/StyleList94/stylish-vanilla-app): `vanilla`
- [Web App](https://github.com/StyleList94/stylish-web-app): `web`

## Getting Started

```bash
# pnpm
pnpm create stylish-app <app-name> [--template template-name]

# npm
npx create-stylish-app <app-name> [--template template-name]

# yarn
yarn create stylish-app <app-name> [--template template-name]
```

## Options

`create-stylish-app` supports the following options:

- -t, --template [template-name] - The template to use. You can use the following templates `next`, `ethereum`, `react`, `extension`, `pure-react`, `vanilla`, `web`. default: `next`

## Example

```bash
# using default(next) template
npx create-stylish-app my-app

# using react template
npx create-stylish-app my-app --template react
```
