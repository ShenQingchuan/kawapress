# kawapress

KawaPress 核心：命令行、生成器和运行时，并内置 nagi 预设和全部官方插件。

[![npm version](https://img.shields.io/npm/v/kawapress?label=npm&color=42b883)](https://www.npmjs.com/package/kawapress) · [English](https://github.com/kawapress/kawapress/blob/main/packages/kawapress/README.md)

`kawapress` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- **开发时就是真正的 SSR。** 每次首次请求都在服务端渲染，只在 SSR 下出现的问题，构建前就能发现。
- **从头到尾都是 Vue。** Markdown 变成 Vue 组件，导航交给 Vue Router，普通的 Vue 单文件组件也能直接写进内容。
- **默认就完整。** `kawapress/nagi` 提供自适应文档布局、深色模式、本地搜索、代码高亮、代码组和多语言导航。
- **面向 AI 的输出。** 每页一份 Markdown，外加 `llms.txt` 和 `llms-full.txt`。
- **一套扩展模型。** 生成器插件、运行时插件和预设，没有只给主题用的私有钩子。

## 安装

```sh
npm install --save-dev kawapress
```

也可以用 `pnpm add --save-dev kawapress` 或 `yarn add --dev kawapress`。

## 使用

普通站点只需要这一个包。新建 `kawapress.config.ts`：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: '我的文档',
})
```

然后运行：

```sh
pnpm exec kawapress dev     # 开发服务器
pnpm exec kawapress build   # 把静态文件生成到 dist
```

想从模板开始，可以运行 `npm create kawapress@latest`。

## 文档

[文档](https://kawapress.dev/guide/getting-started) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
