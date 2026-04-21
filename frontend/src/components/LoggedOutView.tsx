import { Button, Text, Icon, Box, Flex, Image } from "@chakra-ui/react";
import tree from '../assets/tree.jpeg'
import ProfileSearchInput from "./ProfileSearchInput";

interface LoggedOutViewProps {
  token?: string | null;
  onLogin: () => void;
  onViewProfile: (username: string) => void;
}

export default function LoggedOutView({
  token,
  onLogin,
  onViewProfile,
}: LoggedOutViewProps) {
  return (
    <Box bg="#002222" height="100vh" width="100vw">
      <Flex align="stretch" height="full" width="full" overflow="hidden">
          <Flex
            direction="column"
            gap={4}
            align="flex-start"
            justify="center"
            width={{ base: "100%", md: "45%" }}
            position="relative"
            px={{ base: 6, md: 12 }}
            zIndex={1}
          >
            <Text
              fontSize="6xl"
              fontWeight="bold"
              marginBottom="0"
              lineHeight="0.5"
            >
              bloomit
            </Text>
            <Text fontSize="2xl" fontWeight="medium">
              code. commit. blossom.
            </Text>
            <Button onClick={onLogin}>
              <Icon boxSize={6}>
                <img src="/GrommetIconsGithub.svg" alt="Github" />
              </Icon>
              Login with GitHub
            </Button>
            <Flex align="center" gap={2} width="100%">
              <Flex align="center" gap={2} flex="1">
                <Box bg="whiteAlpha.400" flex="1" height="1px" />
                <Text fontSize="xs" color="whiteAlpha.800">
                  or
                </Text>
                <Box bg="whiteAlpha.400" flex="1" height="1px" />
              </Flex>
              <Button size="sm" visibility="hidden" pointerEvents="none" tabIndex={-1}>
                View Tree
              </Button>
            </Flex>
            <Box mt={2} w="full">
              <ProfileSearchInput
                token={token}
                onViewProfile={onViewProfile}
                buttonLabel="View Tree"
              />
            </Box>
            <Flex
              position="absolute"
              bottom={{ base: 4, md: 6 }}
              left={{ base: 6, md: 12 }}
              gap={4}
              align="center"
            >
              <Button size="sm" variant="ghost" p={0} minW="auto" height="auto" color="whiteAlpha.800">
                Privacy Policy
              </Button>
              <Text fontSize="sm" color="whiteAlpha.600" aria-hidden="true">
                |
              </Text>
              <Button size="sm" variant="ghost" p={0} minW="auto" height="auto" color="whiteAlpha.800">
                Terms of Service
              </Button>
            </Flex>
          </Flex>
          <Flex
            display={{ base: "none", md: "flex" }}
            flex="1"
            height="full"
            position="relative"
            align="stretch"
            justify="flex-end"
            overflow="hidden"
          >
            <Image
              src={tree}
              alt="Tree"
              width="100%"
              height="100%"
              objectFit="cover"
              objectPosition="left center"
              transform="scale(1.17)"
            />
            <Box
              position="absolute"
              inset={0}
              zIndex={1}
              style={{
                background: "linear-gradient(90deg, rgba(0, 34, 34, 1) 10%, rgba(0, 34, 34, 0) 100%)",
              }}
              pointerEvents="none"
            />
          </Flex>
        </Flex>
    </Box>
  );
}
