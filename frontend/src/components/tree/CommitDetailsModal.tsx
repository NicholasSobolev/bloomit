import { Box, Button, Flex, Text } from "@chakra-ui/react";
import type { CommitDay } from "../../hooks/useCommitData";
import { getCommitTypeStyle } from "./commitUtils";

interface CommitDetailsModalProps {
  selectedCommitDay: CommitDay | null;
  selectedCommitDetails: CommitDay["commits"];
  onClose: () => void;
}

export default function CommitDetailsModal({ selectedCommitDay, selectedCommitDetails, onClose }: CommitDetailsModalProps) {
  if (!selectedCommitDay) return null;

  return (
    <Box position="absolute" inset={0} zIndex={3} bg="rgba(2, 8, 8, 0.7)" onClick={onClose}>
      <Flex
        position="absolute"
        top="7%"
        left="50%"
        transform="translateX(-50%)"
        w="min(980px, calc(100vw - 48px))"
        h="min(84vh, 760px)"
        direction="column"
        bg="rgba(3, 10, 10, 0.92)"
        border="1px solid"
        borderColor="rgba(112, 142, 136, 0.55)"
        borderRadius="16px"
        boxShadow="0 30px 60px rgba(0, 0, 0, 0.45)"
        p={5}
        onClick={(event) => event.stopPropagation()}
      >
        <Flex justify="space-between" align="center" mb={3}>
          <Box>
            <Text fontSize="2xl" color="whiteAlpha.900" fontWeight="bold">
              {selectedCommitDay.date}
            </Text>
            <Text color="whiteAlpha.700" fontSize="sm">
              {selectedCommitDay.count} commit{selectedCommitDay.count > 1 ? "s" : ""}
            </Text>
          </Box>
          <Button
            size="sm"
            variant="outline"
            color="whiteAlpha.900"
            borderColor="rgba(112, 142, 136, 0.7)"
            _hover={{ bg: "rgba(112, 142, 136, 0.2)" }}
            onClick={onClose}
          >
            Close
          </Button>
        </Flex>

        <Box flex="1" overflowY="auto" pr={1}>
          <Flex direction="column" gap={3}>
            {selectedCommitDetails.map((entry, index) => {
              const commitTime = entry.timestamp
                ? new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })
                : "--:--:--";
              const typeStyle = getCommitTypeStyle(entry.message);

              return (
                <Box
                  key={`${selectedCommitDay.date}-${entry.url}-${index}`}
                  border="1px solid"
                  borderColor={typeStyle.border}
                  borderRadius="12px"
                  p={3}
                  bg={typeStyle.bg}
                >
                  <Flex justify="space-between" align="flex-start" mb={2} gap={3}>
                    <Text color="whiteAlpha.700" fontSize="xs">
                      #{index + 1} · {entry.repository}
                    </Text>
                    <Text color="whiteAlpha.700" fontSize="xs" textAlign="right" whiteSpace="nowrap">
                      {commitTime}
                    </Text>
                  </Flex>
                  {typeStyle.label && (
                    <Text color="whiteAlpha.700" fontSize="xs" textTransform="uppercase" mb={2}>
                      {typeStyle.label}
                    </Text>
                  )}
                  <Text color="whiteAlpha.900" mb={3}>
                    {entry.message}
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    color="whiteAlpha.900"
                    borderColor="rgba(112, 142, 136, 0.7)"
                    _hover={{ bg: "rgba(112, 142, 136, 0.2)" }}
                    onClick={() => window.open(entry.url, "_blank", "noopener,noreferrer")}
                  >
                    Open on GitHub
                  </Button>
                </Box>
              );
            })}
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
