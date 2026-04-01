import { Box, Text, VStack } from "@chakra-ui/react";

import { useMemo, useState } from "react";

import type { CommitDay } from "../../hooks/useCommitData";
import CommitDetailsModal from "./CommitDetailsModal";
import Repository from "./Repository";

interface RepositoryViewsProps {
  commitDays: CommitDay[];
}

export default function RepositoryViews({ commitDays }: RepositoryViewsProps) {
  const [selectedRepoName, setSelectedRepoName] = useState<string | null>(null);
  const repositories = useMemo(() => {
    const stats = new Map<
      string,
      { commitCount: number; lastActive: number; commits: CommitDay["commits"] }
    >();

    for (const day of commitDays) {
      for (const commit of day.commits) {
        const repoName =
          commit.repository?.slice(commit.repository.indexOf("/") + 1).trim() ||
          "Unknown repository";
        const ts = commit.timestamp
          ? new Date(commit.timestamp).getTime()
          : new Date(day.date).getTime();
        const current = stats.get(repoName);

        if (!current) {
          stats.set(repoName, { commitCount: 1, lastActive: ts, commits: [commit] });
          continue;
        }

        stats.set(repoName, {
          commitCount: current.commitCount + 1,
          lastActive: Math.max(current.lastActive, ts),
          commits: [...current.commits, commit],
        });
      }
    }

    return Array.from(stats.entries())
      .map(([name, value]) => ({
        name,
        commitCount: value.commitCount,
        lastActive: value.lastActive,
        commits: value.commits,
      }))
      .sort(
        (a, b) =>
          b.lastActive - a.lastActive ||
          b.commitCount - a.commitCount ||
          a.name.localeCompare(b.name),
      );
  }, [commitDays]);

  const selectedRepo = useMemo(
    () => repositories.find((repo) => repo.name === selectedRepoName) ?? null,
    [repositories, selectedRepoName],
  );

  return (
    <Box w="full" h="full" minH={0} display="flex" flexDirection="column" overflow="hidden">
      <Box
        w="100%"
        h="29px"
        flexShrink={0}
        display="flex"
        flexDirection="row"
        alignItems="start"
        justifyContent="start"
        textAlign="center"
        px={1.5}
      >
        <Text fontSize="xs" color="fg.muted" fontWeight="medium">
          Repositories
        </Text>
      </Box>
      <Box flex={1} minH={0} overflowY="auto" overflowX="hidden" pr={1}>
        <VStack gap={2} align="stretch">
          {repositories.length === 0 ? (
            <Text px={1.5} fontSize="xs" color="fg.muted">
              No active repositories this month
            </Text>
          ) : (
            repositories.map((repo, index) => (
              <Repository
                key={repo.name}
                repoName={repo.name}
                commitCount={repo.commitCount}
                isMostRecent={index === 0}
                onOpen={() => setSelectedRepoName(repo.name)}
              />
            ))
          )}
        </VStack>
      </Box>

      <CommitDetailsModal
        selectedCommitDay={
          selectedRepo
            ? {
                date: selectedRepo.name,
                count: selectedRepo.commitCount,
                message: selectedRepo.commits[0]?.message ?? "",
                url: selectedRepo.commits[0]?.url ?? "",
                commits: selectedRepo.commits,
              }
            : null
        }
        selectedCommitDetails={selectedRepo?.commits ?? []}
        onClose={() => setSelectedRepoName(null)}
      />
    </Box>
  );
}
