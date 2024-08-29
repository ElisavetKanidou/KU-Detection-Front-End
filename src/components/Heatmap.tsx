import React from "react";
import ReactApexChart from "react-apexcharts";
import { AnalysisResult } from "@/lib/types";
import { ApexOptions } from "apexcharts";

interface HeatmapProps {
  analysisResults: AnalysisResult[];
}

const Heatmap: React.FC<HeatmapProps> = ({ analysisResults }) => {
  const authors = Array.from(
    new Set(analysisResults.map((result) => result.author))
  );
  const kus = Object.keys(analysisResults[0].detected_kus);

  const series = authors.map((author) => {
    const data = kus.map((ku) => {
      const authorResults = analysisResults.filter(
        (result) => result.author === author
      );
      const kuCount = authorResults.reduce(
        (acc, result) => acc + result.detected_kus[ku],
        0
      );
      return { x: ku, y: kuCount };
    });
    return { name: author, data };
  });

  const options: ApexOptions = {
    chart: {
      type: "heatmap",
      toolbar: {
        show: false,
      },
    },
    legend: {
      show: false,
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 0,
        enableShades: true,
        useFillColorAsStroke: false,
        colorScale: {
          ranges: [
            {
              from: 0,
              to: 20,
              color: "#0D0887",
            },
          ],
        },
      },
    },
    stroke: {
      width: 0.1,
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      type: "category",
      categories: kus,
    },
  };

  return (
    <div id="chart">
      <ReactApexChart options={options} series={series} type="heatmap" />
    </div>
  );
};

export default Heatmap;
