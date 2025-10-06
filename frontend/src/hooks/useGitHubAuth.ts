import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toaster } from "@/components/ui/toaster";

export const useGitHubAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
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
        try {
          const userRes = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `token ${newToken}` },
          });
          console.log("GitHub user:", userRes.data);
          setUsername(userRes.data.login);
          setAvatarUrl(userRes.data.avatar_url);
          setEmail(userRes.data.email || userRes.data.company || "");
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

  const logout = () => {
    setToken(null);
    localStorage.removeItem("token");
    setUsername("");
    setAvatarUrl("");
    setEmail("");
    toaster.create({
      title: "Logout successful",
      description: "You successfully logged out.",
      type: "success",
    });
  };

  return {
    token,
    username,
    avatarUrl,
    email,
    isInitializing,
    login,
    logout,
  };
};
