import {
  Button,
  Text,
  Icon,
  Box,
  Flex,
  Avatar,
  Stack,
  Float,
  Circle,
  SimpleGrid,
} from "@chakra-ui/react";
import Tree from "./Tree";
import Loading from "./Loading";
import StatsCard from "./tree/StatsCard";
import SearchCommits from "./tree/SearchCommits";
import RepositoryViews from "./tree/RepositoryViews"
import ProfileSearchInput from "./ProfileSearchInput";

import type { CommitDay } from "../hooks/useCommitData";

interface LoggedInViewProps {
  token: string | null;
  username: string;
  viewerUsername: string;
  avatarUrl: string;
  email: string;
  streak: number;
  maxStreak: number;
  daysWithCommits: number;
  mergedPRs: number;
  totalCommits: number;
  previousPeriodCommits: number;
  growthVelocityPct: number;
  commitDays: CommitDay[];
  treeLoaded: boolean;
  onTreeLoad: () => void;
  onViewProfile: (username: string) => void;
  onShowMyProfile: () => void;
  onLogout: () => void;
  exitLabel: string;
}

export default function LoggedInView({
  token,
  username,
  viewerUsername,
  avatarUrl,
  email,
  streak,
  maxStreak,
  daysWithCommits,
  mergedPRs,
  totalCommits,
  previousPeriodCommits,
  growthVelocityPct,
  commitDays,
  treeLoaded,
  onTreeLoad,
  onViewProfile,
  onShowMyProfile,
  onLogout,
  exitLabel,
}: LoggedInViewProps) {
  const isViewingOtherProfile = !!viewerUsername && username !== viewerUsername;

  const useMaxStatsForTesting = false;

  const displayStats = useMaxStatsForTesting
    ? {
        streak: 365,
        maxStreak: 365,
        daysWithCommits: 365,
        mergedPRs: 999,
        totalCommits: 9999,
        previousPeriodCommits: 9999,
        growthVelocityPct: 999.9,
      }
    : {
        streak,
        maxStreak,
        daysWithCommits,
        mergedPRs,
        totalCommits,
        previousPeriodCommits,
        growthVelocityPct,
      };

  return (
    <Box position="relative" height="100vh" width="100vw" bg="#022222">
      <Box
        position="absolute"
        top="12px"
        left="50%"
        transform="translateX(-50%)"
        width={{ base: "calc(100% - 24px)", md: "560px" }}
        zIndex={2}
      >
        <Flex gap={2} align="center">
          <ProfileSearchInput
            token={token}
            onViewProfile={onViewProfile}
            placeholder="Username or GitHub profile URL"
            inputBg="rgba(3, 10, 10, 0.9)"
            inputBorderColor="whiteAlpha.300"
            buttonLabel="View"
            size="xs"
          />
          {isViewingOtherProfile && (
            <Button size="xs" variant="subtle" onClick={onShowMyProfile}>
              Return
            </Button>
          )}
        </Flex>
      </Box>

      <Flex
        direction="column"
        position="absolute"
        display={{ base: "none", xl: "flex" }}
        left={6}
        top={40}
        bottom={40}
        width="375px"
        p={4}
        bg="rgba(3, 10, 10, 0.85)"
        borderRadius="lg"
        boxShadow="lg"
        justify="space-between"
        overflow="visible"
        zIndex={1}
      >
        <Stack flex={1} minH={0} overflow="hidden">
          <Flex align="center" gap={3}>
            <Avatar.Root size="md">
              <Avatar.Fallback name={username} />
              {avatarUrl && <Avatar.Image src={avatarUrl} />}
              <Float placement="bottom-end" offsetX="1" offsetY="1">
                <Circle
                  bg="green.500"
                  size="8px"
                  outline="0.2em solid"
                  outlineColor="bg"
                />
              </Float>
            </Avatar.Root>
            <Stack gap="0" align="flex-start" minW={0}>
              <Text fontWeight="bold" textAlign="left" lineClamp={1} lineHeight="1">
                {username}
              </Text>
              <Text
                color="fg.muted"
                textStyle="sm"
                textAlign="left"
                lineClamp={1}
								lineHeight={1.5}
              >
                {email}
              </Text>
            </Stack>
          </Flex>
          <SimpleGrid columns={3} gap={3} w="full">
            <StatsCard value={displayStats.totalCommits} label="Commits" />
            <StatsCard value={displayStats.daysWithCommits} label="Days" />
            <StatsCard value={displayStats.streak} label="Streak" />
          </SimpleGrid>

          <Box w="full">
            <SearchCommits commitDays={commitDays} />
          </Box>
          <Box flex={1} minH={0} w="full">
            <RepositoryViews commitDays={commitDays} />
          </Box>
        </Stack>
        <Flex direction="row" w="full" gap={3}>
          <Button flex={1}>
            <Flex align="center" gap={2}>
              <Icon boxSize={5}>
                <img src="/MaterialSymbolsSettings.svg" alt="Settings" />
              </Icon>
              <Text fontSize="sm">Settings</Text>
            </Flex>
          </Button>
          <Button flexShrink={0} onClick={onLogout}>
            <Icon boxSize={6}>
              <img src="/MaterialSymbolsLogoutRounded.svg" alt="Logout" />
            </Icon>
            <Text fontSize="sm">{exitLabel}</Text>
          </Button>
        </Flex>
      </Flex>
      <Tree
        userId={username}
        totalCommits={displayStats.totalCommits}
        mergedPRs={displayStats.mergedPRs}
        streak={displayStats.streak}
        maxStreak={displayStats.maxStreak}
        daysWithCommits={displayStats.daysWithCommits}
        previousPeriodCommits={displayStats.previousPeriodCommits}
        growthVelocityPct={displayStats.growthVelocityPct}
        commitDays={commitDays}
        onLoad={onTreeLoad}
      />

      {!treeLoaded && (
        <Flex align="center" justify="center" height="full">
          <Loading />
        </Flex>
      )}
    </Box>
  );
}
