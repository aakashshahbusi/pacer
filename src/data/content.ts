import contentJson from '../../content.json'
import type { Content, LiftProgram, ProgramKey } from '../types'

export const content = contentJson as unknown as Content

export function getProgram(key: ProgramKey | string | undefined): LiftProgram | undefined {
  if (!key) return undefined
  const p = (content.lift_programs as unknown as Record<string, LiftProgram>)[key]
  return p && Array.isArray(p.exercises) ? p : undefined
}

export const programKeys: ProgramKey[] = ['P0_A', 'P0_B', 'LOWER', 'UPPER', 'FULL', 'FULL_LIGHT']

export const labels = content.easter_eggs.labels
export const copy = content.app_copy
