import AmmoScroll from "../../components/AmmoScroll";
import PageSwitch from "../../components/PageSwitch";
import { DEFAULT_AMMO_QUERY_PARAMS, DOCKER_BACKEND } from "../../constants";
import { DEVICE_UUID_COOKIE_NAME } from "../../middleware";
import type { AmmoQueryParams, Ammo, AmmoStats } from "../../types";
import { cookies } from "next/headers";

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

  const res1 = await fetch(DOCKER_BACKEND + "/api/ammo/stats", {
    cache: "no-store",
    headers,
  });
  const ammoStats = (await res1.json()) as AmmoStats;

  const res2 = await fetch(DOCKER_BACKEND + "/api/ammo/query_parms", {
    cache: "no-store",
    headers,
  });
  const resQueryParams = (await res2.json()) as AmmoQueryParams;

  const queryParams = (await searchParams)?.queryParams ?? {
    ...DEFAULT_AMMO_QUERY_PARAMS,
    ...resQueryParams,
  };

  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value.toString() === "") return;
    params.append(key, value.toString());
  });

  const res3 = await fetch(DOCKER_BACKEND + "/api/ammo?" + params.toString(), {
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
