# Sitemap 插件方案

状态：实现中。未纳入 0.1 版本计划，0.1 不包含 sitemap，见 `mvp-0.1-product-plan.md` 第 2.2 节。

## 一、形态

- 独立逻辑插件 `@kawapress/plugin-sitemap`，仅包含生成侧能力，不包含运行侧。
- 通过 `api.config` 读取 `base`、`locales`，通过 `api.vite` 读取项目根目录，通过 `api.buildArtifacts` 获取 `pages` 并调用 `emitFile('sitemap.xml', ...)` 写出文件。不修改 Core，不依赖 Vite 内部实现。
- nagi Preset 默认组合该插件，但插件默认关闭。`nagi({ sitemap })` 只有传入 `hostname` 才会生成文件。

## 二、选项

- 插件选项类型为 `SitemapPluginOptions`，继承 `sitemap` 库的 `SitemapStreamOptions`，所有库选项原样透传给 `SitemapStream`。
- `hostname`：开启开关。必须是绝对的 `http(s)` 地址，插件自动拼接站点 `base`，用户不需要手动追加。未设置时不输出日志，也不生成文件。
- `lastUpdated`：默认 `false`。为 `true` 时从 git 读取每个源文件的最后提交时间，作为 `lastmod`。
- `transformItems(items)`：与 VitePress 签名一致，可增删改条目，返回 `undefined` 时使用原数组。

## 三、构建行为

- 开启时在 `buildArtifacts` 阶段（预渲染之前）终端输出 `sitemap 正在生成中…`，完成后输出条目数量。
- 页面范围来自 `pages`，即已预渲染的页面。frontmatter `sitemap: false` 排除单页。
- URL 由 `routePath` 生成，无末尾 `/` 之外的后缀。非 ASCII 路径逐段 `encodeURIComponent`。
- 多语言按去掉 locale 前缀后的路由分组，同组页面输出 `xhtml:link` 备选，每个 URL 包含全部语言变体（含自身）。`lang` 取自 `locales` 配置。只有一个变体的页面不输出 `links`。

## 四、lastUpdated 约束

- 仅使用 git 提交时间或 frontmatter 覆盖值，不使用文件 mtime。
- 一次 `git log` 批量读取，结果在单次构建中复用。
- 仓库为浅克隆时输出 warning，并且不输出任何 lastmod，不静默输出错误日期。
- 不在 git 仓库中时输出 warning，同样不输出 lastmod。
- frontmatter `lastUpdated: false` 关闭单页 lastmod。
- frontmatter `lastUpdated` 只接受可解析的日期字符串（如 `"2023-05-06"`），不接受 YAML 未加引号的日期。KawaPress Core 要求 `pageData` 可 JSON 序列化，`Date` 会在构建时报错。无效字符串直接报错。与 VitePress 的差异即在此处。
- 当前 `.github/workflows/deploy-pages.yml` 使用 `actions/checkout@v6` 且未设置 `fetch-depth`，默认是浅克隆。启用 `lastUpdated` 时需要改为 `fetch-depth: 0`。

## 五、输出约束

- 输出到构建根目录 `sitemap.xml`。若同名文件已存在，沿用 Core `emitFile` 规则直接报错，不覆盖。
- 单文件条目数不得超过 50,000，超过时报错。`SitemapStream` 本身不做此校验，由插件负责。
- 不支持 sitemap index。超限直接报错，不拆分文件。
- 不生成 `robots.txt`，也不引用 sitemap。由使用方自行处理。
- 生成侧函数（如 `transformItems`）只存在于生成阶段，插件数据不进入运行侧。
- `sitemap` 库的类型只在插件内部使用，用户可见的类型由插件自身导出。