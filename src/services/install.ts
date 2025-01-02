import { each } from 'async'
import { installPluginFromGithub, isPluginInstalled } from 'obsidian-utils'
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
import { safeLoadConfig, writeConfig } from './config'

const installVaultIterator: InstallCommandIterator<InstallFlags> = async (
  item,
) => {
  const { vault, config, flags, specific } = item
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

const action = async (
  args: InstallArgs,
  flags: FactoryFlagsWithVaults<InstallFlags>,
  iterator: InstallCommandIterator<InstallFlags> = installVaultIterator,
  callback?: InstallCommandCallback,
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

  const installCommandCallback: InstallCommandCallback = (error) => {
    const result: ReturnType<InstallCommandCallback> = { success: false }

    if (error instanceof Error) {
      logger.debug('Error installing plugins', { error })
      result.error = error

      callback?.(result)

      return result
    }

    result.success = true

    callback?.(result)

    return result
  }

  return each(
    selectedVaults.map((vault) => ({
      vault,
      config: configWithPlugins,
      flags,
      specific: Boolean(args.pluginId),
    })),
    iterator,
    installCommandCallback,
  )
}

export default {
  action,
  installVaultIterator,
}
