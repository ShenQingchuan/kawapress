---
description: KawaPress 是一个以 Vue 为核心、面向文档与内容型网站的静态站点生成器。
---

# KawaPress 是什么？

KawaPress 是一个以 Vue 为核心的[静态站点生成器](https://en.wikipedia.org/wiki/Static_site_generator)（SSG），主要用于构建文档和其他内容型网站。

简单来说，你用 Markdown 编写内容，KawaPress 负责把这些内容编译成 Vue 页面、应用主题，并在构建时生成可以直接部署的静态 HTML。部署完成后不需要额外运行 Node.js 服务器，普通的静态托管服务就足够了。

## 适用场景

- **技术文档**

  KawaPress 内置默认预设 nagi（凪）。它提供类同 VitePress 默认主题的文档阅读体验，包括响应式 Sidebar、本页目录、深浅色主题、代码高亮和多语言切换。

  如果你只是想安心地写文档，可以直接从 nagi 开始，不必先搭建整套界面。

- **项目官网与内容型页面**

  除了标准文档布局，nagi 也提供 `home` 和 `page` 布局。只要页面与路由能够在构建时确定，就可以用 KawaPress 来组织项目介绍、使用指南和其他静态内容。

## 开发体验

KawaPress 希望让 Markdown 写作保持轻松，同时不牺牲 Vue 项目的开发体验。

- **Vite 驱动**：开发服务器启动快，Markdown、Vue 组件和样式修改都能通过 HMR 及时反馈。

- **开发阶段执行真实 SSR**：每次首次请求都会先在服务端渲染。这样一来，只会在服务端出现的问题能够更早被发现，不必等到构建或上线时再排查。

- **Markdown 与 Vue 自然配合**：每个 Markdown 页面都会编译成 Vue 组件。需要交互时，可以在页面中使用 `<script setup>`，并显式导入普通 Vue 组件。

- **清楚的扩展边界**：Generator Plugin 负责配置、Markdown、pageData 和 Vite；Runtime Plugin 负责最终的 Vue App 与 Router。Preset 则把一组插件组合成开箱即用的体验。

## 渲染方式

KawaPress 兼顾了静态 HTML 的可靠性与单页应用的流畅导航。

- **首次访问**：浏览器收到已经预渲染好的 HTML，内容可以直接显示，也更利于搜索引擎读取。

- **浏览器接管**：客户端 JavaScript 加载后，Vue 会对现有 HTML 进行 hydration。页面不会重新生成一遍，而是在服务端结果上接管交互。

- **后续导航**：站内跳转由 Vue Router 处理，不需要每次都完整刷新页面。各个 Markdown 页面按路由拆分并按需加载。

- **静态部署**：`kawapress build` 会预渲染所有已知 Markdown 路由。最终产物可以部署到任意静态文件服务。

开发与构建共享同一套 Vue 应用和 SSR 渲染语义。两种环境的模块加载方式不同，但页面生命周期保持一致。

## 与 VitePress 的关系

KawaPress 期望成为一个更好的 VitePress。它由 Vue 社区成员自主开发，为喜欢 Vue，也期待一个功能更丰富、更易于扩展的文档工具的用户提供另一种选择。

我们喜欢 VitePress 简洁、轻快的写作体验，也希望在这个基础上做得更多：让默认体验更完整，让多语言站点更自然，让主题与插件拥有更大的发挥空间，也让日常开发少一些绕路，多一些安心。

nagi 延续了大家熟悉的文档布局与阅读方式。如果你用过 VitePress，可以很快找到感觉；如果你第一次搭建文档站，也不需要先理解复杂的主题系统，就能拥有一套舒服、完整的界面。

KawaPress 不是 VitePress 的复制品，也不直接兼容它的配置。我们选择重新思考一个现代 Vue 文档工具应该如何工作，希望它既能让新用户轻松开始，也能陪着有更多想法的团队继续成长。

如果你喜欢 VitePress 的简单，又期待能更方便、友好地编写扩展或主题，KawaPress 想成为那个值得尝试的新选择。
