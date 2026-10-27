# @kawapress/plugin-code-block

给代码块加上语言标签、复制按钮和可选的行号。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-code-block?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-code-block) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-code-block/README.md)

`@kawapress/plugin-code-block` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 每个代码块都有语言标签，例如 `TypeScript`、`Shell`。
- 复制按钮。用 `[!code --]` 标成删除的行不会被复制。
- 可选的行号：`:no-line-numbers` 让单个代码块不显示行号，`:line-numbers=5` 从别的数字开始。
- 文字跟着页面语言走，内置中文和英文。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-code-block
```

也可以用 `pnpm add --save-dev @kawapress/plugin-code-block` 或 `yarn add --dev @kawapress/plugin-code-block`。

## 使用

```ts
import codeBlockPlugin from '@kawapress/plugin-code-block'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    codeBlockPlugin({ lineNumbers: true }),
  ],
})
```

它处理的是已经由 `@kawapress/plugin-shiki` 之类的高亮器渲染好的代码。

## 配置项

| 选项 | 说明 |
| --- | --- |
| `lineNumbers` | 给每个代码块显示行号，单个代码块可以关闭，默认关闭。 |
| `languageLabels` | 改写某个语言显示的名字。 |
| `copyLabels` | 改写所有语言的复制按钮文字。 |
| `localeCopyLabels` | 改写某一种语言的复制按钮文字。 |

## 文档

[文档](https://kawapress.dev/guide/markdown-extensions) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
