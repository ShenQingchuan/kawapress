# KawaPress UI 主题体系方案

本文档是 KawaPress 0.1 之后的 UI 主题体系方案，开发进度由 GitHub issue `#10` 跟踪。它不改变 0.1 的交付范围。本方案正式纳入某个版本计划时，第七节列出的两处 0.1 决策同步修订。

---

## 一、要解决的问题

KawaPress Core 本身没有内置任何 UI。主题在本质上就是一个普通插件。目前主题的最小约定只有两条：注册全局组件 `Layout` 和 `NotFound`，并在 `Layout` 内部放置 `RouterView`。这一最小约定保持不变。

目前的运行时插件 API（Runtime Plugin API）如下：

使用 `defineRuntimePlugin({ name, setup(api) })` 定义插件，通过 `api.vueApp(handler)` 和 `api.router(handler)` 注册逻辑。所有运行时插件的 `setup()` 都会在第一次页面导航之前、在 SSR 渲染或浏览器挂载之前执行完毕。主题作者从 `kawapress/client` 导入公开的客户端 API。

在当前的 0.0.1 代码中，存在 6 个具体问题：

1. nagi 的 `NavBar.vue` 直接导入了 `@kawapress/plugin-search/client` 里的 `Search` 组件。这导致主题必须提前知道每一个 UI 插件的存在。
2. LLMS 插件在 Markdown 编译期间，自己把复制页面组件 `KawaLlmsActions` 插到第一个 H1 标题后面。主题无法决定它的位置。
3. LLMS 插件的 CSS 直接读取了 nagi 主题的私有变量，比如 `--nagi-c-text-2`。
4. nagi 的 `vars.css` 逐个映射了每个插件自己的变量，比如映射了 10 个 `--kawa-search-c-*` 变量和许多 `--twoslash-*` 变量。
5. Search 插件的 CSS 多次重复书写相同的 `light-dark(...)` 降级备用颜色。
6. nagi 的 `styles/content.css` 中大约有 78 条样式规则专门用来修饰插件输出的内容，例如 `.kawa-code*`、`.kawa-container*`、`.kawa-alert*`。一旦脱离 nagi 主题，这些插件就完全没有可用外观。

---

## 二、目标与成功标准

本方案的目标是：一个未知的 UI 插件，放进任何一个遵循这套体系的主题中，不需要写任何胶水代码就能直接运行，并自动继承主题的外观风格。更换主题时，不需要改动插件代码。

成功标准包含三条：

1. nagi 不再直接导入任何插件组件。
2. 没有任何插件 CSS 读取 `--nagi-*` 变量。
3. 评论插件、图片缩放插件、最后更新时间插件，不需要编写任何针对主题的适配代码，就能同时在 nagi 和最小参考主题中正常工作。

---

## 三、核心思路：插件界面分三种，只需解决“放在哪”和“长什么样”

插件要展示的界面可以分为三种类型：

| 类型 | 包含示例 | 是否需要解决“放在哪” | 是否需要解决“长什么样” |
|---|---|---|---|
| 挂在页面框架上的界面 | 搜索按钮、LLMS 复制按钮、最后更新时间、评论区 | 是 | 是 |
| Markdown 正文内部的界面 | 代码块、代码组、自定义容器、GitHub 提示框、数学公式 | 否（作者在 Markdown 中写在哪就在哪） | 是 |
| 浮在最上层的弹出界面 | 搜索弹窗、图片缩放、Twoslash 浮窗 | 否（使用原生的 `<dialog>` 或 popover） | 是 |

因此，整套体系只需要解决两个基本问题：

- “放在哪”：只针对第一种界面。
- “长什么样”：针对全部三种界面。

系统只使用三个核心概念：

- Outlet：解决“放在哪”。
- Token：解决“长什么样”的数值统一。
- Layer：解决“长什么样”的样式优先级。

---

## 四、Outlet（放在哪）

Outlet 的作用就像墙上的电源插座。主题负责在页面的合适位置留出插座，插件带着自己的组件插头接入。后文统一使用术语 Outlet。

### 1. 插件侧

Runtime API 新增 `addToOutlet` 方法：

```ts
defineRuntimePlugin({
  name: 'kawa-comments',
  setup(api) {
    api.addToOutlet('doc.after', { id: 'comments', component: Comments })
  },
})
```

