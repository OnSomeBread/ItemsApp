import {
  BACKEND_ADDRESS,
  type ItemHistory,
  type Item,
  type Sell,
} from "../constants";
import "../App.css";
import { useEffect, type ReactNode } from "react";
import axios from "axios";
import * as d3 from "d3";

interface Props {
  item: Item;
  idx: number;
  fields: string[];
  children: ReactNode;
}

// goes through all of the traders and finds the trader that sells for the most
function getBestTrader(allTraders: Sell[]) {
  if (allTraders.length == 1 && allTraders[0].source == "fleaMarket") {
    return <></>;
  }

  let bestTrader = "";
  let bestPrice = 0;
  for (const trader of allTraders) {
    if (trader.price > bestPrice && trader.source != "fleaMarket") {
      bestPrice = trader.price;
      bestTrader = trader.source;
    }
  }
  return (
    <>
      Highest Trader Sell Price:{" "}
      {bestTrader.charAt(0).toUpperCase() + bestTrader.slice(1)}{" "}
      {bestPrice.toLocaleString("en-us")} RUB
    </>
  );
}

// creates a few lines for the items container only if item can be sold in the flea
function getFleaPrice({ item, children }: Props) {
  for (const trader of item.sells) {
    if (trader.source == "fleaMarket") {
      return (
        <>
          <p>Flea Price: {trader.price.toLocaleString("en-us")} RUB</p>
          {item.avg24hPrice && (
            <p>
              Average 24h Price: {item.avg24hPrice.toLocaleString("en-us")} RUB
            </p>
          )}
          {item.changeLast48hPercent != 0 && (
            <p
              style={{ color: item.changeLast48hPercent < 0 ? "green" : "red" }}
            >
              {item.changeLast48hPercent}%
            </p>
          )}
          {children}
        </>
      );
    }
  }
  return <>Cannot be sold on flea</>;
}

function drawItemHistoryChart({ item }: Props, itemHistory: ItemHistory[]) {
  const margin = { top: 0, right: 0, bottom: 20, left: 20 };
  const innerWidth = 500;
  const innerHeight = 500;
  const chartWidth = innerWidth + margin.left + margin.right;
  const chartHeight = innerHeight + margin.top + margin.bottom;

  itemHistory.sort((a, b) => a.time.getTime() - b.time.getTime());

  const svg = d3
    .select("#item-history-time-series-chart" + item._id)
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  svg.selectAll("*").remove();

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleTime()
    .domain(d3.extent(itemHistory, (d) => d.time) as [Date, Date])
    .range([0, innerWidth]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(itemHistory, (d) => d.fleaMarket)!])
    .nice()
    .range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(4));

  g.append("g").call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

  const line = d3
    .line<ItemHistory>()
    .x((d) => x(d.time))
    .y((d) => y(d.fleaMarket));

  g.append("path")
    .datum(itemHistory)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  console.log("X domain:", x.domain());
}

function ItemComponent({ item, idx, children, fields }: Props) {
  //const [itemHistory, setItemHistory] = useState<ItemHistory[] | null>(null);
  useEffect(() => {
    if (!fields.includes("fleaMarketHistory")) return;
    axios
      .get<ItemHistory[]>(
        BACKEND_ADDRESS + "/api/item_history?item_id=" + item._id
      )
      .then((response) => {
        if (response.data === undefined) return;
        if (response.data.length > 0) {
          const itemHistory = response.data.map((d) => ({
            ...d,

            time: new Date(`2025-08-01T${d.time}Z`),
          }));

          console.log(
            d3.utcFormat("%Y-%m-%dT%H:%M:%S.%LZ")(itemHistory[0].time)
          );

          drawItemHistoryChart(
            { item, idx, children, fields },
            itemHistory ?? []
          );
        }
      });
  }, [fields, item._id, item, idx, children]);

  return (
    <div className="item">
      {fields.includes("name") && <p>{item.name}</p>}
      {fields.includes("shortName") && <p>{item.shortName}</p>}
      {fields.includes("basePrice") && (
        <p>Base Price: {item.basePrice.toLocaleString("en-us")} RUB</p>
      )}

      {item.sells.length > 0 ? (
        <>
          {fields.includes("traders") && <p>{getBestTrader(item.sells)}</p>}
          <div id={"item-history-time-series-chart" + item._id} />
          {fields.includes("fleaMarket") &&
            getFleaPrice({ item, idx, children, fields })}
        </>
      ) : (
        <p>Cannot be sold</p>
      )}
    </div>
  );
}

export default ItemComponent;
