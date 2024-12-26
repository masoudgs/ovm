import { expect } from 'chai'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import { plugin5 } from '../utils/fixtures/plugins'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../utils/testing'
import { Config, ConfigSchema, safeLoadConfig } from './config'
import installService from './install'

const { installVaultIterator } = installService

describe('Command: install', () => {
  it('should perform installation successfully', async () => {
    const { vault, config } = setupVault(
      ConfigSchema.parse({ plugins: [plugin5] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const vaults = await loadVaults(vault.path)
    const selectedVaults = await vaultsSelector(vaults)
    const { data: loadedConfig } = await safeLoadConfig(config.path)

    const result = await installVaultIterator(
      selectedVaults[0],
      loadedConfig as Config,
      {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
    )

    expect(result.installedPlugins[0].id).to.be.equal(
      loadedConfig?.plugins[0].id,
    )
    expect(result.failedPlugins.length).to.equal(0)
    expect(result.reinstallPlugins.length).to.equal(0)

    destroyVault(vault.path)
  })

  it('should throw PluginNotFoundInRegistryError when plugin is not found based on testing installVaultIterator', async () => {
    const pluginId = 'nonExistentPluginId'
    const { vault, config } = setupVault(
      ConfigSchema.parse({ plugins: [{ id: pluginId }] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const vaults = await loadVaults(vault.path)
    const selectedVaults = await vaultsSelector(vaults)

    const result = await installVaultIterator(
      selectedVaults[0],
      ConfigSchema.parse({ plugins: [{ id: pluginId }] }),
      { ...testCommonWithVaultPathFlags, enable: true, path: vault.path },
    )

    expect(result.installedPlugins.length).to.equal(0)
    expect(result.failedPlugins.length).to.equal(1)
    expect(result.failedPlugins[0].id).to.equal(pluginId)

    destroyVault(vault.path)
  })
})
