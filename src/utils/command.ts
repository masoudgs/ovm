import { ExitPromptError } from '@inquirer/core'
import { handle } from '@oclif/core'
import { logger } from './logger'

export const handlerCommandError = (error: unknown) => {
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
