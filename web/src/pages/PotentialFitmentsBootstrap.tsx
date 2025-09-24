import React, { useState, useEffect, useCallback } from "react";
import { Card, Row, Col, Button, Alert, Spinner } from "react-bootstrap";
import { dataUploadService, PartWithFitments } from "../api/services";
import { PotentialConfigsTableBootstrap } from "../components/PotentialConfigsTableBootstrap";
import { PartSelectorBootstrap } from "../components/PartSelectorBootstrap";

interface PotentialFitmentsBootstrapProps {
  user?: {
    accessToken?: string;
    hasPermissions?: (permissions: string[]) => boolean;
  };
  onError?: (error: any) => void;
}

export const PotentialFitmentsBootstrap: React.FC<
  PotentialFitmentsBootstrapProps
> = ({ user, onError }) => {
  const [parts, setParts] = useState<PartWithFitments[]>([]);
  const [selectedPart, setSelectedPart] = useState<PartWithFitments | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [method, setMethod] = useState<"similarity" | "base-vehicle">(
    "similarity"
  );
  const [triggerAnalysis, setTriggerAnalysis] = useState(false);

  // Load parts on component mount
  useEffect(() => {
    const loadParts = async () => {
      setLoading(true);
      try {
        const data = await dataUploadService.getPartsWithFitments();
        setParts(data.data);
      } catch (error) {
        const errorMessage = "Failed to load parts. Please try again.";
        setError(errorMessage);
        onError?.(error);
        console.error("Error loading parts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadParts();
  }, [onError]);

  const handlePartSelect = useCallback((part: PartWithFitments | null) => {
    setSelectedPart(part);
    setError(null);
    setSuccess(null);
  }, []);

  const handleError = useCallback(
    (error: any) => {
      const errorMessage =
        error?.response?.data?.error || error?.message || "An error occurred";
      setError(errorMessage);
      onError?.(error);
      console.error("Error:", error);
    },
    [onError]
  );

  const handleSuccess = useCallback((message: string) => {
    setSuccess(message);
    // Clear success message after 5 seconds
    setTimeout(() => setSuccess(null), 5000);
  }, []);

  const handleAnalyzeClick = () => {
    if (selectedPart) {
      setTriggerAnalysis(true);
      setError(null);
      setSuccess(null);
    }
  };

  const resetForm = () => {
    setSelectedPart(null);
    setError(null);
    setSuccess(null);
    setTriggerAnalysis(false);
    setMethod("similarity"); // Reset to default method
  };

  const handleMethodChange = (newMethod: "similarity" | "base-vehicle") => {
    setMethod(newMethod);
    setTriggerAnalysis(false); // Reset analysis when method changes
  };

  // Check permissions if user object is provided
  if (
    user?.hasPermissions &&
    !user.hasPermissions(["recommendation.potentialFitments"])
  ) {
    return (
      <Alert variant="warning">
        You don't have permission to access Potential Fitments.
      </Alert>
    );
  }

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Header */}
      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-1">Potential Fitments - AI Recommendations</h4>
              <p className="text-muted mb-0">
                Discover potential fitments using AI-powered similarity
                algorithms
              </p>
            </div>
            <i
              className="fas fa-lightbulb text-warning"
              style={{ fontSize: "28px" }}
            ></i>
          </div>
        </Card.Header>
        <Card.Body>
          <Alert variant="info">
            <i className="fas fa-lightbulb me-2"></i>
            Our algorithms analyze existing fitments to suggest new vehicle
            configurations that could be compatible with your selected part.
          </Alert>
        </Card.Body>
      </Card>

      {/* Configuration */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Configuration</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              {loading ? (
                <div className="text-center p-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading parts...</span>
                  </Spinner>
                  <p className="mt-2">Loading parts...</p>
                </div>
              ) : (
                <PartSelectorBootstrap
                  parts={parts}
                  selectedPart={selectedPart}
                  onPartSelect={handlePartSelect}
                  loading={loading}
                />
              )}
            </Col>
            <Col md={6}>
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Analysis Method
                </label>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="method"
                    id="similarity"
                    value="similarity"
                    checked={method === "similarity"}
                    onChange={(e) =>
                      setMethod(e.target.value as "similarity" | "base-vehicle")
                    }
                  />
                  <label className="form-check-label" htmlFor="similarity">
                    <div>
                      <strong>Similarity Analysis</strong>
                      <br />
                      <small className="text-muted">
                        Find vehicles with similar make, model, and year
                        patterns
                      </small>
                    </div>
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="method"
                    id="base-vehicle"
                    value="base-vehicle"
                    checked={method === "base-vehicle"}
                    onChange={(e) =>
                      setMethod(e.target.value as "similarity" | "base-vehicle")
                    }
                  />
                  <label className="form-check-label" htmlFor="base-vehicle">
                    <div>
                      <strong>Base Vehicle Analysis</strong>
                      <br />
                      <small className="text-muted">
                        Find other configurations of the same base vehicle
                        platform
                      </small>
                    </div>
                  </label>
                </div>
              </div>

              <div className="d-flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleAnalyzeClick}
                  disabled={!selectedPart}
                >
                  <i className="fas fa-chart-line me-2"></i>
                  Analyze Potential Fitments
                </Button>
                <Button variant="outline-secondary" onClick={resetForm}>
                  <i className="fas fa-refresh me-2"></i>
                  Reset
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert
          variant="danger"
          className="mb-4"
          dismissible
          onClose={() => setError(null)}
        >
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Success Display */}
      {success && (
        <Alert
          variant="success"
          className="mb-4"
          dismissible
          onClose={() => setSuccess(null)}
        >
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </Alert>
      )}

      {/* Potential Configurations Table */}
      {selectedPart && (
        <Card className="mb-4">
          <Card.Body>
            <PotentialConfigsTableBootstrap
              key={`configs-table-${selectedPart.id}-${method}-${triggerAnalysis}`}
              partId={selectedPart.id}
              method={method}
              onError={handleError}
              onSuccess={handleSuccess}
              triggerAnalysis={triggerAnalysis}
              onMethodChange={handleMethodChange}
            />
          </Card.Body>
        </Card>
      )}

      {/* Method Info */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Analysis Methods</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h6>Similarity Analysis</h6>
              <p className="text-muted">
                Analyzes patterns in existing fitments to find vehicles with
                similar characteristics (make, model, year range, drivetrain).
                Uses machine learning to score compatibility based on historical
                fitting success.
              </p>
            </Col>
            <Col md={6}>
              <h6>Base Vehicle Analysis</h6>
              <p className="text-muted">
                Identifies vehicles that share the same platform or base vehicle
                ID. These typically have identical mounting points and
                mechanical compatibility, making them excellent candidates for
                new fitments.
              </p>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PotentialFitmentsBootstrap;
