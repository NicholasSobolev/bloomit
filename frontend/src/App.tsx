import "./App.css";
import { useState, useEffect, useRef } from "react";
import { Flex } from "@chakra-ui/react";
import { Toaster } from "@/components/ui/toaster";
import { useGitHubAuth } from "./hooks/useGitHubAuth";
import { useCommitData } from "./hooks/useCommitData";
import Loading from "./components/Loading";
import LoggedInView from "./components/LoggedInView";
import LoggedOutView from "./components/LoggedOutView";

function App() {
  const { token, username, avatarUrl, email, login, logout } =
    useGitHubAuth();
  const { streak, maxStreak, totalCommits, daysWithCommits, mergedPRs, commitDays, isLoading } =
    useCommitData(token, username, false);
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const myRef = useRef(null);

  useEffect(() => {
    if (token) return

		let vantaInstance: any = null;
    let timer: ReturnType<typeof setTimeout>;

    if (!vantaEffect) {
      timer = setTimeout(async () => {
        if (myRef.current) {
					const [{ default: TOPOLOGY }, { default: p5 }] = await Promise.all([
						import("vanta/dist/vanta.topology.min"),
						import("p5"),
					]);
          

					vantaInstance = TOPOLOGY({
              el: myRef.current,
              p5,
              color: 0x89964e,
              backgroundColor: 0x2222,
              points: 10.0,
              spacing: 20.0,
              maxDistance: 18.0,
            });

					setVantaEffect(vantaInstance);
        }
      }, 150);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (vantaInstance) vantaInstance.destroy();
    };
  }, [token]);

  return (
    <>
      {isLoading ? (
        <Flex align="center" justify="center" height="100vh">
          <Loading />
        </Flex>
      ) : !token ? (
        <LoggedOutView
          containerRef={myRef}
          vantaEffect={vantaEffect}
          onLogin={login}
        />
      ) : (
        <LoggedInView
          username={username}
          avatarUrl={avatarUrl}
          email={email}
          streak={streak}
          maxStreak={maxStreak}
          daysWithCommits={daysWithCommits}
          mergedPRs={mergedPRs}
          totalCommits={totalCommits}
					commitDays={commitDays}
          treeLoaded={treeLoaded}
          onTreeLoad={() => setTreeLoaded(true)}
          onLogout={logout}
        />
      )}
      <Toaster />
    </>
  );
}
export default App;
