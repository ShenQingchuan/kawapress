# 参与 KawaPress 的开发

感谢你愿意帮助 KawaPress。这一页说明怎么报告问题、怎么提出改动，以及一个 Pull Request 怎样才能被合并。[English](https://github.com/kawapress/kawapress/blob/main/CONTRIBUTING.md)

## 开始之前

- **遇到 Bug？** 先在 [Issues](https://github.com/kawapress/kawapress/issues) 里搜一下。如果还没有人报告，用 Bug 报告表单新建一个 Issue。
- **有疑问？** 到 [Discussions](https://github.com/kawapress/kawapress/discussions) 提问。Issue 用来记录有人可以去做的事。
- **较大的功能或 API 变更？** 先开一个 Issue，等方向确认之后再写代码，避免你做出一个无法合并的东西。
- **安全问题？** 不要公开提 Issue，请按 [SECURITY.md](https://github.com/kawapress/kawapress/blob/main/SECURITY.md) 处理。

Issue 和 Pull Request 使用英文。文档有中英文两个版本，两边保持同步。

## 准备仓库

你需要 Node.js 22.12 或更新版本，以及 pnpm 11.22.0。

```sh
git clone https://github.com/kawapress/kawapress.git
cd kawapress
pnpm install
pnpm dev          # 文档站，使用真实的 SSR
```

| 命令 | 检查什么 |
| --- | --- |
| `pnpm lint` | 对整个仓库运行 ESLint |
| `pnpm typecheck` | 对每个包运行 `vue-tsc` |
| `pnpm test` | 单元测试 |
| `pnpm build` | 构建文档站 |
| `pnpm test:e2e` | Playwright 端到端测试。它会在 5173 端口启动 dev server，所以请先停掉你自己的 dev server |

仓库是一个 pnpm 工作区：各个包在 `packages/`，文档站在 `docs/`，端到端测试在 `e2e/`。

## 提交改动

1. Fork 仓库，从 `main` 创建分支。
2. 一次只做一件事。只做一件事的 Pull Request 会更快被审阅。
3. 添加或更新测试。Bug 修复需要一个在没有修复时会失败的测试。
4. 如果改动了用户能看到的行为，同时更新 `docs/`（中文）和 `docs/en/`（英文）里的文档。
5. 运行 `pnpm lint`、`pnpm typecheck` 和 `pnpm test`。改动渲染、插件或主题时，再运行 `pnpm test:e2e`。
6. 向 `main` 提交 Pull Request。模板会要求你写出摘要、证据和合并的风险。

### 代码规则

- 一个源码文件保持在 500 行以内。更大的文件拆成职责单一的模块。测试、文档和 CSS 除外。
- 不要把代码复制到第二个地方，把它提取出来。
- 代码注释描述代码现在做什么、为什么这样做，不描述代码以前是什么样。
- 主题和插件只使用公开 API。官方包没有私有通道。

### 提交信息

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：`feat(plugin-search): ...`、`fix(theme): ...`、`docs: ...`。破坏性变更在 scope 后面加 `!`，并在提交正文里说明。

## 发布

发布由维护者负责，步骤见 [RELEASING.md](https://github.com/kawapress/kawapress/blob/main/RELEASING.md)。每一个用户能看到的变更都会写进 [CHANGELOG.zh-CN.md](https://github.com/kawapress/kawapress/blob/main/CHANGELOG.zh-CN.md)。

## 许可证

提交贡献，即表示你同意你的贡献以 [MIT 许可证](https://github.com/kawapress/kawapress/blob/main/LICENSE)发布。
