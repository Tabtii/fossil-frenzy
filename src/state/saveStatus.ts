import { create } from 'zustand';

export type SaveIssue = 'read' | 'write' | null;

// Kept outside the persisted game store: reporting a disk error must never
// cause another save (or recursively report itself).
export const useSaveStatus = create<{ issue: SaveIssue }>(() => ({ issue: null }));

export function reportSaveIssue(issue: SaveIssue): void {
  if (useSaveStatus.getState().issue !== issue) useSaveStatus.setState({ issue });
}
