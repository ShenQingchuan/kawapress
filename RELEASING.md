# 发布 KawaPress

KawaPress 有 17 个公开包，每个包有自己的版本号，各发各的。一次发布由 `scripts/release.mjs` 把全部包打包、校验，然后只发布「npm 上还没有这个版本」的包，其余的原样跳过，按依赖顺序发布。所以要发哪个包，只需要提高它自己的版本号。

真正的发布在 GitHub Actions 里跑，走 npm 的 trusted publishing（OIDC）：工作流不需要、也不应该保存任何 npm token，npm 从 GitHub 的短期身份令牌里认出「这是 `ShenQingchuan/kawapress` 的 `release.yml`，跑在 `npm` 环境里」，然后才允许发布，并自动带上 provenance（来源证明）。推送 `v*` tag 之后全程自动，不需要人工介入。

下面分成两部分：**只做一次的准备**，和**每次发版的固定动作**。

---

## 一、只做一次的准备

### 1. 创建 GitHub 环境 `npm`，只允许 `v*` tag 部署

发布 job 跑在名为 `npm` 的 environment 里。npm 的 trusted publisher 也绑定这个环境名，所以只有跑在这个环境里的发布才会被 npm 接受。环境不设审批人，只限制部署来源：只有 `v*` tag 触发的运行能进入它，其他分支即使改了 `release.yml` 也发不出去。

```sh
gh api --method PUT repos/ShenQingchuan/kawapress/environments/npm --input - <<'JSON'
{
  "reviewers": [],
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true }
}
JSON
gh api --method POST repos/ShenQingchuan/kawapress/environments/npm/deployment-branch-policies \
  -f name='v*' -f type=tag
```

核对：`gh api repos/ShenQingchuan/kawapress/environments/npm/deployment-branch-policies --jq '.branch_policies[] | .name + " " + .type'` 应输出 `v* tag`。

### 2. 给 npm 账号开两步验证

打开 <https://www.npmjs.com/settings/~/profile> → Two-factor authentication → 打开（Authorization 级别就够 publish 用）。

本地 `npm login` 之后，第一次运行写入类命令时 npm 会在浏览器里问你一次，之后有 5 分钟免打扰窗口。

### 3. 新增公开包时，先在 npm 上占位（bootstrap）

npm 的 trusted publishing 只能给**已经存在**的包配置，而 `release.yml` 会把所有包放在一次运行里发出去，缺一个就会中途失败——这是最难收拾的失败方式。所以每新增一个公开包，都要先手工在 npm 上占一个位置。

```sh
git switch main && git pull
npm login                      # 需要是 @kawapress 组织成员、kawapress 包 owner
pnpm release --bootstrap --version 0.0.1
```

`--bootstrap` 只发布「npm 上还查不到」的包，已经存在的包一律跳过。包内容走同一套暂存目录和 tarball 校验，发完会把全部包的 `npm trust github` 命令打印出来。

**占位版本固定用 `0.0.1`，不要用要正式发布的版本号。**

- 占位只在 `--bootstrap` 时用 `--version` 指定，所有缺失的包都会被临时当作这个版本打包，不要求等于仓库里已提交的版本，所以新包的 `package.json` 里可以直接写将来要发的 `0.1.0`。
- 如果占位直接用 `0.1.0`，这个版本号就被一次「本地打包」永久占住了。之后 CI 用 Node 22 重新打包同样的代码，压缩结果大概率不是逐字节相同，npm 会直接拒绝：「0.1.0 已存在且内容不同」。而且 trusted publishing 要求配置好后 2 天内有一次**通过 CI 的成功发布**，被「已存在」跳过的包就永远等不到这一次发布。
- 占位包里 `kawapress` 等依赖会变成 `0.0.1`，那是 npm 上真实存在的早期版本，占位包不会因此装不上。
- 结论：**占位发 `0.0.1`，带真实内容的第一个版本（例如 `0.1.0`）一定留给 CI 去发。**

`--bootstrap` 会跳过 lint/typecheck/test/构建（这一步只是占坑，内容马上会被正式版本覆盖），但 tarball 校验一样跑。

### 4. 给新包配置 trusted publisher

`pnpm release:trust --apply` 会对**全部公开包**依次执行下面的命令。已经配置过的包再配一次是重复操作，所以只给刚占位的新包配时，直接手工跑那几条即可（用 `pnpm release:trust` 打印出来复制）。

```sh
pnpm release:trust --apply
```

它会依次执行（每条之间停 2 秒）：

```sh
npm trust github <包名> --file release.yml --repository ShenQingchuan/kawapress --environment npm --allow-publish -y
```

想手工逐条跑也行，`pnpm release:trust`（不带 `--apply`）会把 17 条命令打印出来，而且真的用 `npm trust github ... --dry-run` 校验了一遍，不登录也能跑。

几个容易踩的点：

- **每个包单独配一次**，共 17 次。第一次会弹浏览器做 2FA，之后 5 分钟内不用重复。
- 配好之后 **2 天内必须完成第一次通过 CI 的成功发布**，否则这条 trust 配置会被 npm 自动清掉，只能重配。所以第 3、4 步做完就尽快发带真实内容的第一个版本（例如 `0.1.0`）。
- 想检查现状：`npm trust list <包名>`。想撤销：`npm trust revoke <包名> --id=<trust-id>`。

### 5. 第一次 CI 发布成功之后，关掉 token 发布

把 17 个包的发布权限都改成「必须两步验证，不接受绕过两步验证的 token」（网页上的 Require two-factor authentication and disallow bypass 2fa tokens）：

```sh
pnpm release:lock            # 先打印 17 条命令，不改任何东西
pnpm release:lock --apply    # 真正修改；第一次会在浏览器里做两步验证
```

