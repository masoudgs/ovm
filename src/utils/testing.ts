import { existsSync } from 'fs'
import fse from 'fs-extra'
import fsp from 'fs/promises'
import nock from 'nock'
import { platform, tmpdir } from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import { StagedPlugins } from '../types/commands'
import { OVM_CONFIG_FILENAME } from './constants'
export const getTmpConfigFilePath = () => {
  if (platform() === 'win32') {
    return path.win32.join(tmpdir(), OVM_CONFIG_FILENAME)
  }

  return path.join(tmpdir(), OVM_CONFIG_FILENAME)
}

export const destroyConfigMockFile = (path: string) => {
  const normalizedPath = path.normalize('NFC')

  if (normalizedPath && existsSync(normalizedPath)) {
    fse.rmSync(normalizedPath, { force: true })
  }
}

export const createTmpVault = async (vaultPath: string) => {
  const normalizedPath = path.normalize(vaultPath)
  const obsidianDir = path.resolve(normalizedPath, '.obsidian')
  if (normalizedPath && !existsSync(normalizedPath)) {
    fse.mkdirpSync(obsidianDir)
  }

  const normalizedVaultCommunityPluginsPath = path.resolve(
    obsidianDir,
    'community-plugins.json',
  )

  if (!fse.pathExistsSync(normalizedVaultCommunityPluginsPath)) {
    await fse.writeFile(
      pathToFileURL(normalizedVaultCommunityPluginsPath),
      JSON.stringify([]),
    )
  }

  return normalizedPath
}

export const tmpConfigFilePath = getTmpConfigFilePath()
export const testVaultName = 'test'
export const testVaultPath = `${tmpdir()}/${testVaultName}`
export const testCommonFlags = {
  debug: false,
  timestamp: false,
  config: tmpConfigFilePath,
}
export const testCommonWithVaultPathFlags = {
  debug: false,
  timestamp: false,
  config: tmpConfigFilePath,
  path: testVaultPath,
}

export const destroyVault = (vaultPath: string) => {
  const normalizedPath = path.normalize(vaultPath)

  if (normalizedPath && existsSync(normalizedPath)) {
    fse.emptyDirSync(normalizedPath)
    fsp.readdir(normalizedPath, { recursive: true })
  }
}

export const setupFetchMockForGithubObsidianPlugins = (
  plugins: StagedPlugins & Array<{ id: string }>,
) => {
  nock(/raw\.githubusercontent\.com/)
    .get('/obsidianmd/obsidian-releases/master/community-plugins.json')
    .replyWithFile(
      200,
      path.join(__dirname, 'fixtures', 'community-plugins.json'),
    )

  return plugins
}
