# KawaPress 路由方案：Core 自建文档站路由

本文是 0.1 路由的唯一技术方案。确认后的结论会同步合入 `mvp-0.1-product-plan.md` 2.2、4.4 与第八章，本文保留实现细节与验收要求。

## 一、结论

KawaPress 不再依赖 `vue-router`。Core 会自行实现一套只覆盖文档站需求的路由：页面表是纯数据，页面由统一函数按需加载，对外 API 保留 Vue Router 常用命名与用法的一小部分子集。

决策理由：

- 文档站路由本质上只是“路径 → 页面模块”的查表映射，不需要匹配器、嵌套路由、命名路由与动态路由。VitePress 一直使用约 250 行代码自建路由；VuePress 2 也在 2.0.0-rc.3 将页面移出 `vue-router` 路由记录，直接原因就是 `vue-router` 会拖慢大型静态站的性能。
- “每页一条 `vue-router` 路由记录”直接造成了多项已测得的问题：每页一句动态 `import()` 导致 Vite 为每页生成预加载依赖表（500 页时约占 5.7 KB gzip）；匹配器与 `RouterLink` 的开销随页数增长；SSR 每渲染一页都需要重建一次全部路由（#20）；异步首次导航必须配合专门的 history 包装才能保证 hydration 结果与静态 HTML 完全一致（#18）。
- 现有主题与插件实际只用到三类能力：页面跳转、读取当前路径与 hash、跳转后回调。

## 二、页面表

### 2.1 浏览器端接收的数据

虚拟模块 `virtual:kawapress-pages` 在 dev 与 build 两种模式下导出相同的结构：

```ts
/** 一个页面：加载函数，只在 Core 内部使用。 */
type PageLoader = () => Promise<PageModule>

/** 路由路径 → 加载函数 */
export const pages: Record<string, PageLoader>
```

页面表不再附带标题、layout 或其他任何摘要数据。

- **dev 模式**：每页为 `() => import('<page module id>')`。Vite 按需编译页面，页面 HMR 不经过路由。
- **build 模式（client）**：页面表模块只导入一个 Core 提供的统一加载函数和一张纯数据表：

```ts
// 路由路径 → 页面 chunk 文件名；有额外依赖时为 [文件名, 额外 JS, 额外 CSS]
type BuiltPageEntry = string | [file: string, js: string[], css: string[]]
```

  统一加载函数按需为页面插入 `<link rel="modulepreload">` 与 `<link rel="stylesheet">`（已存在的不重复插入，且等 CSS 加载完成后再继续），然后执行 `import(/* @vite-ignore */ withBase(file))`。页面表中没有任何可被静态分析的 `import()`，因此 Vite 不会再生成预加载依赖表。
- **build 模式（SSR）**：页面表保持 `() => import('<page module id>')`，SSR 打包产物不需要记录文件名。

### 2.2 构建阶段如何获取文件名