- 插件传入的 `id` 在该插件内部必须唯一。该项目的全局完整标识符是 `<插件名>:<id>`，例如 `@kawapress/plugin-search:trigger`。插件名由 Core 自动补全，插件无法伪造。
- 排序规则：在同一个 Outlet 内部，组件首先按照插件在插件配置数组中的顺序渲染，其次按照同一个插件内部调用 `addToOutlet` 的先后顺序渲染。不提供数字权重，不提供 before/after 相对位置设置。

### 2. 主题侧

Core 在 `kawapress/client` 中导出新组件 `KawaOutlet`。主题可以采用两种方式使用：

```vue
<!-- 简单模式：按顺序渲染该插座内的所有组件 -->
<KawaOutlet name="header.actions" />

<!-- 完全控制模式：使用常规 Vue 作用域插槽，可自由过滤、包裹或替换组件 -->
<KawaOutlet name="header.actions" v-slot="{ items }">
  <template v-for="item in items" :key="item.id">
    <MySearch v-if="item.id === '@kawapress/plugin-search:trigger'" />
    <component :is="item.component" v-else />
  </template>
</KawaOutlet>
```

作用域插槽是 Vue 本身提供的能力。通过作用域插槽，主题可以直接完成排序、筛选、响应式外层包裹。因此不需要另外设计调整顺序或替换界面的机制。

### 3. 深度替换

插件可以导出组合式函数（例如 `useSearch()`）。主题可以使用这些函数构建自己的专属界面，保持原有业务逻辑不变，并在插槽中将插件默认注册的组件过滤掉。

### 4. 首版 4 个 Outlet

首版只设立 4 个 Outlet。设立规则是：每一个 Outlet 必须至少有一个真实的使用者。

| Outlet 名称 | 渲染方 | 首个使用者 |
|---|---|---|
| `header.actions` | 主题 | Search 搜索按钮 |
| `doc.header` | Core（自动插入在 Markdown 内容的首个 H1 后面） | LLMS 复制页面按钮 |
| `doc.footer` | 主题 | 最后更新时间、编辑此页链接 |
| `doc.after` | 主题 | 评论区 |

### 5. `doc.header` 为何由 Core 渲染

Markdown 内容中的 H1 位于编译生成的组件内部，主题模板无法直接伸入其结构之中。所以由 Core 在这个位置提供统一的 `doc.header` Outlet，任何插件都可以使用。

### 6. 三种诊断机制

诊断机制只保留以下三种：

1. 使用了未知的 Outlet 名称：TypeScript 抛出类型错误，同时运行时抛出错误。
2. 同一个页面上重复渲染了同一个 Outlet：开发模式下给出警告。这可以防止桌面端和移动端各自渲染一份，导致快捷键重复注册或 DOM ID 重复。
3. 构建结束时，有插件向某个 Outlet 添加了内容，但全站没有页面渲染该 Outlet：构建过程发出警告并标明该插件名称。

---

## 五、Token（长什么样之一）

Token 的作用就像一套标准颜料色号。系统提供统一的变量名，主题负责调配数值，插件直接取用。后文统一使用术语 Token。

Core 提供一套中立的默认 Token。

如果 Core 不提供默认值，每个插件都要自己重复书写一遍备用颜色，违反 DRY 原则。Token 只是样式变量值，不是 UI 组件，所以 Core 提供默认 Token 仍然符合“Core 不内置 UI”的原则。

- Core 在 HTML 最开头注入约 17 个变量。这些变量使用 `light-dark()` 编写，自动适配浅色和深色模式。变量示例包括：`--kawa-c-bg`、`--kawa-c-text-1`、`--kawa-c-brand`、`--kawa-c-warning`、`--kawa-font-mono`、`--kawa-radius`。具体完整列表在开发落地时确定，选入规则为“至少有两个插件会用到该变量”。
- 主题只需覆盖这些变量，就能调整全局外观。nagi 主题只需要约 17 行代码来映射自己的调色板。
- 插件只读取 `--kawa-*` 变量。插件自身的 CSS 中不再书写 fallback 默认备用值。只有真正属于某个插件私有的属性（例如搜索弹窗的宽度），才保留插件私有变量。

---

## 六、Layer（长什么样之二）与样式钩子

Layer 是 CSS 提供的样式叠放顺序机制，用来确定当样式冲突时谁说了算。后文统一使用术语 Layer。

Core 在 `<head>` 标签的最开头写入一行代码，开发环境与构建输出保持一致：

```css
@layer kawa.base, kawa.plugin, kawa.theme;
```

这三个 Layer 的分工如下：

