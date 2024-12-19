import { expect } from 'chai'
import { afterEach } from 'mocha'
import { setTimeout } from 'timers/promises'
import { modifyCommunityPlugins } from '../providers/plugins'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import { plugin3, plugin4 } from '../utils/fixtures/plugins'
import {
  createTmpVault,
  destroyConfigMockFile,
  destroyVault,
  setupFetchMockForGithubObsidianPlugins,
  testCommonWithVaultPathFlags,
  testVaultName,
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
import { prunePluginsIterator } from './prune'

const { installVaultIterator } = installService

const [{ id: plugin3Id }] = setupFetchMockForGithubObsidianPlugins([
  plugin3,
  plugin4,
])

describe('Command: prune', () => {
  afterEach(() => {
    destroyVault(testVaultPath)
    destroyConfigMockFile(tmpConfigFilePath)
  })

  it('should prune plugins successfully', async () => {
    await createTmpVault(testVaultPath)

    createDefaultConfig(
      tmpConfigFilePath,
      ConfigSchema.parse({ plugins: [plugin3, plugin4] }),
    )

    const vaults = await loadVaults(testVaultPath)
    const selectedVaults = await vaultsSelector(vaults)
    const { data: config } = await safeLoadConfig(tmpConfigFilePath)

    for (const vault of selectedVaults) {
      if (config) {
        const installResult = await installVaultIterator(
          vault,
          config as Config,
          { ...testCommonWithVaultPathFlags, enable: true },
          false,
        )

        expect(installResult.installedPlugins[0].id).to.be.equal(
          config?.plugins[0].id,
        )

        await modifyCommunityPlugins(
          { id: plugin3Id },
          testVaultPath,
          'disable',
        )

        await setTimeout(100)

        const pruneResult = await prunePluginsIterator(vault, {
          ...config,
          plugins: [plugin4],
        })

        expect(pruneResult?.prunedPlugins).to.have.lengthOf(1)
        expect(pruneResult?.prunedPlugins?.some(({ id }) => plugin3Id === id))
          .to.be.true
      }
    }
  })

  it('should prune only if plugins directory exists', async () => {
    createTmpVault(testVaultPath)
    const result = await prunePluginsIterator(
      { path: testVaultPath, name: testVaultName },
      { plugins: [plugin3] },
    )

    expect(result.prunedPlugins).to.have.lengthOf(0)
  })
})
