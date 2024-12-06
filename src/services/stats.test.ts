import { expect } from 'chai'
import {
  createTmpVault,
  destroyConfigMockFile,
  testVaultPath,
  tmpConfigFilePath,
} from '../utils/testing'
import { Config, createDefaultConfig } from './config'
import { action } from './stats'

describe('Command: stats', () => {
  let config: Config | null = null
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
    config = createDefaultConfig(tmpConfigFilePath) as Config
    await createTmpVault(testVaultPath)
  })

  afterEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
  })

  it('should display stats for vaults and plugins', async () => {
    await action(
      {},
      {
        config: tmpConfigFilePath,
        debug: false,
        timestamp: false,
        path: testVaultPath,
        output: 'json',
      },
      (iterated) => {
        expect(iterated).to.not.be.undefined
      },
      (result) => {
        expect(result).to.have.property('totalStats')
        expect(result).to.have.property('installedPlugins')
        expect(result.totalStats?.totalVaults).to.be.equal(1)
        expect(result.totalStats?.totalPlugins).to.be.equal(
          config?.plugins.length,
        )
      },
    )
  })
})
