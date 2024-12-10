import { eachSeries } from 'async'
import { isPluginInstalled, Vault } from 'obsidian-utils'
import { removePluginDir } from '../providers/plugins'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import { Plugin } from '../services/config'
import {
  FactoryFlagsWithVaults,
  UninstallArgs,
  UninstallCommandCallback,
  UninstallCommandIterator,
  UninstallFlags,
} from '../types/commands'
import { logger } from '../utils/logger'
import { safeLoadConfig } from './config'

export const uninstallPluginsInVaults = async (
  vaults: Vault[],
  plugins: Plugin[],
  iterator: UninstallCommandIterator,
  callback: UninstallCommandCallback,
) => {
  const uninstallVaultIterator = async (vault: Vault) => {
    const uninstalledPlugins: Plugin[] = []
    const failedPlugins: Plugin[] = []

    for (const stagePlugin of plugins) {
      const childLogger = logger.child({ plugin: stagePlugin, vault })

      if (!(await isPluginInstalled(stagePlugin.id, vault.path))) {
        childLogger.warn(`Plugin not installed`)
        continue
      }

      try {
        await removePluginDir(stagePlugin.id, vault.path)
        uninstalledPlugins.push(stagePlugin)
        childLogger.info(`Uninstalled plugin`)
      } catch (error) {
        failedPlugins.push(stagePlugin)
        childLogger.error(`Failed to uninstall plugin`, { error })
      }
    }

    if (uninstalledPlugins.length) {
      logger.info(`Uninstalled ${uninstalledPlugins.length} plugins`, { vault })
    }

    const result = { uninstalledPlugins, failedPlugins }

    if (iterator) {
      iterator(result)
    }

    return result
  }

  return eachSeries(vaults, uninstallVaultIterator, (error) => {
    if (error) {
      logger.debug('Error uninstalling plugins', { error })
      callback({ success: false, error })
      return
    }

    callback({ success: true })
  })
}

export const action = async (
  args: UninstallArgs,
  flags: FactoryFlagsWithVaults<UninstallFlags>,
  iterator: UninstallCommandIterator = () => {},
  callback: UninstallCommandCallback = () => {},
): Promise<void> => {
  const { path } = flags
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

  const { pluginId } = args
  const plugins: typeof config.plugins = pluginId
    ? [{ id: pluginId }]
    : config.plugins

  return await uninstallPluginsInVaults(
    selectedVaults,
    plugins,
    iterator,
    callback,
  )
}
