# KawaPress UI 主题体系方案

## 文档状态

本方案面向 KawaPress 0.1 之后的主题体系演进，不改变 `.agent-work/decisions/mvp-0.1-product-plan.md` 已确定的 0.1 范围。

已经确定的方向：

- 第一目标是让陌生的 UI Plugin 在兼容主题中即装即用。
- Theme 是 UI Host，UI Plugin 是 UI Guest。
- 采用可选兼容等级。普通 Theme 仍然只需要实现 `Layout` 与 `NotFound`；只有主动声明兼容的 Theme 才需要实现完整 UI 契约。
- 不采用 `api.ui()` 这种范围过大的入口名称。
- 本体系建立在现有 Plugin、Runtime Plugin 和显式插件顺序之上，不增加独立主题加载器。

仍需确认的内容统一列在文末。在确认前，示例 API 名称和 Outlet 清单都不构成公开承诺。

## 一、要解决的问题

KawaPress 0.1 已经允许 Theme 和 UI Plugin 使用同一套公开 Runtime Plugin 能力，但双方仍然需要提前认识彼此。

例如：

- nagi 的导航栏需要直接导入 Search 组件。
- 新 Theme 想支持 Search，也要知道它的组件入口和放置位置。
- LLMS 页面操作依靠 Markdown 生成阶段插入组件，而不是交给 Theme 的“标题操作区”承载。
- Search、LLMS、Code Group 等插件各自形成 CSS class 和变量，Theme 要逐个适配。
- `.kawa-*` 结构已经可以被样式命中，却没有明确区分稳定 Part 与内部 DOM。

继续增加 Layout Slot 只能改善“修改一个已知 Theme”的体验，不能解决下面这个生态问题：

> 一个从未见过 nagi 的 UI Plugin，安装进 nagi 后也能出现在正确的位置并继承 nagi 的视觉；更换为另一个兼容 Theme 后，Plugin 不需要重新接线。

## 二、成功标准

主题体系达到以下结果，才算完成目标：

1. Theme 不直接导入陌生 UI Plugin，也能承载其默认 UI。
2. UI Plugin 不读取 nagi 等具体 Theme 的私有变量。
3. Theme 只映射一套公共视觉 Token，所有兼容 UI Plugin 都能获得协调的基础外观。
4. Plugin 的默认组件保留状态、键盘、焦点、ARIA 和 SSR 行为，Theme 换肤时不需要重写这些能力。
5. Theme 可以通过稳定 Part 和 State 精细调整已知 Plugin，而不依赖内部 DOM 层级。
6. 需要完全不同结构时，Theme 可以使用明确的深度替换契约，而不是复制内部组件或使用 Vite alias。
7. 兼容声明由自动测试验证，不依赖作者主观判断。
8. 同一个 Plugin 在 nagi 和最小参考 Theme 中通过相同的 SSR、hydration、键盘和无障碍测试。

## 三、非目标

本方案不做以下事情：

- 不强迫所有 KawaPress Theme 变成文档 Theme。
- 不让 Core 提供默认导航栏、侧边栏、搜索框或视觉样式。
- 不把任意 Vue Slot 都提升为跨主题公共协议。
- 不稳定化 Theme 或 Plugin 的全部 DOM、class 和内部组件。
- 不让 Theme 接管 Plugin 的数据、状态机和无障碍行为。
- 不引入数字优先级、`before`、`after` 或插件依赖图。
- 不通过生成侧与浏览器 RPC 传递 UI。
- 不修改 KawaPress 0.1 的 Runtime Plugin API 和交付范围。

## 四、与现有方案的关系

### 4.1 Theme 仍然是普通 Plugin

Theme 继续使用默认 Generator Plugin 和可选 Runtime Plugin。它没有单独的加载器，也没有只对 Theme 开放的生命周期。

普通 Theme 的最小契约保持不变：

- 注册 `Layout`。
- 注册 `NotFound`。
- 在 `Layout` 中放置 `RouterView`。

UI 兼容体系是在这份最小契约之上的可选能力。

### 4.2 Core 只提供非视觉编排

Core 可以负责：

