# 安全策略

[English](https://github.com/kawapress/kawapress/blob/main/SECURITY.md)

## 支持的版本

KawaPress 还处在早期开发阶段，只有最新的次版本会得到安全修复。

| 版本 | 是否支持 |
| --- | --- |
| 0.3.x | 支持 |
| 更早的版本 | 不支持，请升级到最新版本 |

## 报告漏洞

**请不要为安全问题公开提 Issue。**

使用 GitHub 的私密报告：打开仓库的 [Security 页签](https://github.com/kawapress/kawapress/security/advisories/new)，选择「Report a vulnerability」。

请写明：

- 受影响的包和版本（例如 `kawapress@0.3.0`）；
- 问题是什么，攻击者能用它做什么；
- 能复现它的步骤，或一个很小的项目。

## 你可以期待什么

- 我们会在 7 天内确认收到你的报告。
- 我们会在 14 天内告诉你，是否把它认定为漏洞，以及准备怎么处理。
- 修复发布时，公告会写上你是报告者，除非你要求不写。

## 范围

范围之内：从这个仓库发布的 17 个包，以及这个仓库的发布工作流。

范围之外：依赖里的、不会通过 KawaPress 产生影响的漏洞（请报告给那个项目）、用户用 KawaPress 搭建的站点，以及插件会加载的第三方服务，例如 `giscus.app`。