| Layer 名称 | 包含内容 |
|---|---|
| `kawa.base` | Core 默认的 Token |
| `kawa.plugin` | 各个插件自身的完整默认样式 |
| `kawa.theme` | 主题的所有样式 |
| 不在 layer 中的样式 | 网站使用者自己写的 CSS，优先级永远最高 |

这套机制带来两个效果：无论 CSS 文件的加载顺序如何，主题样式永远盖过插件样式；网站使用者覆盖 nagi 主题时使用普通 CSS 即可，无需加 `!important`。

全局 reset 等样式归一化放进 `kawa.base`，不放进 `kawa.theme`。Layer 的优先级高于选择器权重，放在 `kawa.theme` 里的 reset 会抹掉插件的内边距和边框。

UnoCSS 生成的工具类不放进任何 Layer。工具类写在站点作者的模板里，属于站点作者自己的样式，所以和其他站点 CSS 一样拥有最高优先级。

样式钩子规则：

- 不引入新的 `data-kawa-part` 属性。
- 结构钩子使用现有的、已记录在文档中的 `.kawa-xxx__yyy` 类名。
- 状态钩子使用 ARIA 属性或原生属性，例如 `[aria-selected="true"]` 和 `[open]`。这些属性为了可访问性本来就必须存在，这样可以保证样式与真实状态永远一致，不产生分歧。

---

## 七、对 0.1 决策的修订

本方案纳入版本计划时，同步修订以下两处 0.1 决策：

1. 内容插件样式的归属修订：0.1 决策曾规定内容类插件（代码块、代码组、自定义容器、提示框）只输出 HTML 结构，外观样式完全交由 nagi 负责。这与通用插件目标冲突。新决策将这些插件的样式迁回各个插件自身，包裹在 `kawa.plugin` 层中，只读取公共 Token。nagi 只负责在 `kawa.theme` 中进行细节微调。
2. LLMS 按钮注入方式修订：LLMS 复制页面按钮从“插件自行在 Markdown 编译期插入到 H1 后面”，改为插入到 Core 提供的 `doc.header` Outlet 中。

---

## 八、明确不做的事

1. 主题不需要声明自己兼容这套体系。主题在模板里渲染了某个 Outlet，就代表支持这个 Outlet。
2. 不设独立的契约版本号。Outlet 清单和 Token 清单都是 `kawapress` 包的公开 API，跟随 `kawapress` 的版本号。
3. 首版不提供 `aside`、`overlay` Outlet，也不允许主题自建私有 Outlet。浮层界面使用原生 `<dialog>` 或 popover。
4. 不引入 `data-kawa-part` 一类的新样式属性，不提供界面替换适配器。替换界面使用作用域插槽和插件导出的组合式函数。
5. 暂不对外发布兼容性测试库。仓库内用最小参考主题和 E2E 测试矩阵验证官方插件。

---

## 九、落地顺序

1. Core 改造：接入默认 Token、写入 Layer 顺序声明、提供 `api.addToOutlet`、导出 `KawaOutlet`、在首个 H1 后渲染 `doc.header` Outlet、实现三种诊断机制。
2. 官方插件改造：将默认样式迁回各个插件内部，改为只读取公共 Token，移除对 `--nagi-*` 变量的读取，移除插件独立的颜色变量。
3. nagi 主题改造：渲染首版 4 个 Outlet，移除对 Search 组件的直接导入，将整个 `theme.css` 放进 `kawa.theme` 层。
4. 最小参考主题与 E2E 矩阵：在仓库内建设最小参考主题，保证所有官方 UI 插件在 nagi 和最小参考主题下都能正常通过 E2E 测试。

本任务跟踪 GitHub issue `#10`。依赖该体系的后续插件有：`#9`（最后更新时间）、`#11`（评论系统）、`#12`（图片缩放）。

---

## 十、风险

1. 第三方样式未分层导致优先级越界：未放在任何 Layer 中的外部 CSS 优先级高于主题样式。例如 nagi 引入了未分层的 `overlayscrollbars.css`。这类 CSS 必须使用 `@import ... layer(kawa.theme)` 的语法引入。这一规则必须写进主题开发文档中。
2. 空白包裹节点残留：当某个页面主动关闭某项功能时（例如配置了 `llms: false`），插件组件不渲染任何内容，但主题在外层包裹的容器标签可能依然留在 DOM 中。主题可以使用 CSS `:empty` 伪类隐藏这类空白容器。
3. 浏览器兼容性：`light-dark()` 和 `@layer` 需要现代浏览器支持。由于 nagi 主题目前已经在正式使用 `light-dark()`，因此本方案没有带来新的环境门槛。
