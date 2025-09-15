import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Progress,
  Button,
  Center,
  ThemeIcon,
} from "@mantine/core";
import {
  IconClock,
  IconRocket,
  IconBell,
  IconMail,
  IconBug,
  IconSettings,
} from "@tabler/icons-react";

export default function Mismatches() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl" align="center">
        {/* Header Section */}
        <Card
          shadow="lg"
          padding="xl"
          radius="md"
          withBorder
          style={{ width: "100%", maxWidth: 800 }}
        >
          <Stack gap="md" align="center">
            <ThemeIcon
              size={80}
              radius="xl"
              variant="gradient"
              gradient={{ from: "blue", to: "purple" }}
            >
              <IconRocket size={40} />
            </ThemeIcon>

            <Title order={1} ta="center" c="blue">
              Mismatches Analysis
            </Title>

            <Badge
              size="lg"
              variant="gradient"
              gradient={{ from: "orange", to: "red" }}
            >
              Coming Soon
            </Badge>

            <Text size="lg" c="dimmed" ta="center" maw={600}>
              Advanced mismatch detection and analysis tools are currently in
              development. This powerful feature will help you identify and
              resolve fitment conflicts across your inventory.
            </Text>
          </Stack>
        </Card>

        {/* Back to Dashboard */}
        <Center>
          <Button
            size="lg"
            variant="gradient"
            gradient={{ from: "blue", to: "purple" }}
            component="a"
            href="/"
          >
            Back to Dashboard
          </Button>
        </Center>
      </Stack>
    </Container>
  );
}
