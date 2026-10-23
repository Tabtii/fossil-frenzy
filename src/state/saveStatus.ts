import { create } from 'zustand';

export type SaveIssue = 'read' | 'write' | null;
export type SaveRecovery = 'run' | 'file' | null;

// Kept outside the persisted game store: reporting a disk error must never
// cause another save (or recursively report itself).
export const useSaveStatus = create<{ issue: SaveIssue; recovery: SaveRecovery }>(() => ({ issue: null, recovery: null }));

export function reportSaveIssue(issue: SaveIssue): void {
  if (useSaveStatus.getState().issue !== issue) useSaveStatus.setState({ issue });
}

export function reportSaveRecovery(recovery: SaveRecovery): void {
  if (useSaveStatus.getState().recovery !== recovery) useSaveStatus.setState({ recovery });
}
