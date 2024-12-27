import { expect } from 'chai'
import { modifyCommunityPlugins } from '../providers/plugins'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import { plugin3, plugin4 } from '../utils/fixtures/plugins'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../utils/testing'
import { Config, ConfigSchema, safeLoadConfig } from './config'
import installService from './install'
import pruneService from './prune'

const { installVaultIterator } = installService
const { pruneVaultIterator } = pruneService

const [{ id: plugin3Id }] = [plugin3, plugin4]

describe('Command: prune', () => {
  it('should prune plugins successfully', async () => {
    const { vault, config } = setupVault(
      ConfigSchema.parse({ plugins: [plugin3, plugin4] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const vaults = await loadVaults(vault.path)
    const selectedVaults = await vaultsSelector(vaults)
    const { data: loadedConfig } = await safeLoadConfig(config.path)

    const installResult = await installVaultIterator(
      selectedVaults[0],
      loadedConfig as Config,
      { ...testCommonWithVaultPathFlags, enable: true },
      false,
    )

    expect(installResult.installedPlugins[0].id).to.be.equal(
      loadedConfig?.plugins[0].id,
    )

    await modifyCommunityPlugins({ id: plugin3Id }, vault.path, 'disable')

    const { prunedPlugins } = await pruneVaultIterator(selectedVaults[0], {
      ...config,
      plugins: [plugin4],
    })

    expect(prunedPlugins).to.have.lengthOf(1)
    expect(prunedPlugins?.some(({ id }) => plugin3Id === id)).to.be.true
    destroyVault(vault.path)
  }).timeout(6000)

  it('should prune only if plugins directory exists', async () => {
    const { vault, config } = setupVault(
      ConfigSchema.parse({ plugins: [plugin3] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const result = await pruneVaultIterator(
      { ...testCommonWithVaultPathFlags, path: vault.path, name: vault.name },
      { plugins: [plugin3] },
    )

    expect(result.prunedPlugins).to.have.lengthOf(0)
    destroyVault(vault.path)
  })
})
