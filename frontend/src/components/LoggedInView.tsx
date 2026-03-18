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
} from "@chakra-ui/react";
import Tree from "./Tree";
import Loading from "./Loading";

import type { CommitDay } from "../hooks/useCommitData";

interface LoggedInViewProps {
  username: string;
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
  onLogout: () => void;
}

export default function LoggedInView({
  username,
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
  onLogout,
}: LoggedInViewProps) {
  return (
    <Box position="relative" height="100vh" width="100vw" bg="#022222">
      <Flex
        direction="column"
        position="absolute"
        left={6}
        top={40}
        bottom={40}
        width="350px"
        p={4}
        bg="rgba(3, 10, 10, 1)/85"
        borderRadius="lg"
        boxShadow="lg"
        justify="space-between"
        zIndex={1}
      >
        <Stack>
          <Box>
            <Avatar.Root size="md" marginBottom="5px">
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
            <Stack gap="0">
              <Text fontWeight="medium">{username}</Text>
              <Text color="fg.muted" textStyle="sm">
                {email}
              </Text>
            </Stack>
          </Box>
          <Box />
        </Stack>
        <Button onClick={onLogout}>
          <Icon boxSize={6}>
            <img src="/MaterialSymbolsLogoutRounded.svg" alt="Logout" />
          </Icon>
        </Button>
      </Flex>
      <Tree
        userId={username}
        totalCommits={totalCommits}
        mergedPRs={mergedPRs}
        streak={streak}
        maxStreak={maxStreak}
        daysWithCommits={daysWithCommits}
        previousPeriodCommits={previousPeriodCommits}
        growthVelocityPct={growthVelocityPct}
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
