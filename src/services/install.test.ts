import { expect } from 'chai'
import proxyquire from 'proxyquire'
import sinon from 'sinon'
import {
  findPluginInRegistry,
  getPluginVersion,
  handleExceedRateLimitError,
} from '../providers/github'
import { InstallCommandIterator } from '../types/commands'
import { plugin5 } from '../utils/fixtures/plugins'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../utils/testing'
import { ConfigSchema } from './config'
import installService from './install'

const { installVaultIterator } = installService

const sandbox = sinon.createSandbox()

describe('Command: install', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('should perform installation successfully', async () => {
    const { vault, config } = await setupVault(
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
    const { vault, config } = await setupVault(
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
    const { vault, config } = await setupVault(
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

  it('should handle API rate limit error', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [plugin5] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const installPluginFromGithubStub = sandbox
      .stub()
      .rejects(new Error('API rate limit exceeded'))
    const {
      default: { installVaultIterator },
    } = proxyquire.noCallThru()('./install', {
      '../providers/github': {
        installPluginFromGithub: installPluginFromGithubStub,
        getPluginVersion,
        findPluginInRegistry,
      },
    })

    try {
      await (installVaultIterator as InstallCommandIterator)({
        vault,
        config,
        flags: {
          ...testCommonWithVaultPathFlags,
          enable: true,
        },
        args: { pluginId: plugin5.id },
      })
    } catch (error) {
      console.log('error', error)
      expect((error as Error).message).to.match(/API rate limit exceeded/)
    }

    destroyVault(vault.path)
  })

  it('should not handle any error as rate limit error', async () => {
    const { vault, config } = await setupVault(
      ConfigSchema.parse({ plugins: [plugin5] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const findPluginInRegistryStub = sandbox
      .stub()
      .rejects(new Error('Some error'))
    const {
      default: { installVaultIterator },
    } = proxyquire.noCallThru()('./install', {
      '../providers/github': {
        getPluginVersion,
        findPluginInRegistry: findPluginInRegistryStub,
        handleExceedRateLimitError,
      },
    })

    const result = await (installVaultIterator as InstallCommandIterator)({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
      args: { pluginId: plugin5.id },
    })

    expect(result.installedPlugins.length).to.equal(0)
    expect(result.failedPlugins.length).to.equal(1)
    expect(result.failedPlugins.some((plugin) => plugin.id === plugin5.id)).to
      .be.true

    destroyVault(vault.path)
  })
})
