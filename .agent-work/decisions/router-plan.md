# KawaPress 路由方案：Core 自建文档站路由

本文是 0.1 路由的唯一技术方案。确认后的结论同步合入 `mvp-0.1-product-plan.md` 2.2、4.4 与第八章，本文保留实现细节与验收。

## 一、结论

KawaPress 不再依赖 vue-router。Core 自己实现一套只覆盖文档站需求的路由：页面表是纯数据，页面由一个统一函数加载，公开 API 沿用 Vue Router 的名字与用法的小子集。

理由：

- 文档站的路由是“路径 → 页面模块”的查表，不需要匹配器、嵌套路由、命名路由与动态路由。VitePress 一直用约 250 行的自建路由；VuePress 2 在 2.0.0-rc.3 把页面从 vue-router 路由记录中移出，原因是 vue-router 对大型静态站的性能有负面影响。
- 每页一条 vue-router 路由记录直接造成了已测得的问题：每页一句动态 `import()` 让 Vite 为每页生成预加载依赖表（500 页约 5.7 KB gzip）；匹配器与 `RouterLink` 的成本随页数增长；SSR 每渲染一页重建一次全部路由（#20）；异步首次导航需要专门的 history 包装才能让 hydration 与静态 HTML 一致（#18）。
- 现有主题与插件只用到跳转、读取当前路径与 hash、跳转后回调三类能力。

## 二、页面表

### 2.1 浏览器得到的数据

`virtual:kawapress-pages` 在两种模式下导出同一个形状：

```ts
/** 一个页面：加载函数，只在 Core 内部使用。 */
type PageLoader = () => Promise<PageModule>

/** 路由路径 → 加载函数 */
export const pages: Record<string, PageLoader>
```

页面表不再携带标题、layout 或任何其他摘要。

- **dev**：每页 `() => import('<page module id>')`。Vite 按需编译页面，页面 HMR 不经过路由。
- **build（client）**：页面表模块只导入一个 Core 的统一加载函数，和一张纯数据表：

```ts
// 路由路径 → 页面 chunk 文件名；有额外依赖时为 [文件名, 额外 JS, 额外 CSS]
type BuiltPageEntry = string | [file: string, js: string[], css: string[]]
```

  统一加载函数按需为页面插入 `<link rel="modulepreload">` 与 `<link rel="stylesheet">`（已存在的不重复插入，CSS 加载完成后再继续），然后 `import(/* @vite-ignore */ withBase(file))`。页面表里不能有任何静态可分析的 `import()`，因此不会有 Vite 预加载依赖表。
- **build（SSR）**：页面表保持 `() => import('<page module id>')`，SSR bundle 不需要文件名。

### 2.2 构建期如何得到文件名

- 每个 Markdown 页面作为 client 构建的独立 input（入口名由路由路径派生，保证稳定、可读、无冲突），并设置 `preserveEntrySignatures: 'allow-extension'`。页面因此各自成为 chunk，不再依赖动态 `import()` 触发拆分。VitePress 1.6 使用同一做法（每个页面一个 input，打包后从产物读取哈希生成 `__VP_HASH_MAP__`），500 页冷构建与我们相当，入口数量本身不是构建时间风险。
- `app` 代码分组按“被 `entry-client` 静态导入（直接或传递）”判断，与 VitePress 的 `framework`/`theme` 分组同一思路，不使用会把页面入口也视为初始入口的 `$initial` 标签。页面 chunk 共同依赖的模块按 Rolldown 默认规则拆成共享 chunk。构建测试锁定 `app` chunk 不包含任何页面模块。
- 页面 CSS 继续按页拆分，不采用 VitePress 的 `cssCodeSplit: false`：带页面级 `<style>` 的页面在页面表中记录自己的 CSS。
- 页面表的内容在 `generateBundle` 阶段从最终产物（chunk 的 `fileName`、`imports`、`viteMetadata.importedCss`）计算：额外 JS = 页面 chunk 的静态依赖闭包减去 `entry-client` 的静态依赖闭包；额外 CSS 同理。所有文件名来自产物，不手写、不猜测。
- 页面表优先作为独立文件发出，以便浏览器缓存。它的文件名必须随内容变化：先验证 Rolldown 在 `generateBundle` 中 `emitFile` 的资源能得到内容哈希文件名，并且入口 chunk 能通过标准机制（`import.meta.ROLLUP_FILE_URL_<id>` 或等价方式）引用它而不破坏 `entry-client` 自身的哈希正确性。验证不通过时，页面表改为内联进每个 HTML（与 VitePress 相同），并在本文记录原因。
- 现有 `server/page-assets.ts` 继续负责首屏 HTML 的 `modulepreload` 与样式表；它改为同时读取页面表的计算结果，保证首屏与站内跳转对同一页面给出相同的依赖集合。

