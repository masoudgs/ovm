import { expect } from 'chai'
import { action } from '../commands/config/init'
import {
  destroyConfigMockFile,
  getTmpConfigFilePath,
  testCommonFlags,
} from '../utils/testing'
import { safeLoadConfig } from './config'

const tmpConfigFilePath = getTmpConfigFilePath()

describe('Command: config init', () => {
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
  })

  afterEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
  })

  it('should create a config file and fail for second attempt', async () => {
    await action({}, testCommonFlags, (result) => {
      expect(result.success).to.be.true
    })

    // Verify that the config file was created
    const result = await safeLoadConfig(tmpConfigFilePath)
    expect(result.success).to.be.true
    expect(result.error).to.be.undefined

    // Verify that the second attempt fails
    try {
      await action({}, testCommonFlags, (result) => {
        expect(result.success).to.be.false
      })
    } catch (error) {
      const typedError = error as Error
      expect(typedError.message).to.match(/File already exists!/)
    }
  })

  it.skip('should throw an error if opening config fail forbidden', async () => {})
})
