import { Command, Flags } from '@oclif/core'
import { ParserInput } from '@oclif/core/lib/interfaces/parser'
import { exec } from 'child_process'
import { Vault } from 'obsidian-utils'
import { homedir } from 'os'
import path from 'path'
import {
    ExecuteCustomCommandResult,
    FactoryFlags,
    FactoryFlagsWithVaults,
} from '../types/commands'
import { handlerCommandError } from '../utils/command'
import {
    OVM_CONFIG_FILENAME,
    RESERVED_VARIABLES,
    VAULTS_PATH_FLAG_DESCRIPTION,
} from '../utils/constants'
import { logger } from '../utils/logger'

const DEFAULT_CONFIG_PATH = path.join(homedir(), OVM_CONFIG_FILENAME)

const commonFlags = {
  debug: Flags.boolean({
    char: 'd',
    default: false,
    description: 'Enable debugging mode.',
  }),
  timestamp: Flags.boolean({
    char: 't',
    default: false,
    description: 'Enable timestamp in logs.',
  }),
  config: Flags.file({
    char: 'c',
    description: `Path to the config file.`,
    default: DEFAULT_CONFIG_PATH,
    required: false,
  }),
}

class FactoryCommand extends Command {
  static readonly commonFlags = commonFlags

  run(): Promise<unknown> {
    throw new Error('Method not implemented.')
  }

  public enableLoggingTimestamp(timestamp: boolean): void {
    process.env.OVM_ENABLE_LOG_TIMESTAMP = timestamp ? '0' : '1'
  }

  public enableDebugLogLevel(
    debug: boolean,
    flags: ParserInput['flags'],
  ): void {
    if (debug) {
      logger.level = 'debug'
      logger.debug(`Command called`, { flags })
    }
  }

  public flagsInterceptor<T>(flags: FactoryFlags<T>): FactoryFlags<T> {
    const { debug, timestamp } = flags

    this.enableLoggingTimestamp(timestamp)

    if (debug) {
      logger.level = 'debug'
      logger.debug(`Command called`, { flags })
    }

    return flags
  }

  public handleError(error: unknown) {
    handlerCommandError(error)
  }
}

class FactoryCommandWithVaults extends Command {
  static readonly commonFlagsWithPath = {
    ...FactoryCommand.commonFlags,
    path: Flags.string({
      char: 'p',
      description: VAULTS_PATH_FLAG_DESCRIPTION,
      default: '',
    }),
  }

  static readonly commonFlags = FactoryCommandWithVaults.commonFlagsWithPath

  run(): Promise<unknown> {
    throw new Error('Method not implemented.')
  }

  public enableLoggingTimestamp(timestamp: boolean): void {
    process.env.OVM_ENABLE_LOG_TIMESTAMP = timestamp ? '0' : '1'
  }

  public enableDebugLogLevel(
    debug: boolean,
    flags: ParserInput['flags'],
  ): void {
    if (debug) {
      logger.level = 'debug'
      logger.debug(`Command called`, { flags })
    }
  }

  public flagsInterceptor<T>(
    flags: FactoryFlagsWithVaults<T>,
  ): FactoryFlagsWithVaults<T> {
    const { debug, timestamp } = flags

    this.enableLoggingTimestamp(timestamp)
    this.enableDebugLogLevel(debug, flags as ParserInput['flags'])

    return flags
  }

  public handleError(error: unknown) {
    handlerCommandError(error)
  }
}

const commandInterpolation = (vault: Vault, command: string): string => {
  const variableRegex = /\{(\d*?)}/g
  const replacer = (match: string, variable: string) => {
    const variableFunction = RESERVED_VARIABLES[variable]

    if (variableFunction) {
      return variableFunction(vault)
    } else {
      return match
    }
  }
  const interpolatedCommand = command.replace(variableRegex, replacer)

  return interpolatedCommand
}

const asyncExecCustomCommand = async (
  command: string,
  runFromVaultDirectoryAsWorkDir: boolean,
  vault: Vault,
): Promise<Pick<ExecuteCustomCommandResult, 'error'> | string> => {
  return new Promise((resolve, reject) => {
    exec(
      command,
      { cwd: runFromVaultDirectoryAsWorkDir ? vault.path : __dirname },
      (error, stdout, stderr) => {
        if (error) {
          reject(error)
        }
        resolve(`${stderr}\n${stdout}`)
      },
    )
  })
}

export {
    asyncExecCustomCommand,
    commandInterpolation,
    FactoryCommand,
    FactoryCommandWithVaults
}

