import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ItemHistory } from "../constants";

interface Props {
  itemHistory: ItemHistory[];
}

function ItemChartComponent({ itemHistory }: Props) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={itemHistory}
        margin={{ top: 0, right: 40, left: 10, bottom: 0 }}
      >
        <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
        <XAxis
          dataKey="time"
          tickFormatter={(t) => new Date(t).toLocaleTimeString()}
        />
        <YAxis
          tickFormatter={(value) =>
            new Intl.NumberFormat("en-US", {
              notation: "compact",
              compactDisplay: "short",
            }).format(value)
          }
        />
        <Tooltip labelFormatter={(t) => new Date(t).toLocaleTimeString()} />
        <Line
          type="monotone"
          dataKey="fleaMarket"
          stroke="#8884d8"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default ItemChartComponent;
