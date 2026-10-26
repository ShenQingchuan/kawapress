import { nagi } from 'kawapress/nagi'

export default nagi({
  title: {{titleLiteral}},
  locales: {
    root: { label: '{{rootLabel}}', lang: '{{rootLang}}' },
    '{{secondKey}}': { label: '{{secondLabel}}', lang: '{{secondLang}}' },
  },
})
