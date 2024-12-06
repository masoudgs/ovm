import { flush } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import { FactoryCommand } from '../../providers/command'
import {
  Config,
  createDefaultConfig,
  safeLoadConfig,
} from '../../providers/config'
import {
  FactoryFlags,
  InitCommandCallback,
  InitFlags,
} from '../../types/commands'

/**
 * Init command configure an ovm.json config file in user's home dir.
 */
export default class Init extends FactoryCommand {
  static readonly aliases = ['ci', 'config init']
  static override readonly description = `Configure an ovm.json config file in user's home dir.`
  static override readonly examples = ['<%= config.bin %> <%= command.id %>']
  static override readonly flags = {
    ...this.commonFlags,
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Handles errors and ensures flushing of logs.
   */
  public async run() {
    try {
      const { args, flags } = await this.parse(Init)
      return action(args, this.flagsInterceptor(flags))
    } catch (error) {
      this.handleError(error)
    } finally {
      flush()
    }
  }
}

/**
 * Main action function for the Init command.
 * @param {ArgInput} args - The arguments passed to the command.
 * @param {FactoryFlags<InitFlags>} flags - The flags passed to the command.
 * @param {InitCommandCallback} callback - Error handling function.
 * @returns {Promise<void>}
 */
export const action = async (
  args: ArgInput,
  flags: FactoryFlags<InitFlags>,
  callback?: InitCommandCallback,
): Promise<Config | undefined> => {
  const { config: configPath } = flags
  const { data: config, error } = await safeLoadConfig(configPath)

  if (error && error.message === 'Config file not found') {
    const defaultConfig = createDefaultConfig(configPath)

    if (callback) {
      callback({
        success: true,
      })
    }
    return defaultConfig
  } else if (error) {
    if (callback) {
      callback({
        success: false,
        error,
      })
    }
  }

  return config
}
