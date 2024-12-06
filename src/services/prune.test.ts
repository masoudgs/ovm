import sinon from 'sinon'
import {
  createTmpVault,
  destroyConfigMockFile,
  destroyVault,
  testCommonFlags,
  testVaultPath,
  tmpConfigFilePath,
} from '../utils/testing'
import { createDefaultConfig } from './config'
import { action } from './prune'

describe('Command: prune', () => {
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
    await destroyVault(testVaultPath)
    createDefaultConfig(tmpConfigFilePath)
  })

  afterEach(async () => {
    sinon.restore()
  })

  it('should prune plugins successfully', async () => {
    await createTmpVault(testVaultPath)
    await action({}, { ...testCommonFlags, path: testVaultPath })
    // Add assertions to verify the plugins were pruned
  })

  it('should handle errors during pruning', async () => {
    await createTmpVault(testVaultPath)
    sinon.stub(process, 'exit')
    await action({}, { ...testCommonFlags, path: testVaultPath })
    // Add assertions to verify error handling
  })
})
