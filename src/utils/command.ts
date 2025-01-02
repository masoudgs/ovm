import { ExitPromptError } from '@inquirer/core'
import { handle } from '@oclif/core'
import { CommonFlags } from '../types/commands'
import { enableDebugLogLevel, enableLoggingTimestamp, logger } from './logger'

export const flagsInterceptor = <T extends CommonFlags>(flags: T): T => {
  const { debug, timestamp } = flags

  enableLoggingTimestamp(timestamp)
  enableDebugLogLevel(debug, flags)

  return flags
}

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
