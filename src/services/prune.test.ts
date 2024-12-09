import { expect } from 'chai'
import { after } from 'mocha'
import sinon from 'sinon'
import { setTimeout } from 'timers/promises'
import {
  createTmpVault,
  destroyConfigMockFile,
  destroyVault,
  testCommonFlags,
  testVaultPath,
  tmpConfigFilePath,
} from '../utils/testing'
import { createDefaultConfig } from './config'
import { action as installAction } from './install'
import { action as pruneAction } from './prune'

const samplePlugin1Id = 'obsidian-linter'
const samplePlugin2Id = 'colored-tags'

const installActionIteratorSpy = sinon.spy()

describe('Command: prune', () => {
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
    destroyVault(testVaultPath)
    createDefaultConfig(tmpConfigFilePath)
  })

  after(() => {
    sinon.restore()
    destroyVault(testVaultPath)
  })

  it('should prune plugins successfully', async () => {
    await createTmpVault(testVaultPath)

    await installAction(
      { pluginId: samplePlugin1Id },
      { ...testCommonFlags, enable: true, path: testVaultPath },
      installActionIteratorSpy,
      (result) => {
        expect(result.success).to.be.true
      },
    )

    await installAction(
      { pluginId: samplePlugin2Id },
      { ...testCommonFlags, enable: true, path: testVaultPath },
      installActionIteratorSpy,
      (result) => {
        expect(result.success).to.be.true
      },
    )

    // Wait for the plugins to be installed
    await setTimeout(2000)

    await pruneAction(
      {},
      { ...testCommonFlags, path: testVaultPath },
      (iterator) => {
        expect(iterator?.prunedPlugins).to.have.lengthOf(2)
        expect(
          iterator?.prunedPlugins?.some(({ id }) => samplePlugin1Id === id),
        ).to.be.true
        expect(
          iterator?.prunedPlugins?.some(({ id }) => samplePlugin2Id === id),
        ).to.be.true
      },
      (result) => {
        expect(result).to.have.property('success')
        expect(result.success).to.be.true
      },
    )
  })

  it('should prune only if plugins directory exists', async () => {
    await createTmpVault(testVaultPath)
    await pruneAction(
      {},
      { ...testCommonFlags, path: testVaultPath },
      (iterator) => {
        expect(iterator.prunedPlugins).to.have.lengthOf(0)
      },
      (result) => {
        expect(result).to.have.property('success')
        expect(result.success).to.be.true
      },
    )
  })
})
