import { readFile, writeFile } from 'fs/promises'
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

export const safeLoadConfig = async (
  configPath: string,
): Promise<SafeLoadConfigResult> => {
  try {
    const config = await readFile(configPath)
    const { success, data, error } = stringToJSONSchema
      .pipe(ConfigSchema)
      .safeParse(config.toString())

    if (!success) {
      logger.debug('Schema validation failed', { error })

      return {
        success,
        data,
        error: new Error('Invalid config file'),
      }
    }

    return { success, data, error: undefined }
  } catch (error) {
    const typedError = error as Error
    if (typedError.message.includes('ENOENT')) {
      return {
        success: false,
        data: undefined,
        error: new Error('Config file not found'),
      }
    }

    return { success: false, data: undefined, error: typedError }
  }
}

export const loadConfig = async (configPath: string) => {
  const {
    success: loadConfigSuccess,
    data: config,
    error: loadConfigError,
  } = await safeLoadConfig(configPath)

  if (!loadConfigSuccess) {
    logger.error('Failed to load config', { error: loadConfigError })
    process.exit(1)
  }

  return config
}

export const writeConfig = async (
  config: Config,
  path: string,
): Promise<void> => {
  logger.debug('Writing config', { path })

  const content = JSON.stringify(config, null, 2)

  await writeFile(path, content)

  logger.debug('Config written', { path })
}

export const createDefaultConfig = async (
  path: string,
  opts?: Config,
): Promise<Config> => {
  const defaultConfig = opts ?? ConfigSchema.parse({})

  await writeConfig(defaultConfig, path)

  logger.info('Config file created', { path })

  return defaultConfig
}
