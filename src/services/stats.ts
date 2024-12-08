import { handle } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/interfaces'
import { eachSeries, ErrorCallback } from 'async'
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
import { loadVaults, vaultsSelector } from '../providers/vaults'
import {
  ExecuteCustomCommandResult,
  FactoryFlagsWithVaults,
  InstalledPlugins,
  StatsCommandCallbackResult,
  StatsFlags,
} from '../types/commands'
import { logger } from '../utils/logger'
import { Config, safeLoadConfig } from './config'

export const action = async (
  args: ArgInput,
  flags: FactoryFlagsWithVaults<StatsFlags>,
  iterator?: (
    _result: Record<string, unknown> | ExecuteCustomCommandResult,
  ) => void,
  callback?: (_result: StatsCommandCallbackResult) => void,
) => {
  const { path, output } = flags
  const {
    success: loadConfigSuccess,
    data: config,
    error: loadConfigError,
  } = await safeLoadConfig(flags.config)
  if (!loadConfigSuccess) {
    logger.error('Failed to load config', { error: loadConfigError })
    process.exit(1)
  }

  const vaults = await loadVaults(path)
  const selectedVaults = await vaultsSelector(vaults)
  const vaultsWithConfig = selectedVaults.map((vault) => ({ vault, config }))

  const installedPlugins: InstalledPlugins = {}

  const statsVaultIterator = async (opts: { vault: Vault; config: Config }) => {
    const { vault, config } = opts
    logger.debug(`Checking stats for vault`, { vault })

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
      const pluginNameWithSize = pluginDirSize
        ? `${stagePlugin.id}@${manifestVersion} (${filesize(pluginDirSize)})`
        : stagePlugin.id
      if (await isPluginInstalled(stagePlugin.id, vault.path)) {
        installedPlugins[pluginNameWithSize] = [
          ...(installedPlugins[pluginNameWithSize] || []),
          vault.name,
        ]
      }

      if (iterator) {
        iterator({
          plugin: stagePlugin,
        })
      }
    }
  }

  const statsVaultErrorCallback: ErrorCallback<Error> = (error) => {
    if (error) {
      logger.debug('Error getting stats', { error })
      callback && callback({ success: false, error })
      handle(error)
    } else {
      const totalStats = {
        totalVaults: selectedVaults.length,
        totalPlugins: config.plugins.length,
      }

      const sortedInstalledPlugins = Object.entries(installedPlugins)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .reduce<InstalledPlugins>((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {})

      if (output === 'table') {
        console.table(totalStats)
        console.table(sortedInstalledPlugins)
      } else if (output === 'json') {
        console.log(JSON.stringify(totalStats, null, 2))

        if (Object.keys(sortedInstalledPlugins).length > 0) {
          console.log(JSON.stringify(sortedInstalledPlugins, null, 2))
        }
      }

      if (callback) {
        callback({
          success: true,
          totalStats,
          installedPlugins: sortedInstalledPlugins,
        })
      }
    }
  }

  eachSeries(vaultsWithConfig, statsVaultIterator, statsVaultErrorCallback)
}
