---
title: 最后更新时间
description: 在页面底部显示「最后更新于」和「编辑此页」，时间取自 Markdown 文件的最后一次 git 提交。
---

# 最后更新时间

`@kawapress/plugin-last-updated` 在每篇文档的最后加一行小字，告诉读者这篇内容是什么时候改的，并提供「编辑此页」的入口。时间来自该 Markdown 文件的最后一次 git 提交，不需要手动维护。

读者看到的效果大致是这样：

```text
编辑此页    最后更新于：2026年10月26日 11:55
```

## 安装与启用 {#install-and-enable}

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-last-updated
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-last-updated
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-last-updated
```
:::

在 `kawapress.config.ts` 中加入插件：

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

插件把这一行放进 `doc.footer` 这个 Outlet，由主题决定它出现在页面底部还是别处。nagi 主题已经渲染了这个位置，所以上面的配置就能直接看到效果。如果换成自己写的主题，记得在 `Layout` 里放一个 `<KawaOutlet name="doc.footer" />`。没有渲染这个 Outlet 时，构建会给出一行警告。

## 「编辑此页」链接 {#edit-link}

`editLink.pattern` 是一个网址模板，其中的 `:path` 会被替换成文件在仓库里的路径，例如 `docs/guide/intro.md`。路径不带开头的斜杠，所以模板通常写成 `.../edit/main/:path`。

```ts
lastUpdatedPlugin({
  editLink: {
    pattern: 'https://github.com/your-name/your-repo/edit/main/:path',
    text: '在 GitHub 上修改',
  },
})
```

- `pattern` 必须包含 `:path`，否则启动时会直接报错，因为链接无法定位到具体文件。
- `text` 是链接文字，会覆盖内置的「编辑此页」。想让不同语言显示不同文字，用下面的 `labels` 更合适。
- 仓库路径由 `git rev-parse --show-toplevel` 得到。站点不在 git 仓库里时，链接会被跳过，并输出一次 warning。

## 自定义日期格式 {#format-options}

默认格式是中等长度的日期加简短时间。需要调整时，传入 `Intl.DateTimeFormat` 支持的选项：

```ts
lastUpdatedPlugin({
  lastUpdated: {
    formatOptions: { year: 'numeric', month: 'long', day: 'numeric' },
  },
})
```

只写年、月、日这类具体字段时，插件不再添加默认的日期和时间样式，因为 `Intl.DateTimeFormat` 不允许两者同时出现。

关于时区，有一件事需要知道：页面在服务器上渲染时用 UTC，读者打开页面后浏览器会在自己的时区里重新格式化一次，所以看到的时间是本地时间。如果希望全站固定显示同一个时区，在 `formatOptions` 里写明 `timeZone`：

```ts
lastUpdatedPlugin({
  lastUpdated: {
    formatOptions: { timeZone: 'Asia/Shanghai' },
  },
})
```

## 修改文字与多语言 {#labels}

内置了两套文字：中文（`最后更新于` / `编辑此页`）和英文（`Last updated` / `Edit this page`）。插件按当前页面的 `lang` 自动选择。覆盖方式与 `@kawapress/plugin-container` 一致：

```ts
lastUpdatedPlugin({
  labels: {
    lastUpdated: '更新于',
  },
  localeLabels: {
    en: {
      lastUpdated: 'Touched',
      editLink: 'Improve this page',
    },
  },
})
```

优先级从高到低是：`localeLabels` 中当前 locale 的值、`labels`、`editLink.text`、内置文字。标点跟着语言走：中文是全角冒号，英文是半角冒号加空格，覆盖文字不需要自己加标点。

## 单页关闭 {#opt-out-per-page}

在页面的 frontmatter 里可以单独关掉这两项：

```md
---
lastUpdated: false
editLink: false
---
```

只写其中一个就只关掉那一项。两项都关掉时，页面底部不会多出任何元素。

## 关于 git 历史 {#git-history}

- 时间只来自 git 提交记录，不读文件修改时间。文件最后一次修改时间和最后一次提交时间常常不同。
- 只提交过、还没提交的新文件没有日期，开发时也一样。想要日期，先 `git commit`。
- 仓库是浅克隆时，插件输出 warning 并跳过这一行，因为历史不完整会算出错误的日期。在 GitHub Actions 中使用 `actions/checkout` 时，请设置 `fetch-depth: 0`。
- 站点不在 git 仓库里时，同样输出 warning，并跳过「最后更新于」和「编辑此页」。

## 在自定义界面里使用 {#use-in-a-custom-component}

插件把两个字段写进页面数据，任何组件都能读取。配合 `usePageData()` 就能做自己的页脚：

```vue
<script setup lang="ts">
import type { LastUpdatedPageData } from '@kawapress/plugin-last-updated'
import { usePageData } from 'kawapress/client'
import { computed } from 'vue'

const page = usePageData()
const lastUpdated = computed(
  () => (page.value as LastUpdatedPageData | undefined)?.lastUpdated,
)
</script>
```

`lastUpdated` 是毫秒时间戳，`editLink` 是拼好的完整网址。两者都可能不存在，读取时请判空。
