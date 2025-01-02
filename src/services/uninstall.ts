import { each } from 'async'
import { isPluginInstalled } from 'obsidian-utils'
import { removePluginDir } from '../providers/plugins'
import {
  loadVaults,
  mapVaultsIteratorItem,
  vaultsSelector,
} from '../providers/vaults'
import { Plugin, writeConfig } from '../services/config'
import {
  FactoryFlagsWithVaults,
  UninstallArgs,
  UninstallCommandCallback,
  UninstallCommandCallbackResult,
  UninstallCommandIterator,
  UninstallFlags,
} from '../types/commands'
import { handlerCommandError } from '../utils/command'
import { logger } from '../utils/logger'
import { safeLoadConfig } from './config'

const uninstallVaultIterator: UninstallCommandIterator = async (item) => {
  const { vault, config, flags, args } = item
  // Check if pluginId is provided and install only that plugin
  const stagedPlugins = args?.pluginId
    ? [{ id: args.pluginId }]
    : config.plugins
  const uninstalledPlugins: Plugin[] = []
  const failedPlugins: Plugin[] = []
  const result = { uninstalledPlugins, failedPlugins }

  for (const stagePlugin of stagedPlugins) {
    const childLogger = logger.child({ plugin: stagePlugin, vault })

    if (!(await isPluginInstalled(stagePlugin.id, vault.path))) {
      childLogger.warn(`Plugin not installed`)
      result.failedPlugins.push(stagePlugin)
      continue
    }

    try {
      await removePluginDir(stagePlugin.id, vault.path)

      const updatedPlugins = new Set(
        config.plugins.filter((plugin) => plugin.id !== stagePlugin.id),
      )
      const updatedConfig = { ...config, plugins: [...updatedPlugins] }
      writeConfig(updatedConfig, flags.config)

      childLogger.info(`Uninstalled plugin`)
      result.uninstalledPlugins.push(stagePlugin)
    } catch (error) {
      childLogger.error(`Failed to uninstall plugin`, { error })
      result.failedPlugins.push(stagePlugin)
    }
  }

  if (uninstalledPlugins.length) {
    logger.info(`Uninstalled ${uninstalledPlugins.length} plugins`, { vault })
  }

  return result
}

const action = async (
  args: UninstallArgs,
  flags: FactoryFlagsWithVaults<UninstallFlags>,
  iterator: UninstallCommandIterator = uninstallVaultIterator,
  callback?: UninstallCommandCallback,
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

  // Check if pluginId is provided and install only that plugin
  const configWithPlugins = args.pluginId
    ? { plugins: [{ id: args.pluginId }] }
    : config

  const items = mapVaultsIteratorItem<
    UninstallArgs,
    FactoryFlagsWithVaults<UninstallFlags>
  >(selectedVaults, configWithPlugins, flags, args)

  const uninstallCommandCallback: UninstallCommandCallback = (error) => {
    const result: UninstallCommandCallbackResult = {
      success: false,
      error,
    }

    if (!error) {
      logger.info('Uninstalling plugins completed')
      result.success = true
      callback?.(null)

      return result
    }

    logger.debug('Error uninstalling plugins', { error })

    callback?.(error)
    handlerCommandError(error)

    return result
  }

  return each(items, iterator, uninstallCommandCallback)
}

export default {
  action,
  uninstallVaultIterator,
}
