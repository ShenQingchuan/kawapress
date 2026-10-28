---
title: 评论
description: 用 GitHub Discussions 托管评论，通过 Giscus 让每一篇文档都有自己的讨论区。
---

# 评论

读者读完一篇文档，常常还想问一句、补充一点。评论插件把这份讨论放进页面底部，内容存放在 GitHub Discussions 里，站点本身不需要数据库，也不需要登录系统。

插件使用 [Giscus](https://giscus.app)：它把 GitHub Discussions 渲染成一个 iframe。读者点开评论时，用的是自己的 GitHub 账号。

## 准备仓库与 Discussions {#prepare-the-repository}

1. 在 GitHub 上准备一个公开仓库，用来存放评论。它不必是文档仓库本身。
2. 仓库的 **Settings → General → Features** 中勾选 **Discussions**。
3. 在仓库的 **Discussions** 里新建一个分类，例如 `Comments`。分类用 **Announcements** 类型最稳妥：只有维护者能发起新讨论，读者只能回复。
4. 安装 [giscus App](https://github.com/apps/giscus)，并授权它访问这个仓库。

## 复制四个标识 {#copy-the-four-ids}

打开 [giscus.app](https://giscus.app)，在 **Repository** 中填入 `你的名字/仓库名`。页面往下会出现一段配置好的代码，类似：

```html
<script
  src="https://giscus.app/client.js"
  data-repo="your-name/your-repo"
  data-repo-id="R_kgDOxxxxxxx"
  data-category="Comments"
  data-category-id="DIC_kwDOxxxxxxx"
  data-mapping="pathname"
  ...
></script>
```

插件需要的正是这四个值：

| 配置项 | 从哪来 |
| --- | --- |
| `repo` | `data-repo`，形如 `your-name/your-repo` |
| `repoId` | `data-repo-id` |
| `category` | `data-category`，讨论分类的名字 |
| `categoryId` | `data-category-id` |

`repoId` 和 `categoryId` 不是仓库地址，也不是分类名字，giscus 用它精确定位讨论区，请原样复制。

## 启用插件 {#enable-the-plugin}

```sh
pnpm add --save-dev @kawapress/plugin-comments
```

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

保存后重新构建，文档页底部就会出现评论区。缺少任何一个标识时，构建会直接报错，并指出是哪个配置项为空。

## 选项 {#options}

`giscus` 里除四个标识外，都可以省略：

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `mapping` | `'pathname'` | 页面与讨论的对应方式：`pathname`、`url`、`title`、`og:title`。 |
| `strict` | `false` | 是否只匹配标题与映射值完全相同的讨论。 |
| `reactionsEnabled` | `true` | 是否显示顶部的表情回应。 |
| `inputPosition` | `'bottom'` | 输入框在讨论列表的上方 `'top'` 还是下方 `'bottom'`。 |
| `loading` | `'lazy'` | iframe 的加载方式，取值 `'lazy'` 或 `'eager'`。 |

`mapping` 决定"哪一篇文档对应哪一个讨论"。默认的 `pathname` 用页面路径做键，多数站点直接用默认值即可。`specific` 和 `number` 需要为每一页手写讨论编号，本插件目前不支持，配置时会给出提示。

### 自定义标题文字 {#customize-the-heading}

评论区标题默认跟随站点语言：中文站点是"评论"，其他语言是"Comments"。要改的话，用 `labels` 改所有语言，用 `localeLabels` 改某一种语言：

```ts
commentsPlugin({
  giscus: { repo, repoId, category, categoryId },
  labels: { heading: 'Discussion' },
  localeLabels: {
    root: { heading: '读者讨论' },
  },
})
```

`localeLabels` 的键是 `locales` 配置里的语言键，`root` 表示默认语言。

## 关闭某一页的评论 {#turn-comments-off-for-one-page}

在 frontmatter 中写 `comments: false`，这一页就不会出现评论区：

```md
---
title: 更新日志
comments: false
---
```

## 运行时的行为 {#what-happens-in-the-browser}

- 构建时，页面里只输出一个标题和一块空容器。评论内容由浏览器加载，不影响静态页面的体积。
- 读者向下滚动、评论区进入视野前方 200 像素时，才开始请求 `https://giscus.app/client.js`。只是浏览正文的读者不会为评论区付出任何加载成本。
- 站点切换深色或浅色外观时，评论区会跟着切换，不会整块重新加载。
- 在页面之间跳转时，评论区会重新建立，显示新页面的讨论。
- 评论语言跟随 `locales` 中该语言的 `lang`：中文用 `zh-CN`，其他语言用 `en`。
- 评论区追加在 `doc` 这个 Outlet 的末尾，而 `doc` 只由文档布局渲染，所以首页和其他页面不会出现评论区。
- 同一个页面里，插件按 `plugins` 数组的顺序依次排列。想让评论区排在「最后更新时间」之后，就把 `commentsPlugin()` 写在 `lastUpdatedPlugin()` 后面。

## 注意事项 {#limitations}

- 评论区是第三方脚本，需要读者的浏览器能访问 `giscus.app`。网络受限的环境里，正文仍然正常显示，只是看不到评论。
- 插件不提供"评论数"统计。需要的话，请另外调用 GitHub API。
- 关闭某页评论时，这一页的容器会整体消失，不会留下空白占位。