### 2.3 dev 与 build 的差别只在页面表生成

路由本体只认 `Record<string, PageLoader>`，不知道当前是 dev 还是 build。

## 三、路由本体

位置：`packages/kawapress/src/client/router/`，按职责拆成小模块（路由状态、跳转、浏览器历史与链接拦截、组件），每个文件不超过 500 行。

### 3.1 当前路由

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

`useRoute()` 返回响应式的只读 `Route`，`router.currentRoute` 是 `Readonly<ShallowRef<Route>>`。query 的解析与 vue-router 一致：重复键得到数组。

### 3.2 跳转

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

`push(to)` 的流程：

1. 解析 `to`（接受不含 base 的路径，可带 query 与 hash），百分号编码的路径先解码再查表。
2. 依次执行 `beforeEach`。
3. 路径与当前相同、只有 hash 或 query 不同：不加载页面，直接更新路由与历史记录。
4. 否则调用页面加载函数。以最后一次跳转为准：较早的跳转加载完成时若已不是最新，直接丢弃。
5. 加载失败或路径不在页面表中：`found = false`，渲染 NotFound。
6. 更新 `currentRoute`，写入历史记录（`push` 用 `pushState`，`replace` 用 `replaceState`），在 `history.state` 中保存当前滚动位置所需的信息由主题决定，路由只保证 `popstate` 时恢复对应路由。
7. 执行 `afterEach`。

浏览器后退与前进：监听 `popstate`，按同一流程加载目标页，不写历史记录。

链接拦截沿用现有 `installLinkInterceptor` 的判定规则（修饰键、`target`、`download`、外部链接、不同源、base 之外都不拦截），改为查页面表；页面表中不存在的路径交给浏览器整页加载，与现在行为一致。

### 3.3 组件

- `RouterView`：渲染当前页面组件；`found` 为 false 时渲染全局 `NotFound`。
- `RouterLink`：`to` 为不含 base 的路由路径，输出 `<a href="withBase(to)">`；当前路径相同时带 `aria-current="page"`。点击交给全局链接拦截，组件自身不注册点击处理，也不在 setup 中做任何与页数相关的计算。

### 3.4 首次渲染与 hydration

- 浏览器启动时，按静态 HTML 对应的路径（不含 query 与 hash；404 文档为 `/404`）同步确定当前路由，`await` 该页面的加载函数后 mount。首屏 `currentRoute` 与 SSR 完全一致。
- mount 之后把 query 与 hash 写入 `currentRoute`，不触发页面加载，也不写历史记录。404 文档 mount 后 `path` 改为地址栏中的真实路径，`found` 保持 false。
- 百分号编码的页面路径：mount 后用 `replaceState` 改成解码后的路径（取代现有 `installEncodedPagePathRedirect`）。
- 删除 `client/hydration.ts` 的 history 包装。`core/hydration-plan.ts` 只保留纯函数部分（决定首屏路径与 mount 后要补上的 URL），继续由单元测试覆盖。

### 3.5 SSR

每次 `render(url)` 创建新的路由实例：只查表与加载一个页面，不构建任何匹配结构。`found` 直接给出是否命中，取代 `NOT_FOUND_ROUTE_NAME` 判断。#20 随之关闭。

### 3.6 滚动

路由不负责滚动，与现状一致：nagi 已经管理自己的滚动区域、锚点定位与回到顶部。

## 四、公开 API

`kawapress/client` 导出：`useRoute`、`useRouter`、`RouterLink`、`RouterView`，以及类型 `Route`、`Router`。名字与用法和 Vue Router 相同的部分保持相同。

