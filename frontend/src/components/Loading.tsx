import { Flex, Spinner, Text } from "@chakra-ui/react";

export default function Loading() {
  return (
    <Flex direction="column" align="center">
      <Spinner size="xl" />
      <Text textStyle="md" mt={3}>
        loading :D
      </Text>
    </Flex>
  );
}
