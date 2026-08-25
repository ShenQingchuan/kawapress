---
description: 了解 KawaPress 如何把 Markdown 文件映射为 URL，并正确处理页面链接、源目录和部署路径。
---

# 路由

KawaPress 使用基于文件的路由。你不需要维护一份额外的路由表：把 Markdown 放在合适的位置，它就会成为对应路径上的页面。

如果你已经完成了[快速开始](/guide/getting-started)，这一章会把刚才看到的路径规则完整讲清楚。

## 基于文件的路由

假设站点里有这些文件：

```text
.
├─ guide/
│  ├─ getting-started.md
│  └─ index.md
├─ index.md
└─ about.md
```

KawaPress 会生成下面的路由和静态文件：

| Markdown 文件 | 访问路径 | 构建产物 |
| --- | --- | --- |
| `index.md` | `/` | `dist/index.html` |
| `about.md` | `/about` | `dist/about.html` |
| `guide/index.md` | `/guide` | `dist/guide.html` |
| `guide/getting-started.md` | `/guide/getting-started` | `dist/guide/getting-started.html` |

文件夹负责组织路径，文件名负责形成最后一段。对访客来说，这些都是不带 `.md` 或 `.html` 的简洁 URL。

静态托管服务需要把 `/guide/getting-started` 这样的请求解析到对应的 `.html` 文件。KawaPress 自带的预览服务器已经支持这种访问方式；部署到其他平台时，请启用平台提供的简洁 URL 或 HTML 扩展名回退能力。

## `index.md` 的规则

根目录的 `index.md` 对应站点首页 `/`。子目录里的 `index.md` 会去掉路径末尾的 `/index`：

```text
index.md             → /
guide/index.md       → /guide
guide/setup/index.md → /guide/setup
```

因此，请不要同时创建 `guide.md` 和 `guide/index.md`。它们都会映射到 `/guide`，应该只保留一种组织方式。

## 站点根目录与源目录

运行 `kawapress dev` 或 `kawapress build` 时，当前工作目录就是**站点根目录**。KawaPress 默认从这里查找 `kawapress.config.ts` 和 Markdown 页面，并把构建结果写入 `dist`。

如果你想把内容集中放进一个子目录，可以在配置中设置相对路径 `srcDir`：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  srcDir: 'docs',
})
```

这时可以使用下面的结构：

```text
my-site/
├─ docs/
│  ├─ guide/
│  │  └─ getting-started.md
│  └─ index.md
├─ kawapress.config.ts
└─ package.json
```

`srcDir` 只改变 Markdown 的来源位置，不会成为公开 URL 的一部分：

```text
docs/index.md                 → /
docs/guide/getting-started.md → /guide/getting-started
```

`srcDir` 必须是相对于站点根目录的路径，不能使用绝对路径。

## 在页面之间建立链接

链接到另一个 KawaPress 页面时，请省略文件扩展名。你可以使用相对路径，也可以从站点根路径开始写：

```md
[快速开始](./getting-started)
[快速开始](/guide/getting-started)
[返回首页](/)
```

不要把源文件名或构建文件名写进链接：

```md
<!-- 不推荐 -->
[快速开始](./getting-started.md)
[快速开始](./getting-started.html)
```

链接到当前页面的标题时，使用标题锚点。例如：[前往源目录](#站点根目录与源目录)。

KawaPress 会为 Markdown 标题生成稳定的锚点。默认主题里的本页目录也使用同一组锚点。

外部页面继续使用完整 URL，例如：[访问 Vue 官网](https://vuejs.org/)。

## 部署到子路径

站点并不总是发布在域名根目录。例如，页面最终可能位于：

```text
https://example.com/my-docs/
```

这时需要设置 `base`：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  base: '/my-docs/',
})
```

`base` 必须以 `/` 开头。KawaPress 会统一处理末尾的 `/`，并让 Vite 资源、Vue Router、预渲染页面和 Markdown 中以 `/` 开头的链接使用同一个部署前缀。

页面内容里仍然写逻辑路由，不要到处手动重复 `/my-docs/`：

```md
[快速开始](/guide/getting-started)
```

构建后，这个 Markdown 链接会自动指向 `/my-docs/guide/getting-started`。这样以后更换部署目录时，只需要修改一处配置。

## 首次访问与站内跳转

第一次打开页面时，KawaPress 会在服务端渲染当前路由，再由浏览器完成 hydration。访客可以立即看到完整内容，不需要等待客户端先生成页面。

浏览器接管以后，站内普通链接会交给 Vue Router：

```text
首次访问
  → 服务端渲染当前页面
  → 浏览器 hydration
  → 点击站内链接
  → Vue Router 加载并显示目标页面
```

这意味着首次访问和构建使用相同的 SSR 语义，而后续跳转不需要整页刷新。外部链接、下载链接、带 `target` 的链接以及配合修饰键打开新标签页的操作，仍然保留浏览器原本的行为。

## 为什么使用 Vue Router

VitePress 没有把 Vue Router 作为运行时依赖。它在客户端维护了一套专门面向文档站的[轻量路由实现](https://github.com/vuejs/vitepress/blob/main/src/client/app/router.ts)，直接负责页面模块加载、浏览器历史、滚动位置和路由前后钩子。功能集中、依赖更少，也方便 VitePress 精确控制自己的页面加载流程。

KawaPress 选择使用 Vue 官方的 [Vue Router](https://router.vuejs.org/)。Markdown 文件仍然自动变成路由，不需要用户手写路由表；区别在于，KawaPress 会把这些页面交给真正的 Vue Router 实例管理：SSR 使用 memory history，浏览器使用 web history，Runtime Plugin 也能直接使用导航守卫和路由记录。

| 关注点 | VitePress 的轻量路由 | KawaPress 的 Vue Router |
| --- | --- | --- |
| 运行时代价 | 不需要携带 Vue Router，能力只覆盖文档站所需范围 | 多一个通用依赖，也会带上文档站暂时用不到的能力 |
| 扩展方式 | 使用 VitePress 自己定义的路由与页面加载钩子 | 使用 Vue Router 的标准实例、导航守卫和路由记录 API |
| 维护取舍 | 自己控制并维护整套路由行为 | 复用 Vue 生态的成熟实现，同时适配 KawaPress 的 SSR 与 SSG 边界 |

这不是“功能越多越好”。VitePress 优先追求小而专用；KawaPress 更看重统一的 Vue 扩展边界，让主题和 Runtime Plugin 不必再学习一套框架私有 Router。

需要注意，`router.addRoute()` 只会修改正在运行的 Router。它不会自动告诉静态构建器新增了哪些页面，因此 KawaPress 0.1 不承诺由它添加的路由会被预渲染。

## 未找到的页面

当路径没有对应的 Markdown 文件时，开发服务器会返回 `404` 状态，默认界面会显示未找到页面。执行 `kawapress build` 时，KawaPress 也会生成 `dist/404.html`，供静态托管服务处理未知路径。

KawaPress 0.1 的路由由 Markdown 文件决定，暂不提供路由重写、动态路由或插件虚拟页面。需要新页面时，直接添加新的 Markdown 文件即可。
