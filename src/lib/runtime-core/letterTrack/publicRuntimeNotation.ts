import { simplifyKuailepuNotation as simplifyArchivedRuntimeNotation } from '../../songbook/kuailepuImport.ts'

export function simplifyPublicRuntimeNotation(value: string) {
  return simplifyArchivedRuntimeNotation(value)
}
