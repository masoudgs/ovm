import { Args, Flags, flush } from '@oclif/core'
import { FactoryCommandWithVaults } from '../../providers/command'
import { action } from '../../services/install'

/**
 * Install command installs specified plugins in vaults.
 */
export default class Install extends FactoryCommandWithVaults {
  static readonly aliases = ['pi', 'plugins install']
  static override readonly description = `Install plugin(s) in specified vaults.`
  static override readonly examples = [
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/*/.obsidian',
    '<%= config.bin %> <%= command.id %> --path=/path/to/vaults/**/.obsidian',
    '<%= config.bin %> <%= command.id %> id',
  ]
  static override readonly flags = {
    enable: Flags.boolean({
      char: 'e',
      description: 'Enable all chosen plugins',
      default: true,
    }),
    ...this.commonFlagsWithPath,
  }
  static override readonly args = {
    pluginId: Args.string({
      description: 'Specific Plugin ID to install',
      required: false,
    }),
  }

  /**
   * Executes the command.
   * Parses the arguments and flags, and calls the action method.
   * Loads vaults, selects vaults, and install specified plugins.
   * Handles errors and ensures flushing of logs.
   * @returns {Promise<void>}
   * @throws {Error} - Throws an error if the command fails.
   */
  public async run(): Promise<void> {
    try {
      const { args, flags } = await this.parse(Install)
      return action(args, this.flagsInterceptor(flags))
    } catch (error) {
      this.handleError(error)
      throw error
    } finally {
      flush()
    }
  }
}
