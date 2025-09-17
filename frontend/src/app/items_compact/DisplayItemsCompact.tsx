import ItemScrollCompact from "../../components/ItemScrollCompact";
import PageSwitch from "../../components/PageSwitch";
import { DEFAULT_ITEM_QUERY_PARAMS, DOCKER_BACKEND } from "../../constants";
import { Item, ItemQueryParams } from "../../types";
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
  queryParams.limit = 50;

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value.toString() === "") return;
    params.append(key, value.toString());
  });

  const res1 = await fetch(DOCKER_BACKEND + "/api/items?" + params.toString());
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
