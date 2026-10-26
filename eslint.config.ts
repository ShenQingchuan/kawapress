import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  // Template files contain `{{placeholder}}` markers instead of final code.
  ignores: ['packages/create-kawapress/templates/**'],
})