- 将每个 Markdown 页面作为 client 构建的独立 input（入口名由路由路径推导生成，确保稳定、可读且互不冲突），并配置 `preserveEntrySignatures: 'allow-extension'`。页面各自成为独立 chunk，不再依赖动态 `import()` 触发拆分。VitePress 1.6 采用相同做法（每页一个 input，打包后从产物读取哈希生成 `__VP_HASH_MAP__`），500 页冷构建耗时与我们相当，入口数量本身不是构建耗时的瓶颈。
- `app` 代码分组按“是否被 `entry-client` 静态导入（直接或间接）”进行判定。这与 VitePress 的 `framework`/`theme` 分组思路一致，避开了会把页面入口也视作初始入口的 `$initial` 标签。页面 chunk 的公共依赖按 Rolldown 默认规则拆成共享 chunk。构建测试会严格锁定 `app` chunk 中不包含任何页面模块。
- 页面 CSS 保持按页拆分，不采用 VitePress 的全局打包策略 `cssCodeSplit: false`：带有页面级 `<style>` 的页面，会在页面表中记录专属于自己的 CSS 文件。
- 页面表内容在预渲染阶段根据 client 构建的最终产物清单（`dist/.vite/manifest.json` 中每个 chunk 的 `file`、`imports`、`css`）计算：额外 JS 为页面 chunk 的静态依赖闭包减去 `entry-client` 的静态依赖闭包；额外 CSS 采用相同计算方式。所有文件名均直接取自打包产物，不手写、不猜测。
- 页面表作为带内容哈希的独立文件输出（`assets/pages-<hash>.js`，`export default` 一个 JSON 对象），由 HTML 引用，不由 `entry-client` 引用：Rolldown 中没有任何钩子能在文件名确定之后再影响入口 chunk 自身的哈希（已用两次构建验证），由入口引用会让入口或页面表的哈希失真。
  - 预渲染阶段生成页面表：它与首屏 `modulepreload` 使用 `server/page-assets.ts` 中同一个依赖计算函数，首屏与站内跳转对同一页面给出相同的依赖集合。
  - 每个 HTML 写入 `<link rel="modulepreload">` 指向页面表，并用 `<meta name="kawapress-pages">` 给出它的地址；client 构建中的 `virtual:kawapress-pages` 读取该地址并 `import()` 页面表，然后才创建路由。
  - 页面表的值直接使用产物中的完整文件名，不从路由路径推导文件名，因此不依赖 `entryFileNames` 等输出命名配置。实测 500 页时页面表每页约 12.9 B gzip。
- 现有的 `server/page-assets.ts` 继续负责处理首屏 HTML 中的 `modulepreload` 与样式表；它改为同时读取页面表的计算结果，保证首屏直出与后续站内跳转对同一页面拿到完全相同的依赖集合。

### 2.3 dev 与 build 的差异仅在于页面表生成

路由本体只处理 `Record<string, PageLoader>`，对当前处于 dev 还是 build 完全无感知。

## 三、路由本体

源码目录：`packages/kawapress/src/client/router/`。代码按职责拆分成独立小模块（路由状态、跳转控制、浏览器历史与链接拦截、内置组件），每个文件控制在 500 行以内。

### 3.1 当前路由状态

```ts
interface Route {
  /** 不含 base 的公开路由路径，例如 /guide/intro */
  readonly path: string
  /** path + search + hash */
  readonly fullPath: string
  readonly query: Readonly<Record<string, string | string[]>>
  /** 含 #，没有时为空字符串 */
  readonly hash: string
  /** 当前路径是否命中页面表 */
  readonly found: boolean
}
```

`useRoute()` 返回响应式的只读 `Route` 对象，`router.currentRoute` 为 `Readonly<ShallowRef<Route>>`。query 的解析规则与 Vue Router 一致：键名重复时解析为数组。

### 3.2 跳转控制

```ts
interface Router {
  readonly currentRoute: Readonly<ShallowRef<Route>>
  push: (to: string) => Promise<void>
  replace: (to: string) => Promise<void>
  /** 返回 false 取消本次跳转 */
  beforeEach: (guard: (to: Route, from: Route) => void | boolean | Promise<void | boolean>) => () => void
  afterEach: (hook: (to: Route, from: Route) => void) => () => void
}
```

`push(to)` 的完整执行步骤：

1. 解析目标地址 `to`（支持不含 base 的路径，可携带 query 与 hash）；百分号编码（percent-encoded）的路径先解码再查表匹配。
2. 依次执行注册的 `beforeEach` 守卫。
3. 若目标路径与当前路径相同，仅 hash 或 query 不同：跳过页面加载，直接更新路由状态与历史记录。
4. 目标路径不同时，调用对应的页面加载函数。加载行为以最后一次发起的跳转为准：较早的跳转加载完成时若已不是最新，直接丢弃该次结果。
5. 若页面加载失败或路径未在页面表中命中：将 `found` 设为 `false`，渲染 NotFound 视图。
6. 更新 `currentRoute` 并写入浏览器历史记录（`push` 调用 `pushState`，`replace` 调用 `replaceState`）。在 `history.state` 中保存滚动位置等信息由主题层自行处理，路由层只保证在 `popstate` 触发时正确恢复对应路由。
7. 执行注册的 `afterEach` 钩子。

