import { expect } from 'chai'
import proxyquire from 'proxyquire'
import sinon from 'sinon'

import { UninstallCommandIterator } from '../types/commands'
import { plugin1, plugin2 } from '../utils/fixtures/plugins'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../utils/testing'
import { ConfigSchema } from './config'
import installService from './install'

const { installVaultIterator } = installService

const sandbox = sinon.createSandbox()
const removePluginDirStub = sandbox.stub().resolves()
const {
  default: { uninstallVaultIterator },
} = proxyquire.noCallThru()('./uninstall', {
  '../providers/plugins': { removePluginDir: removePluginDirStub },
})

const [{ id: plugin1Id }, { id: plugin2Id }] = [plugin1, plugin2]

describe('Command: uninstall', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('should perform uninstallation successfully', async () => {
    const { config, vault } = setupVault(
      ConfigSchema.parse({ plugins: [plugin1] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const plugins = [{ id: plugin1Id }]

    const installResult = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
    })

    expect(installResult.installedPlugins[0].id).to.be.equal(
      config?.plugins[0].id,
    )

    const result = await (uninstallVaultIterator as UninstallCommandIterator)({
      vault,
      config: {
        ...config,
        plugins,
      },
      flags: {
        ...testCommonWithVaultPathFlags,
      },
    })

    expect(result.uninstalledPlugins.some(({ id }) => id === plugin1Id)).to.be
      .true
    expect(result.failedPlugins.length).to.equal(0)

    destroyVault(vault.path)
  })

  it('should fail when plugin not found', async () => {
    const pluginId = 'nonExistentPluginId'

    const { vault, config } = setupVault(
      ConfigSchema.parse({ plugins: [{ id: pluginId }] }),
    )

    const result = await (uninstallVaultIterator as UninstallCommandIterator)({
      vault,
      config,
      flags: getTestCommonWithVaultPathFlags(config.path, vault.path),
    })

    expect(result.uninstalledPlugins.length).to.equal(0)
    expect(result.failedPlugins.some(({ id }) => id === pluginId)).to.be.true

    destroyVault(vault.path)
  })

  it('should uninstall only the specified plugin', async () => {
    const plugins = [plugin1, plugin2]
    const { config, vault } = setupVault(ConfigSchema.parse({ plugins }))

    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    const installResult = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
    })

    expect(installResult.installedPlugins[0].id).to.be.equal(
      config?.plugins[0].id,
    )
    expect(installResult.installedPlugins[1].id).to.be.equal(
      config?.plugins[1].id,
    )

    const result = await (uninstallVaultIterator as UninstallCommandIterator)({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
      },
      args: { pluginId: plugin1Id },
    })

    expect(result.uninstalledPlugins.length).to.equal(1)
    expect(result.uninstalledPlugins.some(({ id }) => id === plugin1Id)).to.be
      .true
    expect(result.failedPlugins.length).to.equal(0)

    destroyVault(vault.path)
  })

  it('should count failed plugins when process encounter unhandled issue', async () => {
    const { vault, config } = setupVault(
      ConfigSchema.parse({ plugins: [plugin1, plugin2] }),
    )
    const testCommonWithVaultPathFlags = getTestCommonWithVaultPathFlags(
      config.path,
      vault.path,
    )

    // Only install plugin1 and leave plugin2 uninstalled to test the failure
    const installResult = await installVaultIterator({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
      args: {
        pluginId: plugin1Id,
      },
    })

    expect(installResult.installedPlugins[0].id).to.be.equal(
      config?.plugins[0].id,
    )

    removePluginDirStub.rejects(new Error('Error'))

    const result = await (uninstallVaultIterator as UninstallCommandIterator)({
      vault,
      config,
      flags: {
        ...testCommonWithVaultPathFlags,
      },
    })

    expect(removePluginDirStub.called).to.be.true
    expect(result.uninstalledPlugins.length).to.equal(0)
    expect(result.failedPlugins.length).to.equal(2)
    expect(result.failedPlugins.some((plugin) => plugin.id === plugin1Id)).to.be
      .true
    expect(result.failedPlugins.some((plugin) => plugin.id === plugin2Id)).to.be
      .true

    destroyVault(vault.path)
  })
})
