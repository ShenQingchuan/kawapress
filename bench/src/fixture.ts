/**
 * Deterministic fixture content shared by the KawaPress and VitePress sites.
 *
 * Only Markdown that both generators understand is used: frontmatter, headings,
 * paragraphs, lists, tables, fenced code blocks and relative links.
 */

export interface FixturePage {
  /** Markdown source path relative to the site content root, e.g. `guide/page-0001.md`. */
  file: string
  /** Public route path, e.g. `/guide/page-0001`. */
  route: string
  title: string
  /** Full Markdown source, including frontmatter. */
  markdown: string
}

export interface Fixture {
  /** Number of guide pages. The home page is generated in addition to these. */
  size: number
  home: FixturePage
  pages: FixturePage[]
}

/** Directory that holds the guide pages inside the site content root. */
export const GUIDE_DIR = 'guide'
/** Route prefix of the guide pages. */
export const GUIDE_ROUTE_PREFIX = '/guide'

const SEED = 20_260_101

const TOPICS = [
  'Routing',
  'Markdown pipeline',
  'Theming',
  'Search',
  'Deployment',
  'Assets',
  'Plugins',
  'Localization',
  'Navigation',
  'Performance',
]

const SUBJECTS = [
  'The build pipeline',
  'A static site generator',
  'The dev server',
  'Each Markdown page',
  'The theme layer',
  'A plugin',
  'The sidebar',
  'The search index',
]

const VERBS = [
  'turns',
  'renders',
  'collects',
  'reads',
  'caches',
  'prepares',
  'watches',
  'groups',
]

const OBJECTS = [
  'every Markdown file',
  'the page frontmatter',
  'the public routes',
  'the heading outline',
  'the generated HTML',
  'the asset manifest',
  'the navigation tree',
  'the code blocks',
]

const TAILS = [
  ' before the browser asks for it',
  ' during a single pass',
  ' without a full page reload',
  ' when the watcher reports a change',
  ' so nothing is recomputed twice',
  ' with the same output on every run',
  ' in the order the files were discovered',
  ' while the server is still starting',
]

const MENU_ITEMS = [
  'route table',
  'markdown options',
  'theme tokens',
  'search settings',
  'deploy target',
  'build cache',
  'plugin order',
  'locale map',
]

interface Random {
  int: (max: number) => number
  pick: <T>(items: readonly T[]) => T
}

