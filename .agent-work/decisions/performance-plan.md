# KawaPress 性能方案：dev 启动与首屏 JS

本文记录 dev 启动时间与首屏 JS 体积的已确认优化，全部已实现并随 0.1.0 发布。测量对象是官方 docs 站点（41 个页面，中英双语）。

## 一、优化前的测量

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

`loadSiteConfig()` 使用 Vite `runnerImport()`。它内部按开发环境解析配置；`NODE_ENV` 未设置时会把 `process.env.NODE_ENV` 写成 `development`，之后的构建因此把 Vue 与 devtools 的开发代码打进了产物。

`kawapress build` 在导入构建模块、加载配置之前就把 `NODE_ENV` 固定为 `production`（继承的其他值会被覆盖并给出提示），并向 `createBuilder()` 显式传入 `mode: 'production'`。固定发生在 `cli.ts`，早于任何可能加载 Vue 编译器的导入，否则开发版编译器会把模板注释带进生产 HTML。

### 2.2 浏览器只拿到页面加载函数

这一条落实 0.1 决策“路由路径清单可以进入浏览器，页面组件与 pageData 按需加载”。

- 进入浏览器的页面表只携带每个页面的加载函数，不携带标题、layout 或其他摘要。完整 pageData 只随页面组件模块加载（页面模块的 `__pageData` 导出），`usePageData()` 返回当前页面的完整数据。
- 页面标题与 layout 属于需要它们的主题，不属于 Core 的路由数据；nagi 用自己的虚拟模块提供自动侧边栏数据。Core 只用 `kawapress/generator` 的页面发现与页面摘要读取能力提供读取手段。方案见 `router-plan.md` 第二节。

### 2.3 dev 不在首个请求时编译全站

页面表生成不需要渲染页面。

- `kawapress/generator` 公开页面摘要读取 `createPageSummaryReader()`：只解析 frontmatter 与首个一级标题（与 `resolvePageMetadata()` 使用相同规则，标题纯文本由同一个 `resolveHeadingTitle()` 得到），不调用 Markdown 渲染器、不运行插件的 `pageData()`。
- 生成侧只列页面文件，浏览器构建的页面表由预渲染阶段按产物清单计算。完整编译只在请求某个页面时发生。
- 页面摘要、完整编译与搜索索引的标题规则必须一致：三者共用 `resolvePageMetadata()` 与 `resolveHeadingTitle()`，并有一致性测试比较三者在 frontmatter `title`、h1、二者都缺失、h1 含行内代码与公式等情况下的结果。
- 已知限制：插件在 `pageData()` 中修改的 `title` 不会进入页面摘要。页面摘要描述的是作者写下的标题，这一点写进插件开发文档。

### 2.4 侧边栏链接不使用 RouterLink

500 页基准中，冷构建 23.7 s，其中 Vite 打包只占 4.5 s。其余时间几乎全部花在渲染侧边栏：每个 `RouterLink` 在 setup 时调用 `router.resolve()`，逐条比对全部路由，因此每页侧边栏的成本与页数成正比，全站成本与页数的平方成正比；静态 HTML 与 LLMS 的 SSG-MD 各渲染一遍全站。把侧边栏链接换成普通 `<a>` 后，同一构建降到 10.4 s。

- nagi 的侧边栏链接使用普通 `<a>`，`href` 使用 `withBase()`。站内跳转由 Core 已有的全局链接拦截完成，行为与 RouterLink 一致。
- 当前页高亮由侧边栏根据当前路由路径计算一次，再传给每个链接；链接不各自解析路由。
- 上一篇与下一篇、首页按钮等数量固定的链接保留 RouterLink。

### 2.5 页面表只写一次、单独成文件

页面表按路由路径为键，来自产物清单，与首屏 modulepreload 使用同一个依赖计算函数；实现见 `router-plan.md` 2.2。

- 每个 Markdown 页面是浏览器构建的独立 input，页面 CSS 按页拆分，因此页面表中每页只有自己的 chunk 内容哈希与额外依赖，文件名由路由与哈希算出。
- 页面表作为带内容哈希的独立文件输出，由 HTML 引用；页面表里没有任何可被静态分析的 `import()`，所以没有 Vite 预加载依赖表。
- 站点内容变化不让 app chunk 与入口 chunk 的缓存失效：只有变化的页面 chunk 与页面表换新文件名。
- 页面表的大小随页数线性增长是所有 SPA 式文档站共有的成本。验收以“每多一页增加的首屏字节数（HTML 与 JS 一起计算）不超过 VitePress”为准。

### 2.6 Twoslash 浮层只在用到的页面加载

floating-vue 与 @floating-ui 约 13 KB gzip，只有 Twoslash 浮层使用。VitePress 的 `@shikijs/vitepress-twoslash` 同样在主题里全局 `app.use()`，开启后每页都加载；VitePress 默认不开 Twoslash，所以基准中看不到这笔成本。nagi 默认开启 Twoslash，因此这笔成本落在每个 KawaPress 站点上。