Runtime Plugin 的 `router(handler)` 得到上面的 `Router`。执行时机不变：创建 Vue App 与 Router → 安装核心能力 → 按插件顺序执行 `vueApp` / `router` handlers → 首次导航 → SSR render 或浏览器 mount。

不提供：嵌套路由、命名路由、动态参数、`addRoute`、`getRoutes`、别名、重定向配置、守卫中返回新地址改跳、`scrollBehavior`、`isReady`、`resolve`。需要时再按真实需求增加。

删除：`PageRouteMeta`、`route.meta.page`、`client/types/route-meta.d.ts`、`toPageRouteMeta`、`NOT_FOUND_ROUTE_NAME`，以及 `vue-router` 依赖（含 `resolve.dedupe`、`ssr.noExternal`、`optimizeDeps` 中的条目与 catalog 条目）。

## 五、nagi 自动侧边栏的数据

页面标题与 layout 属于 nagi 的自动侧边栏，不属于 Core。

- `virtual:kawapress-nagi-sidebar-meta` 在现有 `_meta.json` 数据之外，增加自动侧边栏需要的页面列表 `{ 路由路径: { title, layout? } }`。
- 只为不被手写 `themeConfig.sidebar` 覆盖的路由生成条目：手写配置覆盖的路径前缀（含各 locale）下的页面不进入列表。官方 docs 与基准站点都使用手写 Sidebar，因此这份列表为空。
- 标题按 Core 已公开的规则读取：Core 从 `kawapress` 公开页面摘要读取函数（现有 `compiler/page-summary.ts` 的 `createPageSummaryReader`，返回 `{ title, frontmatter }` 中 nagi 需要的部分），与 Search 一样不执行 `pageData()`。页面文件列表也使用 Core 公开的同一套页面发现规则，不在 nagi 里复制一份目录扫描。
- dev 中 Markdown 标题、layout、页面增删或 `_meta.json` 变化时，该虚拟模块失效并热更新。
- `useSidebarItems` 改为读取这份列表；上一篇与下一篇沿用侧边栏结果，行为不变。

## 六、文档

- `docs/guide/routing.md`（中英）中“为什么使用 Vue Router”一节改写为 KawaPress 自带的文档站路由：说明它覆盖的能力与不覆盖的能力，以及与 VitePress、Vue Router 的关系。
- `theme-customization.md`、`plugin-development.md`（中英）更新 `useRouter`、`RouterLink`、`RouterView`、`router()` 的说明，删除 `route.meta.page` 与 `getRoutes()` 示例；`router()` 示例改为 `beforeEach` 返回 `false` 取消跳转。
- `mvp-0.1-product-plan.md` 2.2、2.1 生命周期图、4.4、第八章 `PageRouteMeta` 与自动侧边栏段落、第十章交付范围同步修改；`performance-plan.md` 2.2、2.5 中与路由摘要相关的内容改为引用本文。

## 七、验收

- 依赖树中没有 `vue-router`。
- 现有全部单元测试与 E2E 通过（base `/` 与 `/kawapress/`、`NODE_ENV` 未设置与 `production`），E2E 无 hydration 警告。
- 新增 E2E：浏览器后退与前进恢复对应页面；快速连续点击两个链接后停在后一个；跳到带页面级 `<style>` 的页面时样式在内容出现前已生效；Twoslash 页面浮层可用；只改 hash 的同页跳转不重新加载页面；百分号编码路径被改成解码后的路径。
- 构建测试：普通页面在页面表中只有一个文件名；带页面级 CSS 的页面记录了它的 CSS；页面表模块中没有 `__vite__mapDeps`；`app` chunk 不包含任何页面模块。
- 基准（`env -u NODE_ENV pnpm bench --sizes 50,500 --runs 3`）：
  - 500 页每多一页增加的首屏字节数（HTML 与 JS）不超过 VitePress。
  - 50 页与 500 页首页首屏 HTML+JS+CSS 不超过 VitePress。
  - 新增两项指标：hydration 完成耗时（从导航开始到应用 mount 完成）与站内跳转耗时（点击侧边栏链接到新页面 h1 可见），均不慢于 VitePress。
  - 冷构建与 dev 就绪不退步。