浏览器前进与后退：监听 `popstate` 事件，按上述相同流程加载目标页，但不追加新的历史记录。

链接拦截沿用现有 `installLinkInterceptor` 的判定规则（按键修饰符、`target`、`download` 属性、外链、跨域请求、base 之外的路径均不拦截），在此基础上改为查页面表；页面表中不存在的路径交还给浏览器执行整页加载，与当前行为保持一致。

### 3.3 内置组件

- `RouterView`：渲染当前页面的组件；`found` 为 `false` 时渲染全局 `NotFound` 组件。
- `RouterLink`：接收不含 base 的路由路径 `to`，渲染为 `<a href="withBase(to)">`；当目标路径与当前路径一致时附带 `aria-current="page"`。点击事件统一交给全局链接拦截处理，组件本身不注册独立的点击监听，在 setup 阶段也不做任何与页面总数相关的计算。

### 3.4 首次渲染与 Hydration

- 浏览器启动阶段，按静态 HTML 对应的路径（不含 query 与 hash；404 页面统一对应 `/404`）同步确定当前路由，在 `await` 该页面的加载函数执行完毕后再挂载（mount）应用。首屏渲染的 `currentRoute` 与 SSR 完全一致。
- 应用挂载完成后，再将地址栏中的 query 与 hash 写入 `currentRoute`。该过程不触发页面重复加载，也不产生新的历史记录。对于 404 页面，挂载完成后将其 `path` 更新为地址栏中的实际路径，`found` 保持为 `false`。
- 百分号编码的页面路径：挂载完成后通过 `replaceState` 改为解码后的标准路径（取代现有的 `installEncodedPagePathRedirect`）。
- 移除 `client/hydration.ts` 中的 history 包装层。`core/hydration-plan.ts` 中仅保留纯函数逻辑（负责推导首屏路径与挂载后需补齐的 URL），继续通过单元测试保证覆盖。

### 3.5 SSR 支持

每次执行 `render(url)` 时直接创建新的路由实例：内部只执行查表与单页加载，不构建任何匹配结构。通过 `found` 字段直接判断是否命中，取代原有的 `NOT_FOUND_ROUTE_NAME` 判断。#20 随之解决。

### 3.6 页面滚动

路由层不负责页面滚动，与现状保持一致：由主题层 nagi 统一管理独立的滚动区域、锚点定位与回到顶部逻辑。

## 四、公开 API

模块 `kawapress/client` 对外导出：`useRoute`、`useRouter`、`RouterLink`、`RouterView`，以及类型定义 `Route`、`Router`。保留的 API 在命名与使用方式上与 Vue Router 完全一致。

Runtime Plugin 的 `router(handler)` 同样注入上述 `Router` 实例。插件生命周期的执行时机保持不变：创建 Vue App 与 Router → 安装核心功能 → 按插件顺序执行 `vueApp` / `router` 钩子 → 首次导航 → 执行 SSR render 或浏览器端 mount。

明确不提供的能力：嵌套路由、命名路由、动态参数、`addRoute`、`getRoutes`、路由别名、重定向配置、守卫中返回新地址重定向、`scrollBehavior`、`isReady`、`resolve`。未来仅在出现真实需求时按需增加。

清理移除的项目：`PageRouteMeta`、`route.meta.page`、`client/types/route-meta.d.ts`、`toPageRouteMeta`、`NOT_FOUND_ROUTE_NAME`，以及对 `vue-router` 的全部依赖（包含 Vite 配置中的 `resolve.dedupe`、`ssr.noExternal`、`optimizeDeps` 条目与 catalog 依赖项）。

## 五、nagi 自动侧边栏数据流

页面的标题与 layout 属于 nagi 自动侧边栏的展示范畴，不属于 Core 的职责。

