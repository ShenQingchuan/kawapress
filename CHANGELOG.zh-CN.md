# 更新日志

KawaPress 的所有重要变更都记录在这里。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。1.0 之前，第二位数字的变化（如 `0.2` → `0.3`）可能包含破坏性变更。

17 个公开包一起发布，使用同一个版本号。[English](https://github.com/kawapress/kawapress/blob/main/CHANGELOG.md)

## [0.3.0] - 2026-10-28

### 破坏性变更

**Outlet 改名，`addToOutlet()` 被替换。** 旧名字和旧 API 已经移除，没有保留别名，仍在使用它们的插件会在站点启动时报错。

| 旧 Outlet | 新 Outlet |
| --- | --- |
| `header.actions` | `layout.header.end` |
| `doc.header` | `doc.under-title` |
| `doc.footer` | `doc`（后置） |
| `doc.after` | `doc`（后置） |

| 旧 API | 新 API |
| --- | --- |
| `api.addToOutlet(outlet, item)` | `api.prependToOutlet(outlet, item)` 或 `api.appendToOutlet(outlet, item)` |

不同身份的用户需要做什么：

- **站点作者**，只使用官方插件：代码不需要改。把 `kawapress` 和所有 `@kawapress/*` 包一起升级到 `0.3.0`。
- **插件作者**：替换每一处 `api.addToOutlet(...)`。`prependToOutlet` 把组件放在主题内容前面，`appendToOutlet` 放在后面。`id` 参数不变。
- **主题作者**：把主题自己画的内容包进 `<KawaOutlet name="...">`，不要再在旁边放一个空的 `<KawaOutlet />`。作用域插槽（`v-slot="{ items }"`）已移除，默认插槽现在放的是你自己的内容。

```diff
-api.addToOutlet('doc.footer', { id: 'last-updated', component: LastUpdated })
+api.appendToOutlet('doc', { id: 'last-updated', component: LastUpdated })
```

```diff
-<KawaOutlet name="header.actions" />
-<LanguageMenu />
+<KawaOutlet name="layout.header.end">
+  <LanguageMenu />
+</KawaOutlet>
```

### 新增

- **八个标准 Outlet。** Outlet 的名字由「范围 + 位置」组成：`layout` 是页面框架，`doc` 是正在阅读的这一篇文档，`start` / `end` 跟随阅读方向。八个名字是 `layout.header`、`layout.header.start`、`layout.header.end`、`layout.sidebar`、`layout.footer`、`doc`、`doc.under-title`、`doc.toc`，nagi 主题全部实现。详见[主题开发](https://kawapress.dev/plugins/theme-development)和[插件开发](https://kawapress.dev/plugins/plugin-development)。
- **`api.prependToOutlet()` 与 `api.appendToOutlet()`。** 插件可以选择出现在主题自己内容的前面还是后面。多个插件使用同一个 Outlet 的同一侧时，按 `plugins` 数组的顺序依次排列。
- **GitHub Packages。** 15 个带 `@kawapress/` 前缀的包也会出现在仓库页面的 Packages 里，安装仍然从 npmjs.com 进行。`kawapress` 和 `create-kawapress` 不在那里，因为 GitHub 要求包的 scope 与所有者同名。

### 变更

- **最后更新那一行。** 左边是带图标的编辑链接，右边是更新时间。它现在排在上一篇/下一篇之后，评论区又排在它之后。两个插件都追加到 `doc`，想调整它们的顺序，就调整它们在 `plugins` 里的顺序。
- **Mermaid 并排视图。** 左边是源码，右边是图，中间的分隔条可以拖动。分隔条平时是一条细线，悬停或拖动时才加宽，源码区撑满整个高度。窄屏幕上，图排在源码上方。
- **文档。** 主题相关的几篇合并成一篇[主题开发](https://kawapress.dev/plugins/theme-development)，`guide/theme-customization` 和 `guide/theme-architecture` 两个页面不再存在。文档站每次构建前会补全 git 历史，所以每个页面都能显示最后更新时间。

### 修复

- 插件放进顶栏控件区的内容（例如搜索按钮）在 0.2.1 里被放到了 Logo 旁边，现在回到顶栏末尾，位于语言菜单之前。

### 迁移

1. 把站点里的 `kawapress` 和所有 `@kawapress/*` 包升级到 `0.3.0`。
2. 如果写过插件，按上面的示例替换 `addToOutlet()`，并按表格改掉 Outlet 的名字。
3. 如果写过主题，把你的内容包进 `<KawaOutlet>`，并删掉对它作用域插槽的使用。
4. 运行 `kawapress build`。如果有插件往一个没有任何页面渲染的 Outlet 里放了内容，会输出一行警告。

## [0.2.2] - 2026-10-28

### 修复

- npm 上每个包的 README 里「简体中文」链接会打开 404 页面。现在每个包的 tarball 都包含 `README-zh-CN.md`，链接可以正常打开。

## [0.2.1] - 2026-10-27

### 新增

- **每个包自己的 README。** 每个包在 npm 页面上都有自己的中英文 README。
- **Mermaid 视图。** 图可以在图像、代码、并排三种视图之间切换。

### 变更

- **nagi 顶栏。** 搜索按钮移到了 Logo 旁边，导航链接移到右侧，与语言菜单、外观切换和 GitHub 链接放在一起。
- 仓库迁移到 `kawapress` GitHub 组织，文档链接改用 `kawapress.dev`。
- **发布流程。** 每个包有自己的版本号，一次发布只发布 npm 上还没有的版本。详见 [RELEASING.md](https://github.com/kawapress/kawapress/blob/main/RELEASING.md)。

### 修复

- 放大后的 Mermaid 图不再被视图切换下方的一条硬边截断。

## [0.2.0] - 2026-10-27

### 破坏性变更

- 页面数据、Frontmatter 和主题配置的类型，现在由插件和主题通过 TypeScript 接口合并来扩展，不再用泛型参数传递。请使用不带类型参数的 `defineConfig()` 和 `useThemeConfig()`，并在 `declare module 'kawapress' { interface ThemeConfig { ... } }` 里声明主题字段。
- 已移除 `PresetConfig`、`NagiThemeConfig`、`NagiHomeFrontmatter` 和 `LastUpdatedPageData`。

### 新增

- `@kawapress/plugin-mermaid`：用文字写图表，构建时画成 SVG。
- nagi 的 `themeConfig.nav`：顶栏的分区链接，每个分区有自己的侧边栏。
- 官方文档分成「指南」和「插件」两个分区，并新增官方插件总览页。

### 修复

- CSS 目标浏览器改为原生支持 `light-dark()` 的版本，主题覆盖 Token 不再在生产构建中丢失颜色。
- 发布时某个版本已经在 npm 上，不再让整次发布失败。

[0.3.0]: https://github.com/kawapress/kawapress/releases/tag/v0.3.0
[0.2.2]: https://github.com/kawapress/kawapress/releases/tag/v0.2.2
[0.2.1]: https://github.com/kawapress/kawapress/releases/tag/v0.2.1
[0.2.0]: https://github.com/kawapress/kawapress/releases/tag/v0.2.0
