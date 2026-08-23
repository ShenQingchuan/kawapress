import { fileURLToPath } from 'node:url'

export const entryServerPath = fileURLToPath(new URL('../client/entry-server.ts', import.meta.url))
export const entryClientPath = fileURLToPath(new URL('../client/entry-client.ts', import.meta.url))
