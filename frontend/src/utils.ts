import { Buy, Item, Sell } from "./types";

// each page has its localStorage start with pageName- example: item-674d90b55704568fe60bc8f5
export function clearPageLocalStorage(page: string) {
  if (typeof window === "undefined") return;

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(page)) localStorage.removeItem(key);
  }
}

export function getBestSell(item: Item) {
  let bestSell: Sell | null = null;
  for (const trader of item.sells) {
    if (
      (bestSell === null || trader.price_rub > bestSell.price_rub) &&
      trader.trader_name !== "Flea Market"
    ) {
      bestSell = trader;
    }
  }
  return bestSell;
}

export function getBestBuy(item: Item) {
  let bestBuy: Buy | null = null;
  for (const trader of item.buys) {
    if (bestBuy === null || trader.price_rub < bestBuy.price_rub) {
      bestBuy = trader;
    }
  }
  return bestBuy;
}

export function formatSecondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // pad with leading zeros
  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}
