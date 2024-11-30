import { ExitPromptError } from '@inquirer/core'
import { Command, Flags, handle } from '@oclif/core'
import { ParserInput } from '@oclif/core/lib/interfaces/parser'
import { Vault } from 'obsidian-utils'
import { FactoryFlags, FactoryFlagsWithVaults } from '../types/commands'
import {
  DEFAULT_CONFIG_PATH,
  VAULTS_PATH_FLAG_DESCRIPTION,
} from '../utils/constants'
import { logger } from '../utils/logger'
import { findVaultsByPatternMatching, findVaultsFromConfig } from './vaults'

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

  /**
   * Loads vaults based on the specified path or from the configuration.
   * If a path is specified, it will find vaults by pattern matching.
   * If no path is specified, it will find vaults from the Obsidian configuration.
   * Throws an error if no vaults are found.
   *
   * @param path - The path to search for vaults.
   * @returns A promise that resolves to an array of Vault objects.
   * @throws An error if no vaults are found.
   */
  public async loadVaults(path: string): Promise<Vault[]> {
    const isPathSpecifiedAndValid = path && path.trim().length > 0
    let vaults: Vault[] = []

    if (isPathSpecifiedAndValid) {
      vaults = await findVaultsByPatternMatching(path)
    } else {
      vaults = await findVaultsFromConfig()
    }

    if (vaults.length === 0) {
      throw new Error(`No vaults found!`)
    }

    return vaults
  }

  public handleError(error: unknown) {
    if (process.env.CI) {
      throw error
    }
    if (error instanceof ExitPromptError) {
      logger.debug('Exit prompt error:', { error })
    } else if (error instanceof Error) {
      logger.debug('An error occurred while installation:', { error })
      handle(error)
    }
  }
}

class FactoryCommandWithVaults extends FactoryCommand {
  static readonly commonFlagsWithPath = {
    ...FactoryCommand.commonFlags,
    path: Flags.string({
      char: 'p',
      description: VAULTS_PATH_FLAG_DESCRIPTION,
      default: '',
    }),
  }

  public flagsInterceptor<T>(
    flags: FactoryFlagsWithVaults<T>,
  ): FactoryFlagsWithVaults<T> {
    const { debug, timestamp } = flags

    this.enableLoggingTimestamp(timestamp)
    this.enableDebugLogLevel(debug, flags as ParserInput['flags'])

    return flags
  }
}

export { FactoryCommand, FactoryCommandWithVaults }
