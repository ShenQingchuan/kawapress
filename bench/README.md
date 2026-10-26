# Benchmark: KawaPress vs VitePress

This package generates two sites from one seeded fixture, measures them on the same machine, and writes a report to `bench/results/`.

The fixture lives in `src/fixture.ts`. It only uses Markdown that both generators understand: frontmatter, headings, paragraphs, lists, tables, `ts` and `bash` code fences, inline code and internal links. A fixed seed makes every run byte-identical, so numbers stay comparable over time.

## Run it

```sh
pnpm bench                                  # 50, 500 and 2000 guide pages, 3 runs each
pnpm bench --sizes 50 --runs 1              # a quick run
pnpm bench --sizes 500 --runs 5 --lighthouse
```

| Option | Meaning |
| --- | --- |
| `--sizes 50,500` | Guide page counts to measure. Every size also gets one home page. |
| `--runs 3` | Runs per measurement. The median is reported, and every run is listed. |
| `--lighthouse` | Also score the home page with Lighthouse. Needs Chrome and takes noticeably longer. |

Generated sites go to `bench/.sites/<size>/{kawapress,vitepress}` and are ignored by git. The report is written to `bench/results/<date>-<shortsha>.md` and `.json`.

Two things make a run fail on purpose instead of producing misleading numbers:

- **Port 5173 must be free.** Both dev servers use it by default, and `kawapress dev` has no port flag yet. If something else is listening (a running docs site, for example), stop it first: `lsof -ti :5173 | xargs kill -9`.
- **Lighthouse needs Chrome.** Install Chrome or run without `--lighthouse`.

## How to read the report

- **Cold build**: build output and Vite caches are deleted before every run, then `kawapress build` / `vitepress build` runs as a child process. The table reports the median and every single run.
- **Dev ready**: the dev server is started, and the harness polls `http://127.0.0.1:5173/` until the first HTML response arrives. Caches are deleted before every run, so this is a cold start as well. The process tree is killed afterwards.
- **First paint size**: the built home page and one guide page are parsed. Every `<script type="module">`, `modulepreload` link and stylesheet referenced by the HTML is collected, and relative imports of those chunks are followed, because the browser downloads them too. Raw, gzip (level 9) and brotli (quality 11) sizes are summed for JS and CSS separately.
- **Lighthouse**: desktop preset, performance and accessibility of the home page, served by each tool's own preview command.
- **Δ**: relative difference of KawaPress against VitePress. Negative means KawaPress is smaller or faster.

The report also records the machine (CPU, cores, RAM, OS, Node) and the versions it compared, plus the capabilities each side enables by default, because those change what is being measured. KawaPress generates LLM artifacts (`llms.txt`, `llms-full.txt` and one `.md` per page) during the build; VitePress does not.

Unfavorable numbers are part of the result and are never filtered out.

## Layout

```text
src/
  fixture.ts            seeded content generator (pure)
  sites.ts              writes both sites and describes their commands
  measure-build.ts      cold build timing
  measure-dev.ts        dev server startup timing
  measure-size.ts       first paint JS/CSS size accounting (pure parts tested)
  measure-lighthouse.ts Lighthouse run behind --lighthouse
  report.ts             Markdown + JSON report formatting (pure)
  run.ts                CLI entry
  results/              committed reports
```

The benchmark is not part of CI: numbers from shared CI machines are not comparable across runs.
