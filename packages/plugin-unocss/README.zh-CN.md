# @kawapress/plugin-unocss

KawaPress 的 UnoCSS 集成，让你在 Markdown 里直接写原子类。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-unocss?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-unocss) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-unocss/README.md)

`@kawapress/plugin-unocss` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 在 Markdown 里写的 HTML 和 Vue 组件里都能用原子类。
- 默认使用 `presetWind4`、`presetIcons` 和 `presetWebFonts`。
- 接受 UnoCSS 的 Vite 插件的全部选项，可以加预设、规则和快捷方式。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-unocss
```

也可以用 `pnpm add --save-dev @kawapress/plugin-unocss` 或 `yarn add --dev @kawapress/plugin-unocss`。

## 使用

```ts
import unocssPlugin from '@kawapress/plugin-unocss'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [unocssPlugin()],
})
```

然后在 Markdown 里写类名：

```md
<div class="rounded-lg bg-black/5 p-4">由 UnoCSS 生成样式。</div>
```

传入 `presets` 会替换默认的预设。

## 文档

[文档](https://kawapress.dev/guide/getting-started#use-unocss-utilities) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
