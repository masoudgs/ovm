import { eachSeries } from 'async'
import {
  installPluginFromGithub,
  isPluginInstalled,
  Vault,
} from 'obsidian-utils'
import { Config, safeLoadConfig, writeConfig } from '../../providers/config'
import {
  findPluginInRegistry,
  handleExceedRateLimitError,
} from '../../providers/github'
import { modifyCommunityPlugins } from '../../providers/plugins'
import { loadVaults, vaultsSelector } from '../../providers/vaults'
import {
  FactoryFlagsWithVaults,
  InstallArgs,
  InstallCommandCallback,
  InstallCommandIterator,
  InstallFlags,
  StagedPlugins,
} from '../../types/commands'
import { PluginNotFoundInRegistryError } from '../../utils/errors'
import { logger } from '../../utils/logger'

export const installPluginsInVaults = async (
  vaults: Vault[],
  config: Config,
  flags: FactoryFlagsWithVaults<InstallFlags>,
  specific: boolean,
  iterator: InstallCommandIterator,
  callback: InstallCommandCallback,
) => {
  const installVaultIterator = async (vault: Vault) => {
    logger.debug(`Install plugins for vault`, { vault })
    const installedPlugins: StagedPlugins = []
    const failedPlugins: StagedPlugins = []

    for (const stagePlugin of config.plugins) {
      const childLogger = logger.child({ plugin: stagePlugin, vault })

      const pluginInRegistry = await findPluginInRegistry(stagePlugin.id)
      if (!pluginInRegistry) {
        throw new PluginNotFoundInRegistryError(stagePlugin.id)
      }

      if (await isPluginInstalled(pluginInRegistry.id, vault.path)) {
        childLogger.info(`Plugin already installed`)
        continue
      }

      stagePlugin.version = stagePlugin.version ?? 'latest'

      try {
        await installPluginFromGithub(
          pluginInRegistry.repo,
          stagePlugin.version,
          vault.path,
        )
        installedPlugins.push({
          repo: pluginInRegistry.repo,
          version: stagePlugin.version,
        })

        if (flags.enable) {
          await modifyCommunityPlugins(stagePlugin, vault.path, 'enable')
        }

        if (specific) {
          const newPlugins = new Set([...config.plugins])
          const updatedConfig = { ...config, plugins: [...newPlugins] }
          writeConfig(updatedConfig, flags.config)
        }

        childLogger.info(`Installed plugin`)
      } catch (error) {
        failedPlugins.push({
          repo: pluginInRegistry.repo,
          version: stagePlugin.version,
        })
        handleExceedRateLimitError(error)
        childLogger.error(`Failed to install plugin`, { error })
      }
    }

    if (installedPlugins.length) {
      logger.info(`Installed ${installedPlugins.length} plugins`, {
        vault,
      })
    }

    if (iterator) {
      iterator({ installedPlugins, failedPlugins })
    }

    return { installedPlugins, failedPlugins }
  }

  return eachSeries(vaults, installVaultIterator, (error) => {
    if (error) {
      logger.debug('Error installing plugins', { error })
      callback({ success: false, error })
      return
    }

    callback({ success: true })
  })
}

/**
 *
 *
 * @param {InstallArgs} args
 * @param {FactoryFlagsWithVaults<InstallFlags>} flags
 * @param {InstallCommandIterator} [iterator=() => {}]
 * @param {InstallCommandCallback} [callback=() => {}]
 * @return {Promise<void>}
 */
export const action = async (
  args: InstallArgs,
  flags: FactoryFlagsWithVaults<InstallFlags>,
  iterator: InstallCommandIterator = () => {},
  callback: InstallCommandCallback = () => {},
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
  const { pluginId } = args
  if (pluginId) {
    await installPluginsInVaults(
      selectedVaults,
      { ...config, plugins: [{ id: pluginId }] },
      flags,
      true,
      iterator,
      callback,
    )
  } else {
    await installPluginsInVaults(
      selectedVaults,
      config,
      flags,
      false,
      iterator,
      callback,
    )
  }
}
