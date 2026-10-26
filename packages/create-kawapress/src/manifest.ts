import { readFileSync } from 'node:fs'

interface ScafolderManifest {
  version: string
  kawapressVersion: string
}

function readManifest(): ScafolderManifest {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as Partial<ScafolderManifest>

  if (typeof manifest.version !== 'string')
    throw new Error('create-kawapress/package.json is missing its version field.')
  if (typeof manifest.kawapressVersion !== 'string') {
    throw new TypeError(
      'create-kawapress/package.json is missing the kawapressVersion field. '
      + 'Set it to the version of the kawapress package so generated sites install a matching version.',
    )
  }

  return { version: manifest.version, kawapressVersion: manifest.kawapressVersion }
}

const manifest = readManifest()

/** Version of the scaffolder itself, shown by `--help` and `--version`. */
export const scaffolderVersion = manifest.version

/**
 * Version of `kawapress` written into generated projects. It is stored in this
 * package's own manifest so the value survives publishing, and a unit test
 * keeps it equal to the `kawapress` package version.
 */
export const kawapressVersion = manifest.kawapressVersion
