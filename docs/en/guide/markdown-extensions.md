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
