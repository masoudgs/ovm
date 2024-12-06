import { ArgInput } from '@oclif/core/lib/parser'
import { eachSeries } from 'async'
import { safeLoadConfig } from '../../providers/config'
import { listInstalledPlugins, removePluginDir } from '../../providers/plugins'
import { loadVaults, vaultsSelector } from '../../providers/vaults'
import {
  FactoryFlagsWithVaults,
  PruneCommandCallback,
  PruneCommandIterator,
  PruneFlags,
  PrunePluginVaultOpts,
} from '../../types/commands'
import { logger } from '../../utils/logger'

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
  const prunePluginsIterator = async (opts: PrunePluginVaultOpts) => {
    const { vault, config } = opts
    const childLogger = logger.child({ vault })
    const installedPlugins = await listInstalledPlugins(vault.path)
    const referencedPlugins = config.plugins.map(({ id }) => id)
    const toBePruned = installedPlugins.filter(
      ({ id }) => !referencedPlugins.includes(id),
    )

    for (const plugin of toBePruned) {
      childLogger.debug(`Pruning plugin`, { plugin })
      await removePluginDir(plugin.id, vault.path)
    }

    childLogger.info(`Pruned ${toBePruned.length} plugins`)

    if (iterator) {
      iterator({ prunedPlugins: toBePruned })
    }
  }

  eachSeries(vaultsWithConfig, prunePluginsIterator, (error) => {
    if (error) {
      logger.debug('Error pruning plugins', { error })
      callback({ success: false, error })
    } else {
      callback({ success: true })
    }
  })
}
