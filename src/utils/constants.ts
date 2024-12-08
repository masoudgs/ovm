import { getVaultName, getVaultPath } from '../providers/vaults'
import { ReservedVariables } from '../types/commands'

export const OVM_CONFIG_FILENAME = 'ovm.json'
export const VAULTS_PATH_FLAG_DESCRIPTION =
  '[default: detect from Obsidian config] Path or Glob pattern of vaults to install plugins.'
export const RESERVED_VARIABLES: ReservedVariables = {
  '0': getVaultPath,
  '1': getVaultName,
}
