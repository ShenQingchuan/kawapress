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

Three things make a run fail on purpose instead of producing misleading numbers:

- **Port 5173 must be free.** Both dev servers use it by default, and `kawapress dev` has no port flag yet. If something else is listening (a running docs site, for example), stop it first: `lsof -ti :5173 | xargs kill -9`.
- **Chromium must be installed.** Dev ready is measured in a real browser, and Playwright downloads no browser on its own. Install the one Playwright expects with `pnpm --dir bench exec playwright install chromium`; the benchmark prints the same command when it cannot start the browser.
- **Lighthouse needs Chrome.** Install Chrome or run without `--lighthouse`.

## How to read the report

- **Cold build**: build output and Vite caches are deleted before every run, then `kawapress build` / `vitepress build` runs as a child process. The table reports the median and every single run.
- **Dev ready**: the dev server is spawned, then a headless Chromium opens the home page of whichever loopback address is listening, and the run ends when the home page heading is visible on screen. That is what a reader waits for, and it is the number to compare. Caches are deleted before every run, so this is a cold start as well, and every run gets a fresh browser context so no HTTP cache survives. The process tree is killed afterwards.
- **Dev first HTML response**: recorded on the same page load, at the moment the HTML document for `/` arrived. It is the metric older reports were built on and stays in the table for that reason. On its own it flatters a tool that answers with an empty shell and renders in the browser afterwards, which is exactly what VitePress dev does, while KawaPress dev renders on the server and answers with the finished page. So both numbers are reported: one describes the first byte, the other describes the first readable page. Caches and browser state are cold for both, and both start at the same moment, the spawning of the dev command. Reports written before the browser measurement are not comparable with these numbers.
- **First paint size**: the built home page and one guide page are measured. The HTML document itself plus every `<script type="module">`, `modulepreload` link and stylesheet it references are collected, and relative imports of those chunks are followed, because the browser downloads them too. The document counts because both generators put data into it: VitePress inlines its page manifest (`__VP_HASH_MAP__`, `__VP_SITE_DATA__`) in the HTML, so only counting external files would understate it. `HTML + JS + CSS` is everything one first paint downloads; the rows under it break the number down. Raw, gzip (level 9) and brotli (quality 11).
- **Per extra page**: how many bytes one more page adds to a guide page load, computed from the smallest and the largest size of the run: the difference of the guide page's HTML plus JS, divided by the page difference. Both tools ship a page manifest that grows with the site, so this is the price of adding content.
- **Lighthouse**: desktop preset, performance and accessibility of the home page, served by each tool's own preview command.
- **Δ**: relative difference of KawaPress against VitePress, of the median duration or of the gzip size for the size rows. Negative means KawaPress is smaller or faster.

The report also records the machine (CPU, cores, RAM, OS, Node) and the versions it compared, plus the capabilities each side enables by default, because those change what is being measured. KawaPress generates LLM artifacts (`llms.txt`, `llms-full.txt` and one `.md` per page) during the build; VitePress does not.

Unfavorable numbers are part of the result and are never filtered out.

## Layout

```text
src/
  fixture.ts            seeded content generator (pure)
  sites.ts              writes both sites and describes their commands
  browser.ts            headless Chromium shared by the dev measurement
  measure-build.ts      cold build timing
  measure-dev.ts        dev readiness timing, once until the page is visible and once until the first HTML response
  measure-size.ts       first paint HTML/JS/CSS size accounting (pure parts tested)
  measure-lighthouse.ts Lighthouse run behind --lighthouse
  report.ts             Markdown + JSON report formatting (pure)
  run.ts                CLI entry
  results/              committed reports
```

The benchmark is not part of CI: numbers from shared CI machines are not comparable across runs.
