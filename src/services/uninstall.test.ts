import { expect } from 'chai'
import { afterEach } from 'mocha'
import { setTimeout } from 'timers/promises'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import { plugin1, plugin2 } from '../utils/fixtures/plugins'
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
  Plugin,
  safeLoadConfig,
} from './config'
import installService from './install'
import uninstallService from './uninstall'

const { installVaultIterator } = installService
const { uninstallVaultIterator } = uninstallService

const [{ id: plugin1Id }] = setupFetchMockForGithubObsidianPlugins([
  plugin1,
  plugin2,
])

describe('Command: uninstall', () => {
  afterEach(() => {
    destroyConfigMockFile(tmpConfigFilePath)
    destroyVault(testVaultPath)
  })

  it('should perform uninstallation successfully', async () => {
    await createTmpVault(testVaultPath)
    createDefaultConfig(
      tmpConfigFilePath,
      ConfigSchema.parse({ plugins: [plugin1] }),
    )

    const vaults = await loadVaults(testVaultPath)
    const selectedVaults = await vaultsSelector(vaults)
    const { data: config } = await safeLoadConfig(tmpConfigFilePath)
    const plugins = [{ id: plugin1Id }]

    for (const vault of selectedVaults) {
      const installResult = await installVaultIterator(
        vault,
        config as Config,
        { ...testCommonWithVaultPathFlags, enable: true },
        false,
      )

      expect(installResult.installedPlugins[0].id).to.be.equal(
        config?.plugins[0].id,
      )

      const result = await uninstallVaultIterator(vault, plugins)

      expect(result.uninstalledPlugins.some(({ id }) => id === plugin1Id)).to.be
        .true
      expect(result.failedPlugins.length).to.equal(0)
    }
  })

  it('should fail when plugin not found', async () => {
    await createTmpVault(testVaultPath)
    const pluginId = 'nonExistentPluginId'
    createDefaultConfig(
      tmpConfigFilePath,
      ConfigSchema.parse({ plugins: [{ id: pluginId }] }),
    )

    const vaults = await loadVaults(testVaultPath)
    const [vault] = await vaultsSelector(vaults)
    const { data: config } = await safeLoadConfig(tmpConfigFilePath)
    await setTimeout(1000)

    const result = await uninstallVaultIterator(
      vault,
      config?.plugins as Plugin[],
    )

    expect(result.uninstalledPlugins.length).to.equal(0)
    expect(result.failedPlugins.some(({ id }) => id === pluginId)).to.be.true
  })
})
