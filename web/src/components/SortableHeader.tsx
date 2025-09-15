import { IconChevronUp, IconChevronDown } from "@tabler/icons-react";
import { Text, Group, ActionIcon } from "@mantine/core";

interface SortableHeaderProps {
  label: string;
  field: string;
  currentSortBy: string;
  currentSortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}

export default function SortableHeader({
  label,
  field,
  currentSortBy,
  currentSortOrder,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentSortBy === field;
  const isAsc = isActive && currentSortOrder === "asc";
  const isDesc = isActive && currentSortOrder === "desc";

  const getIcon = () => {
    if (isAsc) return <IconChevronUp size={14} />;
    if (isDesc) return <IconChevronDown size={14} />;
    return <IconChevronDown size={14} />;
  };

  return (
    <Group
      gap="xs"
      style={{ cursor: "pointer", userSelect: "none" }}
      onClick={() => onSort(field)}
    >
      <Text
        fw={600}
        size="sm"
        c={isActive ? "#3b82f6" : "#374151"}
        style={{
          transition: "color 0.2s ease",
        }}
      >
        {label}
      </Text>
      <ActionIcon
        size="xs"
        variant="subtle"
        color={isActive ? "blue" : "gray"}
        style={{
          transition: "color 0.2s ease",
        }}
      >
        {getIcon()}
      </ActionIcon>
    </Group>
  );
}
