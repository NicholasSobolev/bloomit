import { useEffect, useState } from "react";
import axios from "axios";
import { Box, Button, Flex, Image, Input, Text } from "@chakra-ui/react";
import { parseGitHubUsername } from "../utils/githubProfile";

interface ProfileResult {
  login: string;
  avatar_url?: string;
  html_url?: string;
}

interface ProfileSearchInputProps {
  token?: string | null;
  onViewProfile: (username: string) => void;
  placeholder?: string;
  inputBg?: string;
  inputBorderColor?: string;
  buttonLabel?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export default function ProfileSearchInput({
  token,
  onViewProfile,
  placeholder = "Username or GitHub profile URL",
  inputBg = "rgba(255,255,255,0.05)",
  inputBorderColor = "whiteAlpha.300",
  buttonLabel = "View",
  size = "sm",
}: ProfileSearchInputProps) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const parsed = parseGitHubUsername(trimmed);
    if (parsed && trimmed.includes("github.com")) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const params: Record<string, string | number> = {
          query: trimmed,
          limit: 4,
        };
        if (token) {
          params.token = token;
        }

        const response = await axios.get(`${apiBaseUrl}/search_profiles`, { params });
        const profiles = response.data?.profiles ?? [];
        setResults(profiles);
        setIsOpen(profiles.length > 0);
        setHighlightedIndex(profiles.length > 0 ? 0 : -1);
      } catch {
        setResults([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [apiBaseUrl, query, token]);

  const submitSearch = (selectedUsername?: string) => {
    const parsed = selectedUsername || parseGitHubUsername(query);
    if (!parsed) return;
    onViewProfile(parsed);
    setQuery(parsed);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <Flex gap={2} align="center" w="full">
      <Box position="relative" flex={1}>
        <Input
          size={size}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(results.length > 0);
            setHighlightedIndex(results.length > 0 ? 0 : -1);
          }}
          onBlur={() => setTimeout(() => setIsOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              if (!results.length) return;
              event.preventDefault();
              setIsOpen(true);
              setHighlightedIndex((current) => {
                if (current < 0) return 0;
                return (current + 1) % results.length;
              });
              return;
            }

            if (event.key === "ArrowUp") {
              if (!results.length) return;
              event.preventDefault();
              setIsOpen(true);
              setHighlightedIndex((current) => {
                if (current < 0) return results.length - 1;
                return (current - 1 + results.length) % results.length;
              });
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              submitSearch(results[highlightedIndex]?.login || results[0]?.login);
            }

            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          bg={inputBg}
          borderColor={inputBorderColor}
        />

        {isOpen && (
          <Box
            position="absolute"
            top="calc(100% + 8px)"
            left={0}
            right={0}
            zIndex={10}
            bg="rgba(3, 10, 10, 0.98)"
            border="1px solid"
            borderColor="rgba(112, 142, 136, 0.55)"
            borderRadius="10px"
            overflow="hidden"
          >
            {results.map((profile, index) => (
              <Flex
                key={profile.login}
                align="center"
                gap={2}
                px={3}
                py={2}
                cursor="pointer"
                bg={index === highlightedIndex ? "rgba(112, 142, 136, 0.24)" : "transparent"}
                _hover={{ bg: "rgba(112, 142, 136, 0.2)" }}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  submitSearch(profile.login);
                }}
              >
                {profile.avatar_url && (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.login}
                    boxSize="24px"
                    borderRadius="full"
                  />
                )}
                <Text fontSize="sm" color="whiteAlpha.900">
                  @{profile.login}
                </Text>
              </Flex>
            ))}
          </Box>
        )}
      </Box>
      <Button size={size} onClick={() => submitSearch()}>{buttonLabel}</Button>
    </Flex>
  );
}
