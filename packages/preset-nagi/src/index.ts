import { shikiPlugin } from '@kawapress/plugin-shiki'
import { definePlugin, definePreset } from 'kawapress'

const nagiPlugin = definePlugin({
  name: '@kawapress/preset-nagi',
  setup() {},
})

export const nagi = definePreset({
  plugins: [
    shikiPlugin({
      twoslash: true,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    }),
    nagiPlugin,
  ],
})

export default nagi
