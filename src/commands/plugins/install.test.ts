// import { expect } from 'chai'
// import { Config, createDefaultConfig } from '../../providers/config'
// import {
//   createTmpVault,
//   destroyConfigMockFile, testCommonFlags, testVaultPath,
//   tmpConfigFilePath
// } from '../../utils/testing'
// import { action } from './installAction'

// describe('Command: install', () => {
//   let config: Config | null = null
//   beforeEach(async () => {
//     await destroyConfigMockFile(tmpConfigFilePath)
//     config = (await createDefaultConfig(tmpConfigFilePath)) as Config
//     console.log('config', config)
//     await createTmpVault(testVaultPath)
//   })

//   afterEach(async () => {
//     await destroyConfigMockFile(tmpConfigFilePath)
//   })
//   it('should perform installation successfully', async () => {
//     const result = await action(
//       { pluginId: 'id' },
//       { ...testCommonFlags, enable: true, path: testVaultPath },
//       (error) => {
//         throw error
//       },
//     )

//     // Add assertions to verify successful installation
//     expect(result).to.be.an('object')
//     expect(result).to.have.property('installedPlugins')
//     expect(result).to.have.property('failedPlugins')
//   })

//   it('should handle errors during installation', async () => {
//     try {
//       await action(
//         {},
//         { ...testCommonFlags, enable: true, path: '' },
//         (error) => {
//           throw error
//         },
//       )
//     } catch (error) {
//       const typedError = error as Error
//       expect(typedError).to.be.an('error')
//       // Add more specific error assertions if needed
//     }
//   })
// })

import { expect } from 'chai'
import sinon from 'sinon'
import { Config, createDefaultConfig } from '../../providers/config'
import {
  createTmpVault,
  destroyConfigMockFile,
  destroyVault,
  testCommonFlags,
  testVaultPath,
  tmpConfigFilePath,
} from '../../utils/testing'
import { action } from './installAction'

let config: Config | null = null
const samplePluginId = 'obsidian-linter'
describe('Command: install', () => {
  beforeEach(async () => {
    await destroyConfigMockFile(tmpConfigFilePath)
    await destroyVault(testVaultPath)
    config = (await createDefaultConfig(tmpConfigFilePath)) as Config
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
        expect(result).to.be.an('object')
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
        expect(result).to.be.an('object')
        expect(result).to.have.property('success')
        expect(result.success).to.be.false
      },
    )
  })
})
