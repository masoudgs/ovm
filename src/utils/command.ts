import { ExitPromptError } from '@inquirer/core'
import { handle } from '@oclif/core'
import { logger } from './logger'

export const handlerCommandError = (error: unknown) => {
  if (process.env.CI || process.env.CI === 'true') {
    throw error
  }

  if (error instanceof ExitPromptError === true) {
    logger.debug('Exit prompt error:', { error })
  } else {
    logger.debug('An error occurred while installation:', { error })
    return handle(error as Error)
  }
}
