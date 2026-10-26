import { defineRuntimePlugin } from 'kawapress'
import './vendor.css'
import './shiki.css'
import './twoslash.css'

/**
 * The Twoslash popups render through `KawaTwoslashMenu`, which the Markdown
 * plugin imports into the pages that contain a Twoslash code block. That
 * component brings its own floating-vue dependency, so this runtime plugin only
 * contributes the styles both sides need from the first paint.
 */
export default defineRuntimePlugin({
  name: '@kawapress/plugin-shiki',
  setup() {},
})
