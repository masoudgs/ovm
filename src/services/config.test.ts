import { expect } from 'chai'
import fs from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { OVM_CONFIG_FILENAME } from '../utils/constants'
import { destroyVault, setupVault } from '../utils/testing'
import { ConfigSchema, safeLoadConfig } from './config'

describe('Config', () => {
  it('should load config from path', async () => {
    const sampleDefaultConfig = ConfigSchema.parse({ plugins: [] })
    const { vault, config } = await setupVault(sampleDefaultConfig)
    const loadedConfig = await safeLoadConfig(config.path)

    expect(loadedConfig.success).to.be.true.equal(true)
    expect(loadedConfig.error).to.be.undefined.equal(undefined)
    expect(loadedConfig.data).to.deep.equal(sampleDefaultConfig)

    destroyVault(vault.path)
  })

  it("should throw an error if the config file doesn't exist", async () => {
    try {
      const { error } = await safeLoadConfig('non-existent-file')
      throw error
    } catch (error) {
      expect((error as Error)?.message).to.include('Config file not found')
    }
  })

  it('should throw an error if the config file is not JSON', async () => {
    const vaultName = `ovm-test-vault-${Date.now()}`
    const vaultPath = path.join(tmpdir(), vaultName)
    const configFilePath = path.join(vaultPath, OVM_CONFIG_FILENAME)

    fs.mkdirSync(vaultPath)
    fs.writeFileSync(configFilePath, 'invalid content')

    try {
      const { error } = await safeLoadConfig(configFilePath)
      throw error
    } catch (error) {
      const typedError = error as Error
      expect(typedError.message).to.include('Invalid JSON format')
    }

    destroyVault(vaultPath)
  })

  it('should throw an error if the config file is invalid', async () => {
    const { vault, config } = await setupVault({
      // @ts-expect-error To create an invalid config
      invalidKey: 'invalidValue',
    })

    const { error } = await safeLoadConfig(config.path)
    expect(error?.message).to.include('Invalid config file')

    destroyVault(vault.path)
  })
})
