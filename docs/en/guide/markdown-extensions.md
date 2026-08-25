# Markdown Extensions

KawaPress adds documentation-oriented extensions on top of standard Markdown.

## Heading Anchors

Every heading receives an anchor automatically. Hover a heading to copy a link to that section.

For example:

```md
## Install KawaPress
```

The resulting section link is `#install-kawapress`. When headings repeat on the same page, later anchors receive a numeric suffix to keep every link unique.

### Custom Anchors {#custom-anchors}

Automatic anchors are created by **slugifying** the visible heading into a URL-friendly fragment. This is convenient, but the result changes with the heading.

**Counterexample: relying only on automatic anchors**

Suppose the same installation guide has Chinese and English versions:

```md
<!-- The Chinese heading generates #安装 -->
## 安装

<!-- The English heading generates #installation -->
## Installation
```

A reader is viewing `/en/guide/setup#installation`. After switching to Chinese, the URL keeps `#installation`, but the Chinese page only has `#安装`, so the browser cannot find the matching section. Even on a single-language site, renaming “Installation” to “Install and Configure” produces a new anchor and breaks links already shared in issues, articles, or bookmarks.

**Preferred example: give the section a stable ID**

Let translated headings share an ID that does not depend on their visible text:

```md
<!-- Chinese -->
## 安装 {#installation}

<!-- English -->
## Installation {#installation}
```

Both pages now use `#installation`. Language switching still lands on the installation section, and changing the Chinese heading to `## 安装与配置 {#installation}` does not break existing links.

The page does not display `{#installation}`. Its outline and search results use the same ID. **Custom IDs must be unique within a page.** Prefer lowercase English words, numbers, and hyphens, such as `getting-started`.

## Custom Containers {#custom-containers}

Custom containers separate tips, risks, and supporting information from ordinary paragraphs. Open and close a container with three colons:

```md
::: tip
Run a production build locally to catch deployment problems earlier.
:::
```

The Markdown above renders as:

::: tip
Run a production build locally to catch deployment problems earlier.
:::

### Container Types {#default-container-types}

KawaPress provides five container types. When the title is omitted, it follows the current page language automatically.

::: info
Background information needed to understand the current topic.
:::

::: tip
Advice that helps readers complete a task more smoothly.
:::

::: warning
A risk that needs attention before continuing.
:::

::: danger
An action that may cause data loss or other serious consequences.
:::

::: details
Additional information that stays collapsed until the reader opens it.
:::

### Custom Titles {#custom-container-titles}

Text after the container type replaces the default title. Inline Markdown works in titles too:

```md
::: danger **Stop and check the configuration**
Never commit access tokens to a Git repository.
:::

::: details View the complete configuration
This can contain paragraphs, lists, and code blocks.
:::
```

The result is:

::: danger **Stop and check the configuration**
Never commit access tokens to a Git repository.
:::

::: details View the complete configuration
This can contain paragraphs, lists, and code blocks.
:::

## GitHub-Style Alerts {#github-alerts}

GitHub-style alerts use blockquote syntax. They are useful when the same callout should work in both KawaPress documentation and a GitHub README. Put the alert type on the first line of the blockquote:

```md
> [!NOTE]
> Information readers should not overlook, even when skimming.

> [!TIP]
> Advice that helps readers complete a task more smoothly.

> [!IMPORTANT]
> Information required to complete the current task.

> [!WARNING]
> A potential risk that needs immediate attention.

> [!CAUTION]
> A serious consequence that an action may cause.
```

The result is shown below. Alert names are case-insensitive, and visible titles follow the current page language:

> [!NOTE]
> Information readers should not overlook, even when skimming.

> [!TIP]
> Advice that helps readers complete a task more smoothly.

> [!IMPORTANT]
> Information required to complete the current task.

> [!WARNING]
> A potential risk that needs immediate attention.

> [!CAUTION]
> A serious consequence that an action may cause.

## Code Blocks {#code-blocks}

Add a language after the opening fence. KawaPress displays the language label and a copy button automatically:

````md
```ts
const greeting = 'Hello, KawaPress'
```
````

The button briefly confirms a successful copy. Its text follows the current page language.

### Line Numbers {#line-numbers}

Add `:line-numbers` after the language to show line numbers. Append a starting value when the snippet should begin at a specific line:

````md
```ts:line-numbers=5
const first = 'Line five'
const second = 'Line six'
```
````

The result is:

```ts:line-numbers=5
const first = 'Line five'
const second = 'Line six'
```

Enable line numbers in the nagi configuration when every code block should show them by default:

```ts
import { nagi } from 'kawapress/nagi'

export default nagi({
  codeBlock: {
    lineNumbers: true,
  },
})
```

Once enabled, use `:no-line-numbers` to disable them for one code block.

### Code Annotations {#code-annotations}

Code annotations draw attention to selected lines without showing their control text to readers. Put them in comments supported by the current language, such as `//` in JavaScript, `#` in Shell, or `<!-- -->` in HTML.

Use `{2,4-5}` in the opening fence to highlight lines by number:

````md
```ts {2,4-5}
const first = 1
const second = 2
const third = 3
const fourth = 4
const fifth = 5
```
````

Use `[!code highlight]` to highlight the current line instead:

```ts {1}
const ordinary = 'Highlighted by line number'
const highlighted = 'Highlighted by notation' // [!code highlight]
```

Use `[!code focus]` to focus one line. Other lines remain subdued until the reader hovers the code block or focuses it with the keyboard:

```ts
const before = 'Supporting context'
const target = 'Current focus' // [!code focus]
const after = 'Supporting context'
```

Use `[!code --]` and `[!code ++]` for removed and added lines. Copying the block automatically excludes removed lines:

```ts
const mode = 'legacy' // [!code --]
const mode = 'modern' // [!code ++]
```

Use `[!code warning]` and `[!code error]` to mark risks:

```ts
console.warn('Check the configuration first') // [!code warning]
throw new Error('Invalid configuration') // [!code error]
```

Append a count, such as `[!code focus:2]`, to annotate consecutive lines starting with the current line.
