"use client";
import {
  Label,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  queryKey: string;
  bitcoinData: {
    x: number;
    GpuCount1: number;
    GpuCount10: number;
    GpuCount25: number;
    GpuCount50: number;
  }[];
  title: string;
  xlabel: string;
  ylabel: string;
  ytoolLabel: string;
}

function BitCoinProfitChart({
  queryKey,
  bitcoinData,
  title,
  xlabel,
  ylabel,
  ytoolLabel,
}: Props) {
  return (
    <ResponsiveContainer key={queryKey} width="100%" height={400}>
      <LineChart
        data={bitcoinData}
        margin={{ top: 0, left: 10, right: 40, bottom: 10 }}
      >
        <Label value={title} position="insideTop" />
        <XAxis
          dataKey="x"
          tickFormatter={(value: number) =>
            new Intl.NumberFormat("en-US", {
              notation: "compact",
              compactDisplay: "short",
            }).format(value)
          }
        >
          <Label value={xlabel} position="insideBottom" offset={-5} />
        </XAxis>
        <YAxis
          tickFormatter={(value: number) =>
            new Intl.NumberFormat("en-US", {
              notation: "compact",
              compactDisplay: "short",
            }).format(value)
          }
          type="number"
          domain={["dataMin", "dataMax"]}
        >
          <Label value={ylabel} angle={-90} position="insideLeft" />
        </YAxis>
        <Tooltip
          formatter={(value: number | undefined) =>
            Number((value ?? 0).toFixed(0)).toLocaleString("en-us") + " " + ytoolLabel
          }
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="GpuCount1"
          stroke="#36a2eb"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="GpuCount10"
          stroke="#ff6384"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="GpuCount25"
          stroke="#ff9f40"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="GpuCount50"
          stroke="#9966ff"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default BitCoinProfitChart;
