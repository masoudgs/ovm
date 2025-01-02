import { expect } from 'chai'
import { plugin5 } from '../utils/fixtures/plugins'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../utils/testing'
import { ConfigSchema } from './config'
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

    const result = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
      args: { pluginId: plugin5.id },
    })

    expect(result.installedPlugins[0].id).to.be.equal(config?.plugins[0].id)
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

    const result = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
      args: { pluginId },
    })

    expect(result.installedPlugins.length).to.equal(0)
    expect(result.failedPlugins.length).to.equal(1)
    expect(result.failedPlugins[0].id).to.equal(pluginId)

    destroyVault(vault.path)
  })

  it('should not install plugin if it is already installed', async () => {
    const { vault, config } = setupVault(
      ConfigSchema.parse({ plugins: [plugin5] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const result = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
    })

    expect(result.installedPlugins.length).to.equal(1)
    expect(result.failedPlugins.length).to.equal(0)
    expect(result.reinstallPlugins.length).to.equal(0)

    const resultSecondAttempt = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
    })

    expect(resultSecondAttempt.installedPlugins.length).to.equal(0)
    expect(resultSecondAttempt.failedPlugins.length).to.equal(0)
    expect(resultSecondAttempt.reinstallPlugins[0].id).to.equal(plugin5.id)

    destroyVault(vault.path)
  })
})
