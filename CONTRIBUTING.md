# Contributing to KawaPress

Thank you for helping with KawaPress. This page explains how to report a problem, propose a change, and get a pull request merged. [简体中文](https://github.com/kawapress/kawapress/blob/main/CONTRIBUTING.zh-CN.md)

## Before you start

- **A bug?** Search the [open issues](https://github.com/kawapress/kawapress/issues) first. If nobody has reported it, open a new issue with the bug report form.
- **A question?** Ask it in [Discussions](https://github.com/kawapress/kawapress/discussions). Issues are for work that someone can do.
- **A large feature or an API change?** Open an issue first, and wait for the direction to be agreed on before you write code. This saves you from building something that cannot be merged.
- **A security problem?** Do not open a public issue. Follow [SECURITY.md](https://github.com/kawapress/kawapress/blob/main/SECURITY.md).

Issues and pull requests are written in English. Documentation exists in English and Chinese, and the two versions are kept in step.

## Set up the repository

You need Node.js 22.12 or newer and pnpm 11.22.0.

```sh
git clone https://github.com/kawapress/kawapress.git
cd kawapress
pnpm install
pnpm dev          # the documentation site, with real SSR
```

| Command | What it checks |
| --- | --- |
| `pnpm lint` | ESLint over the whole repository |
| `pnpm typecheck` | `vue-tsc` over every package |
| `pnpm test` | Unit tests |
| `pnpm build` | Builds the documentation site |
| `pnpm test:e2e` | Playwright end-to-end tests. They start a dev server on port 5173, so stop your own dev server first |

The repository is a pnpm workspace. The packages are in `packages/`, the documentation site is in `docs/`, and the end-to-end tests are in `e2e/`.

## Make a change

1. Fork the repository and create a branch from `main`.
2. Make one focused change. A pull request that does one thing is reviewed faster.
3. Add or update tests. A bug fix needs a test that fails without the fix.
4. If you change behavior that users see, update the documentation in `docs/` (Chinese) and `docs/en/` (English).
5. Run `pnpm lint`, `pnpm typecheck` and `pnpm test`. Run `pnpm test:e2e` when you change rendering, plugins or the theme.
6. Open a pull request against `main`. The template asks for a summary, evidence, and the risk of merging.

### Code rules

- Keep a source file under 500 lines. Split a larger file into modules that each do one thing. Tests, documentation and CSS are exempt.
- Do not copy code to a second place. Extract it.
- A code comment describes what the code does now and why. It does not describe how the code used to be.
- Themes and plugins use only the public APIs. The official packages have no private channel.

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(plugin-search): ...`, `fix(theme): ...`, `docs: ...`. Mark a breaking change with `!` after the scope, and explain it in the commit body.

## Releases

Maintainers publish releases. The steps are in [RELEASING.md](https://github.com/kawapress/kawapress/blob/main/RELEASING.md), and every user-visible change goes into [CHANGELOG.md](https://github.com/kawapress/kawapress/blob/main/CHANGELOG.md).

## License

By contributing, you agree that your contribution is licensed under the [MIT license](https://github.com/kawapress/kawapress/blob/main/LICENSE).
