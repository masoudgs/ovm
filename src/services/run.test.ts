import { expect } from 'chai'
import { tmpdir } from 'os'
import proxyquire from 'proxyquire'
import sinon from 'sinon'
import { RunCommandIterator } from '../types/commands'
import {
  destroyVault,
  getTestCommonWithVaultPathFlags,
  setupVault,
} from '../utils/testing'
import runService from './run'

const { runCommandVaultIterator } = runService

const sandbox = sinon.createSandbox()

describe('Command: run', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('should fail with invalid command', async () => {
    const { vault, config } = setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
        output: 'json',
      },
      args: {
        command: '',
      },
    })

    expect(result.success).to.be.false
    expect(result.error).to.be.instanceOf(Error)
    destroyVault(vault.path)
  })

  it('should echo path and name of vault by echo command and reserved placeholder {0} {1}', async () => {
    const { vault, config } = setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
      },
      args: { command: "echo 'Path: {0} {1}'" },
    })

    expect(result?.success).to.be.true

    const expected = `Path: ${vault.path} ${vault.name}`
    expect(result.stdout?.toString().trim()).to.match(new RegExp(expected))
    destroyVault(vault.path)
  })

  it('should echo path and name of vault by echo command and reserved placeholder {0} {1} and not {10000}', async () => {
    const { vault, config } = setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
      },
      args: { command: "echo 'Path: {0} {1} {10000}'" },
    })

    expect(result.success).to.be.true

    const expected = `Path: ${vault.path} ${vault.name} {10000}`
    expect(result.stdout?.toString().trim()).to.not.match(new RegExp(expected))

    destroyVault(vault.path)
  })

  it('should handle asyncExecCustomCommand rejection', async () => {
    const asyncExecCustomCommandStub = sandbox
      .stub()
      .rejects(new Error('Execution failed'))
    const {
      default: { runCommandVaultIterator },
    } = proxyquire.noCallThru()('./run', {
      '../providers/command': {
        asyncExecCustomCommand: asyncExecCustomCommandStub,
      },
    })
    const { vault, config } = setupVault()
    const result = await (runCommandVaultIterator as RunCommandIterator)({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
      },
      args: { command: 'invalid-command' },
    })

    expect(asyncExecCustomCommandStub.calledOnce).to.be.true
    expect(result.success).to.be.false
    expect(result.error).to.be.instanceOf(Error)
    expect((result.error as Error).message).to.equal('Execution failed')

    destroyVault(vault.path)
  })

  it('should not run command from vault directory', async () => {
    const { vault, config } = setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
        cwd: tmpdir(),
      },
      args: { command: 'echo $PWD' },
    })

    expect(result.success).to.be.true
    expect(result.stdout?.toString().trim()).to.match(new RegExp(tmpdir()))

    destroyVault(vault.path)
  })

  it('should run command from vault directory', async () => {
    const { vault, config } = setupVault()
    const result = await runCommandVaultIterator({
      vault,
      config,
      flags: {
        ...getTestCommonWithVaultPathFlags(config.path, vault.path),
      },
      args: { command: 'echo $PWD' },
    })

    expect(result.success).to.be.true
    expect(result.stdout?.toString().trim()).to.match(new RegExp(vault.path))

    destroyVault(vault.path)
  })
})
