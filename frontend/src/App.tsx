import "./App.css";
import axios from "axios";
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
import { toaster, Toaster } from "@/components/ui/toaster";

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [streak, setStreak] = useState(0);
  const [maxstreak, setMaxstreak] = useState(0);
  const [health, setHealth] = useState(0);
  const [dayswithcommits, setDayswithcommits] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const myRef = useRef(null);
  const processedCodeRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (stored && stored.startsWith("gho_")) {
      setToken(stored);
    } else {
      localStorage.removeItem("token");
    }
    setIsInitializing(false);
  }, []);
  const login = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`;
  };

  // exchange code for token and fetch user data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (!code || processedCodeRef.current) return;

    processedCodeRef.current = true;
    const getToken = async () => {
      setIsInitializing(true);
      try {
        const res = await axios.get(`http://localhost:5000/auth?code=${code}`);
        console.log("Auth response:", res.data);
        const newToken = res.data.access_token;
        if (!newToken) {
          throw new Error("No access token received!");
        }
        setToken(newToken);
        localStorage.setItem("token", newToken);
        window.history.replaceState({}, "", "/");
        const isNewLogin = true;

        try {
          const userRes = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `token ${newToken}` },
          });
          console.log("GitHub user:", userRes.data);
          setUsername(userRes.data.login);
          setAvatarUrl(userRes.data.avatar_url);
          setEmail(userRes.data.email || userRes.data.company || "");
          await fetchData(newToken, userRes.data.login, isNewLogin);
        } catch (err: any) {
          if (err.response?.status === 401) {
            console.warn("Token expired, logging out");
            setToken(null);
            localStorage.removeItem("token");
          } else {
            console.error("Error fetching user:", err);
            toaster.create({
              title: "Error",
              description: "Failed to fetch user data.",
              type: "error",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching token:", error);
        toaster.create({
          title: "Login error",
          description: "Failed to authenticate with GitHub. Please try again.",
          type: "error",
        });
      } finally {
        setIsInitializing(false);
      }
    };
    getToken();
  }, []);

  // load user data if token exists but no code (e.g., refresh)
  useEffect(() => {
    if (token && !isInitializing && !username) {
      const loadUserData = async () => {
        setIsInitializing(true);
        try {
          const userRes = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `token ${token}` },
          });
          setUsername(userRes.data.login);
          setAvatarUrl(userRes.data.avatar_url);
          setEmail(userRes.data.email || userRes.data.company || "");
          await fetchData(token, userRes.data.login, false);
        } catch (err: any) {
          if (err.response?.status === 401) {
            console.warn("Token expired, logging out");
            setToken(null);
            localStorage.removeItem("token");
          } else {
            console.error("Error fetching user:", err);
            toaster.create({
              title: "Error",
              description: "Failed to load user data.",
              type: "error",
            });
          }
        } finally {
          setIsInitializing(false);
        }
      };
      loadUserData();
    }
  }, [token, isInitializing, username]);

  // fetch commit stats
  const fetchData = async (
    token: string,
    user: string,
    isNewLogin: boolean,
  ) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/commit_activity?token=${token}&username=${user}`,
      );
      setHealth(res.data.health);
      setStreak(res.data.streak);
      setMaxstreak(res.data.max_streak);
      setDayswithcommits(res.data.days_with_commits.length);
    } catch (error) {
      console.error("Error fetching commits:", error);
      toaster.create({
        title: "Error",
        description: "Failed to fetch commit data.",
        type: "error",
      });
    } finally {
      if (isNewLogin) {
        toaster.create({
          title: "Login successful",
          description: "You successfully logged in with your GitHub Account.",
          type: "success",
        });
      }
    }
  };

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
          <Flex direction="column" align="center">
            <Spinner size="xl" />
            <Text textStyle="md" mt={3}>
              loading :D
            </Text>
          </Flex>
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
              <Flex direction="column" align="center">
                <Spinner size="xl" />
                <Text textStyle="md" mt={3}>
                  loading :D
                </Text>
              </Flex>
            </Flex>
          )}
        </Box>
      ) : (
        <Box
          bg="#022222"
          height="100vh"
          width="100vw"
          p={4}
          position="relative"
        >
          <Box marginTop="100px">
            <Text fontSize="xl" fontWeight="bold">
              Quick Look
            </Text>
            <Text>Health: {health}</Text>
            <Text>Streak: {streak}</Text>
            <Text>Max Streak: {maxstreak}</Text>
            <Text>Days with Commits: {dayswithcommits}</Text>
          </Box>
          <Button
            position="absolute"
            bottom={4}
            left={4}
            onClick={() => {
              setToken(null);
              localStorage.removeItem("token");
              setUsername("");
              setHealth(0);
              setStreak(0);
              setMaxstreak(0);
              setDayswithcommits(0);
              toaster.create({
                title: "Logout successful",
                description: "You successfully logged out.",
                type: "success",
              });
            }}
          >
            <Icon boxSize={6}>
              <img src="/MaterialSymbolsLogoutRounded.svg" alt="Logout" />
            </Icon>
          </Button>
          <Box position="absolute" top={4} left={4}>
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
        </Box>
      )}
      <Toaster />
    </>
  );
}
export default App;
