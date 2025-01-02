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
  runFromVaultDirectoryAsWorkDir: boolean
  output?: string
  unescape?: boolean
  async?: boolean
  silent?: boolean
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
  config: Config
  flags: FactoryFlagsWithVaults<StatsFlags>
}

export type StatsCommandIteratorResult = {
  configuredPlugins: number
  installedPlugins: number
}

export type StatsCommandIterator<T> = (
  _item: StatsCommandVaultIteratorItem & {
    flags: FactoryFlags<T> | FactoryFlagsWithVaults<T>
  },
) => Promise<StatsCommandIteratorResult>

export type StatsCommandCallbackResult = CommandCallbackBaseResult & {
  totalStats?: {
    totalVaults: number
    totalPlugins: number
  }
  installedPlugins?: InstalledPlugins
}

export type StatsCommandCallback = (_result: StatsCommandCallbackResult) => void

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

export type InstallCommandVaultIteratorItem = CommandVaultIteratorItem & {
  config: Config
  flags: FactoryFlagsWithVaults<InstallFlags>
  specific: boolean
}

export type InstallCommandIterator<T> = (
  _item: InstallCommandVaultIteratorItem & {
    flags: FactoryFlags<T> | FactoryFlagsWithVaults<T>
  },
) => Promise<
  InstallCommandIteratorResult | (CustomError & InstallCommandIteratorResult)
>

export type CommandVaultIterator<T> = AsyncIterator<
  InstallCommandVaultIteratorItem & {
    flags: FactoryFlags<T> | FactoryFlagsWithVaults<T>
  },
  CustomError & InstallCommandIteratorResult
>

export type InstallCommandCallbackResult =
  | Error
  | null
  | undefined
  | CommandCallbackBaseResult

export type InstallCommandCallback = (
  _err: InstallCommandCallbackResult,
) => CommandCallbackBaseResult

export interface PruneCommandIteratorResult {
  prunedPlugins: Array<PrunedPlugin>
}

export type PruneCommandVaultIteratorItem = CommandVaultIteratorItem & {
  config: Config
  flags: FactoryFlagsWithVaults<PruneFlags>
}

export type PruneCommandIterator<T> = (
  _item: PruneCommandVaultIteratorItem & {
    flags: FactoryFlags<T> | FactoryFlagsWithVaults<T>
  },
) => Promise<
  PruneCommandIteratorResult | (CustomError & PruneCommandIteratorResult)
>

export type PruneCommandCallbackResult = CommandCallbackBaseResult

export type PruneCommandCallback = (
  _err: Error | null | undefined,
) => PruneCommandCallbackResult

export interface UninstalledPlugin {
  id: string
}

export interface UninstallCommandIteratorResult {
  uninstalledPlugins: Array<Plugin>
  failedPlugins: Array<Plugin>
}

export type UninstallCommandVaultIteratorItem = CommandVaultIteratorItem & {
  config: Config
  flags: FactoryFlagsWithVaults<UninstallFlags>
}

export type UninstallCommandIterator<T> = (
  _item: UninstallCommandVaultIteratorItem & {
    flags: FactoryFlags<T> | FactoryFlagsWithVaults<T>
  },
) => Promise<
  | UninstallCommandIteratorResult
  | (CustomError & UninstallCommandIteratorResult)
>

export type UninstallCommandCallbackResult =
  | Error
  | null
  | undefined
  | CommandCallbackBaseResult

export type UninstallCommandCallback = (
  _result: UninstallCommandCallbackResult,
) => void

export interface CommandVaultIteratorItem {
  vault: Vault
}

export type RunCommandVaultIteratorItem = CommandVaultIteratorItem & {
  command?: CommandArgs['command']
}

export type RunCommandIteratorResult = CommandsExecutedOnVaults[0]

export type RunCommandIterator<T> = (
  _item: RunCommandVaultIteratorItem & {
    flags: FactoryFlags<T> | FactoryFlagsWithVaults<T>
  },
) => Promise<RunCommandIteratorResult>

export type RunCommandCallbackResult = CommandCallbackBaseResult &
  ExecuteCustomCommandCallbackResult
export type RunCommandCallback = (_result: RunCommandCallbackResult) => void