它对每个包执行 `npm access set mfa=publish <包名>`，每条之间停 2 秒。CI 走的是 OIDC，不受这个设置影响。

这一步做完，只有 CI 的 OIDC 和带两步验证的人工操作能发布，长期 token 彻底没用。要等第一次 CI 发布成功再改，否则万一需要救火，你会连手工发布的路都没有。

---

## 二、每次发版的固定动作

以「发 `plugin-mermaid` 的 0.2.1」为例：

```sh
# 1. 改版本号（只改 package.json，不发布）。可以一次写多个包。
pnpm release:prepare plugin-mermaid=0.2.1

# 2. 提交并推 main
git commit -am "chore: 发布 plugin-mermaid 0.2.1"
git push origin main

# 3. 等 main 上的 CI 变绿（Actions → CI）

# 4. 打 tag，推 tag —— 这一步触发发布工作流，之后全自动
git tag v2026-05-30-mermaid
git push origin v2026-05-30-mermaid

# 5. 等 Actions → Release 跑完，核对结果
npm view @kawapress/plugin-mermaid version
```

几条规则：

- 包名可以写目录名（`plugin-mermaid`）或完整的 npm 名（`@kawapress/plugin-mermaid`）。
- 新版本必须高于该包当前的版本。
- **tag 只负责启动工作流，不表示版本号**：任何以 `v` 开头、没用过的名字都行，例如 `v2026-05-30`、`v0.3.0`。每次发布用一个新 tag。发布哪些包、发哪个版本，由已提交的各 `package.json` 决定。
- 同时发布 `kawapress` 时必须带上 `create-kawapress`，因为 `create-kawapress` 里的 `kawapressVersion` 记着新建站点要装的核心版本。`release:prepare` 会自动把它改成 `kawapress` 的新版本，并要求你同时给 `create-kawapress` 一个新版本。
- 包与包之间的依赖用 `workspace:^`，发布后变成 `^<对方当时的版本>`。所以插件只要不跨过核心的大版本（0.x 阶段是不跨过小版本），就不用跟着核心一起发版。

`release.yml` 里有两个 job：

- `verify`：跑 lint / typecheck / test / 构建文档，再打 17 个 tarball 并逐个校验（README、不含测试文件、`workspace:`/`catalog:` 都换成了真实范围、导出目标存在），然后 `npm publish --dry-run` 一遍。它没有任何发布权限，也不需要 token。
- `publish`：`verify` 通过后自动启动，跑在 `npm` 环境里，同一个 tag、同一套校验，真实发布。

### 版本号已经在 npm 上时

脚本对每个包按 npm 上的情况分四种处理：

| npm 上的情况 | 处理 |
| --- | --- |
| 没有这个版本 | 发布 |
| 有，且 tarball 内容一致 | 续跑，只核对 dist-tag |
| 有，但内容不一致 | **跳过**，打印警告，不碰它的 dist-tag |
| 标签已指向该版本，元数据还没同步 | 等待元数据 |

"内容不一致"不等于源码有改动：同样的源码在不同机器上打出的 tarball 不一定逐字节相同。想把某个包的新源码发出去，必须升版本号。

这条规则让每次发布只动改过版本号的包：没提高版本号的包，哪怕源码改了也会被跳过，运行日志会列出这些「原样跳过」的包。想发布它的新源码，就提高它的版本号。

### 版本号怎么选

| 场景 | 版本号 | dist-tag |
| --- | --- | --- |
| 正式版 | `0.1.0` | `latest`（自动） |
| 测试版 | `0.1.0-beta.1` | `beta`（自动） |
| 其它预发布名 | `0.1.0-experimental.1` | `next` |

### 发失败了怎么办

- **中途失败（比如第 9 个包网络超时）**：直接重跑同一个工作流即可。脚本会先在 npm 上核对每个包，已经发好的、内容和本地 tarball 一致的就跳过（输出里会标 `(resumed)`），只补剩下的。**不要**改版本号重来。
- **报 `missing from npm`**：有包在 npm 上还不存在，回到第一节第 3 步补。
- **报 `already exists with different contents`**：这个版本号已经被别人（或自己手工）发过、且内容和这次打包不一样。这种情况下同一个版本号永远发不上去，只能换一个新版本号。
- **报 dist-tag 倒退**：说明 registry 上 `latest` 已经指向更高的版本，脚本拒绝把它挪回去。检查是不是重复发了旧版本。
- **tag 打错了**：`git push origin :<tag>` 删掉远程 tag，本地 `git tag -d <tag>`，改好再打。已经发出去的 npm 版本删不掉（npm 也不建议删），只能发新版本。

### 本地还能手工发布吗

能，但只用于救火和 bootstrap：

```sh
npm login
pnpm release --publish     # 会要求手输 publish 确认
```

这条路径和 CI 完全一致（同样的暂存、打包、校验、依赖顺序、dist-tag 保护），唯一区别是认证靠你的 npm 登录态，发布产物没有 provenance。正式版本请走 CI。

想先看一遍再决定？`pnpm release --dry-run`：跑全部质量检查和 tarball 校验，只是不推送。

---

## 三、相关文件

| 文件 | 作用 |
| --- | --- |
| `.github/workflows/release.yml` | tag 触发的发布工作流（`verify` + `publish`） |
| `scripts/release.mjs` | 入口，其余逻辑在 `scripts/release/` |
| `scripts/release/ci.mjs` | CI 模式判定：tag / 版本 / HEAD 校验，缺包报错文案 |
| `scripts/release/pack.mjs` | 暂存目录、打包、tarball 校验 |
| `scripts/release/registry.mjs` | 已发布内容、dist-tag、缺包检查 |
| `scripts/trust-publishers.mjs` | `pnpm release:trust`，批量配置 trusted publisher |
