import ItemScrollCompact from "./ItemScrollCompact";
import PageSwitch from "../../components/PageSwitch";
import {
  DEFAULT_ITEM_QUERY_PARAMS,
  DOCKER_BACKEND,
} from "../../utils/constants";
import { Item, ItemQueryParams } from "../../utils/types";
import { cookies } from "next/headers";

type PageProps = {
  searchParams: Promise<{ queryParams?: ItemQueryParams }>;
};

async function DisplayItemsCompact({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  let { queryParams } = (await searchParams) ?? {
    id: cookieStore.has("items-query")
      ? cookieStore.get("items-query")
      : DEFAULT_ITEM_QUERY_PARAMS,
  };

  if (queryParams === undefined) queryParams = DEFAULT_ITEM_QUERY_PARAMS;

  // since this is a compact view there will be more items on screen
  queryParams.limit = 50;

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    params.append(key, value.toString());
  });

  const res1 = await fetch(DOCKER_BACKEND + "/api/items?" + params.toString(), {
    cache: "no-cache",
  });
  const items: Item[] = await res1.json();

  return (
    <>
      <PageSwitch />
      <div className="text-[14px]">
        <ItemScrollCompact initItems={items} queryParams={queryParams} />
      </div>
    </>
  );
}

export default DisplayItemsCompact;
