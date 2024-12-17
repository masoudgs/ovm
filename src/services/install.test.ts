import { expect } from 'chai'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import { plugin5 } from '../utils/fixtures/plugins'
import {
  createTmpVault,
  destroyConfigMockFile,
  destroyVault,
  setupFetchMockForGithubObsidianPlugins,
  testCommonWithVaultPathFlags,
  testVaultPath,
  tmpConfigFilePath,
} from '../utils/testing'
import {
  Config,
  ConfigSchema,
  createDefaultConfig,
  safeLoadConfig,
} from './config'
import installService from './install'

const { installVaultIterator } = installService

describe('Command: install', () => {
  before(() => {
    destroyVault(testVaultPath)
  })

  beforeEach(async () => {
    destroyConfigMockFile(tmpConfigFilePath)
    setupFetchMockForGithubObsidianPlugins([plugin5])
  })

  it('should perform installation successfully', async () => {
    await createTmpVault(testVaultPath)

    createDefaultConfig(
      tmpConfigFilePath,
      ConfigSchema.parse({ plugins: [plugin5] }),
    )

    const vaults = await loadVaults(testVaultPath)
    const selectedVaults = await vaultsSelector(vaults)
    const { data: config } = await safeLoadConfig(tmpConfigFilePath)

    for (const vault of selectedVaults) {
      if (config) {
        const result = await installVaultIterator(
          vault,
          config as Config,
          { ...testCommonWithVaultPathFlags, enable: true },
          false,
        )
        expect(result.installedPlugins[0].id).to.be.equal(config?.plugins[0].id)
        expect(result.failedPlugins.length).to.equal(0)
        expect(result.reinstallPlugins.length).to.equal(0)
      }
    }
  })

  it('should throw PluginNotFoundInRegistryError when plugin is not found based on testing installVaultIterator', async () => {
    await createTmpVault(testVaultPath)

    const vaults = await loadVaults(testVaultPath)
    const selectedVaults = await vaultsSelector(vaults)

    const pluginId = 'nonExistentPluginId'

    const result = await installVaultIterator(
      selectedVaults[0],
      ConfigSchema.parse({ plugins: [{ id: pluginId }] }),
      { ...testCommonWithVaultPathFlags, enable: true, path: testVaultPath },
      false,
    )

    expect(result.installedPlugins.length).to.equal(0)
    expect(result.failedPlugins.length).to.equal(1)
    expect(result.failedPlugins[0].id).to.equal(pluginId)
  })
})
