# @kawapress/plugin-last-updated

在每个 KawaPress 页面底部显示最后更新时间和编辑链接。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-last-updated?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-last-updated) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-last-updated/README.md)

`@kawapress/plugin-last-updated` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 时间来自 Markdown 文件最后一次 git 提交，不用人手维护。
- "编辑此页"链接由一个地址模板生成。
- 服务端按 UTC 渲染，浏览器加载后按访客所在的时区重新格式化。
- 传入任何 `Intl.DateTimeFormat` 选项都能改格式。
- 单个页面用 `lastUpdated: false` 或 `editLink: false` 关掉日期或链接。

## 安装

```sh
npm install --save-dev @kawapress/plugin-last-updated
```

也可以用 `pnpm add --save-dev @kawapress/plugin-last-updated` 或 `yarn add --dev @kawapress/plugin-last-updated`。

## 使用

```ts
import lastUpdatedPlugin from '@kawapress/plugin-last-updated'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    lastUpdatedPlugin({
      editLink: {
        pattern: 'https://github.com/your-name/your-repo/edit/main/:path',
      },
    }),
  ],
})
```

浅克隆的仓库里，插件会跳过日期并给出警告。在 GitHub Actions 里，请给 `actions/checkout` 设置 `fetch-depth: 0`。

## 配置项

| 选项 | 说明 |
| --- | --- |
| `editLink.pattern` | 编辑地址。`:path` 会被替换成文件在仓库里的路径。 |
| `editLink.text` | 链接文字。 |
| `lastUpdated.formatOptions` | `Intl.DateTimeFormat` 的选项。 |
| `labels` | 改写所有语言的文字。 |
| `localeLabels` | 改写某一种语言的文字。 |

## 文档

[文档](https://kawapress.dev/plugins/last-updated) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
