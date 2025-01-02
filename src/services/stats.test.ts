import { expect } from 'chai'
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
    const { vault, config } = setupVault(ConfigSchema.parse({ plugins: [] }))
    const installedPlugins = {}
    const result = await statsVaultIterator({
      vault,
      config: ConfigSchema.parse({ plugins: [] }),
      flags: getTestCommonWithVaultPathFlags(config.path, vault.path),
    })

    expect(result.installedPlugins).to.be.equal(0)
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

    const installResult = await installVaultIterator({
      vault,
      config: {
        ...sampleConfig,
        plugins: [plugin1],
      },
      flags: {
        ...testCommonWithVaultPathFlags,
        enable: true,
      },
      args: {
        pluginId: plugin1.id,
      },
    })

    expect(installResult.installedPlugins[0].id).to.be.equal(plugin1.id)

    const installedPlugins = {}

    const result = await statsVaultIterator({
      vault,
      config: ConfigSchema.parse({ plugins: [plugin1] }),
      flags: getTestCommonWithVaultPathFlags(config.path, vault.path),
    })

    expect(result.installedPlugins).to.be.equal(1)

    for (const key in installedPlugins) {
      expect(key).to.match(new RegExp(`${plugin1.id}@${plugin1.version}`))
    }

    destroyVault(vault.path)
  })
})
