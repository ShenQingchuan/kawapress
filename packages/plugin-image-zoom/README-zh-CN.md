# @kawapress/plugin-image-zoom

KawaPress Markdown 内容里的点击放大图片。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-image-zoom?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-image-zoom) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-image-zoom/README.md)

`@kawapress/plugin-image-zoom` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 点击任何 Markdown 图片都会在大图视图里打开，不需要额外写什么。
- 对键盘友好：用 `Tab` 移到图片，`Enter` 或 `Space` 打开，`Esc`、点击或滚轮关闭。
- 关闭后焦点回到刚才打开的那张图。
- 读者设置了减少动态效果时，不播放动画。
- 单张图片加 `#no-zoom` 退出，整个页面用 `imageZoom: false` 退出。

## 安装

```sh
npm install --save-dev @kawapress/plugin-image-zoom
```

也可以用 `pnpm add --save-dev @kawapress/plugin-image-zoom` 或 `yarn add --dev @kawapress/plugin-image-zoom`。

## 使用

```ts
import imageZoomPlugin from '@kawapress/plugin-image-zoom'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [imageZoomPlugin()],
})
```

```md
![Logo](/logo.png)           <!-- 可放大 -->
![Logo](/logo.png#no-zoom)   <!-- 保持原样 -->
```

只处理 Markdown 的图片语法，HTML 的 `<img>` 不受影响。

## 配置项

| 选项 | 说明 |
| --- | --- |
| `labels` | 改写所有语言的无障碍文字：`zoom` 和 `dialog`。 |
| `localeLabels` | 改写某一种语言的文字，`{alt}` 会被替换成图片的 alt 文字。 |

## 文档

[文档](https://kawapress.dev/plugins/image-zoom) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
