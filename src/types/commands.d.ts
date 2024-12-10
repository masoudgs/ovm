import { ExecException } from 'child_process'
import { Vault } from 'obsidian-utils'
import { Config, Plugin } from '../services/config'

export type CommonFlags = {
  debug: boolean
  timestamp: boolean
  config: string
}

export type CommonFlagsWithPath = CommonFlags & {
  path: string
}

export type FactoryFlags<T> = CommonFlags & T

export type FactoryFlagsWithVaults<T> = CommonFlagsWithPath & T

export type CommandsExecutedOnVaults = Record<
  string,
  {
    success: null | boolean
    duration: string
    error: null | Error | string
  }
>
export type CommandOnVault = (_vault: Vault, ..._args: string[]) => string
export type ReservedVariables = {
  [key: string]: CommandOnVault | undefined
}

export type InitFlags = Record<string, unknown>

export interface StagePlugin {
  repo: string
  version: string
}

export interface PrunedPlugin {
  id: string
}

export type StagedPlugins = Array<StagePlugin>

export type InstalledPlugins = Record<string, Array<string>>

export type PruneFlags = Record<string, unknown>

export interface PrunePluginVaultOpts {
  vault: Vault
  config: Config
}

export interface InstallFlags {
  enable: boolean
}

export interface InstallArgs {
  pluginId?: string
}

export interface InstallPluginVaultOpts {
  vault: Vault
  config: Config
}

export interface UninstallArgs {
  pluginId?: string
}

export type UninstallFlags = Record<string, unknown>

export interface UninstallPluginVaultOpts {
  vault: Vault
  config: Config
}

export interface StatsFlags {
  output: string
}

export interface RunFlags {
  output?: string
  unescape?: boolean
  async?: boolean
  silent?: boolean
  runFromVaultDirectoryAsWorkDir: boolean
}

export interface CommandArgs {
  [key: string]: string
}

export interface ExecuteCustomCommandResult {
  stdout: string
  stderr: string
  error: ExecException | null
}

export interface ExecuteCustomCommandCallbackResult {
  sortedTaskExecutedOnVaults: CommandsExecutedOnVaults
}

export type StatsCommandCallbackResult = CommandCallbackBaseResult & {
  totalStats?: {
    totalVaults: number
    totalPlugins: number
  }
  installedPlugins?: InstalledPlugins
}

export interface CommandVault {
  vault: Vault
  command: CommandArgs['command']
}

export type CommandCallbackBaseResult = {
  success: boolean
  error?: Error
}

export type InitCommandCallbackResult = CommandCallbackBaseResult

export type InitCommandCallback = (_result: InitCommandCallbackResult) => void

export interface InstallCommandIteratorResult {
  installedPlugins: StagedPlugins
  failedPlugins: StagedPlugins
  reinstallPlugins: StagedPlugins
}

export type InstallCommandIterator = (
  _result: InstallCommandIteratorResult,
) => void

export type InstallCommandCallbackResult = CommandCallbackBaseResult

export type InstallCommandCallback = (
  _result: InstallCommandCallbackResult,
) => void

export interface PruneCommandIteratorResult {
  prunedPlugins: Array<PrunedPlugin>
}

export type PruneCommandIterator = (_result: PruneCommandIteratorResult) => void

export type PruneCommandCallbackResult = CommandCallbackBaseResult

export type PruneCommandCallback = (_result: PruneCommandCallbackResult) => void

export interface UninstalledPlugin {
  id: string
}

export interface UninstallCommandIteratorResult {
  uninstalledPlugins: Array<Plugin>
  failedPlugins: Array<Plugin>
}

export type UninstallCommandIterator = (
  _result: UninstallCommandIteratorResult,
) => void

export type UninstallCommandCallbackResult = CommandCallbackBaseResult

export type UninstallCommandCallback = (
  _result: UninstallCommandCallbackResult,
) => void
