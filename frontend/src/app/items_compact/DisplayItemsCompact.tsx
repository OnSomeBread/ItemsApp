import { cookies } from "next/headers";
import ItemScrollCompact from "../../components/ItemScrollCompact";
import PageSwitch from "../../components/PageSwitch";
import { DEFAULT_ITEM_QUERY_PARAMS } from "../../constants";
import type { Item, ItemQueryParams, ItemStats } from "../../types";
import { DEVICE_UUID_COOKIE_NAME } from "../../proxy";
import { apiFetch } from "../../utils";

type PageProps = {
  searchParams: Promise<{ queryParams?: ItemQueryParams }>;
};

async function DisplayItemsCompact({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const deviceCookie = cookieStore.get(DEVICE_UUID_COOKIE_NAME);
  const deviceId = deviceCookie ? deviceCookie.value : undefined;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(deviceId ? { "x-device-id": deviceId } : {}),
  };

  // fetch stats and query params in parallel
  const [res1, res2] = await Promise.all([
    apiFetch("/items/stats", {
      cache: "no-store",
      headers,
    }),
    apiFetch("/items/query_parms", {
      cache: "no-store",
      headers,
    }),
  ]);

  const [itemStats, resQueryParams] = await Promise.all([
    res1.json() as Promise<ItemStats>,
    res2.json() as Promise<ItemQueryParams>,
  ]);

  const queryParams = (await searchParams)?.queryParams ?? {
    ...DEFAULT_ITEM_QUERY_PARAMS,
    ...resQueryParams,
  };

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value.toString() === "") return;
    params.append(key, value.toString());
  });

  const res3 = await apiFetch("/items?" + params.toString(), {
    cache: "no-store",
    headers,
  });
  const items = (await res3.json()) as Item[];
  queryParams.offset = queryParams.limit;

  return (
    <>
      <PageSwitch />
      <div className="text-[14px]">
        <ItemScrollCompact
          initItems={items}
          initQueryParams={queryParams}
          headers={headers}
          initItemStats={itemStats}
        />
      </div>
    </>
  );
}

export default DisplayItemsCompact;
