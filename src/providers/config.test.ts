import { expect } from 'chai'
import { destroyConfigMockFile, getTmpConfigFilePath } from '../utils/testing'
import { ConfigSchema, createDefaultConfig, safeLoadConfig } from './config'

const tmpConfigFilePath = getTmpConfigFilePath()

describe('Config', () => {
  beforeEach(() => {
    destroyConfigMockFile(tmpConfigFilePath)
  })
  it("should load config from user's home dir", async () => {
    const sampleDefaultConfig = ConfigSchema.parse({})
    await createDefaultConfig(tmpConfigFilePath)
    const config = await safeLoadConfig(tmpConfigFilePath)

    expect(config.success).to.be.true.equal(true)
    expect(config.error).to.be.undefined.equal(undefined)
    expect(config.data).to.deep.equal(sampleDefaultConfig)
  })

  it('should throw an error if the config file is invalid', async () => {
    try {
      const { error } = await safeLoadConfig('non-existent-file')
      throw error
    } catch (error) {
      expect(error).to.be.an('error')
    }
  })
})
