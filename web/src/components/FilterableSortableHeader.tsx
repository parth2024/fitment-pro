import { useState, useRef, useEffect } from "react";
import {
  Text,
  Group,
  ActionIcon,
  Popover,
  TextInput,
  Select,
  Button,
  Stack,
  Divider,
  Badge,
  NumberInput,
} from "@mantine/core";
import {
  IconChevronUp,
  IconChevronDown,
  IconFilter,
  IconX,
  IconSearch,
} from "@tabler/icons-react";

interface FilterableSortableHeaderProps {
  label: string;
  field: string;
  currentSortBy: string;
  currentSortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  filterType?: "text" | "select" | "number" | "date";
  filterOptions?: Array<{ value: string; label: string }>;
  filterValue?: any;
  onFilterChange?: (field: string, value: any) => void;
  onFilterClear?: (field: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}

export default function FilterableSortableHeader({
  label,
  field,
  currentSortBy,
  currentSortOrder,
  onSort,
  filterType = "text",
  filterOptions = [],
  filterValue,
  onFilterChange,
  onFilterClear,
  placeholder,
  min,
  max,
}: FilterableSortableHeaderProps) {
  const [opened, setOpened] = useState(false);
  const [localFilterValue, setLocalFilterValue] = useState(filterValue || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = currentSortBy === field;
  const isAsc = isActive && currentSortOrder === "asc";
  const isDesc = isActive && currentSortOrder === "desc";
  const hasFilter =
    filterValue !== "" && filterValue !== null && filterValue !== undefined;

  const getIcon = () => {
    if (isAsc) return <IconChevronUp size={14} />;
    if (isDesc) return <IconChevronDown size={14} />;
    return <IconChevronDown size={14} />;
  };

  const handleSort = () => {
    onSort(field);
  };

  const handleFilterApply = () => {
    if (onFilterChange) {
      onFilterChange(field, localFilterValue);
    }
    setOpened(false);
  };

  const handleFilterClear = () => {
    setLocalFilterValue("");
    if (onFilterClear) {
      onFilterClear(field);
    }
    setOpened(false);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleFilterApply();
    }
    if (event.key === "Escape") {
      setOpened(false);
    }
  };

  useEffect(() => {
    setLocalFilterValue(filterValue || "");
  }, [filterValue]);

  const renderFilterContent = () => {
    switch (filterType) {
      case "select":
        return (
          <Select
            ref={inputRef}
            placeholder={placeholder || `Filter by ${label}`}
            value={localFilterValue}
            onChange={(value) => setLocalFilterValue(value || "")}
            data={filterOptions}
            clearable
            searchable
            onKeyDown={handleKeyPress}
            // withinPortal={false}
            // dropdownComponent="div"
            styles={{
              input: {
                fontSize: "13px",
                height: "36px",
              },
            }}
            // onDropdownOpen={(event: any) => {
            //   // Prevent popover from closing when dropdown opens
            //   event?.stopPropagation();
            // }}
            // onDropdownClose={(event) => {
            //   // Prevent popover from closing when dropdown closes
            //   event?.stopPropagation();
            // }}
          />
        );
      case "number":
        return (
          <NumberInput
            ref={inputRef}
            placeholder={placeholder || `Filter by ${label}`}
            value={localFilterValue}
            onChange={(value) => setLocalFilterValue(value || "")}
            min={min}
            max={max}
            onKeyDown={handleKeyPress}
            styles={{
              input: {
                fontSize: "13px",
                height: "36px",
              },
            }}
          />
        );
      case "date":
        return (
          <TextInput
            ref={inputRef}
            type="date"
            placeholder={placeholder || `Filter by ${label}`}
            value={localFilterValue}
            onChange={(event) => setLocalFilterValue(event.currentTarget.value)}
            onKeyDown={handleKeyPress}
            styles={{
              input: {
                fontSize: "13px",
                height: "36px",
              },
            }}
          />
        );
      default:
        return (
          <TextInput
            ref={inputRef}
            placeholder={placeholder || `Filter by ${label}`}
            value={localFilterValue}
            onChange={(event) => setLocalFilterValue(event.currentTarget.value)}
            onKeyDown={handleKeyPress}
            leftSection={<IconSearch size={14} />}
            styles={{
              input: {
                fontSize: "13px",
                height: "36px",
              },
            }}
          />
        );
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        userSelect: "none",
        width: "100%",
        minHeight: "32px",
      }}
    >
      {/* Sort Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          cursor: "pointer",
          flex: 1,
        }}
        onClick={handleSort}
      >
        <Text
          fw={600}
          size="sm"
          c={isActive ? "#3b82f6" : "#374151"}
          style={{
            transition: "color 0.2s ease",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
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
            flexShrink: 0,
          }}
        >
          {getIcon()}
        </ActionIcon>
      </div>

      {/* Filter Button */}
      <Popover
        opened={opened}
        onChange={setOpened}
        position="bottom-start"
        withArrow
        shadow="md"
        radius="md"
        width={280}
        closeOnClickOutside={true}
        closeOnEscape={true}
        withinPortal={false}
      >
        <Popover.Target>
          <ActionIcon
            size="xs"
            variant={hasFilter ? "filled" : "subtle"}
            color={hasFilter ? "blue" : "gray"}
            onClick={() => setOpened(!opened)}
            style={{
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
          >
            <IconFilter size={12} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Text fw={600} size="sm">
                Filter by {label}
              </Text>
              {hasFilter && (
                <Badge size="xs" color="blue" variant="light">
                  Active
                </Badge>
              )}
            </Group>
            <Divider />
            {renderFilterContent()}
            <Group justify="space-between">
              <Button
                size="xs"
                variant="light"
                color="gray"
                onClick={handleFilterClear}
                leftSection={<IconX size={12} />}
                disabled={!hasFilter}
              >
                Clear
              </Button>
              <Button
                size="xs"
                onClick={handleFilterApply}
                disabled={localFilterValue === (filterValue || "")}
              >
                Apply
              </Button>
            </Group>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
