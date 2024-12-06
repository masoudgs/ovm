import { expect } from 'chai'
import fs from 'fs'
import { destroyConfigMockFile, getTmpConfigFilePath } from '../utils/testing'
import { ConfigSchema, createDefaultConfig, safeLoadConfig } from './config'

const tmpConfigFilePath = getTmpConfigFilePath()

describe('Config', () => {
  beforeEach(() => {
    destroyConfigMockFile(tmpConfigFilePath)
  })
  it("should load config from user's home dir", async () => {
    const sampleDefaultConfig = ConfigSchema.parse({})
    createDefaultConfig(tmpConfigFilePath)
    const config = await safeLoadConfig(tmpConfigFilePath)

    expect(config.success).to.be.true.equal(true)
    expect(config.error).to.be.undefined.equal(undefined)
    expect(config.data).to.deep.equal(sampleDefaultConfig)
  })

  it("should throw an error if the config file doesn't exist", async () => {
    try {
      const { error } = await safeLoadConfig('non-existent-file')
      throw error
    } catch (error) {
      expect(error).to.be.an('error')
    }
  })

  it('should throw an error if the config file is not JSON', async () => {
    fs.writeFileSync(tmpConfigFilePath, 'invalid content')
    try {
      const { error } = await safeLoadConfig(tmpConfigFilePath)
      throw error
    } catch (error) {
      const typedError = error as Error
      expect(typedError.message).to.include('Invalid JSON format')
    }
  })

  it('should throw an error if the config file is invalid', async () => {
    createDefaultConfig(tmpConfigFilePath, {
      // @ts-expect-error To create an invalid config
      invalidKey: 'invalidValue',
    })

    const { error } = await safeLoadConfig(tmpConfigFilePath)
    expect(error?.message).to.include('Invalid config file')
  })
})
