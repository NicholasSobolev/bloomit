import { type RefObject } from "react";
import { Button, Text, Icon, Box, Flex } from "@chakra-ui/react";
import Loading from "./Loading";

interface LoggedOutViewProps {
  containerRef: RefObject<HTMLDivElement | null>;
  vantaEffect: any;
  onLogin: () => void;
}

export default function LoggedOutView({
  containerRef,
  vantaEffect,
  onLogin,
}: LoggedOutViewProps) {
  return (
    <Box ref={containerRef} bg="#002222" height="100vh" width="100vw">
      {vantaEffect ? (
        <Flex align="center" justify="flex-start" height="full" ml={250}>
          <Flex direction="column" gap={4} align="flex-start">
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
          </Flex>
        </Flex>
      ) : (
        <Flex align="center" justify="center" height="full">
          <Loading />
        </Flex>
      )}
    </Box>
  );
}
