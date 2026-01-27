import AmmoScroll from "../../components/AmmoScroll";
import PageSwitch from "../../components/PageSwitch";
import { DEFAULT_AMMO_QUERY_PARAMS } from "../../constants";
import { DEVICE_UUID_COOKIE_NAME } from "../../middleware";
import type { AmmoQueryParams, Ammo, AmmoStats } from "../../types";
import { cookies } from "next/headers";
import { apiFetch } from "../../utils";

type PageProps = {
  searchParams: Promise<{ queryParams?: AmmoQueryParams }>;
};

async function DisplayAmmo({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const deviceCookie = cookieStore.get(DEVICE_UUID_COOKIE_NAME);
  const deviceId = deviceCookie ? deviceCookie.value : undefined;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(deviceId ? { "x-device-id": deviceId } : {}),
  };

  // fetch stats and query params in parallel
  const [res1, res2] = await Promise.all([
    apiFetch("/ammo/stats", {
      cache: "no-store",
      headers,
    }),
    apiFetch("/ammo/query_parms", {
      cache: "no-store",
      headers,
    }),
  ]);

  const [ammoStats, resQueryParams] = await Promise.all([
    res1.json() as Promise<AmmoStats>,
    res2.json() as Promise<AmmoQueryParams>,
  ]);

  const queryParams = (await searchParams)?.queryParams ?? {
    ...DEFAULT_AMMO_QUERY_PARAMS,
    ...resQueryParams,
  };

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value.toString() === "") return;
    params.append(key, value.toString());
  });

  const res3 = await apiFetch("/ammo?" + params.toString(), {
    cache: "no-store",
    headers,
  });
  const ammo = (await res3.json()) as Ammo[];
  queryParams.offset = queryParams.limit;

  return (
    <>
      <PageSwitch />
      <AmmoScroll
        initAmmo={ammo}
        initQueryParams={queryParams}
        headers={headers}
        initAmmoStats={ammoStats}
      />
    </>
  );
}

export default DisplayAmmo;
