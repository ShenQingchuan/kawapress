import process from 'node:process'
import { nagi } from '@kawapress/preset-nagi'

export default nagi({
  title: 'KawaPress',
  base: process.env.KAWAPRESS_BASE,
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
    },
  },
})
