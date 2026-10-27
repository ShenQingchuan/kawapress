---
title: Image Zoom
description: Click an image in the page content to view it larger, with per-image and per-page opt-outs and customizable labels.
---

# Image Zoom

Images in documentation are often wider than the column they sit in. To see the details, a reader has to save the file and open it somewhere else. `@kawapress/plugin-image-zoom` turns those images into click-to-zoom targets: clicking one opens a large copy in the top layer of the page, and a click anywhere, a turn of the wheel, or `Esc` brings the reader back.

The plugin is on by default for every Markdown image, so nothing extra is needed in the Markdown:

```md
![KawaPress logo](/kawapress-logo.png)
```

An image written like that can be opened right away:

![KawaPress logo](/kawapress-logo.png)

Go ahead and click the image above. Its alt text appears under the enlarged copy, and `Esc` or another click closes it.

## What readers get {#how-readers-use-it}

- Click the image with a mouse, or move to it with `Tab` and press `Enter` or `Space`.
- Press `Esc`, click anywhere in the enlarged view, or turn the wheel to close it.
- Keyboard focus goes back to the image that was opened, so `Tab` continues from where the reader was.
- Zooming only changes how large the image looks. Its address and the file itself stay the same.

When the reader's system asks for reduced motion, the fade and scale animation is skipped.

## Turn zoom off for one image {#opt-out-one-image}

Add `#no-zoom` to the image address and that image stays as it is. The fragment is removed from the final address during the build, so the file still loads normally:

```md
![Logo without zoom](/kawapress-logo.png#no-zoom)
```

This image uses `#no-zoom`, so clicking it does nothing:

![Logo without zoom](/kawapress-logo.png#no-zoom)

## Turn zoom off for a whole page {#opt-out-a-page}

Set `imageZoom: false` in the page frontmatter and no image on that page zooms:

```md
---
imageZoom: false
---
```

## Markdown images only {#markdown-images-only}

The plugin works on the Markdown image syntax. An HTML `<img>` tag written directly in a page is left alone, so the author stays in control:

```html
<!-- never zooms -->
<img src="/diagram.svg" alt="Diagram">
```

Images rendered by a Vue component or inside a custom block are out of scope too. The plugin owns Markdown content; the rest of the interface belongs to the site.

## Customize the labels {#customize-labels}

Every zoomable image needs an accessible name, because a screen reader announces it to decide whether the image is worth opening. The default is “Zoom image: alt text”. A built-in Chinese and English pair is chosen from the language of the page. Pass `labels` to change the wording everywhere, or `localeLabels` to change one language only:

```ts
import imageZoomPlugin from '@kawapress/plugin-image-zoom'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    imageZoomPlugin({
      labels: {
        dialog: '查看大图',
      },
      localeLabels: {
        en: {
          zoom: 'Enlarge {alt}',
          dialog: 'Enlarged image',
        },
      },
    }),
  ],
})
```

`{alt}` is replaced by the alt text of the image. When an image has no alt text, the plugin drops the separator in front of the placeholder too, so nothing is announced as “Zoom image:”.

| Key | Default English | Where it is used |
| --- | --- | --- |
| `zoom` | `Zoom image: {alt}` | The accessible name of the image, announcing that it opens |
| `dialog` | `Image zoom` | The name of the enlarged view |

## Styles and themes {#styles}

The plugin ships its styles inside the `kawa.plugin` layer and reads only the shared `--kawa-*` tokens, so switching themes needs no change in the plugin. A theme or your own CSS can adjust the result through these class names:

| Class name | The element it styles |
| --- | --- |
| `.kawa-image-zoom` | The enlarged view itself, a native `<dialog>` |
| `.kawa-image-zoom__figure` | The container around the image and its caption |
| `.kawa-image-zoom__image` | The enlarged image |
| `.kawa-image-zoom__caption` | The caption under the enlarged image |

The size limit of the enlarged image is a private variable of the plugin, overridable from your own CSS:

```css
.kawa-image-zoom {
  --kawa-image-zoom-max-width: min(92vw, 1600px);
  --kawa-image-zoom-max-height: 92vh;
}
```

## Use the plugin on its own {#use-the-plugin-independently}

The nagi preset does not include this plugin, so install it yourself:

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-image-zoom
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-image-zoom
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-image-zoom
```
:::

```ts
import imageZoomPlugin from '@kawapress/plugin-image-zoom'
import { defineConfig } from 'kawapress'

export default defineConfig({
  plugins: [
    imageZoomPlugin(),
  ],
})
```

Adding it to `plugins` is enough. KawaPress loads the runtime half of the same package automatically, and that is where the dialog, the click handling, and the keyboard support are installed.
