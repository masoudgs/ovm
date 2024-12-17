import { ArgInput } from '@oclif/core/lib/parser'
import { eachSeries } from 'async'
import { listInstalledPlugins, removePluginDir } from '../providers/plugins'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import {
  FactoryFlagsWithVaults,
  PruneCommandCallback,
  PruneCommandIterator,
  PruneCommandIteratorResult,
  PruneFlags,
  PrunePluginVaultOpts,
} from '../types/commands'
import { logger } from '../utils/logger'
import { safeLoadConfig } from './config'

/**
 * Main action method for the prune command.
 * Loads vaults, selects vaults, loads configuration, and prunes unused plugins.
 * @param {ArgInput} args
 * @param {FactoryFlagsWithVaults<PruneFlags>} flags
 * @param {PruneCommandIterator} [iterator=() => {}]
 * @param {PruneCommandCallback} [callback=() => {}]
 * @returns {Promise<void>}
 */
export const action = async (
  args: ArgInput,
  flags: FactoryFlagsWithVaults<PruneFlags>,
  iterator: PruneCommandIterator = () => {},
  callback: PruneCommandCallback = () => {},
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
  const vaultsWithConfig = selectedVaults.map((vault) => ({ vault, config }))

  eachSeries(
    vaultsWithConfig,
    (opts) => prunePluginsIterator(opts, iterator),
    (error) => {
      if (error) {
        logger.debug('Error pruning plugins', { error })
        callback({ success: false, error })
      } else {
        callback({ success: true })
      }
    },
  )
}

/**
 * Command iterator for the prune command.
 *
 * @param {PrunePluginVaultOpts} opts - The options for the prune command.
 * @param {PruneCommandIterator} [iterator=() => {}] - Optional iterator function for processing each vault.
 * @returns {Promise<PruneCommandIteratorResult>} - A promise that resolves when the action is complete.
 */
export const prunePluginsIterator = async (
  opts: PrunePluginVaultOpts,
  iterator?: PruneCommandIterator,
): Promise<PruneCommandIteratorResult> => {
  const { vault, config } = opts
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