/** Small seeded PRNG (mulberry32) so every run produces identical content. */
function createRandom(seed: number): Random {
  let state = seed >>> 0
  const next = (): number => {
    state = (state + 0x6D_2B_79_F5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }

  return {
    int: max => Math.floor(next() * max),
    pick: items => items[Math.floor(next() * items.length)]!,
  }
}

function sentence(random: Random): string {
  const text = `${random.pick(SUBJECTS)} ${random.pick(VERBS)} ${random.pick(OBJECTS)}${random.pick(TAILS)}`
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

function paragraph(random: Random): string {
  const count = 2 + random.int(3)
  return Array.from({ length: count }, () => sentence(random)).join(' ')
}

function list(random: Random, count: number): string[] {
  return Array.from({ length: count }, () => `- ${sentence(random)}`)
}

function table(random: Random): string[] {
  const rows = Array.from({ length: 3 }, () => {
    const name = random.pick(MENU_ITEMS)
    return `| \`${name}\` | ${random.pick(['string', 'boolean', 'number'])} | ${random.pick(['true', 'false', '1', '0'])} |`
  })
  return [
    '| Option | Type | Default |',
    '| --- | --- | --- |',
    ...rows,
  ]
}

function typescriptBlock(random: Random): string[] {
  const name = random.pick(['route', 'page', 'entry', 'node'])
  return [
    '```ts',
    `export interface ${name.charAt(0).toUpperCase()}${name.slice(1)}Record {`,
    `  ${name}: string`,
    '  depth: number',
    '}',
    '',
    `export function collect${name.charAt(0).toUpperCase()}${name.slice(1)}s(records: ${name.charAt(0).toUpperCase()}${name.slice(1)}Record[]): ${name.charAt(0).toUpperCase()}${name.slice(1)}Record[] {`,
    `  return records.filter(record => record.${name}.length > 0 && record.depth < ${2 + random.int(5)})`,
    '}',
    '```',
  ]
}

function bashBlock(random: Random): string[] {
  const manager = random.pick(['pnpm', 'npm', 'yarn'])
  const verb = manager === 'npm' ? 'run' : ''
  return [
    '```bash',
    `${manager} add -D ${random.pick(['tinyglobby', 'gray-matter', 'markdown-exit'])}`,
    [manager, verb, 'build'].filter(Boolean).join(' '),
    '```',
  ]
}

function pageTitle(index: number, topic: string): string {
  return `Page ${String(index).padStart(4, '0')}: ${topic}`
}

function guideRoute(index: number): string {
  return `${GUIDE_ROUTE_PREFIX}/page-${String(index).padStart(4, '0')}`
}

/**
 * Build the guide pages and the home page.
 *
 * @param size number of guide pages; the home page is additional.
 */
export function createFixture(size: number): Fixture {
  if (!Number.isInteger(size) || size < 3) {
    throw new RangeError(`Fixture size must be an integer of at least 3, got ${size}`)
  }

  const titleRandom = createRandom(SEED)
  const titles = Array.from(
    { length: size },
    (_, index) => pageTitle(index + 1, titleRandom.pick(TOPICS)),
  )

  const pages = titles.map((title, offset) => {
    const index = offset + 1
    const random = createRandom(SEED + index)
    const related = new Set<number>()
    while (related.size < 2) {
      const candidate = 1 + random.int(size)
      if (candidate !== index) {
        related.add(candidate)
      }
    }

    const markdown = [
      '---',
      `title: ${JSON.stringify(title)}`,
      '---',
      '',
      `# ${title}`,
      '',
      `${paragraph(random)} This page is generated from the same fixture content for both generators, so \`${random.pick(MENU_ITEMS)}\` and \`config\` stay comparable.`,
      '',
      '## Overview',
      '',
      paragraph(random),
      '',
      paragraph(random),
      '',
      ...list(random, 3),
      '',
      '## Details',
      '',
      `### ${random.pick(['Configuration', 'Data flow', 'Edge cases', 'Implementation notes'])}`,
      '',
      `${paragraph(random)} The example below shows the shape of the data that reaches the theme.`,
      '',
      ...typescriptBlock(random),
      '',
      `### ${random.pick(['Timing', 'Output shape', 'Defaults', 'Constraints'])}`,
      '',
      paragraph(random),
      '',
      ...table(random),
      '',
      '## Reproducing this page',
      '',
      paragraph(random),
      '',
      ...bashBlock(random),
      '',
      '## Related pages',
      '',
      ...[...related].map((target) => {
        const targetTitle = titles[target - 1]!
        return `- [${targetTitle}](${guideRoute(target)})`
      }),
      '',
      paragraph(random),
      '',
    ].join('\n')

    return {
      file: `${GUIDE_DIR}/page-${String(index).padStart(4, '0')}.md`,
      route: guideRoute(index),
      title,
      markdown,
    }
  })

  return {
    size,
    home: {
      file: 'index.md',
      route: '/',
      title: 'Benchmark',
      markdown: createHomeMarkdown(titles),
    },
    pages,
  }
}

function createHomeMarkdown(titles: readonly string[]): string {
  const first = guideRoute(1)
  const second = guideRoute(2)
  return [
    '---',
    'layout: home',
    'title: Benchmark',
    '',
    'hero:',
    '  name: Benchmark',
    '  text: The same Markdown, rendered by two generators',
    '  tagline: A seeded fixture that compares KawaPress and VitePress on build speed and output size.',
    '  actions:',
    '    - theme: brand',
    '      text: Start reading',
    `      link: ${first}`,
    '    - theme: alt',
    '      text: Second page',
    `      link: ${second}`,
    '',
    'features:',
    '  - icon: 🧪',
    '    title: One fixture, two sites',
    '    details: Both sites are written from the same generated Markdown, so only the generator differs.',
    '  - icon: 📄',
    '    title: Realistic pages',
    '    details: Every page has headings, paragraphs, lists, a table, code blocks and internal links.',
    '  - icon: 🔁',
    '    title: Deterministic',
    '    details: A fixed seed keeps repeated runs byte-identical, so results can be compared over time.',
    '---',
    '',
    `This site is generated from a seeded fixture with ${titles.length} guide pages.`,
    '',
    `Start with [${titles[0]}](${first}).`,
    '',
  ].join('\n')
}
