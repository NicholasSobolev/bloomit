import type { CommitDay } from "../hooks/useCommitData";

export type CommitSortMode = "date" | "repository";

export interface Activity {
  userId: string;
  totalCommits: number;
  mergedPRs: number;
  streak: number;
  maxStreak: number;
  daysWithCommits: number;
  previousPeriodCommits: number;
  growthVelocityPct: number;
  commitDays: CommitDay[];
  onLoad?: () => void;
}

export interface BranchNode {
  angle: number;
  lengthRatio: number;
  children: BranchNode[];
}

export interface BranchSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  len: number;
}

export interface LeafNode {
  x: number;
  y: number;
  angle: number;
}

export interface LeafHit {
  x: number;
  y: number;
  angle: number;
  commit: CommitDay;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
