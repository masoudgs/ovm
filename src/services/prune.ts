import { ArgInput } from '@oclif/core/lib/parser'
import { each } from 'async'
import { listInstalledPlugins, removePluginDir } from '../providers/plugins'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import {
  FactoryFlagsWithVaults,
  PruneCommandCallback,
  PruneCommandIterator,
  PruneCommandIteratorResult,
  PruneFlags,
} from '../types/commands'
import { handlerCommandError } from '../utils/command'
import { logger } from '../utils/logger'
import { safeLoadConfig } from './config'

const pruneVaultIterator: PruneCommandIterator<
  FactoryFlagsWithVaults<PruneFlags>
> = async (item): Promise<PruneCommandIteratorResult> => {
  const { vault, config } = item
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

  const pruneCommandCallback: PruneCommandCallback = (error) => {
    if (error) {
      logger.error('Pruning plugins failed', { error })
      handlerCommandError(error)
      return {
        success: false,
        error,
      }
    } else {
      logger.info('Pruning plugins completed')
      return {
        success: true,
      }
    }
  }

  return each(
    selectedVaults.map((vault) => ({
      vault,
      config,
      flags,
    })),
    pruneVaultIterator,
    pruneCommandCallback,
  )
}

export default {
  action,
  pruneVaultIterator,
}
