# Changelog

All notable changes to KawaPress are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). Before 1.0, a change to the second number (`0.2` → `0.3`) can contain breaking changes.

The 17 public packages are released together and share one version number. [简体中文](https://github.com/kawapress/kawapress/blob/main/CHANGELOG.zh-CN.md)

## [0.3.0] - 2026-10-28

### Breaking changes

**Outlets are renamed, and `addToOutlet()` is replaced.** The old names and the old API are removed. There are no aliases, so a plugin that still uses them fails when the site starts.

| Old outlet | New outlet |
| --- | --- |
| `header.actions` | `layout.header.end` |
| `doc.header` | `doc.under-title` |
| `doc.footer` | `doc` (appended) |
| `doc.after` | `doc` (appended) |

| Old API | New API |
| --- | --- |
| `api.addToOutlet(outlet, item)` | `api.prependToOutlet(outlet, item)` or `api.appendToOutlet(outlet, item)` |

What changes for each kind of user:

- **Site authors** who only use the official plugins: nothing to change in your code. Update `kawapress` and every `@kawapress/*` package to `0.3.0` together.
- **Plugin authors**: replace each `api.addToOutlet(...)` call. `prependToOutlet` places the component before the theme's content, `appendToOutlet` after it. The `id` option is unchanged.
- **Theme authors**: wrap what your theme draws in `<KawaOutlet name="...">`, instead of placing an empty `<KawaOutlet />` beside it. The scoped slot (`v-slot="{ items }"`) is removed. The default slot is now your own content.

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

### Added

- **Eight standard outlets.** An outlet name is a scope plus a position: `layout` is the page frame, `doc` is the document being read, and `start` / `end` follow the reading direction. The outlets are `layout.header`, `layout.header.start`, `layout.header.end`, `layout.sidebar`, `layout.footer`, `doc`, `doc.under-title` and `doc.toc`. The nagi theme renders all of them. See [Theme Development](https://kawapress.dev/en/plugins/theme-development) and [Plugin Development](https://kawapress.dev/en/plugins/plugin-development).
- **`api.prependToOutlet()` and `api.appendToOutlet()`.** A plugin chooses to appear before or after the theme's own content. When several plugins use the same side of an outlet, they follow the order of the `plugins` array.
- **GitHub Packages.** The 15 `@kawapress/*` packages are also listed under the repository's Packages. They are still installed from npmjs.com. `kawapress` and `create-kawapress` are not listed there, because GitHub requires the package scope to match the owner.

### Changed

- **Last updated line.** The edit link, with an icon, is on the left and the time is on the right. The line now comes after the previous/next links, and the comment section comes after it. Both plugins append to `doc`, so to change their order, change their order in `plugins`.
- **Mermaid side-by-side view.** The source is on the left and the diagram on the right, with a draggable divider. The divider is a thin line until you hover or drag it, and the source pane fills the full height. On a narrow screen the diagram moves above the source.
- **Documentation.** The theme guides are merged into one page, [Theme Development](https://kawapress.dev/en/plugins/theme-development). The pages `guide/theme-customization` and `guide/theme-architecture` no longer exist. The docs site loads its git history before each build, so every page shows its last updated time.

### Fixed

- Items that a plugin adds to the top bar controls, such as the search button, were placed next to the logo in 0.2.1. They are back at the end of the top bar, before the language menu.

### Migration

1. Update `kawapress` and every `@kawapress/*` package in your site to `0.3.0`.
2. If you wrote a plugin, replace `addToOutlet()` as shown above, and rename any outlet from the table.
3. If you wrote a theme, wrap your content in `<KawaOutlet>` and remove any use of its scoped slot.
4. Run `kawapress build`. A plugin that adds to an outlet that no page renders prints one warning line.

## [0.2.2] - 2026-10-28

### Fixed

- The "简体中文" link in the README of every package on npm opened a 404 page. Every tarball now contains `README-zh-CN.md`, and the link works.

## [0.2.1] - 2026-10-27

### Added

- **Per-package READMEs.** Every package has its own English and Chinese README on its npm page.
- **Mermaid views.** A diagram switches between image, code and side-by-side views.

### Changed

- **nagi top bar.** The search button was moved next to the logo, and the navigation links to the right, together with the language menu, the appearance switch and the GitHub link.
- The repository moved to the `kawapress` GitHub organization. Documentation links use `kawapress.dev`.
- **Release process.** Every package has its own version, and a release publishes only the versions that npm does not have yet. See [RELEASING.md](https://github.com/kawapress/kawapress/blob/main/RELEASING.md).

### Fixed

- A zoomed-in Mermaid diagram is no longer cut off by the hard edge under the view switch.

## [0.2.0] - 2026-10-27

### Breaking changes

- Page data, frontmatter and theme config types are extended by plugins and themes through TypeScript interface merging, not through generic parameters. Use `defineConfig()` and `useThemeConfig()` without a type argument, and declare theme fields in `declare module 'kawapress' { interface ThemeConfig { ... } }`.
- `PresetConfig`, `NagiThemeConfig`, `NagiHomeFrontmatter` and `LastUpdatedPageData` are removed.

### Added

- `@kawapress/plugin-mermaid`: write diagrams as text and render them to SVG at build time.
- nagi `themeConfig.nav`: section links in the top bar, with one sidebar per section.
- The official documentation is split into "Guide" and "Plugins", with an overview page for the official plugins.

### Fixed

- The CSS target is a browser that supports `light-dark()`, so theme override tokens no longer lose their colors in production builds.
- A release no longer fails when a version is already on npm.

[0.3.0]: https://github.com/kawapress/kawapress/releases/tag/v0.3.0
[0.2.2]: https://github.com/kawapress/kawapress/releases/tag/v0.2.2
[0.2.1]: https://github.com/kawapress/kawapress/releases/tag/v0.2.1
[0.2.0]: https://github.com/kawapress/kawapress/releases/tag/v0.2.0
