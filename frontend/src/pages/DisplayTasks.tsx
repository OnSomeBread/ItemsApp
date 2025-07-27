import axios from "axios";
import { useEffect, useState } from "react";
import type { Task } from "../constants";

function DisplayTasks() {
  const [allTasks, setAllTasks] = useState<Task[] | null>(null);
  const BACKEND_ADDRESS: string = import.meta.env.VITE_BACKEND_SERVER as string;

  const query = BACKEND_ADDRESS + "/api/tasks";
  useEffect(() => {
    axios.get<Task[]>(query).then((response) => {
      setAllTasks(response.data);
    });
  }, [query]);

  console.log(allTasks?.length);

  return (
    <>
      {allTasks?.map((task) => (
        <p>{task.name}</p>
      ))}
    </>
  );
}

export default DisplayTasks;
