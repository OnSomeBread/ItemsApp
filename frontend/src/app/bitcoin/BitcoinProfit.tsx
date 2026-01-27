import BitCoinSelect from "../../components/BitCoinSelect";
import PageSwitch from "../../components/PageSwitch";
import type { Item } from "../../types";

import dynamic from "next/dynamic";
import { apiFetch } from "../../utils";

const BitCoinProductionChart = dynamic(
  () => import("../../components/BitCoinProductionChart")
);
const BitCoinProfitChart = dynamic(
  () => import("../../components/BitCoinProfitChart")
);

function calcBitCoinHoursToProduce(gpuCount: number) {
  return 145000 / (1 + (gpuCount - 1) * 0.041225) / 3600;
}

function calcBitCoinPerHour(gpuCount: number) {
  // pulled from https://escapefromtarkov.fandom.com/wiki/Hideout
  return 1 / calcBitCoinHoursToProduce(gpuCount);
}

type PageProps = {
  searchParams: Promise<{
    days?: number;
    hideoutLvl?: number;
    fuelType?: string;
    hasSolar?: string;
  }>;
};

async function BitCoinProfit({ searchParams }: PageProps) {
  let { days, hideoutLvl, fuelType, hasSolar } = (await searchParams) ?? {};

  if (days === undefined) days = 30;
  if (hideoutLvl === undefined) hideoutLvl = 0;
  if (fuelType === undefined) fuelType = "largeFuel";
  if (hasSolar === undefined) hasSolar = "no";

  // fetch bitcoin and GPU data in parallel
  const [res1, res2] = await Promise.all([
    apiFetch("/items/ids?ids=59faff1d86f7746c51718c9c", {
      cache: "no-store",
    }),
    apiFetch("/items/ids?ids=57347ca924597744596b4e71", {
      cache: "no-store",
    }),
  ]);

  const [bitcoin, gpu] = await Promise.all([
    res1.json() as Promise<Item[]>,
    res2.json() as Promise<Item[]>,
  ]);

  const bitcoinData = bitcoin[0];
  const gpuData = gpu[0];
  const bitcoinSell = bitcoinData.sells.reduce((prev, curr) => {
    return prev.price_rub > curr.price_rub ? prev : curr;
  });
  const gpuCardBuy = gpuData.buys.find((buy) => buy.trader_name === "Flea Market");
  if (gpuCardBuy === undefined) return;

  let fuelCost = 0;
  let fuelLastSecs = 0;

  if (fuelType === "smallFuel") {
    // get small fuel can data
    const res3 = await apiFetch("/items/ids?ids=5d1b371186f774253763a656", {
      cache: "no-store",
    });
    const smallFuel = ((await res3.json()) as Item[])[0];

    const smallFuelBuy = smallFuel.buys.reduce((prev, curr) => {
      return prev.price_rub < curr.price_rub ? prev : curr;
    });
    fuelCost = smallFuelBuy.price_rub;
    fuelLastSecs = 45473;
  } else {
    // get large fuel can data
    const res4 = await apiFetch("/items/ids?ids=5d1b36a186f7742523398433", {
      cache: "no-store",
    });
    const largeFuel = ((await res4.json()) as Item[])[0];

    const largeFuelBuy = largeFuel.buys.reduce((prev, curr) => {
      return prev.price_rub < curr.price_rub ? prev : curr;
    });
    fuelCost = largeFuelBuy.price_rub;
    fuelLastSecs = 75789;
  }

  let hideoutLvlEffect = 1 + 0.005 * hideoutLvl;

  // large fuel can
  // (with solar power module and elite hideout management skill) / (with solar power module)
  // (112 hours 16 minutes and 50 seconds) / (42 hours 6 minutes and 18 seconds)
  // same number comes out when doing small fuel can
  if (hideoutLvl === 50) hideoutLvlEffect = 2.66667;

  const fuelLastDays =
    ((fuelLastSecs * hideoutLvlEffect) / 3600 / 24) * (hasSolar ? 2 : 1);
  const fuelCostPerDay = fuelCost / fuelLastDays;

  const profitOnDay = (day: number, gpuCount: number) => {
    return bitcoinSell.price_rub * calcBitCoinPerHour(gpuCount) * 24 * day;
  };

  const profitOnDayWithCosts = (day: number, gpuCount: number) => {
    return (
      (bitcoinSell.price_rub * calcBitCoinPerHour(gpuCount) * 24 -
        fuelCostPerDay) *
        day -
      gpuCardBuy.price_rub * gpuCount
    );
  };

  const bitcoinProduction = [...Array(50).keys()].map((num) => {
    return {
      x: num + 1,
      y: calcBitCoinHoursToProduce(num + 1),
    };
  });

  const bitcoinProfitPerDayData = (day: number) => {
    return [...Array(day).keys()].map((num) => {
      const currentDay = num + 1;
      return {
        x: currentDay,
        GpuCount1: profitOnDay(currentDay, 1),
        GpuCount10: profitOnDay(currentDay, 10),
        GpuCount25: profitOnDay(currentDay, 25),
        GpuCount50: profitOnDay(currentDay, 50),
      };
    });
  };

  const bitcoinProfitPerDayDataWithCosts = (day: number) => {
    return [...Array(day).keys()].map((num) => {
      const currentDay = num + 1;
      return {
        x: currentDay,
        GpuCount1: profitOnDayWithCosts(currentDay, 1),
        GpuCount10: profitOnDayWithCosts(currentDay, 10),
        GpuCount25: profitOnDayWithCosts(currentDay, 25),
        GpuCount50: profitOnDayWithCosts(currentDay, 50),
      };
    });
  };

  return (
    <>
      <PageSwitch />
      <BitCoinSelect
        hideoutLvl={hideoutLvl}
        fuelType={fuelType}
        hasSolar={hasSolar}
      />
      <div className="flex gap-5 px-5">
        <p>Fuel Flea Price {fuelCost.toLocaleString("en-us")} RUB</p>
        <p>GPU Flea Price {gpuCardBuy.price_rub.toLocaleString("en-us")} RUB</p>
        <p>
          BitCoin Sell Price {bitcoinSell.price_rub.toLocaleString("en-us")} RUB
        </p>
      </div>

      <div className="p-1">
        <div className="flex">
          <BitCoinProfitChart
            queryKey={hideoutLvl.toString() + fuelType + hasSolar}
            bitcoinData={bitcoinProfitPerDayData(days)}
            title="BitCoin Profit"
            xlabel="Days"
            ylabel="Profit RUB"
            ytoolLabel="RUB"
          />
          <BitCoinProfitChart
            queryKey={hideoutLvl.toString() + fuelType + hasSolar}
            bitcoinData={bitcoinProfitPerDayDataWithCosts(days)}
            title="BitCoin Profit including GPU and Fuel costs"
            xlabel="Days"
            ylabel="Profit RUB"
            ytoolLabel="RUB"
          />
        </div>
        <BitCoinProductionChart
          bitcoinData={bitcoinProduction}
          title="Hours to Produce a BitCoin by GPU Count"
          xlabel="GPU Count"
          ylabel="Hours"
          ytoolLabel="hours"
        />
      </div>
    </>
  );
}

export default BitCoinProfit;
