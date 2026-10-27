# @kawapress/plugin-shiki

KawaPress 的代码高亮，支持浅色和深色主题，以及可选的 Twoslash 类型提示。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-shiki?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-shiki) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-shiki/README.md)

`@kawapress/plugin-shiki` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 构建时用 [Shiki](https://shiki.style) 完成高亮，读者不需要下载高亮器。
- 浅色和深色主题随站点外观一起切换。
- 用注释标记行：`[!code highlight]`、`[!code focus]`、`[!code ++]`、`[!code --]`、`[!code warning]` 和 `[!code error]`。
- 可选的 [Twoslash](https://twoslash.netlify.app)：在代码块上写 `ts twoslash`，把鼠标移上去就能看到类型。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-shiki
```

也可以用 `pnpm add --save-dev @kawapress/plugin-shiki` 或 `yarn add --dev @kawapress/plugin-shiki`。

## 使用

```ts
import shikiPlugin from '@kawapress/plugin-shiki'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    shikiPlugin({
      themes: { light: 'github-light', dark: 'github-dark' },
      twoslash: true,
    }),
  ],
})
```

## 配置项

| 选项 | 说明 |
| --- | --- |
| `theme` | 浅色和深色共用的一个 Shiki 主题，默认 `github-light`。 |
| `themes` | `{ light, dark }` 一对主题，用它就不要再写 `theme`。 |
| `langs` | 要加载的语言，默认加载一组常用语言。 |
| `transformers` | 额外的 Shiki 转换器。 |
| `twoslash` | `true` 或 Twoslash 选项，打开 `ts twoslash` 代码块的类型提示。 |

## 文档

[文档](https://kawapress.dev/guide/markdown-extensions) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