- 收集 Theme Host 声明。
- 收集 UI Contribution。
- 按 Plugin 数组顺序排列 Contribution。
- 校验 Compatibility Profile 与 Outlet。
- 向 Vue App 提供响应式 Registry。
- 提供不带样式的 `KawaOutlet` 渲染组件。

Core 不负责：

- Theme 的颜色和布局。
- Plugin 的按钮外观。
- 选择某种导航栏结构。
- 把缺失的 Contribution 擅自移动到其他位置。

## 五、术语

### Theme Host

主动声明某个 Compatibility Profile，并提供其规定的 Outlet、公共 Token 和页面语义的 Theme。

### UI Guest

带有可见界面的 Runtime Plugin。它可以向 Theme Host 提交 Contribution，也可以在 Markdown 正文中提供独立交互组件。

### Compatibility Profile

一组可以被版本化和测试的 UI 兼容规则。它规定：

- 必需和可选 Outlet。
- 必需公共 Token。
- SSR 与 hydration 要求。
- 页面 landmark、skip link 和焦点要求。
- RTL、缩放、键盘和无障碍要求。

本文暂用 `docs-ui@1` 表示首个文档站 Profile，名称仍待确认。

### Outlet

由 Theme Host 放置的语义承载点。Outlet 表达“这里承载哪类能力”，不表达具体 DOM 方位。

例如 `site.header.actions` 表示站点 Header 的操作区，而不是“右上角”。Theme 可以根据语言方向和布局把它放在不同视觉位置。

### Contribution

UI Guest 提交给某个 Outlet 的组件及其兼容元数据。Plugin 只声明希望进入哪个语义位置，Theme 决定这个 Outlet 在页面中的实际结构和外观。

### Token

跨 Theme 和 Plugin 共用的语义视觉值，例如正文颜色、浮层背景、焦点环和控件圆角。

### Part

Plugin 明确承诺可以被 Theme 样式化的结构节点，例如 Search 的 `trigger`、`panel` 和 `result`。

### State

Plugin 映射到公开节点上的交互状态，例如 `open`、`loading`、`empty` 和 `error`。State 只提供稳定样式钩子，不能替代原生语义、ARIA、键盘和焦点逻辑。

### Default UI

UI Guest 自带的最低可用界面。它拥有完整行为、语义和基础样式，陌生 Theme 不需要先为它写专用组件。

### UI Adapter

Theme 针对已知 UI Guest 提供的深度替换实现。Adapter 可以改变视觉 DOM，但必须遵守 Guest 的行为与无障碍绑定契约。

## 六、总体结构

```text
KawaPress Runtime
├─ UI Registry
│  ├─ Theme Host
│  ├─ Outlet instances
│  └─ Contributions in Plugin order
│
├─ Compatible Theme
│  ├─ Layout / NotFound
│  ├─ KawaOutlet
│  ├─ shared --kawa-ui-* tokens
│  └─ theme styling layer
│
└─ UI Plugin
   ├─ behavior and data
   ├─ accessible Default UI
   ├─ Outlet Contribution
   ├─ stable Parts and States
   ├─ guest styling layer
   └─ optional deep Adapter contract
```

这套结构提供三个定制层级：

1. **Token 换肤**：Theme 定义一次视觉语言，陌生 Plugin 自动继承。
2. **Part / State 精调**：Theme 精细调整已知 Plugin 的外观，但不重写行为。
3. **UI Adapter 深度替换**：Theme 改变组件结构，同时显式承担绑定转发和契约测试。

## 七、Theme 兼容声明

普通 Theme 不声明 Compatibility Profile，继续只承担 `Layout` 与 `NotFound`。

兼容 Theme 需要声明自己实现的 Profile 和版本。推荐方向如下，具体 API 待确认：

```ts
api.declareThemeHost({
  profile: 'docs-ui',
  version: '1.0.0',
  outlets: [
    'site.header.actions',
    'document.title.actions',
    'document.content.before',
    'document.content.after',
  ],
})
```

规则：

