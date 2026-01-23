"use client";
import type { ItemBase, TaskQueryParams, TaskStats } from "../types";
import { useEffect, useRef, useState } from "react";
import TaskSearchBar from "./TaskSearchBar";
import { motion } from "framer-motion";
import { apiFetch, formatSecondsToTime } from "../utils";
import Link from "next/link";
import ImageComponent from "./ImageComponent";

interface Props {
  initItems: [ItemBase, number][];
  headers: HeadersInit;
  initQueryParams: TaskQueryParams;
  initTaskStats: TaskStats;
}

function NeededItemScroll({
  initItems,
  headers,
  initQueryParams,
  initTaskStats,
}: Props) {
  const [allItems, setAllItems] = useState(initItems);
  const [timer, setTimer] = useState(
    initTaskStats.time_till_tasks_refresh_secs
  );
  const [queryParams, setQueryParams] = useState(initQueryParams);

  // the actual value here doesn't matter its for the useEffect so that it can account for changed task list
  const [changedTasksToggle, setChangedTasksToggle] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    fetchTasks(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedTasksToggle]);

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const fetchTasks = (offset: number) => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== "offset") params.append(key, value.toString());
    });
    params.append("offset", offset.toString());

    apiFetch("/tasks/get_required_items?" + params.toString(), {
      cache: "no-store",
      headers,
    })
      .then((res1) => {
        res1
          .json()
          .then((tasks: [ItemBase, number][]) => {
            if (offset === 0) {
              setAllItems(tasks);
            } else {
              setAllItems((prev) => [...(prev ?? []), ...tasks]);
            }

            changeQueryParams("offset", queryParams.offset + queryParams.limit);
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));
  };

  const changeQueryParams = (key: string, value: string | number | boolean) => {
    setQueryParams((prev) => {
      return { ...prev, [key]: value };
    });
    if (key !== "offset") {
      setChangedTasksToggle((prev) => !prev);
    }
  };

  const containerVarients = {
    show: {
      transition: {
        staggerChildren: 0.02,
      },
    },
  };

  return (
    <>
      <TaskSearchBar
        queryParams={queryParams}
        changeQueryParams={changeQueryParams}
        onClear={() => {}}
      />
      <p className="h-2 pl-16">
        {formatSecondsToTime(timer)} Time Til Task List Refresh
      </p>
      <motion.ul
        className="!grid !list-none !grid-cols-[repeat(auto-fill,minmax(290px,1fr))] "
        key={allItems?.length}
        variants={containerVarients}
        initial="hidden"
        animate="show"
      >
        {allItems?.map((item) => (
          <motion.li
            className="md:px-14 md:pb-4"
            key={item[0]._id}
            transition={{ duration: 0.8 }}
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1 },
            }}
            style={{ listStyleType: "none" }}
          >
            {item[1].toLocaleString("en-us")}{" "}
            <Link
              className="items-center justify-center"
              href={{
                pathname: "/item_view",
                query: "id=" + item[0]._id,
              }}
            >
              {item[0].item_name}
            </Link>
            <div className="relative -z-1 flex h-32 w-[100%] items-center justify-center">
              <ImageComponent
                imgSrc={"/" + item[0]._id + ".webp"}
                alt={""}
                priority={false}
                width={64}
                height={64}
              />
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </>
  );
}

export default NeededItemScroll;
