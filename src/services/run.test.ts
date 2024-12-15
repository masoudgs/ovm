import { expect } from 'chai'
import { after } from 'mocha'
import {
  createTmpVault,
  destroyConfigMockFile,
  destroyVault,
  testVaultName,
  testVaultPath,
  tmpConfigFilePath,
} from '../utils/testing'
import { createDefaultConfig } from './config'
import { action } from './run'

describe('Command: run', () => {
  beforeEach(() => {
    destroyConfigMockFile(tmpConfigFilePath)
    createDefaultConfig(tmpConfigFilePath)
    createTmpVault(testVaultPath)
  })

  afterEach(() => {
    destroyConfigMockFile(tmpConfigFilePath)
  })

  after(() => {
    destroyVault(testVaultPath)
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

  it('should echo path and name of vault by echo command and reserved placeholder {0} {1} and not {10000}', async () => {
    await action(
      {
        command: "echo 'Path: {0} {1} {10000}'",
      },
      {
        config: tmpConfigFilePath,
        debug: false,
        timestamp: false,
        path: testVaultPath,
        runFromVaultDirectoryAsWorkDir: false,
      },
      async (result) => {
        const expected = `Path: ${testVaultPath} ${testVaultName} {10000}`
        expect(result.toString().trim()).to.match(new RegExp(expected))
      },
    )
  })
})
