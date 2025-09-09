import { ItemQueryParams } from "../../utils/types";
import DisplayItemsCompact from "./DisplayItemsCompact";

type PageProps = {
  searchParams: Promise<{ queryParams?: ItemQueryParams }>;
};

export default function items({ searchParams }: PageProps) {
  return <DisplayItemsCompact searchParams={searchParams} />;
}
