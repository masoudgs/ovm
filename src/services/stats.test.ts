import { expect } from 'chai'
import { after } from 'mocha'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import { plugin1 } from '../utils/fixtures/plugins'
import {
  createTmpVault,
  destroyConfigMockFile,
  destroyVault,
  testCommonWithVaultPathFlags,
  testVaultPath,
  tmpConfigFilePath,
} from '../utils/testing'
import { Config, ConfigSchema, createDefaultConfig } from './config'
import statsService from './stats'

import { setTimeout } from 'timers/promises'
import installService from './install'

const { installVaultIterator } = installService
const { statsVaultIterator } = statsService

describe('Command: stats', () => {
  beforeEach(() => {
    destroyConfigMockFile(tmpConfigFilePath)
    createDefaultConfig(tmpConfigFilePath) as Config
    createTmpVault(testVaultPath)
  })

  afterEach(() => {
    destroyConfigMockFile(tmpConfigFilePath)
  })

  after(() => {
    destroyVault(testVaultPath)
  })

  it('should display stats for vaults and 0 plugins', async () => {
    const vaults = await loadVaults(testVaultPath)
    const selectedVaults = await vaultsSelector(vaults)
    const installedPlugins = {}
    const result = await statsVaultIterator(
      selectedVaults[0],
      ConfigSchema.parse({ plugins: [] }),
      installedPlugins,
    )

    expect(result.totalInstalledPlugins).to.be.equal(0)
    expect(Object.keys(installedPlugins).length).to.be.equal(0)
  })

  it('should display stats for vaults and 1 plugin', async () => {
    const vaults = await loadVaults(testVaultPath)
    const selectedVaults = await vaultsSelector(vaults)

    await installVaultIterator(
      selectedVaults[0],
      ConfigSchema.parse({ plugins: [plugin1] }),
      { ...testCommonWithVaultPathFlags, enable: true },
    )

    await setTimeout(1000)

    const installedPlugins = {}

    const result = await statsVaultIterator(
      selectedVaults[0],
      ConfigSchema.parse({ plugins: [plugin1] }),
      installedPlugins,
    )

    console.log('installedPlugins', installedPlugins)
    expect(result.totalInstalledPlugins).to.be.equal(1)

    for (const key in installedPlugins) {
      expect(key).to.match(new RegExp(`${plugin1.id}@${plugin1.version}`))
    }
  })
})
