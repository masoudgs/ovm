import { each } from 'async'
import { isPluginInstalled } from 'obsidian-utils'
import { removePluginDir } from '../providers/plugins'
import {
  loadVaults,
  mapVaultsIteratorItem,
  vaultsSelector,
} from '../providers/vaults'
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

const uninstallVaultIterator: UninstallCommandIterator<UninstallFlags> = async (
  item,
) => {
  const { vault, config } = item
  const { plugins } = config
  const uninstalledPlugins: Plugin[] = []
  const failedPlugins: Plugin[] = []
  const result = { uninstalledPlugins, failedPlugins }

  for (const stagePlugin of plugins) {
    const childLogger = logger.child({ plugin: stagePlugin, vault })

    if (!(await isPluginInstalled(stagePlugin.id, vault.path))) {
      childLogger.warn(`Plugin not installed`)
      result.failedPlugins.push(stagePlugin)
      continue
    }

    try {
      await removePluginDir(stagePlugin.id, vault.path)
      result.uninstalledPlugins.push(stagePlugin)
      childLogger.info(`Uninstalled plugin`)
    } catch (error) {
      result.failedPlugins.push(stagePlugin)
      childLogger.error(`Failed to uninstall plugin`, { error })
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
  iterator: UninstallCommandIterator<UninstallFlags> = uninstallVaultIterator,
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

  const items = mapVaultsIteratorItem(selectedVaults, configWithPlugins, flags)

  const uninstallCommandCallback: UninstallCommandCallback = (error) => {
    if (error instanceof Error) {
      logger.debug('Error uninstalling plugins', { error })
      return callback?.({ success: false, error })
    }

    logger.debug('Uninstalled plugins', { items })

    return callback?.({ success: true })
  }

  return each(items, iterator, uninstallCommandCallback)
}

export default {
  action,
  uninstallVaultIterator,
}
