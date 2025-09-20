"use client";
import {
  Label,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  bitcoinData: { x: number; y: number }[];
  title: string;
  xlabel: string;
  ylabel: string;
  ytoolLabel: string;
}

function BitCoinProductionChart({
  bitcoinData,
  title,
  xlabel,
  ylabel,
  ytoolLabel,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={400}>
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
          dataKey="y"
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
        <Tooltip formatter={(v: number) => v.toFixed(1) + " " + ytoolLabel} />
        <Line type="monotone" dataKey="y" stroke="#8884d8" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default BitCoinProductionChart;
