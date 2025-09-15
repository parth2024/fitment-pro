import { Select } from "@mantine/core";
import { PartWithFitments } from "../api/services";

interface PartSelectorProps {
  parts: PartWithFitments[];
  selectedPart: PartWithFitments | null;
  onPartSelect: (part: PartWithFitments | null) => void;
  loading?: boolean;
}

export function PartSelector({
  parts,
  selectedPart,
  onPartSelect,
  loading,
}: PartSelectorProps) {
  const getPartDisplayName = (part: PartWithFitments): string => {
    const status = part.itemStatus === "Active" ? "Active" : "Inactive";
    return `${part.id} - ${part.description} (${status}) - ${part.fitmentCount} fitments`;
  };

  return (
    <Select
      label="Select Part"
      placeholder="Choose a part to analyze"
      value={selectedPart?.id || ""}
      onChange={(value) => {
        const part = parts.find((p) => p.id === value) || null;
        onPartSelect(part);
      }}
      data={parts.map((part) => ({
        value: part.id,
        label: getPartDisplayName(part),
      }))}
      searchable
      required
      disabled={loading}
      description={
        loading
          ? "Loading parts..."
          : "Select a part that has existing fitments to get AI recommendations"
      }
    />
  );
}
