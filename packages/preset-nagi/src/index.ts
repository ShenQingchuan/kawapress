import { definePlugin, definePreset, shikiPlugin } from 'kawapress'

const nagiPlugin = definePlugin({
  name: '@kawapress/preset-nagi',
  setup() {},
})

export const nagi = definePreset({
  plugins: [
    nagiPlugin,
    shikiPlugin(),
  ],
})

export default nagi
