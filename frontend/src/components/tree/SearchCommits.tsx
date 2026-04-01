import { Badge, Box, HStack, Icon, Input, Kbd, Stack, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { FiSearch } from "react-icons/fi";
import type { CommitDay } from "../../hooks/useCommitData";

interface SearchCommit {
  id: string;
  message: string;
  date: string;
  repo: string;
  url: string;
}

interface SearchCommitsProps {
  commitDays: CommitDay[];
}

export default function SearchCommits({ commitDays }: SearchCommitsProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const commits = useMemo<SearchCommit[]>(() => {
    return commitDays.flatMap((day, dayIndex) => {
      if (day.commits.length === 0) {
        return [
          {
            id: `${day.date}-${dayIndex}`,
            message: day.message,
            date: day.date,
            repo: "general",
            url: day.url,
          },
        ];
      }

      return day.commits.map((commit, commitIndex) => ({
        id: `${day.date}-${commitIndex}-${commit.url}`,
        message: commit.message,
        date: day.date,
        repo: commit.repository,
        url: commit.url,
      }));
    });
  }, [commitDays]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const searchTerm = trimmed.toLowerCase();
    return commits
      .filter(
        (commit) =>
          commit.message.toLowerCase().includes(searchTerm) ||
          commit.date.includes(searchTerm) ||
          commit.repo.toLowerCase().includes(searchTerm),
      )
      .slice(0, 8);
  }, [commits, query]);

  const platformLabel = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl";
    return navigator.platform.toLowerCase().includes("mac") ? <img src="/MaterialSymbolsCommand.svg" alt="Command" /> : "Ctrl";
                
  }, []);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setIsOpen(true);
  };

  const selectCommit = (commit: SearchCommit) => {
    window.open(commit.url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => (index + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => (index - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selectedCommit = results[selectedIndex];
      if (selectedCommit) selectCommit(selectedCommit);
    }
  };

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <Box ref={containerRef} position="relative" w="100%">
      <Box position="absolute" left="8px" top="50%" transform="translateY(-50%)" color="whiteAlpha.500" zIndex={1}>
        <Icon as={FiSearch} boxSize={3.5} />
      </Box>

      <Input
        ref={inputRef}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim() && setIsOpen(true)}
        placeholder="Search commits..."
        ps="30px"
        pe="74px"
        size="sm"
        bg="rgba(3, 10, 10, 0.86)"
        border="1px solid"
        borderColor="rgba(112, 142, 136, 0.55)"
        color="whiteAlpha.900"
        _placeholder={{ color: "whiteAlpha.500" }}
        _hover={{ borderColor: "rgba(112, 142, 136, 0.75)" }}
        _focus={{ borderColor: "rgba(178, 214, 207, 0.9)", boxShadow: "none" }}
      />

      <HStack
        pointerEvents="none"
        spacing={1}
        position="absolute"
        right="8px"
        top="50%"
        transform="translateY(-50%)"
        color="whiteAlpha.500"
      >
        <Kbd fontSize="9px" py={0} px={1}>
          {platformLabel}
        </Kbd>
        <Kbd fontSize="9px" py={0} px={1}>
          K
        </Kbd>
      </HStack>

      {showDropdown && (
        <Box
          position="absolute"
          top={0}
          left="calc(100% + 12px)"
          w="420px"
          zIndex={5}
          bg="rgba(3, 10, 10, 0.96)"
          border="1px solid"
          borderColor="rgba(112, 142, 136, 0.55)"
          borderRadius="10px"
          maxH="360px"
          overflowY="auto"
          overflowX="hidden"
          boxShadow="0 12px 24px rgba(0, 0, 0, 0.45)"
        >
          {results.length === 0 ? (
            <Box px={3} py={3}>
              <Text fontSize="xs" color="whiteAlpha.600">
                No commits match "{query}"
              </Text>
            </Box>
          ) : (
            <Stack gap={0}>
              {results.map((commit, index) => (
                <Box
                  key={commit.id}
                  px={3}
                  py={2}
                  bg={index === selectedIndex ? "rgba(112, 142, 136, 0.24)" : "transparent"}
                  cursor="pointer"
                  _hover={{ bg: "rgba(112, 142, 136, 0.2)" }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => selectCommit(commit)}
                >
                  <HStack justify="space-between" align="start" gap={2}>
                    <Box minW={0} flex={1}>
                      <Text fontSize="sm" color="whiteAlpha.900" lineClamp={1}>
                        {highlightMatch(commit.message, query)}
                      </Text>
                      <Text fontSize="xs" color="whiteAlpha.600">
                        {commit.date}
                      </Text>
                    </Box>
                    <Badge fontSize="10px" variant="subtle" colorPalette="green" flexShrink={0}>
                      {commit.repo}
                    </Badge>
                  </HStack>
                </Box>
              ))}
              <Box px={3} py={1.5} borderTop="1px solid" borderColor="rgba(112, 142, 136, 0.35)">
                <Text fontSize="10px" color="whiteAlpha.500">
                  {results.length} result{results.length !== 1 ? "s" : ""} - use arrows and Enter
                </Text>
              </Box>
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}

function highlightMatch(text: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return text;

  const matchStart = text.toLowerCase().indexOf(normalizedQuery);
  if (matchStart < 0) return text;

  const matchEnd = matchStart + normalizedQuery.length;

  return (
    <>
      {text.slice(0, matchStart)}
      <Box as="mark" bg="rgba(178, 214, 207, 0.3)" color="whiteAlpha.900" borderRadius="3px" px="1px">
        {text.slice(matchStart, matchEnd)}
      </Box>
      {text.slice(matchEnd)}
    </>
  );
}
