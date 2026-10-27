# create-kawapress

Create a new KawaPress site in one command.

[![npm version](https://img.shields.io/npm/v/create-kawapress?label=npm&color=42b883)](https://www.npmjs.com/package/create-kawapress) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/create-kawapress/README.zh-CN.md)

`create-kawapress` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Asks for a site title and a default language, then writes a working site.
- Detects whether you use npm, pnpm or Yarn and prints the matching commands.
- Can install the dependencies for you.
- Runs without prompts when you pass the answers as arguments, so it fits scripts and CI.

## Usage

You do not install this package. Run it with the create command of your package manager:

```sh
npm create kawapress@latest my-kawapress-site
cd my-kawapress-site
npm run dev
```

`pnpm create kawapress my-kawapress-site` and `yarn create kawapress my-kawapress-site` do the same thing.

## Options

| Option | Description |
| --- | --- |
| `[dir]` | The directory to create the site in. |
| `--title` | The site title. |
| `--lang` | The default site language. |
| `--second-lang` | A second site language, or `none`. |
| `--pm` | The package manager: `npm`, `pnpm`, `yarn` or `bun`. |
| `--install / --no-install` | Install the dependencies after scaffolding, or skip it. |
| `--yes` | Use the defaults and skip every prompt. |

## Documentation

[Documentation](https://kawapress.dev/en/guide/getting-started) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
