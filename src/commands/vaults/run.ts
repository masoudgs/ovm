import { handle } from '@oclif/core'
import { each, eachSeries } from 'async'
import { formatDuration, intervalToDuration } from 'date-fns'
import { Vault } from 'obsidian-utils'
import {
  asyncExecCustomCommand,
  commandInterpolation
} from '../../providers/command'
import { safeLoadConfig } from '../../providers/config'
import { loadVaults, vaultsSelector } from '../../providers/vaults'
import {
  CommandArgs,
  CommandsExecutedOnVaults,
  CommandVault,
  ExecuteCustomCommandCallbackResult,
  FactoryFlagsWithVaults,
  RunFlags,
} from '../../types/commands'
import {
  CUSTOM_COMMAND_LOGGER_FILE,
  customCommandLogger,
  logger,
} from '../../utils/logger'

export const action = async (
  args: CommandArgs,
  flags: FactoryFlagsWithVaults<RunFlags>,
  iterator?: (_result: string | Error) => void,
  callback?: (_result: ExecuteCustomCommandCallbackResult | null) => void,
) => {
  const { path, output } = flags
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

  const vaults = await loadVaults(path)
  const selectedVaults = await vaultsSelector(vaults)
  const vaultsWithCommand = selectedVaults.map((vault: Vault) => ({
    vault,
    command: commandInterpolation(vault, args.command),
  }))

  const taskExecutedOnVaults: CommandsExecutedOnVaults = {}

  const commandVaultIterator = async (opts: CommandVault) => {
    const { vault, command } = opts

    logger.debug(`Execute command`, { vault, command })

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

      taskExecutedOnVaults[vault.name] = {
        success: null,
        duration: formattedDuration,
        error: null,
      }

      if (typeof result === 'string') {
        taskExecutedOnVaults[vault.name]['success'] = true
        customCommandLogger.info('Executed successfully', {
          result,
          vault,
          command,
        })
        if (!flags.silent) {
          logger.info(`Run command`, { vault, command })
          console.log(result)
        }

        if (iterator) {
          iterator(result)
        }
      } else {
        taskExecutedOnVaults[vault.name]['success'] = false
        customCommandLogger.error('Execution failed', {
          error: result.error,
          vault,
          command,
        })
        if (iterator) {
          iterator(result.error as Error)
        }
      }
    } catch (error) {
      taskExecutedOnVaults[vault.name]['error'] = JSON.stringify(error)
      customCommandLogger.error('Execution failed', {
        error: JSON.stringify(error),
        vault,
        command,
      })

      if (iterator) {
        iterator(error as Error)
      }
    }
  }

  const commandVaultCallback = (error: Error | null | undefined) => {
    if (error) {
      logger.debug('UnhandledException', {
        error: JSON.stringify(error),
        path,
      })
      handle(error)
      return error
    } else {
      const sortedTaskExecutedOnVaults = Object.entries(taskExecutedOnVaults)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .reduce<CommandsExecutedOnVaults>((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {})

      logger.info('Run operation finished!', {
        custom_commands_log_path: CUSTOM_COMMAND_LOGGER_FILE,
      })

      if (output === 'table') {
        console.table(sortedTaskExecutedOnVaults)
      } else if (output === 'json') {
        console.log(JSON.stringify(sortedTaskExecutedOnVaults, null, 2))
      }

      if (callback) {
        callback({
          sortedTaskExecutedOnVaults,
        })
      }
    }
  }
  customCommandLogger.debug('Running command on selected vaults...', {
    vaults: vaultsWithCommand.length,
  })

  if (flags.async) {
    return each(vaultsWithCommand, commandVaultIterator, commandVaultCallback)
  } else {
    return eachSeries(
      vaultsWithCommand,
      commandVaultIterator,
      commandVaultCallback,
    )
  }
}
