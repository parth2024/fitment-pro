import React, { useCallback, useState } from "react";
import { Slider } from "@mui/material";
import { Container } from "react-bootstrap";
import { YearSelectedAttributes } from "./types";
import "./Coverage.css";
import { Text } from "@mantine/core";

interface CoverageYearsRangeProps {
  options: YearSelectedAttributes;
  values: YearSelectedAttributes;
  onPropertyChange: (filterParam: string, selected: number) => void;
}

const CoverageYearsRange: React.FC<CoverageYearsRangeProps> = (props) => {
  const [displayedMinYear, setDisplayedMinYear] = useState<number>(
    props.values["year-from"]
  );
  const [displayedMaxYear, setDisplayedMaxYear] = useState<number>(
    props.values["year-to"]
  );

  const marks = [
    props.options["year-from"],
    props.options["year-to"],
    displayedMinYear,
    displayedMaxYear,
  ].map((x) => {
    return { value: x, label: x };
  });

  const handleYearChange = useCallback(
    (_event: Event, newYear: number[] | number) => {
      const newYearArray = newYear as number[];
      setDisplayedMinYear(newYearArray[0]);
      setDisplayedMaxYear(newYearArray[1]);
    },
    [props.onPropertyChange]
  );

  const handleYearChangeCommitted = useCallback(
    (_event: React.SyntheticEvent | Event, newYear: number[] | number) => {
      const newYearArray = newYear as number[];
      props.onPropertyChange("year-from", newYearArray[0]);
      props.onPropertyChange("year-to", newYearArray[1]);
    },
    [props.onPropertyChange]
  );

  return (
    <Container
      className="PropertyContainer YearSliderContainer"
      style={{ margin: "0" }}
    >
      <Text mb={"sm"}>Year Range</Text>
      <Slider
        min={props.options["year-from"] || 1986}
        max={props.options["year-to"] || 2025}
        value={[displayedMinYear, displayedMaxYear]}
        marks={marks}
        onChangeCommitted={handleYearChangeCommitted}
        onChange={handleYearChange}
        valueLabelDisplay="auto"
        sx={{
          color: "#3b82f6",
          "& .MuiSlider-thumb": {
            backgroundColor: "#3b82f6",
          },
          "& .MuiSlider-track": {
            backgroundColor: "#3b82f6",
          },
          "& .MuiSlider-rail": {
            backgroundColor: "#e2e8f0",
          },
        }}
      />
    </Container>
  );
};

export default CoverageYearsRange;
