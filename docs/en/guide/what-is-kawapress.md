---
description: KawaPress is a Vue-first static site generator for documentation and content-focused websites.
---

# What is KawaPress?

KawaPress is a Vue-first [Static Site Generator](https://en.wikipedia.org/wiki/Static_site_generator) (SSG) for documentation and other content-focused websites.

You write content in Markdown. KawaPress compiles it into Vue pages, applies a theme, and generates static HTML during the build. The deployed site does not require a Node.js server and can run on any static hosting service.

## Use Cases

- **Technical Documentation**

  KawaPress includes nagi (凪) as its built-in default preset. nagi provides a documentation experience similar to the VitePress default theme, including a responsive sidebar, page outline, light and dark themes, syntax highlighting, and language switching.

  Use nagi when you want a complete documentation interface without building a theme first.

- **Project and Content Sites**

  nagi also provides `home` and `page` layouts. KawaPress can be used for project introductions, guides, and other static content when pages and routes are known at build time.

  KawaPress 0.1 does not include a blog system, CMS content layer, or dynamic routes.

## Developer Experience

KawaPress keeps Markdown authoring simple while retaining the development model of a Vue application.

- **Powered by Vite**: Markdown, Vue component, and style changes are updated through HMR.

- **Real SSR in development**: Every initial request is rendered on the server. Server-only problems appear during development instead of being deferred until build or deployment.

- **Markdown with Vue**: Each Markdown page is compiled into a Vue component. A page can use `<script setup>` and explicitly import regular Vue components when it needs interactivity.

- **Explicit extension boundaries**: Generator Plugins configure Markdown, page data, site config, and Vite. Runtime Plugins extend the final Vue App and Router. Presets combine configuration and plugins into a ready-to-use setup.

## Rendering Model

KawaPress combines pre-rendered HTML with client-side navigation.

- **Initial visit**: The browser receives pre-rendered HTML that can be displayed immediately and read by search engines.

- **Hydration**: After the client bundle loads, Vue hydrates the existing HTML and takes over interaction.

- **Later navigation**: Vue Router handles internal navigation without a full page reload. Markdown pages are split by route and loaded on demand.

- **Static deployment**: `kawapress build` pre-renders every known Markdown route. The final output can be deployed to any static file service.

Development and build use the same Vue application and SSR rendering semantics. Their module loading mechanisms differ, but the page lifecycle remains consistent.

## Relationship to VitePress

KawaPress aims to be a better VitePress. It is an independent alternative built by members of the Vue community for people who want to keep building documentation with Vue.

VitePress provides a simple and fast authoring experience. KawaPress keeps that strength while aiming for a more complete default experience, smoother multilingual sites, greater freedom for themes and plugins, and fewer surprises during daily development.

nagi uses a familiar documentation layout. Existing VitePress users should feel at home, while new users can start with a complete interface without learning a theme system first.

KawaPress is not a VitePress fork or a drop-in replacement, and it does not use VitePress configuration. It rethinks how a modern Vue documentation tool should work so that beginners can start quickly and teams can keep extending it as their needs grow.

KawaPress is for users who value VitePress's simplicity but want a friendlier, more convenient way to build extensions and themes.
