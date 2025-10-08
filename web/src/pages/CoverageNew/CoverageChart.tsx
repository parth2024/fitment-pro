import React, { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Bar, getElementAtEvent } from "react-chartjs-2";
// Remove problematic imports and use any type for now
import { Coverage, CoverageSelectedMake } from "./types";
import "./Coverage.css";

interface CoverageChartProps {
  coverage: Coverage[];
  onMakeSelect: (bar: CoverageSelectedMake) => void;
}

type ScaleMode = "x" | "y" | "xy";

const defaultOptions = {
  plugins: {
    legend: {
      display: true,
      position: "bottom" as const,
    },
    zoom: {
      pan: {
        enabled: true,
        mode: "x" as ScaleMode,
      },
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: "x" as ScaleMode,
      },
    },
  },
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      ticks: {
        autoSkip: true,
        minRotation: 90,
        font: {
          size: 15,
        },
      },
      stacked: true,
    },
    y: {
      stacked: true,
    },
  },
};

const CoverageChart: React.FC<CoverageChartProps> = (props) => {
  const [labels, setLabels] = useState<string[]>([]);
  const [withFitments, setWithFitments] = useState<number[]>([]);
  const [withoutFitments, setWithoutFitments] = useState<number[]>([]);
  const chartRef = useRef<any>();

  useEffect(() => {
    setLabels(props.coverage.map((c) => c.make));
    setWithFitments(props.coverage.map((c) => c.fittedConfigsCount));
    setWithoutFitments(
      props.coverage.map((c) => c.configsCount - c.fittedConfigsCount)
    );

    if (chartRef.current !== undefined) {
      chartRef.current.resetZoom();
    }
  }, [props.coverage]);

  const onClick = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (chartRef.current !== undefined) {
      const element = getElementAtEvent(chartRef.current, event)[0];
      if (!element) {
        return;
      }
      props.onMakeSelect({
        make: labels[element.index],
        withFitments: element.datasetIndex === 0,
      });
    }
  };

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
    zoomPlugin
  );

  const data = {
    labels,
    datasets: [
      {
        label: "With Fitments",
        data: withFitments,
        backgroundColor: "grey",
      },
      {
        label: "Without Fitments",
        data: withoutFitments,
        backgroundColor: "rgb(217, 217, 217)",
      },
    ],
  };

  return (
    <div className="CoverageChart" style={{ margin: "0", boxShadow: "none" }}>
      <div className="chart-container">
        <Bar
          ref={chartRef}
          onClick={onClick}
          options={defaultOptions}
          data={data}
        />
      </div>
    </div>
  );
};

export default CoverageChart;
