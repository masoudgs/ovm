import { ArgInput } from '@oclif/core/lib/parser'
import { Vault } from 'obsidian-utils'
import { listInstalledPlugins, removePluginDir } from '../providers/plugins'
import { loadVaults, runOnVaults, vaultsSelector } from '../providers/vaults'
import {
  FactoryFlagsWithVaults,
  PruneCommandCallback,
  PruneCommandIterator,
  PruneCommandIteratorResult,
  PruneFlags,
} from '../types/commands'
import { logger } from '../utils/logger'
import { Config, safeLoadConfig } from './config'

/**
 * Command vault iterator for the prune command.
 *
 * @param {Vault} vault - The options for the prune command.
 * @param {Config} config - The configuration object.
 * @param {PruneCommandIterator} [iterator=() => {}] - Optional iterator function for processing each vault.
 * @returns {Promise<PruneCommandIteratorResult>} - A promise that resolves when the action is complete.
 */
const pruneVaultIterator = async (
  vault: Vault,
  config: Config,
  iterator?: PruneCommandIterator,
): Promise<PruneCommandIteratorResult> => {
  const childLogger = logger.child({ vault })
  const result: PruneCommandIteratorResult = { prunedPlugins: [] }

  if (!config.plugins.length) {
    return { prunedPlugins: [] }
  }

  const installedPlugins = await listInstalledPlugins(vault.path)
  const referencedPlugins = config.plugins.map(({ id }) => id)
  const toBePruned = installedPlugins.filter(
    ({ id }) => !referencedPlugins.includes(id),
  )

  for (const plugin of toBePruned) {
    await removePluginDir(plugin.id, vault.path)
  }

  childLogger.info(`Pruned ${toBePruned.length} plugins`, {
    vault,
    plugins: toBePruned.map(({ id }) => id),
  })

  result.prunedPlugins = toBePruned

  if (iterator) {
    iterator(result)
  }

  return result
}

/**
 * Main action method for the prune command.
 * Loads vaults, selects vaults, loads configuration, and prunes unused plugins.
 * @param {ArgInput} _args
 * @param {FactoryFlagsWithVaults<PruneFlags>} flags
 * @param {PruneCommandIterator} [iterator=() => {}]
 * @param {PruneCommandCallback} [callback=() => {}]
 * @returns {Promise<void>}
 */
const action = async (
  _args: ArgInput,
  flags: FactoryFlagsWithVaults<PruneFlags>,
  iterator: PruneCommandIterator = () => {},
  callback: PruneCommandCallback = () => {},
): Promise<void> => {
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

  runOnVaults(
    selectedVaults,
    flags,
    (vault) => pruneVaultIterator(vault, config, iterator),
    (error) => {
      if (error) {
        logger.error('Pruning plugins failed', { error })
        callback({ success: false, error })
      } else {
        callback({ success: true })
      }
    },
  )
}

export default {
  action,
  pruneVaultIterator,
}