- 同一个 Vue App 只能有一个 Theme Host。
- 两个 Runtime Plugin 同时声明 Theme Host 时直接报错，并显示双方 Plugin 身份。
- 声明 Profile 就代表 Theme 承诺实现该 Profile 的全部必需规则。
- 声明的 Outlet 与 Layout 中实际渲染的 Outlet 必须一致。
- Compatibility Profile 版本与 Theme npm 包版本分别管理。
- Theme 未声明兼容时，KawaPress 不保证陌生 UI Guest 自动出现。

Theme Host 声明使用 Runtime API，还是作为 `defineRuntimePlugin()` 的静态元数据，仍需确认。静态元数据更利于渲染前校验；Runtime API 更符合当前按需注册方法的风格。

## 八、Outlet 设计

### 8.1 命名规则

Outlet 使用稳定的语义名称：

```text
<范围>.<区域>.<用途>
```

名称描述内容职责，不描述：

- 左、右、上、下等视觉方向。
- 桌面或移动端。
- nagi 的组件名。
- 当前 DOM 层级。

### 8.2 首版候选清单

首个 `docs-ui` Profile 建议从较小清单开始。

#### 必需 Outlet

| Outlet | 用途 | 典型 Guest |
| --- | --- | --- |
| `site.header.actions` | 全站 Header 操作 | Search、语言工具、账号入口 |
| `document.title.actions` | 当前文档的页面操作 | 复制 Markdown、版本操作 |
| `document.content.before` | 正文开始前的文档信息 | 版本警告、阅读提示 |
| `document.content.after` | 正文结束后的扩展内容 | 反馈、相关文章 |

#### 可选 Outlet

| Outlet | 用途 |
| --- | --- |
| `document.aside` | 与当前文档有关的辅助面板 |
| `site.footer.before` | Footer 前的全站扩展内容 |
| `shell.overlay` | 不属于正文流的全局浮层宿主 |

`document.aside` 和 `shell.overlay` 是否进入首版，应在真实 Plugin 用例验证后决定。

### 8.3 Contribution 顺序

同一个多值 Outlet 中：

- Contribution 按 Plugin 数组顺序渲染。
- 同一个 Plugin 提交多个 Contribution 时，按该 Plugin 的声明顺序渲染。
- 不提供数字优先级。
- 不提供 `before`、`after` 或依赖关系。

这与 KawaPress 现有显式 Plugin 顺序保持一致。

### 8.4 不允许响应式重复挂载

同一个必需 Outlet 在一个 Layout 中只挂载一次。

Theme 不应为了桌面版和移动版分别渲染两个相同 Outlet，再用 CSS 隐藏其中一个。否则同一个 Guest 可能：

- 注册两次全局快捷键。
- 产生重复 ID。
- 重复请求数据。
- 让屏幕阅读器读到重复控件。

响应式变化优先使用 CSS Grid、Flex、container query 和视觉重排，不复制 Guest 实例。

### 8.5 缺失与错误

- Theme 声明兼容 Profile，却缺少必需 Outlet：开发和构建直接报错。
- Guest 要求的 Profile 版本与 Theme 不兼容：直接报错，并列出 Guest、Host 和版本要求。
- Guest 使用 Profile 中不存在的 Outlet：直接报错。
- 普通 Theme 没有声明兼容，却安装了 Outlet Guest：开发期警告并跳过自动渲染，同时提示 Theme 可以手动导入 Guest 的公开组件。
- 可选 Outlet 缺失：开发期警告并跳过；不自动移动到语义不同的 Outlet。

### 8.6 单值 Outlet

首版只提供按顺序追加的多值 Outlet。

如果以后出现只能有一个实现的 Outlet，需要单独决定冲突规则。默认不采用静默的“后者覆盖前者”，因为它会让一个 Plugin 的 UI 消失且难以发现。

## 九、UI Contribution Runtime API

### 9.1 命名原则

入口名称必须直接说明：

- Plugin 不是在控制整个 UI。
- Plugin 不是注册全局 Vue 组件。
- Plugin 只是向 Theme 已存在的 Outlet 提交一项内容。
- 调用发生在注册阶段，不是立即 mount。

因此不采用：

