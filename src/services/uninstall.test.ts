import { expect } from 'chai'
import Sinon from 'sinon'
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
import { action as uninstallAction } from './uninstall'

const samplePluginId = 'obsidian-linter'
const installActionIteratorSpy = Sinon.spy()

describe('Command: uninstall', () => {
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
    destroyVault(testVaultPath)
    createDefaultConfig(tmpConfigFilePath)
  })

  it('should perform uninstallation successfully', async () => {
    await createTmpVault(testVaultPath)

    await installAction(
      { pluginId: samplePluginId },
      { ...testCommonFlags, enable: true, path: testVaultPath },
      installActionIteratorSpy,
      (result) => {
        expect(result.success).to.be.true
      },
    )

    await setTimeout(1000)

    await uninstallAction(
      { pluginId: samplePluginId },
      { ...testCommonFlags, path: testVaultPath },
      (iterator) => {
        expect(iterator).to.be.an('object')
        expect(iterator).to.have.property('uninstalledPlugins')
        expect(iterator).to.have.property('failedPlugins')
        expect(iterator.uninstalledPlugins.length).to.be.greaterThan(0)
        expect(iterator.failedPlugins.length).to.equal(0)
        expect(iterator.uninstalledPlugins[0].id).to.contain(samplePluginId)
      },
      (result) => {
        expect(result).to.have.property('success')
        expect(result.success).to.be.true
      },
    )
  })

  it('should throw error when plugin is not found', async () => {
    await createTmpVault(testVaultPath)
    const pluginId = 'nonExistentPluginId'

    await uninstallAction(
      { pluginId },
      { ...testCommonFlags, path: testVaultPath },
      (iterator) => {
        expect(iterator).to.be.an('object')
        expect(iterator).to.have.property('uninstalledPlugins')
        expect(iterator).to.have.property('failedPlugins')
        expect(iterator.uninstalledPlugins).to.be.an('array')
        expect(iterator.failedPlugins).to.be.an('array')
        expect(iterator.uninstalledPlugins.length).to.equal(0)
        expect(iterator.failedPlugins.length).to.equal(1)
        expect(iterator.failedPlugins[0].id).to.contain(pluginId)
      },
      (result) => {
        expect(result).to.have.property('success')
        expect(result.success).to.be.false
      },
    )
  })
})
