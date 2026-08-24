import { Menu } from 'floating-vue'
import { defineComponent, h, useId } from 'vue'

export const TwoslashMenu = defineComponent({
  name: 'KawaTwoslashMenu',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const ariaId = useId()
    return () => h(Menu, { ...attrs, ariaId }, slots)
  },
})
