import { expect } from 'chai'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import { plugin1 } from '../utils/fixtures/plugins'
import { ConfigSchema } from './config'
import statsService from './stats'

import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../utils/testing'
import installService from './install'

const { installVaultIterator } = installService
const { statsVaultIterator } = statsService

describe('Command: stats', () => {
  it('should display stats for vaults and 0 plugins', async () => {
    const { vault } = setupVault(ConfigSchema.parse({ plugins: [] }))
    const vaults = await loadVaults(vault.path)
    const selectedVaults = await vaultsSelector(vaults)
    const installedPlugins = {}
    const result = await statsVaultIterator(
      selectedVaults[0],
      ConfigSchema.parse({ plugins: [] }),
      installedPlugins,
    )

    expect(result.totalInstalledPlugins).to.be.equal(0)
    expect(Object.keys(installedPlugins).length).to.be.equal(0)

    destroyVault(vault.path)
  })

  it('should display stats for vaults and 1 plugin', async () => {
    const sampleConfig = ConfigSchema.parse({ plugins: [] })
    const { vault, config } = setupVault(sampleConfig)
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )
    const vaults = await loadVaults(vault.path)
    const selectedVaults = await vaultsSelector(vaults)

    await installVaultIterator(
      selectedVaults[0],
      ConfigSchema.parse({ plugins: [plugin1] }),
      { ...testCommonWithVaultPathFlags, enable: true },
    )

    const installedPlugins = {}

    const result = await statsVaultIterator(
      selectedVaults[0],
      ConfigSchema.parse({ plugins: [plugin1] }),
      installedPlugins,
    )

    expect(result.totalInstalledPlugins).to.be.equal(1)

    for (const key in installedPlugins) {
      expect(key).to.match(new RegExp(`${plugin1.id}@${plugin1.version}`))
    }

    destroyVault(vault.path)
  })
})
