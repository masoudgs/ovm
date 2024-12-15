import { eachSeries } from 'async'
import {
  installPluginFromGithub,
  isPluginInstalled,
  Vault,
} from 'obsidian-utils'
import {
  findPluginInRegistry,
  getPluginVersion,
  handleExceedRateLimitError,
} from '../providers/github'
import { modifyCommunityPlugins } from '../providers/plugins'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import {
  FactoryFlagsWithVaults,
  InstallArgs,
  InstallCommandCallback,
  InstallCommandIterator,
  InstallFlags,
  StagedPlugins,
} from '../types/commands'
import { PluginNotFoundInRegistryError } from '../utils/errors'
import { logger } from '../utils/logger'
import { Config, safeLoadConfig, writeConfig } from './config'

export const installVaultIterator = async (
  vault: Vault,
  config: Config,
  flags: FactoryFlagsWithVaults<InstallFlags>,
  specific: boolean,
) => {
  const installedPlugins: StagedPlugins = []
  const failedPlugins: StagedPlugins = []
  const reinstallPlugins: StagedPlugins = []
  const result = { installedPlugins, failedPlugins, reinstallPlugins }

  for (const stagePlugin of config.plugins) {
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

      installedPlugins.push({
        ...stagePlugin,
        repo: pluginInRegistry.repo,
        version,
      })

      if (flags.enable) {
        await modifyCommunityPlugins(stagePlugin, vault.path, 'enable')
      }

      if (specific) {
        const newPlugins = new Set(config.plugins)
        const updatedConfig = { ...config, plugins: [...newPlugins] }
        writeConfig(updatedConfig, flags.config)
      }

      childLogger.info(`Installed plugin`)
    } catch (error) {
      const failedPlugin = {
        ...stagePlugin,
        repo: pluginInRegistry?.repo,
        version,
      }
      result.failedPlugins.push(failedPlugin)
      result.installedPlugins = installedPlugins.filter(
        (plugin) => plugin.repo !== failedPlugin.repo,
      )
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

const installPluginsInVaults = async (
  vaults: Vault[],
  config: Config,
  flags: FactoryFlagsWithVaults<InstallFlags>,
  specific: boolean,
  iterator: InstallCommandIterator,
  callback: InstallCommandCallback,
) => {
  return eachSeries(
    vaults,
    (vault) => installVaultIterator(vault, config, flags, specific),
    (error) => {
      if (error) {
        logger.debug('Error installing plugins', { error })
        return callback({ success: false, error })
      }

      return callback({ success: true })
    },
  )
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
const action = async (
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
  const configWithPlugins = args.pluginId
    ? { plugins: [{ id: args.pluginId }] }
    : config

  await installPluginsInVaults(
    selectedVaults,
    configWithPlugins,
    flags,
    false,
    iterator,
    callback,
  )
}

export default {
  action,
  installPluginsInVaults,
}
