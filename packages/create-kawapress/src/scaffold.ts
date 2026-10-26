import type { ResolvedOptions } from './options'
import type { ProjectDefinition } from './templates'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { kawapressVersion } from './manifest'
import { renderTemplate } from './template'
import { planProjectFiles } from './templates'

/** Absolute path of the directory that holds the template files. */
export const templatesDirectory = fileURLToPath(new URL('../templates/', import.meta.url))

/** A target that only contains version control data counts as empty. */
const allowedEntries = new Set(['.git'])

/**
 * Refuses to mix generated files into existing content. Overwriting a project
 * silently is far more expensive than asking the user for a fresh directory.
 */
export async function assertEmptyTargetDirectory(directory: string): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(directory)
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return
    throw error
  }

  const blockingEntries = entries
    .filter(entry => !allowedEntries.has(entry))
    .sort((left, right) => left.localeCompare(right))

  if (blockingEntries.length === 0)
    return

  throw new Error(
    `Cannot create a project in ${directory}: the directory is not empty.\n`
    + `Remove or move these entries first: ${blockingEntries.join(', ')}\n`
    + `Or choose a directory that does not exist yet.`,
  )
}

export interface WriteProjectOptions extends ProjectDefinition {
  /** Absolute path of the directory that receives the generated files. */
  directory: string
}

/**
 * Renders every template file into `directory` and returns the written paths,
 * relative to that directory. The target directory may already exist as long as
 * it is empty.
 */
export async function writeProject(options: WriteProjectOptions): Promise<string[]> {
  const { directory, ...project } = options
  await assertEmptyTargetDirectory(directory)

  const writtenFiles: string[] = []
  for (const file of planProjectFiles(project)) {
    const template = await readFile(join(templatesDirectory, file.templatePath), 'utf8')
    const targetPath = join(directory, file.targetPath)
    await mkdir(dirname(targetPath), { recursive: true })
    await writeFile(targetPath, renderTemplate(template, file.values))
    writtenFiles.push(file.targetPath)
  }

  return writtenFiles
}

/** Scaffolds a project from resolved command line options. */
export async function scaffoldProject(options: ResolvedOptions): Promise<string[]> {
  return writeProject({
    directory: options.directory,
    projectName: options.projectName,
    title: options.title,
    kawapressVersion,
    language: options.language,
    secondLanguage: options.secondLanguage,
  })
}
