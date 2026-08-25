# 部署

KawaPress 构建出来的是一组静态文件，可以部署到任何静态托管服务。部署后的站点不需要继续运行 KawaPress 或 Node.js。

## 构建并在本地检查

KawaPress 的运行基线是 Node.js 22.12 或更高版本。先执行生产构建：

::: code-group
```sh [npm]
npm run docs:build
```

```sh [pnpm]
pnpm docs:build
```

```sh [Yarn]
yarn docs:build
```
:::

构建结果会写入站点根目录下的 `dist/`。上传前，先用生产预览检查它：

::: code-group
```sh [npm]
npm run docs:preview
```

```sh [pnpm]
pnpm docs:preview
```

```sh [Yarn]
yarn docs:preview
```
:::

预览服务默认运行在 `http://localhost:4173`。它读取已经生成的 `dist/`，因此看到的就是待部署版本，而不是开发服务器的结果。

## 设置公开路径

站点部署在域名根路径时，无需设置 `base`。如果最终地址包含子路径，例如 `https://example.com/handbook/`，请把 `base` 设为 `/handbook/`：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  base: '/handbook/',
})
```

`base` 会同时应用到静态资源、Vue Router、站内根路径链接和多语言入口。它必须与实际部署路径一致，并在构建前确定。路径如何映射到 Markdown 文件，请参阅[路由](/guide/routing)。

## 配置静态托管

如果托管平台负责从源码构建和部署，请让它使用 Node.js 22.12 或更高版本，按照锁文件安装依赖，执行 `package.json` 中的 `docs:build`，再发布生成的 `dist/`。

如果你已经在本地或独立 CI 中完成构建，只需把 `dist/` 的完整内容交给托管平台。最终站点不需要 Node.js 运行环境。

KawaPress 会为每个页面生成独立 HTML。例如 `/guide/routing` 对应 `dist/guide/routing.html`。静态服务器需要支持省略 `.html` 的访问方式，并遵守下面两条规则：

- 未找到页面时返回 `dist/404.html`；
- 不要把所有未知路径都回退到 `index.html`，KawaPress 不是只生成一个入口的 SPA。

## 配置缓存

构建后的静态资源使用内容哈希文件名，可以长期缓存：

| 文件 | 建议的 `Cache-Control` |
| --- | --- |
| `dist/assets/*` | `public, max-age=31536000, immutable` |
| HTML 与 `404.html` | 使用短缓存，或要求浏览器重新验证 |

HTML 会引用带哈希的最新资源。让 HTML 及时更新、让 `assets/` 长期缓存，能够兼顾发布生效速度与重复访问性能。
