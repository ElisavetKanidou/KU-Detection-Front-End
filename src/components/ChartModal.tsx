import React from 'react';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { ChartOptions, TooltipItem } from 'chart.js';

import {
  Chart as ChartJS,
  PointElement,
  LineElement,
  TimeScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(PointElement, LineElement, TimeScale, LinearScale, Tooltip, Legend, zoomPlugin);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  timestamps: string[];
}

const ChartModal: React.FC<ModalProps> = ({ isOpen, onClose, timestamps }) => {
  if (!isOpen) return null;

  // Aggregate commits by date
  const dateMap = timestamps.reduce((acc, timestamp) => {
    const date = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD format
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as { [date: string]: number });

  const chartData = {
    labels: Object.keys(dateMap).map(date => new Date(date)),
    datasets: [
      {
        label: 'Commits over time',
        data: Object.keys(dateMap).map(date => ({
          x: new Date(date),
          y: dateMap[date],
        })),
        borderColor: '#0d3a6a', // Dark blue for border
        backgroundColor: 'rgba(13, 58, 106, 0.6)', // Dark blue with some transparency
        fill: false,
        tension: 0,
        pointRadius: 6, // Slightly larger size for visibility
        pointHoverRadius: 8, // Larger size on hover
        borderWidth: 0,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'Pp', // 'Pp' for a short date and time format, adjust as needed
        },
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Commits',
        },
        ticks: {
          callback: (value) => value,
        },
      },
    },
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x',
        },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const date = new Date(context.parsed.x as number);
            const formattedDate = date.toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const commits = context.parsed.y as number;
            return `Date: ${formattedDate}, Commits: ${commits}`;
          },
        },
      },
    },
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full flex flex-col">
        <div className="flex flex-col items-center mb-4">
          <div className="text-lg font-semibold mb-2">Total Commits:</div>
          <div className="text-xl">{timestamps.length}</div>
        </div>
        <h2 className="text-2xl font-bold mb-4">Commits Over Time</h2>
        <Line data={chartData} options={chartOptions} />
        <button
          className="mt-4 bg-[#c72424] hover:bg-[#a31e1e] text-white font-bold py-2 px-4 rounded"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ChartModal;
