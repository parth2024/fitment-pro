import React from "react";
import { Form } from "react-bootstrap";
import { PartWithFitments } from "../api/services";

interface PartSelectorBootstrapProps {
  parts: PartWithFitments[];
  selectedPart: PartWithFitments | null;
  onPartSelect: (part: PartWithFitments | null) => void;
  loading?: boolean;
}

export const PartSelectorBootstrap: React.FC<PartSelectorBootstrapProps> = ({
  parts,
  selectedPart,
  onPartSelect,
  loading,
}) => {
  const getPartDisplayName = (part: PartWithFitments): string => {
    const status = part.itemStatus === "Active" ? "Active" : "Inactive";
    return `${part.id} - ${part.description} (${status}) - ${part.fitmentCount} fitments`;
  };

  return (
    <Form.Group>
      <Form.Label className="fw-semibold">
        Select Part for Recommendations
      </Form.Label>
      <Form.Select
        value={selectedPart?.id || ""}
        onChange={(e) => {
          const part = parts.find((p) => p.id === e.target.value) || null;
          onPartSelect(part);
        }}
        disabled={loading}
        size="lg"
      >
        <option value="">Choose a part...</option>
        {parts.map((part) => (
          <option key={part.id} value={part.id}>
            {getPartDisplayName(part)}
          </option>
        ))}
      </Form.Select>
      {loading && (
        <Form.Text className="text-muted">
          <i className="fas fa-spinner fa-spin me-1"></i>
          Loading parts...
        </Form.Text>
      )}
      {!loading && (
        <Form.Text className="text-muted">
          Select a part that has existing fitments to get AI recommendations
        </Form.Text>
      )}
    </Form.Group>
  );
};
