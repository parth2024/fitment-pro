import React, { useState } from "react";
import {
  Container,
  Title,
  Text,
  MultiSelect,
  Button,
  Group,
  Stack,
  Paper,
  Alert,
  Loader,
} from "@mantine/core";
import { IconBuilding, IconInfoCircle } from "@tabler/icons-react";
import { useEntity } from "../hooks/useEntity";

interface EntitySelectionWrapperProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  allowMultiple?: boolean;
}

const EntitySelectionWrapper: React.FC<EntitySelectionWrapperProps> = ({
  children,
  title,
  description,
  allowMultiple = true,
}) => {
  const { entities, loading, error } = useEntity();
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [hasSelected, setHasSelected] = useState(false);

  const handleContinue = () => {
    if (selectedEntities.length > 0) {
      setHasSelected(true);
    }
  };

  const handleBack = () => {
    setHasSelected(false);
    setSelectedEntities([]);
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md" align="center">
          <Loader size="lg" />
          <Text>Loading entities...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!hasSelected) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <div>
            <Title order={2} mb="sm">
              {title}
            </Title>
            {description && (
              <Text c="dimmed" size="lg">
                {description}
              </Text>
            )}
          </div>

          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="md">
                <IconBuilding
                  size={24}
                  color="var(--mantine-color-primary-6)"
                />
                <div>
                  <Title order={3}>Select Entities</Title>
                  <Text c="dimmed">
                    {allowMultiple
                      ? "Choose one or more entities to work with"
                      : "Choose an entity to work with"}
                  </Text>
                </div>
              </Group>

              <MultiSelect
                label={allowMultiple ? "Entities" : "Entity"}
                placeholder={
                  allowMultiple ? "Select entities..." : "Select an entity..."
                }
                data={entities.map((entity) => ({
                  value: entity.id,
                  label: entity.name,
                }))}
                value={selectedEntities}
                onChange={setSelectedEntities}
                searchable
                clearable
                maxValues={allowMultiple ? undefined : 1}
                required
              />

              <Alert icon={<IconInfoCircle size={16} />} color="blue">
                <Text size="sm">
                  {allowMultiple
                    ? "You can select multiple entities to perform bulk operations across them."
                    : "Select an entity to access its specific data and configurations."}
                </Text>
              </Alert>

              <Group justify="flex-end">
                <Button
                  onClick={handleContinue}
                  disabled={selectedEntities.length === 0}
                  size="lg"
                >
                  Continue
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>{title}</Title>
            <Text c="dimmed">
              Working with:{" "}
              {entities
                .filter((e) => selectedEntities.includes(e.id))
                .map((e) => e.name)
                .join(", ")}
            </Text>
          </div>
          <Button variant="outline" onClick={handleBack}>
            Change Entities
          </Button>
        </Group>
        {children}
      </Stack>
    </Container>
  );
};

export default EntitySelectionWrapper;
