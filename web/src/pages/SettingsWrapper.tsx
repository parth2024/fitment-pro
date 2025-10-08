import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Loader, Text, Group } from "@mantine/core";

const SettingsWrapper: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Get current entity from localStorage
    const storedEntity = localStorage.getItem("current_entity");

    if (storedEntity) {
      try {
        const entity = JSON.parse(storedEntity);
        // Redirect to edit page for current entity
        navigate(`/edit-entity/${entity.id}`, { replace: true });
      } catch (err) {
        console.error("Failed to parse stored entity:", err);
        // If parsing fails, go to analytics
        navigate("/analytics", { replace: true });
      }
    } else {
      // No entity selected, go to analytics
      navigate("/analytics", { replace: true });
    }
  }, [navigate]);

  return (
    <Container size="xl" py="xl">
      <Group justify="center" style={{ minHeight: "60vh" }}>
        <Loader size="lg" />
        <Text>Redirecting to entity settings...</Text>
      </Group>
    </Container>
  );
};

export default SettingsWrapper;
