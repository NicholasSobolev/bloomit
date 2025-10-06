import { useState, useEffect } from "react";
import axios from "axios";
import { toaster } from "@/components/ui/toaster";

export const useCommitData = (
  token: string | null,
  username: string,
  isNewLogin: boolean,
) => {
  const [streak, setStreak] = useState(0);
  const [maxstreak, setMaxstreak] = useState(0);
  const [health, setHealth] = useState(0);
  const [dayswithcommits, setDayswithcommits] = useState(0);

  useEffect(() => {
    if (!token || !username) return;

    const fetchData = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/commit_activity?token=${token}&username=${username}`,
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
    fetchData();
  }, [token, username, isNewLogin]);

  return { streak, maxstreak, health, dayswithcommits };
};
