import { Args, Flags, flush, handle } from '@oclif/core'
import { each, eachSeries, ErrorCallback } from 'async'
import { formatDuration, intervalToDuration } from 'date-fns'
import { Vault } from 'obsidian-utils'
import {
  asyncExecCustomCommand,
  commandInterpolation,
  FactoryCommandWithVaults,
} from '../../providers/command'
import { safeLoadConfig } from '../../providers/config'
import { loadVaults, vaultsSelector } from '../../providers/vaults'
import {
  CommandArgs,
  CommandsExecutedOnVaults,
  CommandVault,
  ExecuteCustomCommandResult,
  FactoryFlagsWithVaults,
  RunFlags,
} from '../../types/commands'
import {
  CUSTOM_COMMAND_LOGGER_FILE,
  customCommandLogger,
  logger,
} from '../../utils/logger'
import { isTestEnv } from '../../utils/testing'

export const action = async (
  args: CommandArgs,
  flags: FactoryFlagsWithVaults<RunFlags>,
  iterator?: (result: string | ExecuteCustomCommandResult) => Promise<void>,
  errorCallback?: ErrorCallback<Error>,
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
        if (errorCallback) {
          errorCallback(result.error as Error)
        }
      }
    } catch (error) {
      taskExecutedOnVaults[vault.name]['error'] = JSON.stringify(error)
      customCommandLogger.error('Execution failed', {
        error: JSON.stringify(error),
        vault,
        command,
      })

      if (errorCallback) {
        errorCallback(error as Error)
      }
    }
  }

  const commandVaultErrorCallback: ErrorCallback<Error> = (
    error: Error | null | undefined,
  ) => {
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
    }
  }
  customCommandLogger.debug('Running command on selected vaults...', {
    vaults: vaultsWithCommand.length,
  })

  if (flags.async) {
    return each(
      vaultsWithCommand,
      commandVaultIterator,
      commandVaultErrorCallback,
    )
  } else {
    return eachSeries(
      vaultsWithCommand,
      commandVaultIterator,
      commandVaultErrorCallback,
    )
  }
}

export default class Run extends FactoryCommandWithVaults {
  static readonly aliases = ['r', 'run', 'vr', 'vaults run']
  static override readonly description = `Run a shell command on selected vaults (using Node.js child_process).\nDisclaimer: Any input containing shell metacharacters may be used to trigger arbitrary command execution, using of this command is at risk of command's caller.`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian --output=json',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian --output=json --unescape=false',
    '<%= config.bin %> <%= command.id %> --output=json --async=false',
    '<%= config.bin %> <%= command.id %> --output=json --silent=true',
    '<%= config.bin %> <%= command.id %> --output=json --runFromVaultDirectoryAsWorkDir=false',
  ]
  static override readonly flags = {
    output: Flags.string({
      char: 'o',
      description: 'Display the output with a specific transformer.',
      default: 'table',
      options: ['table', 'json'],
    }),
    unescape: Flags.boolean({
      char: 'u',
      description:
        'Unescape special characters in a command to run as a single command.',
      default: true,
    }),
    async: Flags.boolean({
      char: 'a',
      description: 'Run the command in parallel on the vault(s).',
      default: true,
    }),
    silent: Flags.boolean({
      char: 's',
      description: 'Silent on results of the custom command on vault(s).',
      default: false,
    }),
    runFromVaultDirectoryAsWorkDir: Flags.boolean({
      char: 'r',
      description: 'Run the command from the vault directory as working dir.',
      default: true,
    }),
    ...this.commonFlagsWithPath,
  }

  static override readonly args = {
    command: Args.string({
      description:
        'Command to run and use specified vaults with each execution.',
      required: true,
    }),
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Handles errors and ensures flushing of logs.
   */
  public async run() {
    try {
      const { args, flags } = await this.parse(Run)
      return await this.action(args, this.flagsInterceptor(flags))
    } catch (error) {
      if (isTestEnv()) {
        throw error
      } else {
        this.handleError(error)
      }
    } finally {
      flush()
    }
  }

  /**
   * Main action method for the command.
   * Loads vaults, selects vaults, and gets stats about number of vaults and installed plugins per vault.
   * @param {ArgInput} args - The arguments passed to the command.
   * @param {FactoryFlagsWithVaults<RunFlags>} flags - The flags passed to the command.
   * @returns {Promise<void>}
   */
  private async action(
    args: CommandArgs,
    flags: FactoryFlagsWithVaults<RunFlags>,
  ): Promise<void> {
    await action(args, flags)
  }
}