- `api.ui()`：范围过大，容易成为万能入口。
- `api.component()`：容易与全局组件注册混淆。
- `api.render()`：容易被理解为渲染生命周期。
- `api.outlet()`：Plugin 没有创建 Outlet。
- `api.mountToOutlet()`：实际行为不是立即 mount。

### 9.2 推荐名称

当前推荐 `contributeToOutlet()`：

```ts
api.contributeToOutlet('site.header.actions', {
  id: 'search-trigger',
  component: Search,
  profile: 'docs-ui',
  version: '^1.0.0',
})
```

Plugin owner 由当前 Runtime Plugin 身份自动附加，调用方不能伪造。

`id` 只需要在当前 Plugin 内唯一。完整身份由 KawaPress 组合：

```text
<plugin-name>/<contribution-id>
```

### 9.3 其他候选

| 名称 | 结论 |
| --- | --- |
| `contributeToOutlet()` | 最明确，当前推荐。 |
| `outlet(name).contribute()` | 便于扩展，但会引入含义不清的链式对象。 |
| `registerOutletContribution()` | 精确，但调用处过长。 |
| `contributeUI()` | 仍然过宽，不能体现只能进入 Outlet。 |

### 9.4 Contribution 内容边界

首版 Contribution 只包含：

- Plugin 内唯一 `id`。
- 目标 Outlet。
- Vue Component。
- 所需 Compatibility Profile 和版本范围。

首版不包含：

- 数字排序。
- 任意 HTML 字符串。
- Theme 私有 DOM selector。
- 生成侧函数或状态。
- 远程组件地址。
- 运行时位置计算函数。

Contribution 组件已经位于 Runtime Vite module graph，继续遵守 KawaPress 的 SSR 规则。

## 十、公共视觉 Token

### 10.1 目标

公共 Token 让 Theme 定义一次视觉语言，而不是逐个适配：

```css
--kawa-search-c-text-2: var(--nagi-c-text-2);
--kawa-llms-c-text-2: var(--nagi-c-text-2);
--kawa-another-c-text-2: var(--nagi-c-text-2);
```

兼容 Theme 改为提供：

```css
--kawa-ui-text-muted: var(--nagi-c-text-2);
```

所有兼容 Guest 直接读取 `--kawa-ui-text-muted`。

### 10.2 Token 分层

#### 公共语义 Token

由 Compatibility Profile 定义，由 Theme Host 提供：

```css
--kawa-ui-background
--kawa-ui-surface
--kawa-ui-surface-muted
--kawa-ui-border
--kawa-ui-divider

--kawa-ui-text
--kawa-ui-text-muted
--kawa-ui-text-subtle
--kawa-ui-accent
--kawa-ui-success
--kawa-ui-warning
--kawa-ui-danger

--kawa-ui-font-sans
--kawa-ui-font-mono

--kawa-ui-radius-control
--kawa-ui-radius-panel
--kawa-ui-shadow-overlay
--kawa-ui-focus-ring

--kawa-ui-duration-fast
--kawa-ui-ease-out
```

首版最终清单应保持很小，只放多个 Guest 都会使用的语义。布局宽度、导航栏高度等 Theme 私有决定不进入公共 Token。

#### Guest 专用 Token

Guest 可以提供少量专用 Token，例如：

```css
--kawa-search-panel-width
--kawa-search-result-gap
```

专用 Token 默认引用公共 Token，并保留可用 fallback：

```css
--kawa-search-panel-background:
  var(--kawa-ui-surface, Canvas);
```

规则：

- Guest 不得读取 `--nagi-*` 等 Host 私有 Token。
- Theme 不需要覆盖每个 Guest 专用 Token。
- 新增可选 Token 必须带 fallback。
- Token 名称是公开样式 API，改名或改变语义按契约版本管理。

### 10.3 Token 不等于 Design Token 文件格式

浏览器运行时契约使用 CSS Custom Properties。

未来可以额外提供 DTCG 格式作为设计工具交换或生成来源，但它不是浏览器 API，也不是实现 UI 兼容的前提。

## 十一、Part 与 State

### 11.1 稳定 Part

新契约使用显式 data attribute 标记公开 Part：

