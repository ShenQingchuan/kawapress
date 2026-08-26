# Markdown 语法扩展

KawaPress 在标准 Markdown 之上提供了一些适合技术文档的语法扩展。

## 标题锚点

每个标题都会自动获得一个锚点。把鼠标移到标题上，可以复制指向当前章节的链接。

自动锚点来自标题文字。例如：

```md
## 安装 KawaPress
```

对应的章节链接是 `#安装-kawapress`。同一页出现相同标题时，后面的锚点会自动追加数字，避免相互冲突。

### 自定义锚点 {#custom-anchors}

自动锚点会对标题执行 **slugify**：把显示文字整理成适合 URL 的片段。它很方便，但生成结果会跟着标题变化。

**反例：只依赖自动锚点**

假设同一篇安装指南有中文和英文两个版本：

```md
<!-- 中文标题生成 #安装 -->
## 安装

<!-- 英文标题生成 #installation -->
## Installation
```

读者正在访问英文版的 `/en/guide/setup#installation`。切换到中文后，地址中的 `#installation` 会被保留，但中文页面只有 `#安装`，浏览器便找不到对应章节。即使只有一种语言，把标题从“安装”改成“安装与配置”也会生成新的锚点，让 Issue、博客或书签里的旧链接失效。

**正例：为同一章节指定稳定的 ID**

让不同语言的标题共用一个不会随显示文字变化的 ID：

```md
<!-- 中文 -->
## 安装 {#installation}

<!-- English -->
## Installation {#installation}
```

两个页面现在都使用 `#installation`。切换语言仍会落在安装章节；以后把中文标题改成 `## 安装与配置 {#installation}`，已有链接也继续有效。

页面上不会显示 `{#installation}`。本页目录和搜索结果也会使用这个 ID。**自定义 ID 在同一页中必须保持唯一。** 建议使用小写英文单词、数字和连字符，例如 `getting-started`。

## 自定义容器 {#custom-containers}

自定义容器可以把提示、风险和补充内容从普通段落中清楚地区分出来。容器以三个冒号开始和结束：

```md
::: tip
先在本地运行一次生产构建，可以更早发现部署问题。
:::
```

上面的 Markdown 会显示为：

::: tip
先在本地运行一次生产构建，可以更早发现部署问题。
:::

### 容器类型 {#default-container-types}

KawaPress 提供五种容器。省略标题时，标题会根据当前页面语言自动显示为中文或英文。

::: info
补充理解当前内容所需的背景信息。
:::

::: tip
帮助你更顺利完成操作的建议。
:::

::: warning
继续操作前需要留意的风险。
:::

::: danger
可能造成数据丢失或其他严重后果的操作。
:::

::: details
默认收起的补充内容，点击标题后展开。
:::

### 自定义标题 {#custom-container-titles}

在容器类型后继续写文字，就能替换默认标题。标题中也可以使用行内 Markdown：

```md
::: danger **停止并检查配置**
不要把访问令牌提交到 Git 仓库。
:::

::: details 查看完整配置
这里可以放普通段落、列表和代码块。
:::
```

实际效果如下：

::: danger **停止并检查配置**
不要把访问令牌提交到 Git 仓库。
:::

::: details 查看完整配置
这里可以放普通段落、列表和代码块。
:::

## GitHub 风格的警报 {#github-alerts}

GitHub 风格的警报使用引用块语法，适合需要在 KawaPress 文档与 GitHub README 之间保持一致的提示内容。警报类型单独写在引用块的第一行：

```md
> [!NOTE]
> 即使快速浏览文档，也不应忽略的信息。

> [!TIP]
> 帮助读者更顺利完成目标的建议。

> [!IMPORTANT]
> 完成当前任务不可缺少的信息。

> [!WARNING]
> 需要立即留意的潜在风险。

> [!CAUTION]
> 某个操作可能带来的严重后果。
```

实际效果如下。警报名称不区分大小写，显示标题会跟随当前页面语言：

