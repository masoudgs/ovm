import { each } from 'async'
import { installPluginFromGithub, isPluginInstalled } from 'obsidian-utils'
import {
  findPluginInRegistry,
  getPluginVersion,
  handleExceedRateLimitError,
} from '../providers/github'
import { modifyCommunityPlugins } from '../providers/plugins'
import { getSelectedVaults, mapVaultsIteratorItem } from '../providers/vaults'
import {
  FactoryFlagsWithVaults,
  InstallArgs,
  InstallCommandCallback,
  InstallCommandIterator,
  InstallFlags,
  StagedPlugins,
} from '../types/commands'
import { handlerCommandError } from '../utils/command'

import { PluginNotFoundInRegistryError } from '../utils/errors'
import { logger } from '../utils/logger'
import { loadConfig, writeConfig } from './config'

const installVaultIterator: InstallCommandIterator = async (item) => {
  const { vault, config, flags, args } = item
  // Check if pluginId is provided and install only that plugin
  const stagedPlugins = args?.pluginId
    ? [{ id: args.pluginId }]
    : config.plugins
  const installedPlugins: StagedPlugins = []
  const failedPlugins: StagedPlugins = []
  const reinstallPlugins: StagedPlugins = []
  const result = { installedPlugins, failedPlugins, reinstallPlugins }

  for (const stagePlugin of stagedPlugins) {
    const version = getPluginVersion(stagePlugin)
    const childLogger = logger.child({ plugin: { ...stagePlugin, version } })
    childLogger.info(
      `Install ${stagePlugin.id}@${version} in ${vault.name} vault`,
    )

    const pluginInRegistry = await findPluginInRegistry(stagePlugin.id)

    try {
      if (!pluginInRegistry) {
        throw new PluginNotFoundInRegistryError(stagePlugin.id)
      }

      const pluginInVault = await isPluginInstalled(stagePlugin.id, vault.path)

      if (pluginInVault) {
        childLogger.info(`Plugin already installed`)
        reinstallPlugins.push({
          ...stagePlugin,
          repo: pluginInRegistry.repo,
          version,
        })
        continue
      }

      await installPluginFromGithub(pluginInRegistry.repo, version, vault.path)

      if (flags.enable) {
        await modifyCommunityPlugins(stagePlugin, vault.path, 'enable')
      }

      const updatedPlugins = new Set([...config.plugins, stagePlugin])
      const updatedConfig = { ...config, plugins: [...updatedPlugins] }

      writeConfig(updatedConfig, flags.config)

      installedPlugins.push({
        ...stagePlugin,
        repo: pluginInRegistry.repo,
        version,
      })
    } catch (error) {
      const failedPlugin = {
        ...stagePlugin,
        repo: pluginInRegistry?.repo,
        version,
      }

      result.failedPlugins.push(failedPlugin)
      handleExceedRateLimitError(error)
      childLogger.error(`Failed to install plugin`, { error })
    }
  }

  if (installedPlugins.length) {
    logger.info(`Installed ${installedPlugins.length} plugins`, {
      vault,
    })
  }

  return result
}

const action = async (
  args: InstallArgs,
  flags: FactoryFlagsWithVaults<InstallFlags>,
  iterator: InstallCommandIterator = installVaultIterator,
  callback?: InstallCommandCallback,
): Promise<void> => {
  const config = await loadConfig(flags.config)
  const selectedVaults = await getSelectedVaults(flags.path)

  const items = mapVaultsIteratorItem<
    InstallArgs,
    FactoryFlagsWithVaults<InstallFlags>
  >(selectedVaults, config, flags, args)

  const installCommandCallback: InstallCommandCallback = (error) => {
    const result: ReturnType<InstallCommandCallback> = { success: false, error }
    if (!error) {
      result.success = true

      callback?.(null)

      return result
    }

    logger.debug('Error installing plugins', { error })
    callback?.(error)
    handlerCommandError(error)

    return result
  }

  return each(items, iterator, installCommandCallback)
}

export default {
  action,
  installVaultIterator,
}
