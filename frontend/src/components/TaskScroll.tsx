"use client";
import InfiniteScroll from "react-infinite-scroll-component";
import { Task, TaskQueryParams } from "../types";
import { useEffect, useState } from "react";
import TaskSearchBar from "./TaskSearchBar";
import { motion } from "framer-motion";
import TaskComponent from "./TaskComponent";

interface Props {
  initTasks: Task[];
  completedTasks: Task[];
  headers: HeadersInit;
  initQueryParams: TaskQueryParams;
}

function TaskScroll({
  initTasks,
  completedTasks,
  headers,
  initQueryParams,
}: Props) {
  const [allTasks, setAllTasks] = useState(initTasks);
  const [allCompletedTasks, setAllCompletedTasks] = useState(completedTasks);
  const [hasMore, setHasMore] = useState(true);
  //const [offset, setOffset] = useState(initQueryParams.limit);
  const [loading, setLoading] = useState(false);
  const [queryParams, setQueryParams] = useState(initQueryParams);

  // the actual value here doesn't matter its for the useEffect so that it can account for changed task list
  const [changedTasksToggle, setChangedTasksToggle] = useState(false);

  useEffect(() => {
    fetchTasks(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedTasksToggle]);

  const fetchNewCompletedTasks = () => {
    fetch("/api/get_completed", {
      cache: "no-store",
      headers,
    })
      .then((res2) => {
        res2
          .json()
          .then((new_completed_tasks: Task[]) => {
            setAllCompletedTasks(new_completed_tasks);
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));
  };

  const fetchTasks = (offset: number) => {
    if (loading) return;
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== "offset") params.append(key, value.toString());
    });
    params.append("offset", offset.toString());

    fetch("/api/tasks?" + params.toString(), {
      cache: "no-store",
      headers,
    })
      .then((res1) => {
        res1
          .json()
          .then((tasks: Task[]) => {
            if (offset === 0) {
              setAllTasks(tasks);
              fetchNewCompletedTasks();
            } else {
              setAllTasks((prev) => [...(prev ?? []), ...tasks]);
            }

            changeQueryParams("offset", queryParams.offset + queryParams.limit);
            setHasMore(tasks.length === queryParams.limit);
            //setOffset((prev) => prev + queryParams.limit);
            setLoading(false);
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

    fetch("/api/set_complete", {
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
          fetch("/api/clear_completed_tasks", {
            cache: "no-store",
            headers,
          })
            .then()
            .catch((err) => console.error(err));
          setChangedTasksToggle((prev) => !prev);
        }}
      />

      <div className="flex w-[100%]">
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
                  className="md:p-4"
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
        <div className="flex-1">
          {allCompletedTasks.length > 0 && (
            <>
              <div>
                <p>All Completed Tasks</p>
                <p>(click on a task to set not completed)</p>
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
