---
title: 图片缩放
description: 点击正文图片放大查看，支持单张关闭、整页关闭，并可自定义提示文字。
---

# 图片缩放

正文里的图片往往比屏幕窄。想看清细节时，读者要先把图片保存下来再打开。`@kawapress/plugin-image-zoom` 让图片可以点开放大：点击图片，它会在页面最上层展开成一个大图；点击任意位置、滚动滚轮或按 `Esc`，就回到原来的页面。

插件默认对所有 Markdown 图片生效，无需在 Markdown 里写额外标记：

```md
![KawaPress 标志](/kawapress-logo.png)
```

这样写出来的图片就能点开：

![KawaPress 标志](/kawapress-logo.png)

试着点一下上面这张图。放大后的图片下面会显示它的替代文字，按 `Esc` 或再点一下即可关闭。

## 读者怎么使用 {#how-readers-use-it}

- 用鼠标点击图片，或用键盘 `Tab` 移到图片上再按 `Enter`、空格键，即可放大。
- 按 `Esc`、点击放大后的任意位置或滚动滚轮，即可关闭。
- 关闭后，键盘焦点会回到刚才那张图上，继续按 `Tab` 可以接着浏览页面。
- 放大只是看得更清楚，图片地址和文件本身都没有变化。

如果读者的系统开启了“减少动态效果”，打开和关闭不会播放淡入缩放动画。

## 关闭某一张图片的缩放 {#opt-out-one-image}

在图片地址末尾加上 `#no-zoom`，这张图片就保持原样。构建时这个片段会从最终地址中去掉，所以不会影响图片加载：

```md
![不缩放的标志](/kawapress-logo.png#no-zoom)
```

下面这张图片写了 `#no-zoom`，点击它不会有任何反应：

![不缩放的标志](/kawapress-logo.png#no-zoom)

## 关闭整个页面的缩放 {#opt-out-a-page}

在页面 frontmatter 中写入 `imageZoom: false`，这一页的所有图片都不会放大：

```md
---
imageZoom: false
---
```

## 只处理 Markdown 图片 {#markdown-images-only}

插件只处理 Markdown 的图片语法。直接写在页面里的 HTML `<img>` 标签不会被加上缩放能力，需要由你自己决定是否处理：

```html
<!-- 不会放大 -->
<img src="/diagram.svg" alt="Diagram">
```

一个 Markdown 单元格或 Vue 组件里渲染出来的图片，同样不在处理范围之内。插件的目标是 Markdown 内容，其余界面留给作者自己掌握。

## 自定义提示文字 {#customize-labels}

图片需要一段无障碍名称，屏幕阅读器会把它读给读者听。默认文字是“放大图片：图片描述”，插件内置中文和英文两套，按页面所在语言自动选择。需要换一种说法时，传入 `labels` 覆盖所有语言，或者用 `localeLabels` 只改某一种语言：

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

`{alt}` 会替换成图片的替代文字。图片没有写替代文字时，插件会连同前面的冒号一起去掉，因此不会读成“放大图片：”。

| 键 | 默认中文 | 用在什么地方 |
| --- | --- | --- |
| `zoom` | `放大图片：{alt}` | 图片的无障碍名称，告诉读者这张图可以点开 |
| `dialog` | `图片缩放` | 放大窗口的名称 |

## 样式与主题 {#styles}

插件自带的样式全部放在 `kawa.plugin` 样式层，只读取公共的 `--kawa-*` 变量，所以换主题不需要改插件。主题或者你自己的 CSS 想微调时，直接覆盖这几个类名即可：

| 类名 | 对应的元素 |
| --- | --- |
| `.kawa-image-zoom` | 放大窗口本身，也就是浏览器原生的 `<dialog>` |
| `.kawa-image-zoom__figure` | 包住大图和说明文字的容器 |
| `.kawa-image-zoom__image` | 放大后的大图 |
| `.kawa-image-zoom__caption` | 大图下方的说明文字 |

大图的尺寸限制是插件私有变量，可以在自己的 CSS 里覆盖：

```css
.kawa-image-zoom {
  --kawa-image-zoom-max-width: min(92vw, 1600px);
  --kawa-image-zoom-max-height: 92vh;
}
```

## 独立使用插件 {#use-the-plugin-independently}

nagi 预设没有内置这个插件，需要单独安装：

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

加入 `plugins` 就够了。KawaPress 会自动加载同一个包里的运行时代码，放大窗口、点击和键盘处理都在那里安装。