```html
<button
  data-kawa-scope="search"
  data-kawa-part="trigger"
  data-kawa-state="closed"
>
  Search
</button>
```

每个公开 Part 节点同时携带：

- `data-kawa-scope`：Guest 能力名称。
- `data-kawa-part`：该能力内的结构名称。
- 可选 `data-kawa-state`：当前公开状态。

Theme 使用单节点选择器，不依赖内部 wrapper：

```css
[data-kawa-scope="search"][data-kawa-part="trigger"] {
  /* Theme styling */
}
```

### 11.2 State 规则

- State 名称由 Guest 的公开契约列出。
- State 只能镜像真实状态，不能自己驱动行为。
- 原生 `disabled`、`hidden`、`open` 和 `aria-*` 仍然承担语义。
- Theme 不能只靠颜色表达 loading、error 或 selected。
- 新增 State 值只有在旧 Theme 可以安全忽略时，才属于兼容新增。

### 11.3 class 边界

- `.kawa-*` class 可以继续用于 Guest 自己的基础样式和现有兼容迁移。
- 只有文档明确列出的 Part、State、Token 和 class 才是公开契约。
- 内部 wrapper、后代层级、元素顺序和构建生成 class 不构成兼容承诺。
- 现有官方 Plugin 迁移时先增加 Part 和 State，不直接删除已有 `.kawa-*` class。

## 十二、CSS Cascade Layers

建议统一声明以下层序：

```css
@layer kawa.reset, kawa.guest, kawa.theme, kawa.user;
```

职责：

| Layer | 内容 |
| --- | --- |
| `kawa.reset` | 只作用于 Kawa UI 边界内的最小归一化。 |
| `kawa.guest` | UI Guest 的默认可用样式。 |
| `kawa.theme` | Theme 对公共 Token、Part 和 State 的视觉适配。 |
| `kawa.user` | 站点作者显式选择加入的最终覆盖。 |

规则：

- KawaPress 必须确保层序在 Guest 和 Theme 样式之前声明。
- Guest 默认 CSS 不使用 `!important`。
- Theme 不依赖不断提高 selector specificity 来覆盖 Guest。
- 文档要明确说明：未分层的普通作者样式会压过正常的显式 layer。
- Markdown 正文样式继续限制在 Theme 自己的内容边界内，不能污染 Guest。

Layer 只解决覆盖顺序，不替代 Token、Part 和 State。

## 十三、Default UI 与深度替换

### 13.1 Default UI 的责任

Default UI 由 Guest 持有，并负责：

- 状态机与异步状态。
- 原生语义元素。
- ARIA 属性与 ID 关系。
- 键盘操作。
- 焦点进入、移动和返回。
- 路由切换后的清理。
- SSR 与 hydration 稳定初始状态。
- loading、empty、error 和 disabled 状态。
- 最低可用的响应式与 reduced-motion 样式。

Theme 只使用 Token、Part 和 State 时，不需要重新实现这些行为。

### 13.2 UI Adapter

完全替换视觉结构属于高级能力，应晚于 Default UI、Outlet 和样式契约稳定后设计。

UI Adapter 必须：

- 针对明确的 Guest capability 和契约 major 注册。
- 接受 Guest 提供的 state、bindings、events 和 refs。
- 把必要 attrs、ARIA 和 ref 转发到正确且可聚焦的元素。
- 通过 Guest 提供的 conformance tests。
- 在版本不兼容时回退 Default UI 或给出明确错误。

UI Adapter 不通过下面的方式实现：

- 导入 Guest 私有组件。
- Vite alias 覆盖内部文件。
- 复制 Guest 源码。
- 依赖内部 DOM 顺序。

首阶段不确定 Adapter 的注册 API，避免过早固定错误的行为绑定结构。

## 十四、SSR、无障碍与响应式规范

### 14.1 SSR 与 hydration

- Theme Host、Outlet 和 Contribution 集合必须在 SSR 与 client 初始执行中一致。
- Contribution 的初始 DOM 不能根据 `window`、视口宽度或媒体查询条件分叉。
- 浏览器专属依赖继续使用非 SSR 分支动态导入。
- 组件 ID 使用 `useId()` 或等价的 SSR 稳定机制。
- 同一个 Outlet 不重复渲染同一 Contribution。
- Theme 和 Guest 都必须在真实开发 SSR 中通过测试。

