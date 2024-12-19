import { expect } from 'chai'
import { after } from 'mocha'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import {
  createTmpVault,
  destroyConfigMockFile,
  destroyVault,
  testVaultName,
  testVaultPath,
  tmpConfigFilePath,
} from '../utils/testing'
import { createDefaultConfig } from './config'
import runService from './run'

const { commandVaultIterator } = runService

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

  const executedTasks = {}

  it('should fail with invalid command', async () => {
    const vaults = await loadVaults(testVaultPath)
    const selectedVaults = await vaultsSelector(vaults)
    const result = await commandVaultIterator(
      selectedVaults[0],
      executedTasks,
      '',
      {
        config: tmpConfigFilePath,
        debug: false,
        timestamp: false,
        path: testVaultPath,
        runFromVaultDirectoryAsWorkDir: false,
      },
    )

    expect(result.success).to.be.false
    expect(result.error).to.be.instanceOf(Error)
  })

  it('should echo path and name of vault by echo command and reserved placeholder {0} {1}', async () => {
    const vaults = await loadVaults(testVaultPath)
    const selectedVaults = await vaultsSelector(vaults)
    const result = await commandVaultIterator(
      selectedVaults[0],
      executedTasks,
      "echo 'Path: {0} {1}'",
      {
        config: tmpConfigFilePath,
        debug: false,
        timestamp: false,
        path: testVaultPath,
        runFromVaultDirectoryAsWorkDir: false,
      },
    )

    expect(result.success).to.be.true

    const expected = `Path: ${testVaultPath} ${testVaultName}`
    expect(result.stdout?.toString().trim()).to.match(new RegExp(expected))
  })

  it('should echo path and name of vault by echo command and reserved placeholder {0} {1} and not {10000}', async () => {
    const vaults = await loadVaults(testVaultPath)
    const selectedVaults = await vaultsSelector(vaults)
    const result = await commandVaultIterator(
      selectedVaults[0],
      executedTasks,
      "echo 'Path: {0} {1} {10000}'",
      {
        config: tmpConfigFilePath,
        debug: false,
        timestamp: false,
        path: testVaultPath,
        runFromVaultDirectoryAsWorkDir: false,
      },
    )

    expect(result.success).to.be.true

    const expected = `Path: ${testVaultPath} ${testVaultName} {10000}`
    expect(result.stdout?.toString().trim()).to.not.match(new RegExp(expected))
  })
})