- 虚拟模块 `virtual:kawapress-nagi-sidebar-meta` 在现有 `_meta.json` 数据之外，增加自动侧边栏所需的页面清单 `{ 路由路径: { title, layout? } }`。
- 只为未被手动配置 `themeConfig.sidebar` 覆盖的路由生成条目：凡是命中手动配置路径前缀（包含各 locale）的页面均不进入该清单。官方文档站与性能基准站均采用手动配置 Sidebar，因此该列表在对应构建中保持为空。
- 标题提取统一复用 Core 已公开的规则：Core 从 `kawapress` 暴露页面摘要读取接口（即现有 `compiler/page-summary.ts` 中的 `createPageSummaryReader`，仅返回 nagi 所需的 `{ title, frontmatter }` 字段），与 Search 模块保持一致，不执行页面的 `pageData()`。页面文件查找同样复用 Core 公开的页面发现规则，不在 nagi 中重复维护一套目录扫描逻辑。
- dev 模式下，当 Markdown 文件的标题、layout、页面增删或 `_meta.json` 发生变化时，该虚拟模块自动失效并触发热更新（HMR）。
- `useSidebarItems` 改为直接读取该列表；上一篇与下一篇翻页导航沿用侧边栏的计算结果，行为保持不变。

## 六、相关文档同步

- `docs/guide/routing.md`（中英版）：将原“为什么使用 Vue Router”一节改写为介绍 KawaPress 自建的文档站路由，说明其覆盖的能力范围、不予支持的功能，以及相比 VitePress 和 Vue Router 的设计考量。
- `theme-customization.md` 与 `plugin-development.md`（中英版）：同步更新 `useRouter`、`RouterLink`、`RouterView` 与 `router()` 的使用说明，删除针对 `route.meta.page` 与 `getRoutes()` 的示例；`router()` 示例调整为在 `beforeEach` 中通过返回 `false` 取消跳转。
- `mvp-0.1-product-plan.md`：同步修改 2.2、2.1 生命周期图、4.4、第八章中涉及 `PageRouteMeta` 与自动侧边栏的段落，以及第十章的交付范围；`performance-plan.md` 2.2、2.5 中与路由摘要相关的表述统一改为引用本文。

## 七、验收标准

- 项目依赖树中完全剔除 `vue-router`。
- 现有全部单元测试与 E2E 测试均运行通过（覆盖 base 为 `/` 与 `/kawapress/`，以及 `NODE_ENV` 未设置与显式为 `production` 的组合场景），E2E 测试过程无任何 hydration 警告。
- 新增 E2E 验证：
  - 浏览器后退与前进能正确恢复对应页面；
  - 快速连续点击两个链接后，稳定停留在后点击的页面；
  - 导航至包含页面级 `<style>` 的页面时，样式在内容出现前已生效；
  - Twoslash 页面浮层功能正常可用；
  - 仅变更 hash 的同页跳转不会重新加载页面模块；
  - 百分号编码的 URL 路径会被无刷新替换为解码后的路径。
- 构建校验：
  - 页面表中普通页面条目仅包含一个文件名；
  - 包含页面级 CSS 的页面条目准确记录其专用的 CSS 资源；
  - 页面表模块中不存在 Vite 生成的 `__vite__mapDeps` 预加载表；
  - 打包产物中的 `app` chunk 不包含任何页面代码模块。
- 性能基准校验（执行 `env -u NODE_ENV pnpm bench --sizes 50,500 --runs 3`）：
  - 500 页站点中，每新增一页所增加的首屏体积（HTML 与 JS）不超过 VitePress；
  - 50 页与 500 页规模下，首页首屏资源总量（HTML + JS + CSS）均不超过 VitePress；
  - 新增两项核心交互指标：hydration 完成耗时（从发起导航到应用 mount 完成）与站内跳转耗时（从点击侧边栏链接到新页面 h1 渲染可见），两者均不慢于 VitePress；
  - 冷构建耗时与 dev 模式就绪耗时相较当前版本无性能退步。

