import { runCommand } from '@oclif/test'
import { expect } from 'chai'
import {
  destroyConfigMockFile,
  getTmpConfigFilePath,
} from '../../utils/testing'

const tmpConfigFilePath = getTmpConfigFilePath()

describe('Command: config init', () => {
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
  })

  afterEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
  })

  it('should create a config file', async () => {
    const tmpConfigFilePath = getTmpConfigFilePath()
    const result = await runCommand(`config init -c ${tmpConfigFilePath}`)
    const normalizedOutput = result?.stdout?.trim().replace(/\\\\/g, '\\')
    expect(normalizedOutput).to.equal(
      `info: Config file created {"path":"${tmpConfigFilePath.replace(/\\\\/g, '\\')}"}`,
    )
  })
})
