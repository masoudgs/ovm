import { existsSync, rmSync, writeFileSync } from 'fs'
import fse from 'fs-extra'
import { rm } from 'fs/promises'
import { platform, tmpdir } from 'os'
import path from 'path'
import { OVM_CONFIG_FILENAME } from './constants'

export const getTmpConfigFilePath = () => {
  if (platform() === 'win32') {
    return path.win32.join(tmpdir(), OVM_CONFIG_FILENAME)
  }

  return path.join(tmpdir(), OVM_CONFIG_FILENAME)
}

export const destroyConfigMockFile = async (path: string) => {
  const normalizedPath = path.normalize('NFC')

  if (normalizedPath && existsSync(normalizedPath)) {
    await rm(normalizedPath, { force: true })
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

  if (!existsSync(normalizedVaultCommunityPluginsPath)) {
    writeFileSync(normalizedVaultCommunityPluginsPath, JSON.stringify([]))
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

export const destroyVault = (vaultPath: string) => {
  const normalizedPath = path.normalize(vaultPath)

  if (normalizedPath && existsSync(normalizedPath)) {
    fse.emptyDirSync(normalizedPath)
    rmSync(normalizedPath, { recursive: true, force: true })
  }
}
