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
    if (bestSell === null || trader.price_rub > bestSell.price_rub) {
      bestSell = trader;
    }
  }
  return bestSell;
}

export function getBestBuy(item: Item) {
  let bestBuy: Buy | null = null;
  for (const trader of item.buys) {
    if (
      bestBuy === null ||
      (trader.price_rub < bestBuy.price_rub &&
        trader.trader_name !== "Flea Market")
    ) {
      bestBuy = trader;
    }
  }
  return bestBuy;
}
