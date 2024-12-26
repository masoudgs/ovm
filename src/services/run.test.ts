import { expect } from 'chai'
import { loadVaults, vaultsSelector } from '../providers/vaults'
import { destroyVault, setupVault } from '../utils/testing'
import runService from './run'

const { commandVaultIterator } = runService

describe('Command: run', () => {
  const executedTasks = {}

  it('should fail with invalid command', async () => {
    const { vault, config } = setupVault()
    const vaults = await loadVaults(vault.path)
    const selectedVaults = await vaultsSelector(vaults)
    const result = await commandVaultIterator(
      selectedVaults[0],
      executedTasks,
      '',
      {
        config: config.path,
        debug: false,
        timestamp: false,
        path: vault.path,
        runFromVaultDirectoryAsWorkDir: false,
      },
    )

    expect(result.success).to.be.false
    expect(result.error).to.be.instanceOf(Error)
    destroyVault(vault.path)
  })

  it('should echo path and name of vault by echo command and reserved placeholder {0} {1}', async () => {
    const { vault, config } = setupVault()
    const vaults = await loadVaults(vault.path)
    const selectedVaults = await vaultsSelector(vaults)
    const result = await commandVaultIterator(
      selectedVaults[0],
      executedTasks,
      "echo 'Path: {0} {1}'",
      {
        config: config.path,
        debug: false,
        timestamp: false,
        path: vault.path,
        runFromVaultDirectoryAsWorkDir: false,
      },
    )

    expect(result.success).to.be.true

    const expected = `Path: ${vault.path} ${vault.name}`
    expect(result.stdout?.toString().trim()).to.match(new RegExp(expected))
    destroyVault(vault.path)
  })

  it('should echo path and name of vault by echo command and reserved placeholder {0} {1} and not {10000}', async () => {
    const { vault, config } = setupVault()

    const vaults = await loadVaults(vault.path)
    const selectedVaults = await vaultsSelector(vaults)
    const result = await commandVaultIterator(
      selectedVaults[0],
      executedTasks,
      "echo 'Path: {0} {1} {10000}'",
      {
        config: config.path,
        debug: false,
        timestamp: false,
        path: vault.path,
        runFromVaultDirectoryAsWorkDir: false,
      },
    )

    expect(result.success).to.be.true

    const expected = `Path: ${vault.path} ${vault.name} {10000}`
    expect(result.stdout?.toString().trim()).to.not.match(new RegExp(expected))

    destroyVault(vault.path)
  })
})
