import { createContentLoader } from 'kawapress'

export interface DataLoadingDemo {
  pageCount: number
}

declare const data: DataLoadingDemo
export { data }

export default createContentLoader([
  'guide/*.md',
  'en/guide/*.md',
], {
  transform(pages): DataLoadingDemo {
    return { pageCount: pages.length }
  },
})
