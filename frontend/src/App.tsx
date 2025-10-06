import "./App.css";
import { useState, useEffect, useRef } from "react";
import TOPOLOGY from "vanta/dist/vanta.topology.min";
import p5 from "p5";
import {
  Button,
  Text,
  Spinner,
  Icon,
  Box,
  Flex,
  Avatar,
  Stack,
  Float,
  Circle,
} from "@chakra-ui/react";
import { Toaster } from "@/components/ui/toaster";
import { useGitHubAuth } from "./hooks/useGitHubAuth";
import { useCommitData } from "./hooks/useCommitData";
import Tree from "./components/Tree";
import Loading from "./components/Loading";

function App() {
  const { token, username, avatarUrl, email, isInitializing, login, logout } =
    useGitHubAuth();
  const { streak, maxStreak, totalCommits, daysWithCommits, mergedPRs } =
    useCommitData(token, username, false);
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const myRef = useRef(null);

  useEffect(() => {
    if (token) return;
    let timer: ReturnType<typeof setTimeout>;
    if (!vantaEffect) {
      timer = setTimeout(() => {
        if (myRef.current) {
          setVantaEffect(
            TOPOLOGY({
              el: myRef.current,
              p5,
              color: 0x89964e,
              backgroundColor: 0x2222,
              points: 10.0,
              spacing: 20.0,
              maxDistance: 18.0,
            }),
          );
        }
      }, 150);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect, p5, token]);
  return (
    <>
      {isInitializing ? (
        <Flex align="center" justify="center" height="100vh">
          <Loading />
        </Flex>
      ) : !token ? (
        <Box ref={myRef} bg="#002222" height="100vh" width="100vw">
          {vantaEffect ? (
            <Flex align="center" justify="flex-start" height="full" ml={250}>
              <Flex direction="column" gap={4} align="flex-start">
                <Text
                  fontSize="6xl"
                  fontWeight="bold"
                  marginBottom="0"
                  lineHeight="0.5"
                >
                  bloomit
                </Text>
                <Text fontSize="2xl" fontWeight="medium">
                  code. commit. blossom.
                </Text>
                <Button onClick={login}>
                  <Icon boxSize={6}>
                    <img src="/GrommetIconsGithub.svg" alt="Github" />
                  </Icon>
                  Login with GitHub
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Flex align="center" justify="center" height="full">
              <Loading />
            </Flex>
          )}
        </Box>
      ) : (
        <Box position="relative" height="100vh" width="100vw" bg="#022222">
          <Flex
            direction="column"
            position="absolute"
            left={6}
            top={6}
            bottom={6}
            width="350px"
            p={4}
            bg="rgba(3, 10, 10, 1)/95"
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
              <Box>
                <Text fontSize="xl" fontWeight="bold">
                  In the last 30 days...
                </Text>
                <Text>Streak: {streak}</Text>
                <Text>Max Streak: {maxStreak}</Text>
                <Text>Days with Commits: {daysWithCommits}</Text>
                <Text>Merged Pull Requests: {mergedPRs}</Text>
                <Text>Number of Commits: {totalCommits}</Text>
              </Box>
            </Stack>
            <Button onClick={() => logout()}>
              <Icon boxSize={6}>
                <img src="/MaterialSymbolsLogoutRounded.svg" alt="Logout" />
              </Icon>
            </Button>
          </Flex>
          <Tree
            totalCommits={totalCommits}
            mergedPRs={mergedPRs}
            streak={streak}
            maxStreak={maxStreak}
            daysWithCommits={daysWithCommits}
            onLoad={() => setTreeLoaded(true)}
          />

          {!treeLoaded && (
            <Flex align="center" justify="center" height="full">
              <Loading />
            </Flex>
          )}
        </Box>
      )}
      <Toaster />
    </>
  );
}
export default App;
