import { expect } from 'chai'
import { describe } from 'mocha'
import sinon from 'sinon'
import { handlerCommandError } from './command'
import { isTestEnv } from './env'

const sandbox = sinon.createSandbox()

describe('Command: Handle errors', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('should detect a test environment', async () => {
    expect(isTestEnv()).to.be.true
  })

  it('should throw error if CI env is true', async () => {
    process.env.CI = 'true'
    const error = new Error()
    expect(() => handlerCommandError(error)).to.throw(error)
    process.env.CI = undefined
  })
})
