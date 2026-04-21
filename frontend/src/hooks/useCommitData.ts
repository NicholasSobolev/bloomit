import { useState, useEffect } from "react";
import axios from "axios";
import { toaster } from "@/components/ui/toaster";

export interface CommitDay {
  date: string;
  count: number;
  message: string;
  url: string;
  commits: {
    message: string;
    url: string;
    repository: string;
    timestamp?: string;
  }[];
}

export const useCommitData = (
  token: string | null,
  username: string,
  isNewLogin: boolean,
) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [daysWithCommits, setDaysWithCommits] = useState(0);
  const [mergedPRs, setMergedPRs] = useState(0);
  const [totalCommits, setTotalCommits] = useState(0);
  const [previousPeriodCommits, setPreviousPeriodCommits] = useState(0);
  const [growthVelocityPct, setGrowthVelocityPct] = useState(0);
  const [commitDays, setCommitDays] = useState<CommitDay[]>([]);

	const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!username) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string> = { username };
        if (token) {
          params.token = token;
        }
        const res = await axios.get(`${apiBaseUrl}/commit_activity`, { params });
        setStreak(res.data.streak);
        setMaxStreak(res.data.max_streak);
        setDaysWithCommits(res.data.days_with_commits.length);
        setMergedPRs(res.data.merged_prs);
        setTotalCommits(res.data.total_commits);
        setPreviousPeriodCommits(res.data.previous_period_commits ?? 0);
        setGrowthVelocityPct(res.data.growth_velocity_pct ?? 0);
        setCommitDays(res.data.commit_days ?? []);
      } catch (error) {
        console.error("Error fetching commits:", error);
        toaster.create({
          title: "Error",
          description: "Failed to fetch commit data.",
          type: "error",
        });
      } finally {
				setIsLoading(false);
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
  }, [apiBaseUrl, token, username, isNewLogin]);

  return {
    streak,
    maxStreak,
    daysWithCommits,
    mergedPRs,
    totalCommits,
    previousPeriodCommits,
    growthVelocityPct,
    commitDays,
    isLoading,
  };
};
