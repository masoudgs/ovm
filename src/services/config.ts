import { readFileSync, writeFileSync } from 'fs'
import { GitHubPluginVersion } from 'obsidian-utils'
import z from 'zod'
import { logger } from '../utils/logger'
import { stringToJSONSchema } from '../utils/transformer'

const PluginSchema = z.object({
  id: z.string(),
  version: z.custom<GitHubPluginVersion>().optional(),
  repo: z.string().optional(),
  name: z.string().optional(),
  author: z.string().optional(),
  description: z.string().optional(),
})

export type Plugin = z.infer<typeof PluginSchema>

export const ConfigSchema = z
  .object({
    plugins: z.array(PluginSchema).default([]),
  })
  .strict()

export type Config = z.infer<typeof ConfigSchema>

type SafeLoadConfigResultSuccess = {
  success: true
  data: Config
  error: undefined
}

type SafeLoadConfigResultError = {
  success: false
  data: undefined
  error: Error
}

type SafeLoadConfigResult =
  | ({
      success: boolean
    } & SafeLoadConfigResultSuccess)
  | SafeLoadConfigResultError

export const safeLoadConfig = (
  configPath: string,
): Promise<SafeLoadConfigResult> => {
  return new Promise((resolve) => {
    try {
      const config = readFileSync(configPath)
      const { success, data, error } = stringToJSONSchema
        .pipe(ConfigSchema)
        .safeParse(config.toString())

      if (!success) {
        logger.debug('Schema validation failed', { error })

        return resolve({
          success,
          data,
          error: new Error('Invalid config file'),
        })
      }

      return resolve({ success, data, error: undefined })
    } catch (error) {
      const typedError = error as Error
      if (typedError.message.includes('ENOENT')) {
        return resolve({
          success: false,
          data: undefined,
          error: new Error('Config file not found'),
        })
      }

      return resolve({ success: false, data: undefined, error: typedError })
    }
  })
}

export const writeConfig = (config: Config, path: string): void => {
  logger.debug('Writing config', { path })

  const content = JSON.stringify(config, null, 2)

  writeFileSync(path, content)

  logger.debug('Config written', { path })
}

export const createDefaultConfig = (path: string, opts?: Config): Config => {
  const defaultConfig = opts ?? ConfigSchema.parse({})

  writeConfig(defaultConfig, path)

  logger.info('Config file created', { path })

  return defaultConfig
}
