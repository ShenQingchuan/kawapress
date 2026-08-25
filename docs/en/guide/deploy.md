# Deploy

KawaPress builds a set of static files that can be published by any static hosting service. The deployed site does not need KawaPress or a Node.js server at runtime.

## Build and Check Locally

KawaPress requires Node.js 22.12 or later. Start with a production build:

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

The build output is written to `dist/` in the site root. Before uploading it, inspect the production output locally:

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

The preview server runs at `http://localhost:4173` by default. It serves the generated `dist/` directory, so it reflects the deployable build rather than the development server.

## Set the Public Base Path

No `base` is needed when the site is deployed at the domain root. If the final URL includes a subpath such as `https://example.com/handbook/`, set `base` to `/handbook/`:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  base: '/handbook/',
})
```

`base` applies to static assets, Vue Router, root-relative internal links, and locale entry points. It must match the deployed path and be known before the build starts. See [Routing](/en/guide/routing) for the mapping between URLs and Markdown files.

## Configure Static Hosting

If the hosting platform builds and deploys from source, configure it to use Node.js 22.12 or later, install dependencies from the lockfile, run `docs:build` from `package.json`, and publish the generated `dist/` directory.

If the build already runs locally or in a separate CI job, send the complete contents of `dist/` to the hosting platform. The deployed site does not need a Node.js runtime.

KawaPress generates a separate HTML file for every page. For example, `/guide/routing` maps to `dist/guide/routing.html`. The static server must support extensionless access and follow these rules:

- Return `dist/404.html` when no page exists.
- Do not send every unknown path to `index.html`; KawaPress is not a single-entry SPA build.

## Configure Caching

Generated assets use content-hashed filenames and can be cached for a long time:

| Files | Recommended `Cache-Control` |
| --- | --- |
| `dist/assets/*` | `public, max-age=31536000, immutable` |
| HTML and `404.html` | Use a short cache or require revalidation |

HTML points to the latest hashed assets. Keeping HTML fresh while caching `assets/` for a long time gives fast repeat visits without delaying new releases.
