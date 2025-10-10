"use client";
import InfiniteScroll from "react-infinite-scroll-component";
import type { Ammo, AmmoQueryParams, AmmoStats } from "../types";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { API_BASE } from "../constants";
import { formatSecondsToTime } from "../utils";
import AmmoSearchBar from "./AmmoSearchBar";
import Link from "next/link";

interface Props {
  initAmmo: Ammo[];
  headers: HeadersInit;
  initQueryParams: AmmoQueryParams;
  initAmmoStats: AmmoStats;
}

function AmmoScroll({
  initAmmo,
  headers,
  initQueryParams,
  initAmmoStats,
}: Props) {
  const [allAmmo, setAllAmmo] = useState(initAmmo);
  const [timer, setTimer] = useState(initAmmoStats.time_till_ammo_refresh_secs);
  const [hasMore, setHasMore] = useState(
    initAmmo.length === initQueryParams.limit
  );
  //const [loading, setLoading] = useState(false);
  const [queryParams, setQueryParams] = useState(initQueryParams);

  // the actual value here doesn't matter its for the useEffect so that it can account for changed task list
  const [changedAmmoToggle, setChangedAmmoToggle] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    fetchAmmo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedAmmoToggle]);

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const fetchAmmo = (offset: number) => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== "offset") params.append(key, value.toString());
    });
    params.append("offset", offset.toString());

    fetch(API_BASE + "/api/ammo?" + params.toString(), {
      cache: "no-store",
      headers,
    })
      .then((res1) => {
        res1
          .json()
          .then((ammo: Ammo[]) => {
            if (offset === 0) {
              setAllAmmo(ammo);
            } else {
              setAllAmmo((prev) => [...(prev ?? []), ...ammo]);
            }

            changeQueryParams("offset", queryParams.offset + queryParams.limit);
            setHasMore(ammo.length === queryParams.limit);
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));
  };

  const fetchScroll = () => {
    fetchAmmo(queryParams.offset);
  };

  const changeQueryParams = (key: string, value: string | number | boolean) => {
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
    if (key !== "offset") {
      setChangedAmmoToggle((prev) => !prev);
    }
  };

  const containerVarients = {
    show: {
      transition: {
        staggerChildren:
          // first load has a stagger animation but when infinite scrolling its turned off
          allAmmo && allAmmo.length > queryParams.limit ? 0 : 0.04,
      },
    },
  };

  return (
    <>
      <AmmoSearchBar
        queryParams={queryParams}
        changeQueryParams={changeQueryParams}
      />
      <p className="h-2 pl-16">
        {formatSecondsToTime(timer)} Time Til Ammo List Refresh
      </p>

      <div className="flex w-full">
        <div className="flex-1">
          <InfiniteScroll
            dataLength={allAmmo?.length ?? 0}
            next={fetchScroll}
            hasMore={hasMore}
            loader={<article aria-busy="true"></article>}
          >
            <motion.ul
              className="!grid !list-none !grid-cols-[repeat(auto-fill,minmax(290px,1fr))] "
              key={allAmmo?.length}
              variants={containerVarients}
              initial="hidden"
              animate="show"
            >
              {allAmmo?.map((ammo) => (
                <motion.li
                  className="h-50 md:px-14 md:pb-4"
                  key={ammo.item_id}
                  transition={{ duration: 0.8 }}
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1 },
                  }}
                  style={{ listStyleType: "none" }}
                >
                  <Link
                    href={{
                      pathname: "/item_view",
                      query: "id=" + ammo.item_id,
                    }}
                  >
                    {ammo.caliber}
                  </Link>
                  <p>Damage: {ammo.damage}</p>
                  <p>Penetration Power: {ammo.penetration_power}</p>
                </motion.li>
              ))}
            </motion.ul>
          </InfiniteScroll>
        </div>
      </div>
    </>
  );
}

export default AmmoScroll;
