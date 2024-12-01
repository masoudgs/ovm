import { flush } from '@oclif/core'
import { ArgInput } from '@oclif/core/lib/parser'
import { FactoryCommand } from '../../providers/command'
import { createDefaultConfig, safeLoadConfig } from '../../providers/config'
import { FactoryFlags, InitFlags } from '../../types/commands'

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
      await action(
        args,
        this.flagsInterceptor(flags),
        this.handleError.bind(this),
      )
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
 * @param {(error: unknown) => void} handleError - Error handling function.
 * @returns {Promise<void>}
 */
export const action = async (
  args: ArgInput,
  flags: FactoryFlags<InitFlags>,
  handleError: (_error: Error | unknown) => void,
): Promise<void> => {
  try {
    const { data: config, error } = await safeLoadConfig(flags.config)

    if (config) {
      throw new Error('File already exists!')
    }

    if (error) {
      throw error
    }
  } catch (error) {
    const typedError = error as Error

    if (typedError.message === 'Config file not found') {
      try {
        await createDefaultConfig(flags.config)
      } catch (error) {
        handleError(error)
        throw error
      }

      return
    }

    handleError(typedError)

    throw typedError
  }
}
