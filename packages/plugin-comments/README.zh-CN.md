# @kawapress/plugin-comments

KawaPress 的 GitHub Discussions 评论，由 Giscus 驱动。

[![npm version](https://img.shields.io/npm/v/@kawapress/plugin-comments?label=npm&color=42b883)](https://www.npmjs.com/package/@kawapress/plugin-comments) · [English](https://github.com/kawapress/kawapress/blob/main/packages/plugin-comments/README.md)

`@kawapress/plugin-comments` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 评论存在 GitHub Discussions 里，站点不需要数据库，也不需要登录系统。
- 构建时只写入一个标题和一个空容器，评论区快要滚动到视野里时才加载 Giscus 脚本。
- 评论区跟着站点的浅色/深色外观和界面语言切换。
- 换到另一个页面会为它重新建一个评论区。
- 单个页面用 `comments: false` 关闭评论。

## 安装

```sh
npm install --save-dev @kawapress/plugin-comments
```

也可以用 `pnpm add --save-dev @kawapress/plugin-comments` 或 `yarn add --dev @kawapress/plugin-comments`。

## 使用

先准备一个开启了 Discussions 的公开仓库，装上 [giscus app](https://github.com/apps/giscus)，再从 [giscus.app](https://giscus.app) 复制四个值：

```ts
import commentsPlugin from '@kawapress/plugin-comments'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    commentsPlugin({
      giscus: {
        repo: 'your-name/your-repo',
        repoId: 'R_kgDOxxxxxxx',
        category: 'Comments',
        categoryId: 'DIC_kwDOxxxxxxx',
      },
    }),
  ],
})
```

四个值缺任何一个，构建都会停下来，并指出是哪个选项为空。

## 配置项

| 选项 | 说明 |
| --- | --- |
| `giscus.repo / repoId / category / categoryId` | 来自 giscus.app 的四个值，都必须填写。 |
| `mapping` | 页面怎样对应到一个讨论，默认 `pathname`。 |
| `strict` | 只匹配标题与映射值完全相同的讨论，默认关闭。 |
| `reactionsEnabled` | 显示表情回应栏，默认开启。 |
| `inputPosition` | `top` 或 `bottom`，默认 `bottom`。 |
| `loading` | `lazy`（默认）或 `eager`。 |
| `labels / localeLabels` | 改写所有语言或某一种语言的标题。 |

## 文档

[文档](https://kawapress.dev/plugins/comments) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
