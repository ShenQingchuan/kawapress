declare module 'virtual:kawapress-search-index' {
  export const searchIndexLoaders: Record<
    string,
    () => Promise<{ default: string }>
  >
}
