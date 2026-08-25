# VitePress Markdown 能力跟进

## 实现分层

| 能力 | 生成层 | 运行/CSS层 | 决策 |
|---|---|---|---|
| 自定义容器 | `@mdit/plugin-container` 解析 fence；renderer 输出 `div/details`、标题、class。[源码](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/node/markdown/plugins/containers.ts#L35-L66) [renderer](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/node/markdown/plugins/containers.ts#L126-L148) | 无 JS；`details` 是原生行为，主题 [CSS](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/client/theme-default/styles/components/custom-block.css#L1-L185) 着色。 | 通用 container plugin；nagi 管外观。 |
| GitHub alerts | core rule 把 blockquote token 改成容器 DOM/class。[源码](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/node/markdown/plugins/containers.ts#L191-L239) | 无 runtime；复用容器 CSS。 | 与 container 同包，共用类型、标题、本地化。 |
| 语言标签、复制 | fence renderer 添加 label/button。[生成](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/node/markdown/plugins/preWrapper.ts#L14-L51) | 事件委托 + Clipboard API；剔除 diff 删除行。[runtime](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/client/app/composables/copyCode.ts#L5-L47) 主题 [CSS](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/client/theme-default/styles/components/vp-doc.css#L499-L586) 管图标和状态。 | 放 `plugin-code-block-ui`；不依赖高亮器。 |
| 高亮/聚焦/error/warning/diff | Shiki 构建期运行 `meta-highlight` 和 notation transformers，向 `pre/line` 写 class。[装配](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/node/markdown/plugins/highlight.ts#L70-L97) | 无 JS；[CSS](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/client/theme-default/styles/components/vp-doc.css#L404-L471) 解释背景、模糊和 `+/-`。 | transformer、高亮器、主题/语言、`v-pre` 留在 `plugin-shiki`；nagi 解释 class。 |
| 行号 | 非 Shiki transformer；在 pre-wrapper 后重写 fence HTML，生成 `aria-hidden` 数字列。[源码](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/node/markdown/plugins/lineNumbers.ts#L1-L49) | 无 JS；CSS 定位。 | 放 `plugin-code-block-ui`。 |
| MathJax | `markdown-it-mathjax3` 解析 `$…$`/`$$…$$`，[构建期](https://github.com/nzt/markdown-it-mathjax3/blob/8366bd9e523a71eaa3bcdc0f761e9e2a893c6065/index.ts#L44-L210) 用 `mathjax-full` 生成带辅助 MathML 的 SVG。[renderer](https://github.com/nzt/markdown-it-mathjax3/blob/8366bd9e523a71eaa3bcdc0f761e9e2a893c6065/index.ts#L14-L41) | VitePress 加 `v-pre`、块公式 `tabindex=0`；无浏览器 MathJax；CSS 管滚动/居中。[接入](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/node/markdown/markdown.ts#L505-L528) [CSS](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/client/theme-default/styles/base.css#L309-L316) | 单独 `plugin-mathjax`：语法、配置、错误面独立，且 `mathjax-full`、`juice` 很重；按需安装不拖累基础启动。 |

`plugin-code-block-ui` 管外壳/标签/复制/行号；nagi 管视觉；`plugin-shiki` 管高亮 HTML 与既定 Twoslash。

## `[!code focus]`

不只 `//`。4.4.3 接受 `<!-- … -->`、`/* … */`，以及行尾前缀 `//`、`"`、`'`、`#`、`;`、`;;`、`%`、`%%`、`--`、多行块注释的 `*` 行；也识别 JSX/TSX `{/* … */}`。行式须为末 token，仍受 grammar 分词影响。[匹配表](https://github.com/shikijs/shiki/blob/48cd2cc695ed2e3357c3f9c370578ea843d6d9a3/packages/transformers/src/shared/parse-comments.ts#L18-L30) [JSX](https://github.com/shikijs/shiki/blob/48cd2cc695ed2e3357c3f9c370578ea843d6d9a3/packages/transformers/src/shared/parse-comments.ts#L137-L160) 还支持 `[!code focus:3]` 连续三行。[源码](https://github.com/shikijs/shiki/blob/48cd2cc695ed2e3357c3f9c370578ea843d6d9a3/packages/transformers/src/transformers/notation-map.ts#L33-L50)

## `raw`

它只包 `<div class="vp-raw">`；内容仍编译 Markdown/Vue，并非 `v-pre`、Shadow DOM 或 iframe。[parser](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/node/markdown/plugins/containers.ts#L41-L51) 跨层语义是：**可选** PostCSS 隔离主题样式，router 不接管其中链接。[隔离](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/node/postcss/isolateStyles.ts#L10-L35) [路由](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/client/app/router.ts#L206-L214) 它是沙箱边界，不是普通 callout。

## `[[toc]]` 取舍

构建期把占位符变成静态 `<nav>`（默认 h2/h3）；Outline 在运行时扫描标题、跟踪 active。[TOC](https://github.com/mdit-vue/mdit-vue/blob/104b5d81913c29efee1c8c00925a1be5b05bb210/packages/plugin-toc/src/toc-plugin.ts#L18-L75) [Outline](https://github.com/vuejs/vitepress/blob/110209dd32bd7b828abccfb773ae2207f36c1147/src/client/theme-default/composables/outline.ts#L21-L76) 可选保留、不默认插入，仅用于：无 Outline 的 `home/page`；移动端/打印需正文永久目录的长文；需自定层级/结构的规范或 API 索引。普通 doc 页避免重复。
