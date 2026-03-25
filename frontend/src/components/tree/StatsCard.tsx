import { Box, Text } from "@chakra-ui/react";

interface StatsCardProps {
  value: number | string;
  label: string;
}

export default function StatsCard({ value, label }: StatsCardProps) {
  return (
    <Box
      w="100%"
      h="76px"
      borderRadius="10px"
      border="1px solid"
      borderColor="rgba(112, 142, 136, 0.55)"
      bg="rgba(3, 10, 10, 0.86)"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      px={1.5}
      boxShadow="inset 0 0 0 1px rgba(255, 255, 255, 0.02)"
    >
      <Text color="whiteAlpha.900" fontSize="xl" lineHeight="1" fontWeight="semibold" mb={0.5}>
        {value}
      </Text>
      <Text color="whiteAlpha.700" fontSize="xs" lineHeight="1.2">
        {label}
      </Text>
    </Box>
  );
}
