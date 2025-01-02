import { ArgInput } from '@oclif/core/lib/parser'
import { each } from 'async'
import { listInstalledPlugins, removePluginDir } from '../providers/plugins'
import {
  loadVaults,
  mapVaultsIteratorItem,
  vaultsSelector,
} from '../providers/vaults'
import {
  FactoryFlagsWithVaults,
  PruneArgs,
  PruneCommandCallback,
  PruneCommandCallbackResult,
  PruneCommandIterator,
  PruneCommandIteratorResult,
  PruneFlags,
} from '../types/commands'
import { handlerCommandError } from '../utils/command'
import { logger } from '../utils/logger'
import { safeLoadConfig } from './config'

const pruneVaultIterator: PruneCommandIterator = async (item) => {
  const { vault, config } = item
  const childLogger = logger.child({ vault })
  const result: PruneCommandIteratorResult = { prunedPlugins: [] }

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

const action = async (
  args: ArgInput,
  flags: FactoryFlagsWithVaults<PruneFlags>,
  iterator: PruneCommandIterator = pruneVaultIterator,
  callback?: PruneCommandCallback,
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
  const items = mapVaultsIteratorItem<
    PruneArgs,
    FactoryFlagsWithVaults<PruneFlags>
  >(selectedVaults, config, flags, args)

  const pruneCommandCallback: PruneCommandCallback = (error) => {
    const result: PruneCommandCallbackResult = {
      success: false,
      error,
    }

    if (!error) {
      result.success = true
      logger.info('Pruning plugins completed')
      callback?.(error)

      return result
    }

    logger.error('Pruning plugins failed', { error })
    callback?.(error)
    handlerCommandError(error)

    return result
  }

  return each(items, iterator, pruneCommandCallback)
}

export default {
  action,
  pruneVaultIterator,
}
