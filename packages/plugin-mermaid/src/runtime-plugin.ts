import { defineRuntimePlugin } from 'kawapress'
import './mermaid.css'

/**
 * The diagram itself is a page component that the Markdown plugin imports into
 * pages with a Mermaid block, so this runtime plugin only contributes the styles
 * both sides need from the first paint.
 */
export default defineRuntimePlugin({
  name: '@kawapress/plugin-mermaid',
  setup() {},
})
