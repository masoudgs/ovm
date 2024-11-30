import { Vault } from 'obsidian-utils'
import { Config } from './providers/config'

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

export type InitFlags = Record<string, unknown>

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

export type CommandsExecutedOnVaults = Record<
  string,
  {
    success: null | boolean
    duration: string
    error: null | Error | string
  }
>
