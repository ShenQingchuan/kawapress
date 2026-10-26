import { describe, expect, it } from 'vitest'
import { renderTemplate } from './template'

describe('renderTemplate', () => {
  it('replaces every occurrence of a placeholder', () => {
    const rendered = renderTemplate(
      '{\n  "name": "{{projectName}}",\n  "title": "{{projectName}}"\n}\n',
      { projectName: 'my-site' },
    )

    expect(rendered).toBe('{\n  "name": "my-site",\n  "title": "my-site"\n}\n')
  })

  it('keeps text without placeholders untouched', () => {
    const template = '# Getting started\n\nNo placeholders here.\n'

    expect(renderTemplate(template, {})).toBe(template)
  })

  it('leaves single braces alone', () => {
    expect(renderTemplate('{{name}} and {name}', { name: 'kawa' })).toBe('kawa and {name}')
  })

  it('round-trips a quoted title as pre-quoted JSON', () => {
    const values = { titleLiteral: JSON.stringify('Qingchuan\'s Docs') }

    expect(renderTemplate('title: {{titleLiteral}}', values)).toBe('title: "Qingchuan\'s Docs"')
  })

  it('reports a placeholder that has no value', () => {
    expect(() => renderTemplate('title: {{title}}', {})).toThrow(
      'Template placeholder {{title}} has no value. Add "title" to the values passed to renderTemplate().',
    )
  })
})
