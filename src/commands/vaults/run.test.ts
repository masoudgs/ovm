import { expect } from 'chai'
import { tmpdir } from 'os'
import { createDefaultConfig } from '../../providers/config'
import {
  createTmpVault,
  destroyConfigMockFile,
  getTmpConfigFilePath,
} from '../../utils/testing'
import { action } from './run'

const tmpConfigFilePath = getTmpConfigFilePath()
const vaultPath = tmpdir() + '/test'

describe('Command: run', () => {
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
    await createDefaultConfig(tmpConfigFilePath)
    await createTmpVault(vaultPath)
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
          path: vaultPath,
          runFromVaultDirectoryAsWorkDir: false,
        },
      )
    } catch (error) {
      expect(error).to.not.be.null
    }
  })

  it('should echo path of vault by echo command and reserved placeholder {0}', async () => {
    await action(
      {
        command: "echo 'Path: {0}'",
      },
      {
        config: tmpConfigFilePath,
        debug: false,
        timestamp: false,
        path: vaultPath,
        runFromVaultDirectoryAsWorkDir: false,
      },
      async (result) => {
        const expected = `Path: ${vaultPath}`
        expect(result.toString().trim()).to.match(new RegExp(expected))
      },
    )
  })
})
