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
import type { ItemHistory } from "../types";

interface Props {
  itemHistory: ItemHistory[];
}

function ItemChart({ itemHistory }: Props) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={itemHistory}
        margin={{ top: 0, right: 40, left: 10, bottom: 0 }}
      >
        <XAxis
          dataKey="recorded_time"
          tickFormatter={(t: string) => new Date(t).toLocaleTimeString()}
        />
        <YAxis
          tickFormatter={(value: number) =>
            new Intl.NumberFormat("en-US", {
              notation: "compact",
              compactDisplay: "short",
            }).format(value)
          }
          domain={["dataMin", "dataMax"]}
        />
        <Tooltip
          labelFormatter={(t: string) => new Date(t).toLocaleTimeString()}
          formatter={(t: string) => Number(t).toLocaleString("en-us")}
        />
        <Line
          type="monotone"
          dataKey="price_rub"
          stroke="#8884d8"
          dot={false}
        />
        <Label value="Item Flea Market History" position="insideTop" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default ItemChart;
