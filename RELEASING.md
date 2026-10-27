# 发布 KawaPress

KawaPress 的 16 个公开包永远同一个版本号，由 `scripts/release.mjs` 一起打包、校验、按依赖顺序发布。

真正的发布在 GitHub Actions 里跑，走 npm 的 trusted publishing（OIDC）：工作流不需要、也不应该保存任何 npm token，npm 从 GitHub 的短期身份令牌里认出「这是 `ShenQingchuan/kawapress` 的 `release.yml`，跑在 `npm` 环境里」，然后才允许发布，并自动带上 provenance（来源证明）。发布前还需要你在 Actions 里点一下批准。

下面分成两部分：**只做一次的准备**，和**每次发版的固定动作**。

---

## 一、只做一次的准备

### 1. 创建 GitHub 环境 `npm`，并把自己设成必需审批人

发布 job 跑在名为 `npm` 的 environment 里，这个 environment 要求人工批准，否则工作流会一直等着。

```sh
gh api --method PUT repos/ShenQingchuan/kawapress/environments/npm --input - <<'JSON'
{
  "reviewers": [
    { "type": "User", "id": 46062972 }
  ]
}
JSON
```

`46062972` 是 `ShenQingchuan` 的 GitHub 用户 id。命令成功后会返回一段 JSON，里面 `reviewers` 数组能看到自己。

想核对该 id：`gh api users/ShenQingchuan --jq .id`。

> 默认 `prevent_self_review` 是关的，所以推 tag 的人可以批自己这一次部署，不需要第二个人。

### 2. 给 npm 账号开两步验证

打开 <https://www.npmjs.com/settings/~/profile> → Two-factor authentication → 打开（Authorization 级别就够 publish 用）。

本地 `npm login` 之后，第一次运行写入类命令时 npm 会在浏览器里问你一次，之后有 5 分钟免打扰窗口。

### 3. 把 npm 上还不存在的 4 个包补上（bootstrap）

npm 的 trusted publishing 只能给**已经存在**的包配置，而 `release.yml` 会把所有包放在一次运行里发出去，缺一个就会中途失败——这是最难收拾的失败方式。所以先手工补一次。

当前 npm 上还没有：`create-kawapress`、`@kawapress/plugin-comments`、`@kawapress/plugin-image-zoom`、`@kawapress/plugin-last-updated`。

```sh
git switch main && git pull
npm login                      # 需要是 @kawapress 组织成员、kawapress 包 owner
pnpm release:trust             # 先看一眼要配置的 trusted publisher 命令（不会改任何东西）
pnpm release --bootstrap --version 0.0.1
```

`--bootstrap` 只发布「npm 上还查不到」的包，包内容和正式发布完全一样（同一套暂存目录、同一套 tarball 校验），发完会把 16 个包的 `npm trust github` 命令打印出来。

**为什么是 `0.0.1` 而不是下一个版本号 `0.1.0`？**

- `0.0.1` 是现在仓库里已经提交的版本，也是其余 12 个包在 npm 上的版本。补完之后 16 个包版本一致，`@kawapress/plugin-comments` 里对 `@kawapress/preset-nagi` 之类的依赖也指向真实存在的版本，不会出现装不上的包。
- 如果用 `0.1.0` 补，这个版本号就被一次「本地打包」永久占住了。之后 CI 用 Node 22 重新打包同样的代码，压缩结果大概率不是逐字节相同，npm 会直接拒绝：「0.1.0 已存在且内容不同」。而且 trusted publishing 要求配置好后 2 天内有一次**通过 CI 的成功发布**，那几个被「已存在」跳过的包就永远等不到这一次发布。
- 结论：**bootstrap 只补当前已提交的版本，`0.1.0` 一定留给 CI 去发**。所以 bootstrap 必须在改版本号之前做。

`--bootstrap` 会跳过 lint/typecheck/test/构建（这一步只是占坑，内容马上会被正式版本覆盖），但 tarball 校验一样跑。

### 4. 给 16 个包配置 trusted publisher

```sh
pnpm release:trust --apply
```

它会依次执行（每条之间停 2 秒）：

```sh
npm trust github <包名> --file release.yml --repository ShenQingchuan/kawapress --environment npm --allow-publish -y
```

想手工逐条跑也行，`pnpm release:trust`（不带 `--apply`）会把 16 条命令打印出来，而且真的用 `npm trust github ... --dry-run` 校验了一遍，不登录也能跑。

几个容易踩的点：

- **每个包单独配一次**，共 16 次。第一次会弹浏览器做 2FA，之后 5 分钟内不用重复。
- 配好之后 **2 天内必须完成第一次通过 CI 的成功发布**，否则这条 trust 配置会被 npm 自动清掉，只能重配。所以第 3、4 步做完就尽快发 `0.1.0`。
- 想检查现状：`npm trust list <包名>`。想撤销：`npm trust revoke <包名> --id=<trust-id>`。

### 5. 第一次 CI 发布成功之后，关掉 token 发布

去每个包的 npm 页面 → Settings → Publishing access，改成 **Require two-factor authentication and disallow tokens**（16 个包都改）。

这一步做完，只有 CI 的 OIDC 和带 2FA 的人工操作能发布，长期 token 彻底没用。要等第一次 CI 发布成功再改，否则万一需要救火，你会连手工发布的路都没有。

---

## 二、每次发版的固定动作

以 `0.1.0` 为例：

```sh
# 1. 改版本号（只改 packages/*/package.json，不发布）
pnpm release:prepare --version 0.1.0

# 2. 提交并推 main
git commit -am "chore: 发布 0.1.0"
git push origin main

# 3. 等 main 上的 CI 变绿（Actions → CI）

# 4. 打 tag，推 tag —— 这一步才会触发发布工作流
git tag v0.1.0
git push origin v0.1.0

# 5. Actions → Release → 点开这次运行 → Review deployments → 批准 `npm` 环境

# 6. 核对结果
npm view kawapress version                # 应该看到 0.1.0
open https://www.npmjs.com/package/kawapress/v/0.1.0   # 页面上有 provenance 徽章
```

`release.yml` 里有两个 job：

- `verify`：跑 lint / typecheck / test / 构建文档，再打 16 个 tarball 并逐个校验（README、不含测试文件、`workspace:`/`catalog:` 都换成了真实范围、导出目标存在），然后 `npm publish --dry-run` 一遍。它没有任何发布权限，也不需要 token。
- `publish`：等 `verify` 通过、你在 `npm` 环境点批准之后才启动，同一个 tag、同一套校验，真实发布。

tag 和版本的对应关系写死在工作流里：tag 必须是 `v<包版本>`，而且必须指向这次提交，否则一开场就会失败。

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
- **tag 打错了**：`git push origin :v0.1.0` 删掉远程 tag，本地 `git tag -d v0.1.0`，改好再打。已经发出去的 npm 版本删不掉（npm 也不建议删），只能发新版本。

### 本地还能手工发布吗

能，但只用于救火和 bootstrap：

```sh
npm login
pnpm release --version <版本> --publish     # 会要求手输版本号确认
```

这条路径和 CI 完全一致（同样的暂存、打包、校验、依赖顺序、dist-tag 保护），唯一区别是认证靠你的 npm 登录态，发布产物没有 provenance。正式版本请走 CI。

想先看一遍再决定？`pnpm release --version 0.1.0 --dry-run`：跑全部质量检查和 tarball 校验，只是不推送。

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
