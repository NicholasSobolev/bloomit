import type { CommitDay } from "../hooks/useCommitData";
import type { CommitSortMode } from "../types/Tree.types";
export function buildDisplayCommitGroups(
  commitDays: CommitDay[],
  commitSortMode: CommitSortMode,
): CommitDay[] {
  if (commitSortMode === "date") return commitDays;
  const repoMap = new Map<string, CommitDay["commits"]>();
  for (const day of commitDays) {
    const dayCommits =
      day.commits && day.commits.length > 0
        ? day.commits
        : [
            {
              message: day.message,
              url: day.url,
              repository: "Unknown repository",
              timestamp: `${day.date}T00:00:00Z`,
            },
          ];
    for (const entry of dayCommits) {
      const repository = entry.repository || "Unknown repository";
      const current = repoMap.get(repository) ?? [];
      current.push(entry);
      repoMap.set(repository, current);
    }
  }
  return Array.from(repoMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([repository, commits]) => {
      const sortedCommits = commits
        .slice()
        .sort(
          (a, b) =>
            (new Date(b.timestamp || "").getTime() || 0) -
            (new Date(a.timestamp || "").getTime() || 0),
        );
      const first = sortedCommits[0];
      return {
        date: repository,
        count: sortedCommits.length,
        message: first?.message || "",
        url: first?.url || "",
        commits: sortedCommits,
      };
    });
}
export function sortCommitGroupsForSketch(
  groups: CommitDay[],
  commitSortMode: CommitSortMode,
): CommitDay[] {
  if (commitSortMode === "repository") return [...groups];
  return [...groups].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
export function getSelectedCommitDetails(
  selectedCommitDay: CommitDay | null,
): CommitDay["commits"] {
  return (
    selectedCommitDay?.commits && selectedCommitDay.commits.length > 0
      ? selectedCommitDay.commits
      : selectedCommitDay
        ? [
            {
              message: selectedCommitDay.message,
              url: selectedCommitDay.url,
              repository: "Unknown repository",
              timestamp: `${selectedCommitDay.date}T00:00:00Z`,
            },
          ]
        : []
  )
    .slice()
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
}
export function getCommitTypeStyle(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("feature")) {
    return {
      border: "rgba(104, 198, 138, 0.75)",
      bg: "rgba(38, 94, 56, 0.42)",
      label: "feature",
    };
  }
  if (normalized.includes("refactor")) {
    return {
      border: "rgba(96, 150, 230, 0.75)",
      bg: "rgba(33, 68, 124, 0.42)",
      label: "refactor",
    };
  }
  if (normalized.includes("bug fix") || normalized.includes("bugfix")) {
    return {
      border: "rgba(226, 98, 98, 0.78)",
      bg: "rgba(112, 35, 35, 0.45)",
      label: "bug fix",
    };
  }
  if (normalized.includes("docs")) {
    return {
      border: "rgba(228, 196, 92, 0.78)",
      bg: "rgba(108, 87, 30, 0.45)",
      label: "docs",
    };
  }
  return {
    border: "rgba(112, 142, 136, 0.5)",
    bg: "rgba(6, 16, 16, 0.55)",
    label: null,
  };
}
