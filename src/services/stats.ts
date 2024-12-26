import { handle } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/interfaces'
import fastFolderSize from 'fast-folder-size'
import { filesize } from 'filesize'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import {
  isPluginInstalled,
  Vault,
  vaultPathToPluginsPath,
} from 'obsidian-utils'
import { join } from 'path'
import { promisify } from 'util'
import { loadVaults, runOnVaults, vaultsSelector } from '../providers/vaults'
import {
  FactoryFlagsWithVaults,
  InstalledPlugins,
  StatsCommandCallback,
  StatsCommandCallbackResult,
  StatsCommandIterator,
  StatsFlags,
} from '../types/commands'
import { logger } from '../utils/logger'
import { Config, safeLoadConfig } from './config'

const statsVaultIterator = async (
  vault: Vault,
  config: Config,
  allConfigInstalledPlugins: InstalledPlugins,
  iterator?: StatsCommandIterator,
) => {
  logger.debug(`Statistics for vault`, { vault })
  const stats = {
    totalPlugins: config.plugins.length,
    totalInstalledPlugins: 0,
  }

  const pluginsDir = vaultPathToPluginsPath(vault.path)

  for (const stagePlugin of config.plugins) {
    const pluginDir = join(pluginsDir, stagePlugin.id)
    const pluginDirExists = existsSync(pluginDir)

    if (!pluginDirExists) {
      continue
    }
    const manifestFile = await readFile(pluginDir + '/manifest.json', 'utf8')
    const manifestVersion = (JSON.parse(manifestFile) as { version: string })
      .version
    const pluginDirSize = await promisify(fastFolderSize)(pluginDir)
    const pluginNameWithSize = `${stagePlugin.id}@${manifestVersion} (${filesize(pluginDirSize as number)})`

    if (await isPluginInstalled(stagePlugin.id, vault.path)) {
      stats.totalInstalledPlugins += 1
      allConfigInstalledPlugins[pluginNameWithSize] = [
        ...(allConfigInstalledPlugins[pluginNameWithSize] || []),
        vault.name,
      ]
    }

    if (iterator) {
      iterator(stats)
    }
  }

  return stats
}

const statsVaultCallback = (
  error: Error | null | undefined,
  vaults: Vault[],
  config: Config,
  installedPlugins: InstalledPlugins,
  flags: FactoryFlagsWithVaults<StatsFlags>,
  callback?: StatsCommandCallback,
) => {
  const result: StatsCommandCallbackResult = {
    success: false,
    totalStats: {
      totalVaults: vaults.length,
      totalPlugins: config.plugins.length,
    },
    installedPlugins,
  }
  if (error) {
    logger.debug('Error getting stats', { error })
    callback?.({ success: false, error })
    handle(error)
  } else {
    const sortedInstalledPlugins = Object.entries(installedPlugins)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .reduce<InstalledPlugins>((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {})

    if (flags.output === 'table') {
      console.table(result.totalStats)
      console.table(sortedInstalledPlugins)
    } else if (flags.output === 'json') {
      console.log(JSON.stringify(result.totalStats, null, 2))

      if (Object.keys(sortedInstalledPlugins).length > 0) {
        console.log(JSON.stringify(sortedInstalledPlugins, null, 2))
      }
    }

    callback?.(result)
  }

  return result
}

const action = async (
  args: ArgInput,
  flags: FactoryFlagsWithVaults<StatsFlags>,
  iterator?: StatsCommandIterator,
  callback?: StatsCommandCallback,
) => {
  const {
    success: loadConfigSuccess,
    data: config,
    error: loadConfigError,
  } = await safeLoadConfig(flags.config)
  if (!loadConfigSuccess) {
    logger.error('Failed to load config', { error: loadConfigError })
    process.exit(1)
  }

  const vaults = await loadVaults(flags.path)
  const selectedVaults = await vaultsSelector(vaults)

  const installedPlugins: InstalledPlugins = {}

  return runOnVaults(
    selectedVaults,
    flags,
    (vault) => statsVaultIterator(vault, config, installedPlugins, iterator),
    (error) =>
      statsVaultCallback(
        error,
        selectedVaults,
        config,
        installedPlugins,
        flags,
        callback,
      ),
  )
}

export default {
  action,
  statsVaultIterator,
  statsVaultCallback,
}
