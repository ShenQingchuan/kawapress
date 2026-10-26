export const packageManagers = ['npm', 'pnpm', 'yarn', 'bun'] as const

export type PackageManager = (typeof packageManagers)[number]

export function isPackageManager(value: string): value is PackageManager {
  return (packageManagers as readonly string[]).includes(value)
}

/**
 * Package managers that wrap this command put their own name in
 * `npm_config_user_agent`, so the agent is the most reliable hint about which
 * one the user actually typed. Longer names come first because an agent string
 * for pnpm also contains the word `npm`.
 */
const detectionOrder: readonly PackageManager[] = ['pnpm', 'yarn', 'bun', 'npm']

export function detectPackageManager(userAgent = ''): PackageManager {
  const tokens = userAgent.toLowerCase().split(/[\s/]+/)
  return detectionOrder.find(manager => tokens.includes(manager)) ?? 'npm'
}

export function installCommand(packageManager: PackageManager): string {
  return `${packageManager} install`
}

export function runCommand(packageManager: PackageManager, script: string): string {
  return `${packageManager} run ${script}`
}
