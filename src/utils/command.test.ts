import { expect } from 'chai'
import { describe } from 'mocha'
import sinon from 'sinon'
import { handlerCommandError } from './command'

const sandbox = sinon.createSandbox()

describe('Command: Handle errors', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('should throw error if CI env is true', async () => {
    process.env.CI = 'true'
    const error = new Error()
    expect(() => handlerCommandError(error)).to.throw()
    process.env.CI = undefined
  })
})