### 14.2 无障碍

兼容文档 Theme 必须提供：

- 正确的 `header`、`nav`、`main`、`aside`、`footer` landmark。
- Skip link。
- 主内容焦点目标。
- 当前页面对应的 `lang` 与 `dir`。
- 可见的键盘焦点。
- 200% 缩放下不丢失内容与操作。

UI Guest 必须提供：

- 键盘交互表。
- Escape 与焦点返回规则。
- 正确的 name、role、value。
- loading、empty、error 与 live region。
- 路由变化时的状态和异步任务清理。
- 不只依赖颜色的状态表达。

Theme 改样式不能删除这些语义。

### 14.3 响应式

- Guest 优先根据自身容器宽度适配，不假设所在位置一定是桌面导航栏。
- Theme 使用 container query 和 CSS 布局表达紧凑状态，首版不向 Guest 传递 `desktop`、`mobile` 或 `compact` JavaScript 状态。
- 支持 RTL、触控、窄屏、forced colors 和 `prefers-reduced-motion`。
- Guest 的浮层优先使用原生 top layer 能力；需要 Teleport 时必须保证公共 Token 和方向信息仍然可继承。

## 十五、版本兼容

UI Compatibility Profile 使用独立的契约版本：

```text
Theme package version: 2.4.0
Supported profile: docs-ui@^1.0.0

Plugin package version: 3.1.0
Required profile: docs-ui@^1.1.0
```

版本规则：

- 新增带 fallback 的可选 Token：minor。
- 新增可选 Part 或 Outlet：minor。
- 新增旧 Theme 可以安全忽略的 State：minor。
- 删除或改名 Token、Part、State、Outlet：major。
- 改变 Outlet 语义：major。
- 改变键盘和焦点契约：major。
- 修改 Adapter 必须转发的 bindings：major。

迁移期可以：

- 同时提供新旧 Token alias。
- 同时写入新旧 Part。
- 输出带 Plugin 身份的弃用提示。

KawaPress 处于 `0.x` 期间，Profile 不能对外宣称已经稳定。首个稳定窗口和支持几个 Profile major 仍需确认。

## 十六、测试与开发工具

### 16.1 最小参考 Theme

除了 nagi，还需要一个只实现 Profile 最低要求的参考 Theme。它不追求品牌外观，只用于证明 Guest 没有偷偷依赖 nagi。

每个官方 UI Guest 至少在以下 Host 中测试：

- nagi。
- 最小参考 Theme。

### 16.2 Conformance Test

Theme 兼容测试至少覆盖：

- Theme Host 声明。
- 必需 Outlet 是否存在且只存在一次。
- 公共 Token 是否完整。
- landmark 和 skip link。
- SSR HTML 与 hydration。
- RTL、窄屏、200% 缩放、reduced motion。
- Theme 与官方 Guest 的组合。

Guest 兼容测试至少覆盖：

- Contribution 顺序与身份。
- 缺失 Host 和版本不匹配诊断。
- Part 与 State catalog。
- 完整键盘流程。
- 焦点恢复。
- loading、empty、error。
- 多实例稳定 ID。
- 默认 Token fallback。
- axe 等自动无障碍检查。

### 16.3 开发诊断

建议提供 UI Inspector 或等价调试信息，显示：

- 当前 Theme Host。
- 当前 Compatibility Profile。
- 已挂载 Outlet。
- 每个 Outlet 的 Contribution owner 和顺序。
- 未消费 Contribution。
- 缺失 Outlet。
- Profile 版本不匹配。

是否提供 `kawapress theme check` CLI，等契约测试 API 稳定后决定。

### 16.4 CSS 检查

官方 Plugin CI 应检查：

- Guest 是否读取 Host 私有 Token。
- 是否存在依赖内部 wrapper 的脆弱长选择器。
- 稳定 Part 是否进入 catalog。
- Guest 默认 CSS 是否位于正确 layer。
- 是否使用 `!important` 绕过层序。

## 十七、真实能力示例

