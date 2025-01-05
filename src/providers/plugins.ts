import { checkbox } from '@inquirer/prompts'
import { access, constants, readFile, rm, writeFile } from 'fs/promises'
import { vaultPathToPluginsPath } from 'obsidian-utils'
import { Plugin } from '../services/config'
import { logger } from '../utils/logger'

export const removePluginDir = async (pluginId: string, vaultPath: string) => {
  const pluginsPath = vaultPathToPluginsPath(vaultPath)
  const pluginDir = `${pluginsPath}/${pluginId}`
  const childLogger = logger.child({ pluginsPath, pluginId })

  childLogger.debug(`Remove plugin`)

  await rm(pluginDir, { recursive: true, force: true })
  await modifyCommunityPlugins({ id: pluginId }, vaultPath, 'disable')

  childLogger.debug(`Removed plugin`)
}

export const listInstalledPlugins = async (vaultPath: string) => {
  const pluginPath = vaultPathToPluginsPath(vaultPath)

  try {
    await access(pluginPath, constants.R_OK)
    const plugins = JSON.parse(
      (await readFile(pluginPath)).toString(),
    ) as string[]
    return plugins.map((plugin) => ({ id: plugin }))
  } catch (error) {
    logger.error('Error listing installed plugins', { error })
    return []
  }
}

export const pluginsSelector = async (plugins: Plugin[]) => {
  const choices = plugins
    .map((plugin) => ({
      name: plugin.id,
      value: plugin,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const selectedPlugins = await checkbox({
    choices,
    message: 'Select the plugins:',
    validate: (selected) =>
      selected.length > 0 || 'At least one plugin must be selected',
    required: true,
  })

  logger.debug('selectedPlugins', { selectedPlugins })

  return selectedPlugins
}

export const modifyCommunityPlugins = async (
  plugin: Plugin,
  vaultPath: string,
  action: 'enable' | 'disable' = 'enable',
) => {
  const childLogger = logger.child({ plugin, vaultPath, action })

  childLogger.debug(`Modify community plugins json`)

  const communityPluginsDir = `${vaultPath}/.obsidian/community-plugins.json`

  try {
    await access(communityPluginsDir, constants.W_OK)
  } catch (error) {
    const typedError = error as Error & { code: string }

    if (typedError.code === 'ENOENT') {
      const emptyPlugins: string[] = []
      const content = JSON.stringify(emptyPlugins)

      await writeFile(communityPluginsDir, content)

      return emptyPlugins
    } else if (typedError.code === 'EACCES') {
      throw typedError
    } else {
      throw typedError
    }
  }

  const content = await readFile(communityPluginsDir)
  let plugins = JSON.parse(content.toString()) as string[]

  // By default, enable the plugin
  if (action === 'disable') {
    plugins = plugins.filter((p) => p !== plugin.id)
  } else {
    plugins.push(plugin.id)
  }

  await writeFile(communityPluginsDir, JSON.stringify(plugins, null, 2))

  childLogger.debug(`Modify action performed`)

  return plugins
}

export const deduplicatePlugins = (plugins: Plugin[], stagePlugin: Plugin) => {
  return plugins.filter((plugin) => plugin.id !== stagePlugin.id)
}
