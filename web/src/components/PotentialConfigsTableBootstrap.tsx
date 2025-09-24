import React, { useState, useEffect } from "react";
import { Table, Badge, Button, Form, Spinner, Alert } from "react-bootstrap";
import {
  dataUploadService,
  PotentiallyMissingConfiguration,
} from "../api/services";

interface PotentialConfigsTableBootstrapProps {
  partId: string;
  method: "similarity" | "base-vehicle";
  onError: (error: any) => void;
  onSuccess: (message: string) => void;
  triggerAnalysis?: boolean;
  onMethodChange?: (method: "similarity" | "base-vehicle") => void;
}

export const PotentialConfigsTableBootstrap: React.FC<
  PotentialConfigsTableBootstrapProps
> = ({
  partId,
  method,
  onError,
  onSuccess,
  triggerAnalysis = false,
  onMethodChange,
}) => {
  const [configurations, setConfigurations] = useState<
    PotentiallyMissingConfiguration[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedConfigs, setSelectedConfigs] = useState<Set<string>>(
    new Set()
  );
  const [applying, setApplying] = useState(false);
  const [localTriggerAnalysis, setLocalTriggerAnalysis] =
    useState(triggerAnalysis);

  // Update local trigger when prop changes
  useEffect(() => {
    setLocalTriggerAnalysis(triggerAnalysis);
  }, [triggerAnalysis]);

  // Fetch recommendations only when triggerAnalysis is true
  useEffect(() => {
    if (!partId || !localTriggerAnalysis) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const data = await dataUploadService.getPotentialFitments(
          partId,
          method
        );
        if (data.data.length === 0 && method === "similarity") {
          // Fallback to base-vehicle method if similarity returns no results
          const fallbackData = await dataUploadService.getPotentialFitments(
            partId,
            "base-vehicle"
          );
          setConfigurations(
            fallbackData.data.sort(
              (
                a: PotentiallyMissingConfiguration,
                b: PotentiallyMissingConfiguration
              ) => b.relevance - a.relevance
            )
          );
        } else {
          setConfigurations(
            data.data.sort(
              (
                a: PotentiallyMissingConfiguration,
                b: PotentiallyMissingConfiguration
              ) => b.relevance - a.relevance
            )
          );
        }
        setSelectedConfigs(new Set()); // Clear selections
      } catch (error) {
        onError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [partId, method, localTriggerAnalysis, onError]);

  // Reset triggerAnalysis after it's been used
  useEffect(() => {
    if (localTriggerAnalysis) {
      setLocalTriggerAnalysis(false);
    }
  }, [localTriggerAnalysis]);

  const handleConfigSelect = (configId: string, selected: boolean) => {
    const newSelected = new Set(selectedConfigs);
    if (selected) {
      newSelected.add(configId);
    } else {
      newSelected.delete(configId);
    }
    setSelectedConfigs(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedConfigs(new Set(configurations.map((c) => c.id)));
    } else {
      setSelectedConfigs(new Set());
    }
  };

  const handleApplySelected = async () => {
    if (selectedConfigs.size === 0) return;

    try {
      setApplying(true);

      // Apply fitment to all selected configurations
      const response = await dataUploadService.applyPotentialFitments({
        partId,
        configurationIds: Array.from(selectedConfigs),
        title: `AI Recommended Fitment`,
        description: `Recommended based on ${method} method`,
        quantity: 1,
      });

      onSuccess(
        `Successfully applied fitments to ${response.data.created} configurations!`
      );
      setSelectedConfigs(new Set());

      // Refresh recommendations
      setLoading(true);
      try {
        const data = await dataUploadService.getPotentialFitments(
          partId,
          method
        );
        setConfigurations(
          data.data.sort(
            (
              a: PotentiallyMissingConfiguration,
              b: PotentiallyMissingConfiguration
            ) => b.relevance - a.relevance
          )
        );
      } catch (error) {
        onError(error);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      onError(error);
    } finally {
      setApplying(false);
    }
  };

  const getRelevanceLabel = (relevance: number) => {
    if (relevance >= 80) return "Excellent Match";
    if (relevance >= 60) return "Good Match";
    if (relevance >= 40) return "Fair Match";
    return "Poor Match";
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading recommendations...</span>
        </Spinner>
        <p className="mt-2">Loading AI recommendations...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Form.Select
            value={method}
            onChange={(e) =>
              onMethodChange?.(e.target.value as "similarity" | "base-vehicle")
            }
            style={{ width: "auto" }}
          >
            <option value="similarity">Similarity Method</option>
            <option value="base-vehicle">Base Vehicle Method</option>
          </Form.Select>
        </div>

        {selectedConfigs.size > 0 && (
          <Button
            variant="primary"
            onClick={handleApplySelected}
            disabled={applying}
          >
            {applying ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Applying...
              </>
            ) : (
              <>
                <i className="fas fa-check me-2"></i>
                Apply Selected ({selectedConfigs.size})
              </>
            )}
          </Button>
        )}
      </div>

      {configurations.length === 0 ? (
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          No potential fitments found for this part using the {method} method.
        </Alert>
      ) : (
        <>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>
                  <Form.Check
                    type="checkbox"
                    checked={
                      selectedConfigs.size === configurations.length &&
                      configurations.length > 0
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Vehicle</th>
                <th>Specifications</th>
                <th>Relevance</th>
                <th>Match Quality</th>
              </tr>
            </thead>
            <tbody>
              {configurations.map((config) => (
                <tr key={config.id}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={selectedConfigs.has(config.id)}
                      onChange={(e) =>
                        handleConfigSelect(config.id, e.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <div>
                      <strong>
                        {config.year} {config.make} {config.model}
                      </strong>
                      <br />
                      <small className="text-muted">{config.submodel}</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="mb-1">
                        <Badge bg="light" text="dark" className="me-1">
                          {config.driveType}
                        </Badge>
                        <Badge bg="light" text="dark">
                          {config.fuelType}
                        </Badge>
                      </div>
                      <small className="text-muted">
                        {config.numDoors} doors • {config.bodyType}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <span
                        className="fw-bold me-2"
                        style={{ fontSize: "1.1rem" }}
                      >
                        {config.relevance}%
                      </span>
                      <div
                        className="progress"
                        style={{ width: "60px", height: "8px" }}
                      >
                        <div
                          className={`progress-bar ${
                            config.relevance >= 80
                              ? "bg-success"
                              : config.relevance >= 60
                              ? "bg-warning"
                              : "bg-danger"
                          }`}
                          style={{ width: `${config.relevance}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge
                      bg={
                        config.relevance >= 80
                          ? "success"
                          : config.relevance >= 60
                          ? "warning"
                          : "danger"
                      }
                      className="text-white"
                    >
                      {getRelevanceLabel(config.relevance)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="mt-3">
            <small className="text-muted">
              <i className="fas fa-info-circle me-1"></i>
              Showing {configurations.length} potential configurations using{" "}
              {method} method
            </small>
          </div>
        </>
      )}
    </div>
  );
};
