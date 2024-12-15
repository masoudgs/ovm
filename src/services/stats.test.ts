import { expect } from 'chai'
import { after } from 'mocha'
import {
  createTmpVault,
  destroyConfigMockFile,
  destroyVault,
  testVaultPath,
  tmpConfigFilePath,
} from '../utils/testing'
import { Config, createDefaultConfig } from './config'
import { action } from './stats'

describe('Command: stats', () => {
  let config: Config | null = null
  beforeEach(() => {
    destroyConfigMockFile(tmpConfigFilePath)
    config = createDefaultConfig(tmpConfigFilePath) as Config
    createTmpVault(testVaultPath)
  })

  afterEach(() => {
    destroyConfigMockFile(tmpConfigFilePath)
  })

  after(() => {
    destroyVault(testVaultPath)
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
