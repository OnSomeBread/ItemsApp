"use client";
import InfiniteScroll from "react-infinite-scroll-component";
import type { Task, TaskBase, TaskQueryParams, TaskStats } from "../types";
import { useEffect, useRef, useState } from "react";
import TaskSearchBar from "./TaskSearchBar";
import { motion } from "framer-motion";
import TaskComponent from "./TaskComponent";
import { apiFetch, formatSecondsToTime } from "../utils";

interface Props {
  initTasks: Task[];
  completedTasks: TaskBase[];
  headers: HeadersInit;
  initQueryParams: TaskQueryParams;
  initTaskStats: TaskStats;
}

function TaskScroll({
  initTasks,
  completedTasks,
  headers,
  initQueryParams,
  initTaskStats,
}: Props) {
  const [allTasks, setAllTasks] = useState(initTasks);
  const [allCompletedTasks, setAllCompletedTasks] = useState(completedTasks);
  const [taskStats, setTastStats] = useState(initTaskStats);
  const [timer, setTimer] = useState(
    initTaskStats.time_till_tasks_refresh_secs
  );
  const [hasMore, setHasMore] = useState(
    initTasks.length === initQueryParams.limit
  );
  //const [loading, setLoading] = useState(false);
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

  const fetchNewCompletedTasks = () => {
    apiFetch("/tasks/get_completed", {
      cache: "no-store",
      headers,
    })
      .then((res2) => {
        res2
          .json()
          .then((newCompletedTasks: TaskBase[]) => {
            setAllCompletedTasks(newCompletedTasks);
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));
  };

  const fetchNewTaskStats = () => {
    apiFetch("/tasks/stats", {
      cache: "no-store",
      headers,
    })
      .then((res2) => {
        res2
          .json()
          .then((newTaskStats: TaskStats) => {
            setTastStats(newTaskStats);
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));
  };

  const fetchTasks = (offset: number) => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== "offset") params.append(key, value.toString());
    });
    params.append("offset", offset.toString());

    if (offset === 0) {
      fetchNewCompletedTasks();
      fetchNewTaskStats();
    }

    apiFetch("/tasks?" + params.toString(), {
      cache: "no-store",
      headers,
    })
      .then((res1) => {
        res1
          .json()
          .then((tasks: Task[]) => {
            if (offset === 0) {
              setAllTasks(tasks);
            } else {
              setAllTasks((prev) => [...(prev ?? []), ...tasks]);
            }

            changeQueryParams("offset", queryParams.offset + queryParams.limit);
            setHasMore(tasks.length === queryParams.limit);
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));
  };

  const fetchScroll = () => {
    fetchTasks(queryParams.offset);
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
        staggerChildren:
          // first load has a stagger animation but when infinite scrolling its turned off
          allTasks && allTasks.length > queryParams.limit ? 0 : 0.04,
      },
    },
  };

  // false meaning backwords and true meaning forwards
  const onClickComplete = (startId: string, direction: boolean) => {
    const data = {
      task_id: startId,
      direction: direction,
    };

    apiFetch("/tasks/set_complete", {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify(data),
    })
      .then(() => {
        setChangedTasksToggle((prev) => !prev);
      })
      .catch((err) => console.error(err));
  };

  return (
    <>
      <TaskSearchBar
        queryParams={queryParams}
        changeQueryParams={changeQueryParams}
        onClear={() => {
          apiFetch("/tasks/clear_completed_tasks", {
            cache: "no-store",
            headers,
          })
            .then()
            .catch((err) => console.error(err));
          setChangedTasksToggle((prev) => !prev);
        }}
      />
      <p className="h-2 pl-16">
        {formatSecondsToTime(timer)} Time Til Task List Refresh
      </p>

      <div className="flex w-full">
        <div className="flex-1">
          <InfiniteScroll
            dataLength={allTasks?.length ?? 0}
            next={fetchScroll}
            hasMore={hasMore}
            loader={<article aria-busy="true"></article>}
          >
            <motion.ul
              className="!list-none md:p-1 md:pl-2"
              key={allTasks?.length}
              variants={containerVarients}
              initial="hidden"
              animate="show"
            >
              {allTasks?.map((task, idx) => (
                <motion.li
                  className="md:px-14 md:pb-4"
                  key={task._id}
                  transition={{ duration: 0.8 }}
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1 },
                  }}
                >
                  <TaskComponent
                    task={task}
                    idx={idx}
                    onClickButton={onClickComplete}
                  />
                </motion.li>
              ))}
            </motion.ul>
          </InfiniteScroll>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          {allCompletedTasks.length === 0 && (
            <div className="italic">No tasks completed yet...</div>
          )}
          {allCompletedTasks.length > 0 && (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-bold">Completed Tasks</h2>
                <p className="text-sm">
                  Click on a task to mark it as not completed (all tasks
                  completed here will affect the other task related pages)
                </p>
              </div>
              <div className="flex">
                <progress
                  className="flex-1"
                  value={taskStats.tasks_completed_count}
                  max={taskStats.tasks_count}
                />
                <p className="relative bottom-2 flex-1 pl-5">
                  {taskStats.tasks_completed_count}/{taskStats.tasks_count}{" "}
                  Total Tasks Completed
                </p>
              </div>
              <div className="flex">
                <progress
                  className="flex-1"
                  value={taskStats.kappa_completed_count}
                  max={taskStats.kappa_required_count}
                />
                <p className="relative bottom-2 flex-1 pl-5">
                  {taskStats.kappa_completed_count}/
                  {taskStats.kappa_required_count} Kappa Tasks Completed
                </p>
              </div>
              <div className="flex">
                <progress
                  className="flex-1"
                  value={taskStats.lightkeeper_completed_count}
                  max={taskStats.lightkeeper_required_count}
                />
                <p className="relative bottom-2 flex-1 pl-5">
                  {taskStats.lightkeeper_completed_count}/
                  {taskStats.lightkeeper_required_count} Lightkeeper Tasks
                  Completed
                </p>
              </div>

              <motion.ul
                key={allCompletedTasks.length}
                variants={containerVarients}
                initial="hidden"
                animate="show"
              >
                {allCompletedTasks.map((task) => (
                  <motion.li
                    key={task._id}
                    transition={{ duration: 0.4 }}
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1 },
                    }}
                    onClick={() => {
                      onClickComplete(task._id, true);
                    }}
                  >
                    {task.task_name}
                  </motion.li>
                ))}
              </motion.ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default TaskScroll;
