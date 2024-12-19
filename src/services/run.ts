import { formatDuration, intervalToDuration } from 'date-fns'
import { Vault } from 'obsidian-utils'
import { asyncExecCustomCommand } from '../providers/command'
import { loadVaults, runOnVaults, vaultsSelector } from '../providers/vaults'
import {
  CommandArgs,
  CommandsExecutedOnVaults,
  FactoryFlagsWithVaults,
  RunCommandCallback,
  RunCommandCallbackResult,
  RunCommandIterator,
  RunCommandIteratorResult,
  RunFlags,
} from '../types/commands'
import { handlerCommandError } from '../utils/command'
import {
  CUSTOM_COMMAND_LOGGER_FILE,
  customCommandLogger,
  logger,
} from '../utils/logger'
import { safeLoadConfig } from './config'

/**
 * Command iterator for the prune command.
 *
 * @param {Vault} vault - The options for the prune command.
 * @param {CommandsExecutedOnVaults} taskExecutedOnVaults - The tasks executed on the
 * @param {string} command - The command to run.
 * @param {FactoryFlagsWithVaults<RunFlags>} flags - The flags for the command.
 * @param {RunCommandIterator} [iterator=() => {}] - Optional iterator function for processing each vault.
 * @returns {Promise<RunCommandIteratorResult>} - A promise that resolves when the action is complete.
 */
const commandVaultIterator = async (
  vault: Vault,
  taskExecutedOnVaults: CommandsExecutedOnVaults,
  command: string,
  flags: FactoryFlagsWithVaults<RunFlags>,
  iterator?: RunCommandIterator,
): Promise<RunCommandIteratorResult> => {
  logger.debug(`Execute command`, { vault, command })
  const vaultPathHash = btoa(vault.path)
  taskExecutedOnVaults[vaultPathHash] = {
    success: null,
    duration: '',
    error: null,
  }

  try {
    const startDate = new Date()
    const result = await asyncExecCustomCommand(
      command,
      flags.runFromVaultDirectoryAsWorkDir,
      vault,
    )
    const endDate = new Date()
    const durationLessThanSecond = endDate.getTime() - startDate.getTime()
    const durationMoreThanSecond = intervalToDuration({
      start: startDate,
      end: endDate,
    })

    const formattedDuration =
      formatDuration(durationMoreThanSecond, {
        format: ['hours', 'minutes', 'seconds'],
      }) || `${durationLessThanSecond.toString()} ms`

    taskExecutedOnVaults[vaultPathHash] = {
      success: null,
      duration: formattedDuration,
      error: null,
    }

    if (typeof result === 'string') {
      taskExecutedOnVaults[vaultPathHash]['success'] = true
      taskExecutedOnVaults[vaultPathHash]['stdout'] = result
      customCommandLogger.info('Executed successfully', {
        result,
        vault,
        command,
      })
      if (!flags.silent) {
        logger.info(`Run command`, { vault, command })
      }

      if (iterator) {
        iterator(taskExecutedOnVaults[vaultPathHash])
      }
    } else {
      taskExecutedOnVaults[vaultPathHash]['success'] = false
      taskExecutedOnVaults[vaultPathHash]['error'] = result.error

      customCommandLogger.error('Execution failed', {
        error: result.error,
        vault,
        command,
      })

      if (iterator) {
        iterator(taskExecutedOnVaults[vaultPathHash])
      }
    }
  } catch (error) {
    taskExecutedOnVaults[vaultPathHash]['success'] = false
    taskExecutedOnVaults[vaultPathHash]['error'] = error as Error
    customCommandLogger.error('Execution failed', {
      error,
      vault,
      command,
    })

    if (iterator) {
      iterator(taskExecutedOnVaults[vaultPathHash])
    }
  }

  return taskExecutedOnVaults[vaultPathHash]
}

/**
 * Command callback for the prune command.
 *
 * @param {Error | null} error - The error that occurred during the command.
 * @param {CommandsExecutedOnVaults} taskExecutedOnVaults - The tasks executed on the vaults.
 * @param {FactoryFlagsWithVaults<RunFlags>} flags - The flags for the command.
 * @param {RunCommandCallback} [callback=() => {}] - Optional callback function for processing the results.
 * @returns {RunCommandCallbackResult}
 */
const commandVaultCallback = (
  error: Error | null | undefined,
  taskExecutedOnVaults: CommandsExecutedOnVaults,
  flags: FactoryFlagsWithVaults<RunFlags>,
  callback?: RunCommandCallback,
): RunCommandCallbackResult => {
  const result: RunCommandCallbackResult = {
    success: false,
    sortedTaskExecutedOnVaults: taskExecutedOnVaults,
  }

  if (error) {
    logger.debug('UnhandledException', {
      error: JSON.stringify(error),
      path: flags.path,
    })
    handlerCommandError(error)
  } else {
    result.sortedTaskExecutedOnVaults = Object.entries(
      result.sortedTaskExecutedOnVaults,
    )
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .reduce<CommandsExecutedOnVaults>((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {})

    logger.info('Run operation finished!', {
      custom_commands_log_path: CUSTOM_COMMAND_LOGGER_FILE,
    })

    if (flags.output === 'table') {
      console.table(result.sortedTaskExecutedOnVaults)
    } else if (flags.output === 'json') {
      console.log(JSON.stringify(result.sortedTaskExecutedOnVaults, null, 2))
    }
  }

  if (callback) {
    callback(result)
  }

  return result
}

const action = async (
  args: CommandArgs,
  flags: FactoryFlagsWithVaults<RunFlags>,
  iterator?: RunCommandIterator,
  callback?: RunCommandCallback,
) => {
  const { success: loadConfigSuccess, error: loadConfigError } =
    await safeLoadConfig(flags.config)
  if (!loadConfigSuccess) {
    logger.error('Failed to load config', { error: loadConfigError })
    process.exit(1)
  }

  if (!args.command || args.command === '') {
    customCommandLogger.error('Command is empty', {
      command: args.command,
    })
    const emptyCommandError = new Error('Command is empty')
    throw emptyCommandError
  }

  const vaults = await loadVaults(flags.path)
  const selectedVaults = await vaultsSelector(vaults)

  const taskExecutedOnVaults: CommandsExecutedOnVaults = {}

  customCommandLogger.debug('Running command on selected vaults...', {
    vaults: selectedVaults.length,
  })

  return runOnVaults(
    selectedVaults,
    flags,
    (vault) =>
      commandVaultIterator(
        vault,
        taskExecutedOnVaults,
        args.command,
        flags,
        iterator,
      ),
    (error) =>
      commandVaultCallback(error, taskExecutedOnVaults, flags, callback),
  )
}

export default {
  action,
  commandVaultIterator,
  commandVaultCallback,
}
