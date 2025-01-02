import { expect } from 'chai'
import { plugin1, plugin2 } from '../utils/fixtures/plugins'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../utils/testing'
import { ConfigSchema } from './config'
import installService from './install'
import uninstallService from './uninstall'

const { installVaultIterator } = installService
const { uninstallVaultIterator } = uninstallService

const [{ id: plugin1Id }] = [plugin1, plugin2]

describe('Command: uninstall', () => {
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
      specific: false,
    })

    expect(installResult.installedPlugins[0].id).to.be.equal(
      config?.plugins[0].id,
    )

    const result = await uninstallVaultIterator({
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

    const result = await uninstallVaultIterator({
      vault,
      config,
      flags: getTestCommonWithVaultPathFlags(config.path, vault.path),
    })

    expect(result.uninstalledPlugins.length).to.equal(0)
    expect(result.failedPlugins.some(({ id }) => id === pluginId)).to.be.true

    destroyVault(vault.path)
  })
})
