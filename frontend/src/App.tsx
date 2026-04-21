import "./App.css";
import { useEffect, useState } from "react";
import { Flex } from "@chakra-ui/react";
import { Toaster } from "@/components/ui/toaster";
import { useGitHubAuth } from "./hooks/useGitHubAuth";
import { useCommitData } from "./hooks/useCommitData";
import Loading from "./components/Loading";
import LoggedInView from "./components/LoggedInView";
import LoggedOutView from "./components/LoggedOutView";

function App() {
  const { token, username, avatarUrl, email, isInitializing, login, logout } =
    useGitHubAuth();
  const [profileUsername, setProfileUsername] = useState("");
  const activeUsername = profileUsername || username;
  const { streak, maxStreak, totalCommits, previousPeriodCommits, growthVelocityPct, daysWithCommits, mergedPRs, commitDays, isLoading } =
    useCommitData(token, activeUsername, false);
  const [treeLoaded, setTreeLoaded] = useState(false);

  useEffect(() => {
    setTreeLoaded(false);
  }, [activeUsername]);

  const handleExit = () => {
    if (token) {
      logout();
    }
    setProfileUsername("");
  };

  return (
    <>
      {isInitializing || isLoading ? (
        <Flex align="center" justify="center" height="100vh">
          <Loading />
        </Flex>
      ) : !token && !profileUsername ? (
        <LoggedOutView
          token={token}
          onLogin={login}
          onViewProfile={setProfileUsername}
        />
      ) : (
        <LoggedInView
          token={token}
          username={activeUsername}
          viewerUsername={username}
          avatarUrl={profileUsername ? "" : avatarUrl}
          email={profileUsername ? "Public profile view" : email}
          streak={streak}
          maxStreak={maxStreak}
          daysWithCommits={daysWithCommits}
          mergedPRs={mergedPRs}
          totalCommits={totalCommits}
					previousPeriodCommits={previousPeriodCommits}
					growthVelocityPct={growthVelocityPct}
					commitDays={commitDays}
          treeLoaded={treeLoaded}
          onTreeLoad={() => setTreeLoaded(true)}
          onViewProfile={setProfileUsername}
          onShowMyProfile={() => setProfileUsername("")}
          onLogout={handleExit}
          exitLabel={token ? "Logout" : "Back"}
        />
      )}
      <Toaster />
    </>
  );
}
export default App;
