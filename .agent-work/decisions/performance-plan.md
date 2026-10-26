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

### 2.4 侧边栏链接不使用 RouterLink

500 页基准中，冷构建 23.7 s，其中 Vite 打包只占 4.5 s。其余时间几乎全部花在渲染侧边栏：每个 `RouterLink` 在 setup 时调用 `router.resolve()`，逐条比对全部路由，因此每页侧边栏的成本与页数成正比，全站成本与页数的平方成正比；静态 HTML 与 LLMS 的 SSG-MD 各渲染一遍全站。把侧边栏链接换成普通 `<a>` 后，同一构建降到 10.4 s。

- nagi 的侧边栏链接使用普通 `<a>`，`href` 使用 `withBase()`。站内跳转由 Core 已有的全局链接拦截完成，行为与 RouterLink 一致。
- 当前页高亮由侧边栏根据当前路由路径计算一次，再传给每个链接；不再每个链接各自解析路由。
- 上一篇与下一篇、首页按钮等数量固定的链接保留 RouterLink。

### 2.5 页面清单只写一次、单独成块

500 页时，入口文件中与页面清单有关的内容约 17 KB gzip：页面加载函数表 7.8 KB（以源文件路径为键，浏览器里再换算成路由）、Vite 预加载文件表 4.8 KB、路由摘要 4.5 KB（路由路径作为键与值各出现一次）。

- `virtual:kawapress-pages` 在生成侧直接以路由路径为键生成页面表，每页一条记录同时给出加载函数与路由摘要；浏览器不再换算源文件路径。
- 路由摘要的值不再重复 `path`；`PageRouteMeta.path` 由 Core 在建立路由时补上，公开类型不变。
- 页面清单拆成独立 chunk，与框架代码分开缓存：站点内容变化不让 Vue、vue-router 与主题代码的缓存失效。
- 页面清单的大小随页数线性增长是所有 SPA 式文档站共有的成本。验收以“每多一页增加的首屏字节数（HTML 与 JS 一起计算）不超过 VitePress”为准。

### 2.6 Twoslash 浮层只在用到的页面加载

floating-vue 与 @floating-ui 约 13 KB gzip，只有 Twoslash 浮层使用。VitePress 的 `@shikijs/vitepress-twoslash` 同样在主题里全局 `app.use()`，开启后每页都加载；VitePress 默认不开 Twoslash，所以基准中看不到这笔成本。nagi 默认开启 Twoslash，因此这笔成本落在每个 KawaPress 站点上。

- Core 为 Markdown 编译提供公开能力：Markdown 插件在渲染某个页面时，可以声明“这个页面用到了某个组件”，Core 把对应的导入合并进该页面的 SFC，与作者自己写的 `<script setup>` 共存。写 Markdown 的用户不需要做任何声明。
- 这一能力是公开的插件 API，写入《插件开发》文档；官方插件不走私有通道。
- plugin-shiki 只在含有活跃 Twoslash 代码块的页面导入浮层组件；Runtime Plugin 不再全局安装 floating-vue。SSR 与 client 使用同一个页面组件，hydration 保持一致。
- 0.1 方案中“Runtime Plugin 在 SSR 与 client 创建 Vue App 时都直接安装 floating-vue”的描述随之更新。

### 2.7 OverlayScrollbars 渐进增强

overlayscrollbars 约 9 KB gzip，每页都加载。

- 首屏使用 nagi 已有的 CSS scrollbar 样式（颜色、粗细与主题变量一致），不加载 OverlayScrollbars。
- 页面 hydration 完成后再按需加载 OverlayScrollbars 并接管主要滚动区域；SSR 与 hydration 期间的 DOM 结构不依赖它是否已加载。
- 0.1 方案中 nagi 滚动条一节随之更新：OverlayScrollbars 是加载完成后的增强，加载完成前为同一配色的 CSS 滚动条。

### 2.8 基准测试按“页面显示出来”计时

- dev 就绪：从启动命令到浏览器把首页内容真正显示出来（无头浏览器打开首页，等待正文元素可见），而不是第一个 HTTP 响应。VitePress dev 首个响应只是空壳 HTML，旧口径对两边不公平。
- 首屏体积：HTML 与首屏 JS 一起计算，因为 VitePress 把页面清单内联在 HTML 中。
- 旧口径的结果保留在 `bench/results/` 中，但新旧结果不直接比较。

## 三、不做的事

- 不替换 Vue Router。路由运行时约 35 KB，是 0.1 已确认的取舍。
- 不在本轮优化 CLI 与配置加载（约 800 ms）。它主要来自 Jiti 与 Vite `runnerImport` 的冷启动，需要单独测量后再设计。

## 四、验收

第一轮（2.1 至 2.3）已完成：docs 首页 `entry-client` 从 155 KB 降到 98 KB gzip，dev 首个页面请求从 1.4 s 降到约 0.7 s。

第二轮（2.4 至 2.8）：

- 500 页冷构建不超过 VitePress 的 1.5 倍。
- 每多一页增加的首屏字节数（HTML 与 JS 一起计算）不超过 VitePress。
- docs 首页首屏 JS 低于 85 KB gzip。
- E2E 中没有 hydration 警告。

两轮都要求：

- `env -u NODE_ENV pnpm bench --sizes 50,500 --runs 3` 的结果写入 `bench/results/`。
- docs 首页 `entry-client` 的 gzip 体积低于 95 KB。
- dev 首个页面请求在 docs 站点低于 700 ms。
- 全部 lint、typecheck、单元测试、构建和两种 base 的 E2E 通过。