> [!NOTE]
> 即使快速浏览文档，也不应忽略的信息。

> [!TIP]
> 帮助读者更顺利完成目标的建议。

> [!IMPORTANT]
> 完成当前任务不可缺少的信息。

> [!WARNING]
> 需要立即留意的潜在风险。

> [!CAUTION]
> 某个操作可能带来的严重后果。

## 代码块 {#code-blocks}

在代码围栏后写上语言名称，KawaPress 会显示语言标签和复制按钮：

````md
```ts
const greeting = '你好，KawaPress'
```
````

复制成功后，按钮会短暂显示反馈。按钮文案会跟随当前页面语言。

### 行号 {#line-numbers}

在语言名称后加上 `:line-numbers` 可以显示行号。再写一个起始数字，就能从指定位置开始计数：

````md
```ts:line-numbers=5
const first = '第五行'
const second = '第六行'
```
````

实际效果如下：

```ts:line-numbers=5
const first = '第五行'
const second = '第六行'
```

需要让所有代码块默认显示行号时，可以在 nagi 配置中开启：

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  codeBlock: {
    lineNumbers: true,
  },
})
```

开启后，可以使用 `:no-line-numbers` 关闭某一个代码块的行号。

### 代码标注 {#code-annotations}

代码标注只改变需要关注的行，不会把控制文字显示给读者。它们写在当前语言支持的注释中，例如 JavaScript 的 `//`、Shell 的 `#` 或 HTML 的 `<!-- -->`。

在代码围栏中使用 `{2,4-5}`，可以直接按行号高亮：

````md
```ts {2,4-5}
const first = 1
const second = 2
const third = 3
const fourth = 4
const fifth = 5
```
````

也可以使用 `[!code highlight]` 标记当前行：

```ts {1}
const ordinary = '按行号高亮'
const highlighted = '按注释高亮' // [!code highlight]
```

使用 `[!code focus]` 聚焦一行。其他行会暂时淡出，把鼠标移入代码块或用键盘聚焦后即可查看全部内容：

```ts
const before = '辅助信息'
const target = '当前重点' // [!code focus]
const after = '辅助信息'
```

使用 `[!code --]` 和 `[!code ++]` 表示删除与新增；复制代码时会自动排除删除行：

```ts
const mode = 'legacy' // [!code --]
const mode = 'modern' // [!code ++]
```

最后，可以用 `[!code warning]` 和 `[!code error]` 标出风险：

```ts
console.warn('请先检查配置') // [!code warning]
throw new Error('配置无效') // [!code error]
```

在标注后加上数字，例如 `[!code focus:2]`，可以从当前行开始连续标记两行。

## 数学公式 {#math-equations}

数学公式由可选的 `@kawapress/plugin-mathjax` 提供。它在构建时生成 SVG，不需要读者的浏览器再下载或运行 MathJax。

::: code-group
```sh [npm]
npm install -D @kawapress/plugin-mathjax
```

```sh [pnpm]
pnpm add -D @kawapress/plugin-mathjax
```

```sh [Yarn]
yarn add -D @kawapress/plugin-mathjax
```
:::

把插件加入站点配置：

```ts
import mathjaxPlugin from '@kawapress/plugin-mathjax'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    mathjaxPlugin(),
  ],
})
```

使用一对 `$` 编写行内公式。例如，质能方程是 $E = mc^2$。

```md
质能方程是 $E = mc^2$。
```

使用一对 `$$` 单独包围块级公式：

```md
$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$
```

实际效果如下：

$$
\int_0^1 x^2 \, dx = \frac{1}{3}
$$

插件遵循 Pandoc 风格的定界规则，`$20` 和 `$30` 这样的价格仍是普通文字。需要明确显示普通美元符号时，也可以写成 `\$`。通过 `mathjaxPlugin({ tex: { ... }, svg: { ... } })` 可以继续配置 TeX 宏、公式编号和 SVG 输出。
