import { AsyncIterator } from 'async'
import { ExecException } from 'child_process'
import { Vault } from 'obsidian-utils'
import { Config, Plugin } from '../services/config'

export type CustomError = Error | ExecException

export type CommonFlags = {
  debug: boolean
  timestamp: boolean
  config: string
}

export type CommonFlagsWithPath = CommonFlags & {
  path: string
  async?: boolean
}

export type FactoryFlags<T> = CommonFlags & T

export type FactoryFlagsWithVaults<T> = CommonFlagsWithPath & T

export type CommandsExecutedOnVaults = Record<
  string,
  {
    success: null | boolean
    duration: string
    error: null | string | CustomError
    stdout?: string
  }
>
export type CommandOnVault = (_vault: Vault, ..._args: string[]) => string
export type ReservedVariables = {
  [key: string]: CommandOnVault | undefined
}

export type InitFlags = Record<string, unknown>

export interface PrunedPlugin {
  id: string
}

export type StagedPlugins = Array<Pick<Plugin, 'id' | 'repo' | 'version'>>

export type InstalledPlugins = Record<string, Array<string>>

export type PruneFlags = Record<string, unknown>

export type PruneArgs = Record<string, unknown>

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

export type StatsArgs = Record<string, unknown>

export interface RunFlags {
  runFromVaultDirectoryAsWorkDir: boolean
  output?: string
  unescape?: boolean
  async?: boolean
  silent?: boolean
}

export interface RunArgs {
  command: string
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

export type StatsCommandVaultIteratorItem = CommandVaultIteratorItem & {
  flags: FactoryFlagsWithVaults<StatsFlags>
  args?: StatsArgs
}

export type StatsCommandIteratorResult = {
  configuredPlugins: number
  installedPlugins: number
}

export type StatsCommandIterator = (
  _item: StatsCommandVaultIteratorItem,
) => Promise<StatsCommandIteratorResult>

export type StatsCommandCallbackResult = CommandCallbackBaseResult & {
  totalStats?: {
    totalVaults: number
    totalPlugins: number
  }
  installedPlugins?: InstalledPlugins
}

export type StatsCommandCallback = (
  _err?: Error | null,
) => StatsCommandCallbackResult

export type CommandCallbackBaseResult = {
  success: boolean
  error?: Error | null
}

export type InitCommandCallbackResult = CommandCallbackBaseResult

export type InitCommandCallback = (
  _err?: Error | null,
) => InitCommandCallbackResult

export interface InstallCommandIteratorResult {
  installedPlugins: StagedPlugins
  failedPlugins: StagedPlugins
  reinstallPlugins: StagedPlugins
}

export type InstallCommandVaultIteratorItem = CommandVaultIteratorItem & {
  flags: FactoryFlagsWithVaults<InstallFlags>
  args?: InstallArgs
}

export type InstallCommandIterator = (
  _item: InstallCommandVaultIteratorItem,
) => Promise<
  InstallCommandIteratorResult | (CustomError & InstallCommandIteratorResult)
>

export type CommandVaultIterator<T> = AsyncIterator<
  InstallCommandVaultIteratorItem & {
    flags: FactoryFlags<T> | FactoryFlagsWithVaults<T>
  },
  CustomError & InstallCommandIteratorResult
>

export type InstallCommandCallbackResult = CommandCallbackBaseResult

export type InstallCommandCallback = (
  _err?: Error | null,
) => InstallCommandCallbackResult

export interface PruneCommandIteratorResult {
  prunedPlugins: Array<PrunedPlugin>
}

export type PruneCommandVaultIteratorItem = CommandVaultIteratorItem & {
  flags: FactoryFlagsWithVaults<PruneFlags>
  args?: PruneArgs
}

export type PruneCommandIterator = (
  _item: PruneCommandVaultIteratorItem,
) => Promise<
  PruneCommandIteratorResult | (CustomError & PruneCommandIteratorResult)
>

export type PruneCommandCallbackResult = CommandCallbackBaseResult

export type PruneCommandCallback = (
  _err?: Error | null,
) => PruneCommandCallbackResult

export interface UninstalledPlugin {
  id: string
}

export interface UninstallCommandIteratorResult {
  uninstalledPlugins: Array<Plugin>
  failedPlugins: Array<Plugin>
}

export type UninstallCommandVaultIteratorItem = CommandVaultIteratorItem & {
  flags: FactoryFlagsWithVaults<UninstallFlags>
  args?: UninstallArgs
}

export type UninstallCommandIterator = (
  _item: UninstallCommandVaultIteratorItem,
) => Promise<
  | UninstallCommandIteratorResult
  | (CustomError & UninstallCommandIteratorResult)
>

export type UninstallCommandCallbackResult = CommandCallbackBaseResult

export type UninstallCommandCallback = (
  _err?: Error | null,
) => UninstallCommandCallbackResult

export interface CommandVaultIteratorItem {
  vault: Vault
  config: Config
}

export type RunCommandVaultIteratorItem = CommandVaultIteratorItem & {
  flags: FactoryFlagsWithVaults<RunFlags>
  args: RunArgs
}

export type RunCommandIteratorResult = CommandsExecutedOnVaults[0]

export type RunCommandIterator = (
  _item: RunCommandVaultIteratorItem,
) => Promise<RunCommandIteratorResult>

export type RunCommandCallbackResult = CommandCallbackBaseResult &
  ExecuteCustomCommandCallbackResult
export type RunCommandCallback = (
  _err?: Error | null,
) => RunCommandCallbackResult