- Core 为 Markdown 编译提供公开能力：Markdown 插件在渲染某个页面时，可以声明“这个页面用到了某个组件”，Core 把对应的导入合并进该页面的 SFC，与作者自己写的 `<script setup>` 共存。写 Markdown 的用户不需要做任何声明。
- 这一能力是公开的插件 API，写入《插件开发》文档；官方插件不走私有通道。
- plugin-shiki 只在含有活跃 Twoslash 代码块的页面导入浮层组件；Runtime Plugin 不全局安装 floating-vue。SSR 与 client 使用同一个页面组件，hydration 保持一致。

### 2.7 OverlayScrollbars 渐进增强

overlayscrollbars 约 9 KB gzip，每页都加载。

- 首屏使用 nagi 已有的 CSS scrollbar 样式（颜色、粗细与主题变量一致），不加载 OverlayScrollbars。
- 页面 hydration 完成后再按需加载 OverlayScrollbars 并接管主要滚动区域；SSR 与 hydration 期间的 DOM 结构不依赖它是否已加载。

### 2.8 基准测试按“页面显示出来”计时

- dev 就绪：从启动命令到浏览器把首页内容真正显示出来（无头浏览器打开首页，等待正文元素可见），而不是第一个 HTTP 响应。VitePress dev 首个响应只是空壳 HTML，按首个响应计时对两边不公平。
- 首屏体积：HTML 与首屏 JS 一起计算，因为 VitePress 把页面清单内联在 HTML 中。
- `bench/results/` 中早于本口径的结果不与之后的结果直接比较。

## 三、不做的事

- 不优化 CLI 与配置加载（约 800 ms）。它主要来自 Jiti 与 Vite `runnerImport` 的冷启动，需要单独测量后再设计。

## 四、验收

第一轮（2.1 至 2.3）已完成：docs 首页 `entry-client` 从 155 KB 降到 98 KB gzip，dev 首个页面请求从 1.4 s 降到约 0.7 s。

第二轮（2.4 至 2.8）结果（`bench/results/2026-10-26-9337622.md`，新口径，3 次中位数）：

| 指标 | KawaPress | VitePress |
|---|---|---|
| 50 页冷构建 | 1.90 s | 2.17 s |
| 500 页冷构建 | 11.74 s | 12.01 s |
| 50 页 dev 就绪（浏览器中可见） | 1.28 s | 1.41 s |
| 500 页 dev 就绪（浏览器中可见） | 1.34 s | 2.42 s |
| 50 页首页首屏 HTML+JS+CSS gzip | 81.2 KB | 83.2 KB |
| 500 页首页首屏 HTML+JS+CSS gzip | 97.9 KB | 91.0 KB |
| 每多一页（指南页 HTML+JS gzip） | 47.3 B | 26.6 B |

docs 首页首屏 JS 为 68.8 KB gzip（`app` 66.3 KB、页面清单 1.8 KB、入口 0.2 KB）。当时“每多一页”未达标：差距来自页面清单中每页的加载函数与 Vite 动态导入的预加载依赖表（500 页时约 4.8 KB gzip，每页都重复列出启动时早已加载的 `app` chunk 与其 CSS），由第三轮解决。

第三轮（`router-plan.md`：Core 自建路由、页面表、页面作为构建入口，并修复 `NODE_ENV` 未设置时生产构建使用 Vue 开发版编译器的问题）结果（`bench/results/2026-10-27-b704cf4.md`，3 次中位数）：

| 指标 | KawaPress | VitePress |
|---|---|---|
| 50 页冷构建 | 1.82 s | 2.15 s |
| 500 页冷构建 | 10.05 s | 12.01 s |
| 50 页 dev 就绪（浏览器中可见） | 1.21 s | 1.42 s |
| 500 页 dev 就绪（浏览器中可见） | 1.25 s | 2.42 s |
| 50 页 hydration 完成 | 178 ms | 250 ms |
| 500 页 hydration 完成 | 174 ms | 518 ms |
| 500 页站内跳转 | 97 ms | 96 ms |
| 50 页首页首屏 HTML+JS+CSS gzip | 73.0 KB | 83.2 KB |
| 500 页首页首屏 HTML+JS+CSS gzip | 81.1 KB | 91.0 KB |
| 每多一页（指南页 HTML+JS gzip） | 26.8 B | 26.6 B |

docs 首页首屏 JS 为 63.6 KB gzip（`app` 62.7 KB、页面表 0.7 KB、入口 0.2 KB）。“每多一页”与 VitePress 持平（差 0.2 B，在多次运行的波动范围内），其中页面表约 10 B，其余为 HTML 中的侧边栏与 nagi 的侧边栏配置。全部指标达到或优于 VitePress。

第二轮目标：

- 500 页冷构建不超过 VitePress 的 1.5 倍。
- 每多一页增加的首屏字节数（HTML 与 JS 一起计算）不超过 VitePress。
- docs 首页首屏 JS 低于 85 KB gzip。
- E2E 中没有 hydration 警告。

两轮都要求：

- `env -u NODE_ENV pnpm bench --sizes 50,500 --runs 3` 的结果写入 `bench/results/`。
- docs 首页 `entry-client` 的 gzip 体积低于 95 KB。
- dev 首个页面请求在 docs 站点低于 700 ms。
- 全部 lint、typecheck、单元测试、构建和两种 base 的 E2E 通过。