### 17.1 Search

当前关系：nagi 导航栏直接导入 Search。

目标关系：

```ts
api.contributeToOutlet('site.header.actions', {
  id: 'search-trigger',
  component: Search,
  profile: 'docs-ui',
  version: '^1.0.0',
})
```

Theme：

```vue
<header>
  <SiteTitle />
  <KawaOutlet name="site.header.actions" />
</header>
```

边界：

- Search Plugin 继续拥有快捷键、dialog、索引状态、结果导航和焦点返回。
- Theme 通过公共 Token 改颜色、字体、圆角和浮层阴影。
- Theme 通过 Search Part 调整 trigger、panel 和 result。
- nagi 不再直接导入 Search。
- 固定 DOM ID 迁移为实例级 SSR 稳定 ID。

### 17.2 LLMS 页面操作

当前关系：Generator Plugin 在首个文档 H1 后插入操作组件。

目标关系：

```ts
api.contributeToOutlet('document.title.actions', {
  id: 'page-markdown-actions',
  component: LlmsActions,
  profile: 'docs-ui',
  version: '^1.0.0',
})
```

边界：

- `.md`、`llms.txt`、`llms-full.txt` 和 SSG-MD 继续属于 LLMS Plugin。
- `frontmatter.llms: false` 继续决定当前页面是否显示该 Contribution。
- LLMS 默认 CSS 改用公共 Token 和自己的专用 Token，不再读取 `--nagi-*`。
- 迁移版本不能同时保留 H1 注入和 Outlet 渲染，避免重复 UI。

这项迁移会修改 0.1 已确定的承载方式，只能进入后续版本决策。

### 17.3 Code Group

Code Group 位于 Markdown 正文中，不需要页面 Outlet。

它仍然属于 UI Guest，因为它需要跨 Theme 视觉兼容：

- Plugin 保留 Tab 状态、ARIA、方向键、Home、End 和稳定 ID。
- Plugin 提供最低可用默认 CSS。
- Plugin 公开 `root`、`tabList`、`tab`、`panel` Parts。
- `tab` 公开 `selected` State。
- Theme 使用公共 Token 和 Part 精调视觉。
- nagi 的 Code Group 样式进入 Theme layer，不再是该组件唯一可用的外观。

这项变化会修订 0.1“Plugin 只负责结构和状态，nagi 负责视觉”的边界，需要在后续版本单独确认。

## 十八、相比现有 SSG 主题体系的改进点

### VitePress

VitePress 支持完整 Theme、继承默认 Theme 和 Default Theme Layout Slots；深层组件替换通常需要包装默认 Layout 或 alias 内部组件。其扩展入口没有形成“Plugin 自动贡献到 Theme 语义区域”的统一协议。

KawaPress 的目标不是提供更多默认 Theme Slot，而是让 UI Guest 通过 Profile、Outlet 和 Contribution 与未知 Theme 协作。

参考：

- <https://vitepress.dev/guide/custom-theme>
- <https://vitepress.dev/guide/extending-default-theme#layout-slots>

### Rspress

Rspress 的 `globalUIComponents` 可以让 Plugin UI 自动进入 Root，但精确进入 Header、Sidebar 等区域仍需要 Layout Slot、Theme 重导出或组件替换。

KawaPress 的 Outlet 进一步规定语义位置、顺序、版本、缺失诊断和 Host 兼容承诺。

参考：

- <https://rspress.rs/plugin/system/plugin-api#globaluicomponents>
- <https://rspress.rs/ui/layout-components/layout>

### Astro Starlight

Starlight 使用固定组件覆盖键和 Plugin 配置更新；多个能力争用同一个覆盖键时需要冲突处理。

KawaPress 首版 Outlet 只提供可追加 Contribution，避免多个 Guest 争夺整个组件所有权。

参考：

- <https://starlight.astro.build/reference/overrides/>
- <https://starlight.astro.build/reference/plugins/#configsetup>

### Docusaurus

Docusaurus 通过 Theme alias、wrap 和 eject 提供深层替换，并明确区分 safe 与 unsafe swizzle。复制组件会冻结上游实现。

