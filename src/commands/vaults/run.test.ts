import { expect } from 'chai'
import { createDefaultConfig } from '../../providers/config'
import {
  createTmpVault,
  destroyConfigMockFile,
  testVaultName,
  testVaultPath,
  tmpConfigFilePath,
} from '../../utils/testing'
import { action } from './run'

describe('Command: run', () => {
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
    await createDefaultConfig(tmpConfigFilePath)
    await createTmpVault(testVaultPath)
  })

  afterEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
  })

  it('should fail with invalid command', async () => {
    try {
      await action(
        {
          command: '',
        },
        {
          config: tmpConfigFilePath,
          debug: false,
          timestamp: false,
          path: testVaultPath,
          runFromVaultDirectoryAsWorkDir: false,
        },
      )
    } catch (error) {
      expect(error).to.not.be.undefined
    }
  })

  it('should echo path and name of vault by echo command and reserved placeholder {0} {1}', async () => {
    await action(
      {
        command: "echo 'Path: {0} {1}'",
      },
      {
        config: tmpConfigFilePath,
        debug: false,
        timestamp: false,
        path: testVaultPath,
        runFromVaultDirectoryAsWorkDir: false,
      },
      async (result) => {
        const expected = `Path: ${testVaultPath} ${testVaultName}`
        expect(result.toString().trim()).to.match(new RegExp(expected))
      },
    )
  })
})
