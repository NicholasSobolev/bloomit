import { Button, Flex } from "@chakra-ui/react";
import type { CommitSortMode } from "./types";

interface SortModeToggleProps {
  commitSortMode: CommitSortMode;
  onChange: (mode: CommitSortMode) => void;
}

export default function SortModeToggle({ commitSortMode, onChange }: SortModeToggleProps) {
  return (
    <Flex
      position="absolute"
      top="12px"
      left="24px"
      zIndex={2}
      border="1px solid"
      borderColor="rgba(112, 142, 136, 0.55)"
      borderRadius="6px"
      bg="rgba(3, 10, 10, 0.86)"
      overflow="hidden"
    >
      <Button
        size="xs"
        borderRadius="0"
        variant="ghost"
        color={commitSortMode === "date" ? "whiteAlpha.900" : "whiteAlpha.700"}
        bg={commitSortMode === "date" ? "rgba(112, 142, 136, 0.28)" : "transparent"}
        _hover={{ bg: "rgba(112, 142, 136, 0.2)" }}
        onClick={() => onChange("date")}
      >
        By Date
      </Button>
      <Button
        size="xs"
        borderRadius="0"
        variant="ghost"
        color={commitSortMode === "repository" ? "whiteAlpha.900" : "whiteAlpha.700"}
        bg={commitSortMode === "repository" ? "rgba(112, 142, 136, 0.28)" : "transparent"}
        _hover={{ bg: "rgba(112, 142, 136, 0.2)" }}
        onClick={() => onChange("repository")}
      >
        By Repo
      </Button>
    </Flex>
  );
}
