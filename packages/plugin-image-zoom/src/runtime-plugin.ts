import type { ImageZoomRuntimeOptions } from './options-module'
import { defineRuntimePlugin } from 'kawapress'
import { imageZoomOptions } from 'virtual:kawapress-image-zoom-options'
import { createImageZoomLabelResolver } from './labels'
import { closeImageZoom, installImageZoom } from './zoom-runtime'
import './image-zoom.css'

export default defineRuntimePlugin({
  name: '@kawapress/plugin-image-zoom',
  setup(api) {
    const resolvePageLabels = createImageZoomLabelResolver(
      imageZoomOptions as ImageZoomRuntimeOptions,
    )
    // The route path is the only locale signal both sides share: the generator
    // resolved the same labels per page path while it rendered the images.
    let currentPath = '/'

    api.vueApp(() => {
      if (!import.meta.env.SSR) {
        installImageZoom({ resolveLabels: () => resolvePageLabels(currentPath) })
      }
    })

    api.router((router) => {
      if (import.meta.env.SSR) {
        return
      }
      router.afterEach((to) => {
        currentPath = to.path
        // Navigating away closes the dialog, but focus belongs to the new page.
        closeImageZoom({ restoreFocus: false })
      })
    })
  },
})
