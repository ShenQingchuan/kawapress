# @kawapress/plugin-code-group

把几个代码块合成一组可访问的标签页。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-code-group?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-code-group) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-code-group/README.md)

`@kawapress/plugin-code-group` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 把 npm、pnpm 和 Yarn 的命令并排放在一起，不用重复周围的文字。
- 标签名取自代码围栏，例如 ` ```sh [pnpm] `。
- 标签页支持键盘操作和读屏软件。
- 组里只允许放围栏代码块。放了别的内容，构建会停下来并给出清楚的提示。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-code-group
```

也可以用 `pnpm add --save-dev @kawapress/plugin-code-group` 或 `yarn add --dev @kawapress/plugin-code-group`。

## 使用

````md
::: code-group
```sh [npm]
npm install kawapress
```

```sh [pnpm]
pnpm add kawapress
```
:::
````

```ts
import codeGroupPlugin from '@kawapress/plugin-code-group'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [codeGroupPlugin()],
})
```

## 文档

[文档](https://kawapress.dev/guide/markdown-extensions) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
