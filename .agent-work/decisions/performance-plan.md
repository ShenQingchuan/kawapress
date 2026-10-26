# KawaPress 性能方案：dev 启动与首屏 JS

本文记录 dev 启动时间与首屏 JS 体积的已确认优化。测量对象是官方 docs 站点（41 个页面，中英双语）。

## 一、现状测量

### 首屏 JS

`entry-client` 是首页必须下载的唯一大文件。

| 构建方式 | 原始大小 | gzip |
|---|---|---|
| `NODE_ENV` 未设置（CI 与大多数用户） | 462 KB | 155 KB |
| `NODE_ENV=production` | 330 KB | 109 KB |

按 sourcemap 拆分，生产构建中的主要组成：

| 来源 | 约占 | 说明 |
|---|---|---|
| Vue 运行时（runtime-core、reactivity、runtime-dom、shared） | 110 KB | 必需 |
| 全站 pageData 索引 | 57 KB | 41 个页面的完整 pageData，包含每页全部 headers |
| vue-router | 35 KB | 必需 |
| nagi 主题组件 | 40 KB | 必需 |
| floating-vue 与 @floating-ui | 45 KB | 只有 Twoslash 浮层使用 |
| overlayscrollbars | 30 KB | nagi 滚动条 |

### dev 启动

| 阶段 | 耗时 |
|---|---|
| CLI 启动与加载站点配置（`runnerImport`） | 约 800 ms |
| 创建 Vite server | 约 130 ms |
| 首个页面请求：生成 `virtual:kawapress-pages` | 约 840 ms |
| 首个页面请求：其余 SSR 模块转换与渲染 | 约 600 ms |
| 之后的页面请求 | 约 90 ms |

`virtual:kawapress-pages` 为了得到全站 pageData，在首个请求时编译了全部 41 个 Markdown 页面（含 Shiki 高亮、Twoslash 和 MathJax）。

## 二、决策

### 2.1 `kawapress build` 始终产出生产构建

`loadSiteConfig()` 使用 Vite `runnerImport()`。它内部按开发环境解析配置；`NODE_ENV` 未设置时会把 `process.env.NODE_ENV` 写成 `development`，之后的构建因此把 Vue、vue-router 与 devtools 的开发代码打进了产物。

`kawapress build` 在加载配置之前把未设置的 `NODE_ENV` 设为 `production`，并向 `createBuilder()` 显式传入 `mode: 'production'`。跟踪：独立修复分支。

### 2.2 浏览器只拿到路由清单与 Sidebar 所需的最小页面摘要

这一条落实 0.1 决策“路由路径清单可以进入浏览器，页面组件与 pageData 按需加载”。

- `virtual:kawapress-pages` 只导出页面路由与按需加载函数，以及每个页面的**路由摘要** `PageRouteMeta`：`path`、`title`、`frontmatter.layout`。不再导出完整 pageData。
- 完整 pageData 只随页面组件模块加载（现有 `__pageData` 导出），`usePageData()` 继续返回当前页面的完整数据。
- Core 公开 `PageRouteMeta` 类型，并把它放在 `route.meta.page` 上，供主题生成 Sidebar、上一篇与下一篇。nagi 改为读取路由摘要，不再读取完整 pageData。
- 需要更多字段的主题或插件，使用 Generator Plugin 的 `vite()` 发布自己的虚拟模块，与 nagi 的 `_meta.json` 虚拟模块、Search 的索引模块同一模式。Core 不提供“扩展路由摘要字段”的 API；等出现真实需求再设计。

### 2.3 dev 不在首个请求时编译全站

路由摘要只需要 frontmatter 与第一个 h1，不需要完整渲染页面。

- 新增“页面摘要”读取：只解析 frontmatter 与首个一级标题（与 `resolvePageMetadata()` 使用相同规则），不调用 Markdown 渲染器、不运行插件的 `pageData()`。
- `virtual:kawapress-pages` 使用页面摘要生成路由摘要。完整编译只在请求某个页面时发生。
- 页面摘要与完整编译的标题规则必须一致：两者共用 `resolvePageMetadata()`，并有单元测试比较两者在 frontmatter `title`、h1、二者都缺失与 h1 含行内代码等情况下的结果。
- 已知限制：插件在 `pageData()` 中修改的 `title` 不会进入路由摘要。路由摘要描述的是作者写下的标题，这一点写进插件开发文档。

### 2.4 Twoslash 浮层运行时（待测量后决定）

floating-vue 约 45 KB，只有 Twoslash 浮层使用。但浮层组件 `KawaTwoslashMenu` 直接出现在页面模板中，SSR 与 hydration 都需要它，不能简单改成客户端动态导入。等 2.1 至 2.3 完成后重新测量；如果它仍是首屏的主要可选成本，再单独设计“只在含 Twoslash 的页面加载”的方案。

## 三、不做的事

- 不替换 Vue Router。路由运行时约 35 KB，是 0.1 已确认的取舍。
- 不移除 overlayscrollbars。它是 nagi 的视觉决策，留给主题自己权衡。
- 不在本轮优化 CLI 与配置加载（约 800 ms）。它主要来自 Jiti 与 Vite `runnerImport` 的冷启动，需要单独测量后再设计。

## 四、验收

- `env -u NODE_ENV pnpm bench --sizes 50,500 --runs 3` 的结果写入 `bench/results/`。
- docs 首页 `entry-client` 的 gzip 体积低于 95 KB。
- dev 首个页面请求在 docs 站点低于 700 ms。
- 全部 lint、typecheck、单元测试、构建和两种 base 的 E2E 通过。
