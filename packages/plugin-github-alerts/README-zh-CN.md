# @kawapress/plugin-github-alerts

GitHub 风格的提示块，写法是 `> [!NOTE]`。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-github-alerts?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-github-alerts) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-github-alerts/README.md)

`@kawapress/plugin-github-alerts` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 和 GitHub 一样的写法，同一份 README 在两处渲染的结果一致。
- 五种类型：`NOTE`、`TIP`、`IMPORTANT`、`WARNING` 和 `CAUTION`。
- 默认标题跟着页面语言走，内置中文和英文。

## 安装

这个包已经包含在 `kawapress` 里。使用 `kawapress/nagi` 的站点自带它，不需要再安装。

只有不使用 nagi 预设搭建站点时，才需要单独安装它。

```sh
npm install --save-dev @kawapress/plugin-github-alerts
```

也可以用 `pnpm add --save-dev @kawapress/plugin-github-alerts` 或 `yarn add --dev @kawapress/plugin-github-alerts`。

## 使用

```md
> [!NOTE]
> 提醒读者需要留意的信息。

> [!WARNING]
> 需要马上注意的重要内容。
```

```ts
import githubAlertsPlugin from '@kawapress/plugin-github-alerts'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [githubAlertsPlugin()],
})
```

## 配置项

| 选项 | 说明 |
| --- | --- |
| `labels` | 改写所有语言的默认标题。 |
| `localeLabels` | 改写某一种语言的默认标题，键是 `locales` 里的名字。 |

## 文档

[文档](https://kawapress.dev/guide/markdown-extensions) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
