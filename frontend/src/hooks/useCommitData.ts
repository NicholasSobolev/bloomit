import { useState, useEffect } from "react";
import axios from "axios";
import { toaster } from "@/components/ui/toaster";

export const useCommitData = (
  token: string | null,
  username: string,
  isNewLogin: boolean,
) => {
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [daysWithCommits, setDaysWithCommits] = useState(0);
  const [mergedPRs, setMergedPRs] = useState(0);
  const [totalCommits, setTotalCommits] = useState(0);

  useEffect(() => {
    if (!token || !username) return;

    const fetchData = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/commit_activity?token=${token}&username=${username}`,
        );
        setStreak(res.data.streak);
        setMaxStreak(res.data.max_streak);
        setDaysWithCommits(res.data.days_with_commits.length);
        setMergedPRs(res.data.merged_prs);
        setTotalCommits(res.data.total_commits);
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
    fetchData();
  }, [token, username, isNewLogin]);

  return { streak, maxStreak, daysWithCommits, mergedPRs, totalCommits };
};
