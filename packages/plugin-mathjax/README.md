# @kawapress/plugin-mathjax

Build-time MathJax rendering for KawaPress. Math becomes SVG, so readers download no MathJax.

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-mathjax?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-mathjax) · [简体中文](https://github.com/kawapress/kawapress/blob/main/packages/plugin-mathjax/README-zh-CN.md)

`@kawapress/plugin-mathjax` is part of [KawaPress](https://github.com/kawapress/kawapress), a Vue-first static site generator.

## Features

- Renders `$…$` inline and `$$…$$` block math as SVG during the build.
- The browser never downloads or runs MathJax.
- Supports a broad set of TeX packages, including `ams`, `mhchem`, `physics`, `cancel` and `braket`.
- Define your own TeX macros in the configuration.

## Install

```sh
npm install --save-dev @kawapress/plugin-mathjax
```

`pnpm add --save-dev @kawapress/plugin-mathjax` and `yarn add --dev @kawapress/plugin-mathjax` work too.

## Usage

```ts
import mathjaxPlugin from '@kawapress/plugin-mathjax'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [mathjaxPlugin()],
})
```

```md
Mass-energy equivalence is $E = mc^2$.

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$
```

## Options

| Option | Description |
| --- | --- |
| `tex` | MathJax TeX input options. `tex.macros` defines your own macros. |
| `svg` | MathJax SVG output options, such as `scale` and `minScale`. |

## Documentation

[Documentation](https://kawapress.dev/en/guide/markdown-extensions#math-equations) · [Report a problem](https://github.com/kawapress/kawapress/issues)

## License

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
