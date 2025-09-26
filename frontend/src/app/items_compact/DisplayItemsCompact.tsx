import ItemScrollCompact from "../../components/ItemScrollCompact";
import PageSwitch from "../../components/PageSwitch";
import { DEFAULT_ITEM_QUERY_PARAMS, DOCKER_BACKEND } from "../../constants";
import type { Item, ItemQueryParams } from "../../types";

type PageProps = {
  searchParams: Promise<{ queryParams?: ItemQueryParams }>;
};

async function DisplayItemsCompact({ searchParams }: PageProps) {
  const queryParams =
    (await searchParams)?.queryParams ?? DEFAULT_ITEM_QUERY_PARAMS;

  queryParams.limit = 50;

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value.toString() === "") return;
    params.append(key, value.toString());
  });

  const res1 = await fetch(DOCKER_BACKEND + "/api/items?" + params.toString(), {
    cache: "no-store",
  });
  const items = (await res1.json()) as Item[];

  return (
    <>
      <PageSwitch />
      <div className="text-[14px]">
        <ItemScrollCompact initItems={items} initQueryParams={queryParams} />
      </div>
    </>
  );
}

export default DisplayItemsCompact;
