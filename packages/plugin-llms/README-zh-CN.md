# @kawapress/plugin-llms

KawaPress 面向 AI 的输出：每页一份 Markdown，外加 llms.txt 和 llms-full.txt。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-llms?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-llms) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-llms/README.md)

`@kawapress/plugin-llms` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 每个页面旁边生成一份 `.md`，例如 `/guide/start` 对应 `/guide/start.md`。
- 按语言分别生成 `llms.txt` 和 `llms-full.txt`。
- 在页面标题下面加一个"复制页面"按钮。
- 转换的是渲染后的页面，所以 Vue 组件也能变成可读的 Markdown。组件可以用 `SsgMarkdown` 自己提供 Markdown。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-llms
```

也可以用 `pnpm add --save-dev @kawapress/plugin-llms` 或 `yarn add --dev @kawapress/plugin-llms`。

## 使用

```ts
import llmsPlugin from '@kawapress/plugin-llms'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    llmsPlugin({ description: '我的项目文档' }),
  ],
})
```

用 nagi 时改写在 `llms` 下：`nagi({ llms: { description: '…' } })`。

## 配置项

| 选项 | 说明 |
| --- | --- |
| `description` | `llms.txt` 顶部的简介。可以是字符串，也可以按语言写成对象。 |
| `llmsTxt` | 一个函数，收到页面列表和默认文本，返回你自己的 `llms.txt`。 |

## 文档

[文档](https://kawapress.dev/guide/ai-ready-documentation) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
