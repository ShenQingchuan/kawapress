const placeholderPattern = /\{\{(\w+)\}\}/g

/** Values substituted into a template file. Keys match `{{key}}` placeholders. */
export type TemplateValues = Readonly<Record<string, string>>

/**
 * Replaces every `{{name}}` placeholder with its value.
 *
 * This is deliberately not a template engine: templates stay readable files,
 * and a placeholder without a value fails loudly instead of leaking `{{...}}`
 * into the generated project.
 */
export function renderTemplate(template: string, values: TemplateValues): string {
  return template.replace(placeholderPattern, (placeholder, name: string) => {
    const value = values[name]
    if (value === undefined) {
      throw new Error(
        `Template placeholder ${placeholder} has no value. Add "${name}" to the values passed to renderTemplate().`,
      )
    }
    return value
  })
}
