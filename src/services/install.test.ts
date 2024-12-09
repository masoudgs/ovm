import { expect } from 'chai'
import sinon from 'sinon'
import {
  createTmpVault,
  destroyConfigMockFile,
  destroyVault,
  testCommonFlags,
  testVaultPath,
  tmpConfigFilePath,
} from '../utils/testing'
import { createDefaultConfig } from './config'
import { action } from './install'

const samplePluginId = 'obsidian-linter'
describe('Command: install', () => {
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
    destroyVault(testVaultPath)
    createDefaultConfig(tmpConfigFilePath)
  })

  afterEach(async () => {
    sinon.restore()
  })

  it('should perform installation successfully', async () => {
    await createTmpVault(testVaultPath)
    await action(
      { pluginId: samplePluginId },
      { ...testCommonFlags, enable: true, path: testVaultPath },
      (iterator) => {
        expect(iterator).to.be.an('object')
        expect(iterator).to.have.property('installedPlugins')
        expect(iterator).to.have.property('failedPlugins')
        expect(iterator.installedPlugins).to.be.an('array')
        expect(iterator.failedPlugins).to.be.an('array')
        expect(iterator.installedPlugins.length).to.be.greaterThan(0)
        expect(iterator.failedPlugins.length).to.equal(0)
        expect(iterator.installedPlugins[0].repo).to.match(
          new RegExp(samplePluginId),
        )
      },
      (result) => {
        expect(result).to.have.property('success')
        expect(result.success).to.be.true
      },
    )
  })

  it('should perform installation successfully', async () => {
    await createTmpVault(testVaultPath)
    await action(
      { pluginId: samplePluginId },
      { ...testCommonFlags, enable: true, path: testVaultPath },
      (iterator) => {
        expect(iterator).to.be.an('object')
        expect(iterator).to.have.property('installedPlugins')
        expect(iterator).to.have.property('failedPlugins')
        expect(iterator.installedPlugins).to.be.an('array')
        expect(iterator.failedPlugins).to.be.an('array')
        expect(iterator.installedPlugins.length).to.be.greaterThan(0)
        expect(iterator.failedPlugins.length).to.equal(0)
        expect(iterator.installedPlugins[0].repo).to.match(
          new RegExp(samplePluginId),
        )
        expect(iterator.reinstallPlugins).to.be.an('array')
        expect(iterator.reinstallPlugins.length).to.equal(0)
      },
      (result) => {
        expect(result).to.have.property('success')
        expect(result.success).to.be.true
      },
    )
  })

  it('should throw PluginNotFoundInRegistryError when plugin is not found', async () => {
    await createTmpVault(testVaultPath)
    const pluginId = 'nonExistentPluginId'

    await action(
      { pluginId },
      { ...testCommonFlags, enable: true, path: testVaultPath },
      (iterator) => {
        expect(iterator).to.be.an('object')
        expect(iterator).to.have.property('installedPlugins')
        expect(iterator).to.have.property('failedPlugins')
        expect(iterator.installedPlugins).to.be.an('array')
        expect(iterator.failedPlugins).to.be.an('array')
        expect(iterator.installedPlugins.length).to.equal(0)
        expect(iterator.failedPlugins.length).to.equal(1)
        expect(iterator.failedPlugins[0].repo).to.equal(pluginId)
      },
      (result) => {
        expect(result).to.have.property('success')
        expect(result.success).to.be.false
      },
    )
  })
})
