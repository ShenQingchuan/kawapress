import type { EnvironmentInfo, ToolVersions } from './report.ts'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import process from 'node:process'

const require = createRequire(import.meta.url)

/** Describe the machine the benchmark runs on, so results stay comparable. */
export function readEnvironment(): EnvironmentInfo {
  const cpus = os.cpus()
  return {
    cpuModel: cpus[0]?.model.trim() ?? 'unknown',
    cores: cpus.length,
    memoryGiB: Math.round(os.totalmem() / 1024 ** 3),
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    nodeVersion: process.version,
  }
}

export function readToolVersions(options: {
  repoRoot: string
  lighthouse: boolean
}): ToolVersions {
  return {
    kawapressVersion: readPackageVersion('kawapress'),
    kawapressGitSha: readGitSha(options.repoRoot),
    vitepressVersion: readPackageVersion('vitepress'),
    ...(options.lighthouse
      ? { lighthouseVersion: readPackageVersion('lighthouse') }
      : {}),
  }
}

function readPackageVersion(packageName: string): string {
  const manifestPath = require.resolve(`${packageName}/package.json`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { version?: string }
  if (!manifest.version) {
    throw new Error(`Benchmark: ${manifestPath} has no version field, so the report cannot record it.`)
  }
  return manifest.version
}

/** Short git sha of the checkout, marked `-dirty` when it has uncommitted changes. */
function readGitSha(repoRoot: string): string {
  try {
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf-8',
    }).trim()
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd: repoRoot,
      encoding: 'utf-8',
    }).trim()
    return status ? `${sha}-dirty` : sha
  }
  catch {
    return 'unknown'
  }
}
