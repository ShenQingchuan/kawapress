# @kawapress/plugin-mathjax

KawaPress 的构建时 MathJax 渲染。公式变成 SVG，读者不需要下载 MathJax。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-mathjax?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-mathjax) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-mathjax/README.md)

`@kawapress/plugin-mathjax` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 构建时把行内的 `$…$` 和块级的 `$$…$$` 公式渲染成 SVG。
- 浏览器不需要下载或运行 MathJax。
- 支持大量 TeX 宏包，包括 `ams`、`mhchem`、`physics`、`cancel` 和 `braket`。
- 可以在配置里定义自己的 TeX 宏。

## 安装

```sh
npm install --save-dev @kawapress/plugin-mathjax
```

也可以用 `pnpm add --save-dev @kawapress/plugin-mathjax` 或 `yarn add --dev @kawapress/plugin-mathjax`。

## 使用

```ts
import mathjaxPlugin from '@kawapress/plugin-mathjax'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [mathjaxPlugin()],
})
```

```md
质能方程是 $E = mc^2$。

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$
```

## 配置项

| 选项 | 说明 |
| --- | --- |
| `tex` | MathJax 的 TeX 输入选项。`tex.macros` 用来定义你自己的宏。 |
| `svg` | MathJax 的 SVG 输出选项，例如 `scale` 和 `minScale`。 |

## 文档

[文档](https://kawapress.dev/guide/markdown-extensions#math-equations) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
