import { ItemQueryParams } from "../../types";
import DisplayItemsCompact from "./DisplayItemsCompact";

export const metadata = { title: "Tarkov Items Compact View" };

type PageProps = {
  searchParams: Promise<{ queryParams?: ItemQueryParams }>;
};

export default function items({ searchParams }: PageProps) {
  return <DisplayItemsCompact searchParams={searchParams} />;
}
