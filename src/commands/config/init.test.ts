import { expect } from 'chai'
import { safeLoadConfig } from '../../providers/config'
import {
  destroyConfigMockFile,
  getTmpConfigFilePath,
  testCommonFlags,
} from '../../utils/testing'
import { action } from './init'

const tmpConfigFilePath = getTmpConfigFilePath()

describe('Command: config init', () => {
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
  })

  afterEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
  })

  it('should create a config file', async () => {
    await action({}, testCommonFlags, (error) => {
      throw error
    })

    // Verify that the config file was created
    const result = await safeLoadConfig(tmpConfigFilePath)
    expect(result.success).to.be.true
    expect(result.error).to.be.undefined
  })

  it('should throw an error if the config file already exists', async () => {
    // First, create the config file
    await action({}, testCommonFlags, (error) => {
      throw error
    })

    // Attempt to create the config file again, expecting an error
    try {
      await action({}, testCommonFlags, (error) => {
        throw error
      })
    } catch (error) {
      const typedError = error as Error

      expect(typedError).to.be.an('error')
      expect(typedError.message).to.equal('File already exists!')
    }
  })
})
