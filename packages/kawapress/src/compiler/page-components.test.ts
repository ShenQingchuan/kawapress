import type { MarkdownExit } from 'markdown-exit'
import { beforeAll, describe, expect, it } from 'vitest'
import { compileScript, parse } from 'vue/compiler-sfc'
import { definePlugin } from '../api/plugin'
import { createGeneratorPluginRunner } from '../plugin/generator-runner'
import { compileMarkdownToVue, createMarkdownCompiler } from './markdown'
import { addPageComponent, injectPageComponentImports } from './page-components'

const CHART_MODULE = '/abs/AcmeChart.vue'

/** Compiles an SFC the way `@vitejs/plugin-vue` does for a page. */
function compileSfc(code: string): string {
  const { descriptor, errors } = parse(code, { filename: 'page.md' })
  expect(errors).toEqual([])
  return compileScript(descriptor, { id: 'page' }).content
}

function chainDeclaration(env: Record<string, unknown>): void {
  addPageComponent(env, { name: 'AcmeChart', from: CHART_MODULE })
}

let md: MarkdownExit
beforeAll(async () => {
  const runner = await createGeneratorPluginRunner([definePlugin({
    name: 'test:page-components',
    setup(api) {
      api.markdown((markdown) => {
        markdown.renderer.rules.fence = (tokens, index, _options, env) => {
          if (tokens[index].info.trim() !== 'acme-chart') {
            return ''
          }
          chainDeclaration(env)
          return '<AcmeChart />'
        }
      })
    },
  })])
  md = await createMarkdownCompiler({ pluginRunner: runner })
})

describe('addPageComponent', () => {
  it('collects the declared components on the page env', () => {
    const env: Record<string, unknown> = { path: '/guide/intro' }

    chainDeclaration(env)

    expect(env.pageComponents).toEqual([
      { name: 'AcmeChart', from: CHART_MODULE },
    ])
  })

  it('keeps one entry when the same component is declared twice', () => {
    const env: Record<string, unknown> = { path: '/guide/intro' }

    chainDeclaration(env)
    chainDeclaration(env)

    expect(env.pageComponents).toHaveLength(1)
  })

  it('rejects one name declared from two modules', () => {
    const env: Record<string, unknown> = { path: '/guide/intro' }
    chainDeclaration(env)

    expect(() => addPageComponent(env, { name: 'AcmeChart', from: '@acme/other' }))
      .toThrow(
        'route "/guide/intro" declares the component "AcmeChart" from two modules: "/abs/AcmeChart.vue" and "@acme/other"',
      )
  })

  it('rejects a name that is not an identifier', () => {
    const env: Record<string, unknown> = { path: '/guide/intro' }

    expect(() => addPageComponent(env, { name: 'acme-chart', from: CHART_MODULE }))
      .toThrow('use the PascalCase form of the tag')
  })

  it('rejects a missing module', () => {
    const env: Record<string, unknown> = { path: '/guide/intro' }

    expect(() => addPageComponent(env, { name: 'AcmeChart', from: '' }))
      .toThrow('has no module to import from')
  })

  it('rejects a call without the Markdown env', () => {
    expect(() => addPageComponent(null as never, { name: 'AcmeChart', from: CHART_MODULE }))
      .toThrow('expects the Markdown env of the page being rendered')
  })
})

describe('injectPageComponentImports', () => {
  const chart = { name: 'AcmeChart', from: CHART_MODULE }

  it('leaves the scripts alone when the page declared nothing', () => {
    const scripts = ['<script setup lang="ts">\nconst a = 1\n</script>']

    expect(injectPageComponentImports(scripts, [])).toStrictEqual(scripts)
  })

  it('adds the imports to an existing setup block and keeps its lang', () => {
    const scripts = ['<script setup lang="ts">\nconst a = 1\n</script>']

    const result = injectPageComponentImports(scripts, [chart])

    expect(result).toStrictEqual([
      `<script setup lang="ts">\nimport AcmeChart from ${JSON.stringify(CHART_MODULE)}\nconst a = 1\n</script>`,
    ])
    expect(scripts).toStrictEqual(['<script setup lang="ts">\nconst a = 1\n</script>'])
  })

  it('adds a setup block with the lang of a plain script', () => {
    const result = injectPageComponentImports(
      ['<script lang="ts">\nexport const count = 1\n</script>'],
      [chart],
    )

    expect(result).toStrictEqual([
      `<script setup lang="ts">\nimport AcmeChart from ${JSON.stringify(CHART_MODULE)}\n</script>`,
      '<script lang="ts">\nexport const count = 1\n</script>',
    ])
  })

  it('adds a setup block to a page without any script', () => {
    expect(injectPageComponentImports([], [chart])).toStrictEqual([
      `<script setup>\nimport AcmeChart from ${JSON.stringify(CHART_MODULE)}\n</script>`,
    ])
  })
})

describe('compiling a page that declares a component', () => {
  const source = '```acme-chart\n```\n'

  it('imports the component into a page without scripts', async () => {
    const { code } = await compileMarkdownToVue(md, source, '/guide/intro')

    expect(code).toContain('<template><AcmeChart /></template>')
    expect(code).toContain(`<script setup>\nimport AcmeChart from ${JSON.stringify(CHART_MODULE)}\n</script>`)
    expect(compileSfc(code)).toContain('__pageData')
  })

  it('keeps the author script setup block and its lang', async () => {
    const { code } = await compileMarkdownToVue(
      md,
      `${source}\n<script setup lang="ts">\nconst count = 1\n</script>\n`,
      '/guide/intro',
    )

    expect(code).toContain(`<script setup lang="ts">\nimport AcmeChart from ${JSON.stringify(CHART_MODULE)}\nconst count = 1\n</script>`)
    expect(compileSfc(code)).toContain('const count = 1')
  })

  it('adds a setup block next to an author plain script', async () => {
    const { code } = await compileMarkdownToVue(
      md,
      `${source}\n<script>\nexport const count = 1\n</script>\n`,
      '/guide/intro',
    )

    expect(code).toContain(`<script setup>\nimport AcmeChart from ${JSON.stringify(CHART_MODULE)}\n</script>`)
    expect(code).toContain('export const count = 1')
    expect(compileSfc(code)).toContain('import AcmeChart')
  })

  it('does not import anything for a page that declared nothing', async () => {
    const { code } = await compileMarkdownToVue(md, '# Plain\n', '/guide/plain')

    expect(code).not.toContain('AcmeChart')
  })
})
