# Security Policy

[简体中文](https://github.com/kawapress/kawapress/blob/main/SECURITY.zh-CN.md)

## Supported versions

KawaPress is in early development. Only the latest minor version receives security fixes.

| Version | Supported |
| --- | --- |
| 0.3.x | Yes |
| Older | No. Update to the latest version |

## Report a vulnerability

**Do not open a public issue for a security problem.**

Use GitHub's private reporting: open the [Security tab](https://github.com/kawapress/kawapress/security/advisories/new) of the repository and choose "Report a vulnerability".

Include:

- the package and version (for example `kawapress@0.3.0`);
- what the problem is and what an attacker can do with it;
- the steps or a small project that reproduces it.

## What to expect

- We acknowledge your report within 7 days.
- We tell you whether we accept it as a vulnerability, and what we plan to do, within 14 days.
- When a fix is released, the advisory names you as the reporter, unless you ask us not to.

## Scope

In scope: the 17 packages published from this repository, and the release workflow of this repository.

Out of scope: a vulnerability in a dependency that has no effect through KawaPress (report it to that project), a site that a user built with KawaPress, and the third-party services that plugins load, such as `giscus.app`.
