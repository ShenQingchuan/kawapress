# create-kawapress

一条命令创建一个新的 KawaPress 站点。

[![npm version](https://img.shields.io/npm/v/create-kawapress?label=npm&color=42b883)](https://www.npmjs.com/package/create-kawapress) · [English](https://github.com/kawapress/kawapress/blob/main/packages/create-kawapress/README.md)

`create-kawapress` 是 [KawaPress](https://github.com/kawapress/kawapress) 的一部分。KawaPress 是一个以 Vue 为核心的静态站点生成器。

## 特性

- 询问站点标题和默认语言，然后生成一个能直接运行的站点。
- 自动识别你用的是 npm、pnpm 还是 Yarn，并给出对应的命令。
- 可以帮你装好依赖。
- 把答案写成命令行参数时不会再提问，适合脚本和 CI。

## 使用

这个包不用安装，直接用包管理器的 create 命令运行：

```sh
npm create kawapress@latest my-kawapress-site
cd my-kawapress-site
npm run dev
```

`pnpm create kawapress my-kawapress-site` 和 `yarn create kawapress my-kawapress-site` 效果相同。

## 配置项

| 选项 | 说明 |
| --- | --- |
| `[dir]` | 创建站点的目录。 |
| `--title` | 站点标题。 |
| `--lang` | 站点的默认语言。 |
| `--second-lang` | 第二种站点语言，或 `none`。 |
| `--pm` | 包管理器：`npm`、`pnpm`、`yarn` 或 `bun`。 |
| `--install / --no-install` | 生成后安装依赖，或者跳过安装。 |
| `--yes` | 使用默认值，跳过所有提问。 |

## 文档

[文档](https://kawapress.dev/guide/getting-started) · [反馈问题](https://github.com/kawapress/kawapress/issues)

## 许可证

[MIT](https://github.com/kawapress/kawapress/blob/main/LICENSE) © KawaPress contributors
