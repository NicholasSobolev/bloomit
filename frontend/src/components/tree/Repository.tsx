import { Box, Text, Circle } from "@chakra-ui/react";

interface RepositoryProps {
  repoName: string;
  commitCount: number;
  isMostRecent?: boolean;
  onOpen?: () => void;
}

export default function Repository({
  repoName,
  commitCount,
	isMostRecent,
  onOpen,
}: RepositoryProps) {
  return (
    <Box
      position="relative"
      overflow="hidden"
      isolation="isolate"
      w="100%"
      h="45px"
      borderRadius="10px"
      border="1px solid"
      borderColor="rgba(112, 142, 136, 0.55)"
      bg="rgba(3, 10, 10, 0.86)"
      display="flex"
      alignItems="center"
      px={3.5}
      boxShadow="inset 0 0 0 1px rgba(255,255,255,0.02)"
			_hover={{ borderColor: "rgba(112, 142, 136, 0.75)" }}
			_focus={{ borderColor: "rgba(178, 214, 207, 0.9)", boxShadow: "none" }}
      cursor="pointer"
      onClick={onOpen}
    >
      <Circle
        bg={isMostRecent ? "#10b981" : "#056060"}
        size="12px"
        outline="0.2em solid"
        outlineColor="bg"
      />

      <Text
        fontSize="xs"
        color="fg.muted"
        fontWeight="medium"
        px={1.5}
        flex={1}
        minW={0}
        textAlign="left"
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {repoName}
      </Text>
      <Text flexShrink={0} minW="3ch" textAlign="right">
        {commitCount}
      </Text>
    </Box>
  );
}