KawaPress 使用 Default UI 保留上游行为，通过 Token、Part 和 State 完成大多数换肤；只有深度替换才进入受测试的 UI Adapter。

参考：

- <https://docusaurus.io/docs/swizzling>
- <https://docusaurus.io/docs/styling-layout#theme-class-names>

## 十九、分阶段落地

### 阶段一：契约实验

- 确认术语。
- 确认 Compatibility Profile 名称。
- 用 nagi 与最小参考 Theme 验证公共 Token。
- 为 Search、LLMS、Code Group 补充 Part / State catalog 实验。
- 不改变 0.1 的组件承载方式。

### 阶段二：Registry 与 Outlet

- 增加 Theme Host 和 Contribution Registry。
- 确认 `contributeToOutlet()` 的最终名称与调用形态。
- 提供类型化 `KawaOutlet`。
- 实现 Profile、Outlet、顺序与缺失诊断。
- 加入真实 SSR 与 hydration 测试。

### 阶段三：nagi 兼容

- nagi 声明文档 UI Profile。
- 放置首批必需 Outlet。
- 引入公共 Token 和 CSS Layers。
- 保持现有 Theme 最小契约不变。

### 阶段四：官方 Guest 迁移

迁移顺序：

1. Search。
2. LLMS 页面操作。
3. Code Group。
4. 其他带 UI 的官方 Plugin。

每次迁移都保留必要兼容面，并避免新旧路径重复渲染。

### 阶段五：Conformance

- 发布 Theme 与 Guest 测试工具。
- 建立 Theme × Guest 测试矩阵。
- 提供开发诊断。
- 根据真实第三方 Theme 和 Plugin 调整 Profile。

### 阶段六：深度替换

- 设计 UI Adapter。
- 明确 bindings、events、refs 和 fallback。
- 为 Adapter 提供 Guest 自带 conformance tests。
- 在 Default UI 路径稳定前不开放该能力。

## 二十、仍需确认

1. 首个 Compatibility Profile 使用 `docs-ui`、`kawa-docs-ui` 还是其他名称？
2. UI 契约 API 放在 `kawapress/client`、新的 `kawapress/ui` 子入口，还是独立包？
3. Theme Host 声明使用 Runtime API，还是 `defineRuntimePlugin()` 静态元数据？
4. `contributeToOutlet()` 是否作为最终方法名？参数使用两个位置参数还是单对象？
5. `document.aside` 是否进入首版 Profile？
6. `shell.overlay` 是否需要成为 Outlet，还是由 Guest 使用原生 dialog / popover / top layer？
7. 普通 Theme 遇到未消费 Contribution 时，只警告还是构建报错？
8. 可选 Outlet 缺失时是否只在开发期提示？
9. 公共 Token 的首版最小清单是什么？由 Theme 全部提供，还是由 KawaPress 提供中性 fallback？
10. CSS layer prelude 由 Core、Theme 还是一个公共 CSS 入口保证最先加载？
11. 是否允许 Theme 私有、带命名空间的 Outlet？
12. Profile 支持几个 major，弃用窗口多长？
13. UI Adapter 由 Theme 注册、站点配置，还是由 Guest 暴露专用入口？
14. Theme conformance 是库 API、CLI，还是两者都提供？

## 二十一、外部规范依据

- CSS Custom Properties：<https://www.w3.org/TR/css-variables-1/>
- CSS Cascade Layers：<https://www.w3.org/TR/css-cascade-5/#layer-ordering>
- CSS Shadow Parts 的稳定结构思想：<https://www.w3.org/TR/css-shadow-parts-1/>
- HTML `data-*`：<https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes>
- Vue Named / Scoped Slots：<https://vuejs.org/guide/components/slots.html>
- Vue Provide / Inject：<https://vuejs.org/guide/components/provide-inject.html>
- Radix Styling 与状态属性：<https://www.radix-ui.com/primitives/docs/guides/styling>
- Radix Accessibility：<https://www.radix-ui.com/primitives/docs/overview/accessibility>
- Ark UI Parts：<https://ark-ui.com/docs/guides/styling>
- Semantic Versioning：<https://semver.org/>
