import BitCoinProfit from "./BitcoinProfit";

export const metadata = { title: "BitCoin Profit" };

type PageProps = {
  searchParams: Promise<{
    days?: number;
    hideoutLvl?: number;
    fuelType?: string;
    hasSolar?: string;
  }>;
};

export default function bitcoin({ searchParams }: PageProps) {
  return <BitCoinProfit searchParams={searchParams} />;
}
