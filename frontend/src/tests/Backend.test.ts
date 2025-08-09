import { useState } from "react";
import { BACKEND_ADDRESS, type Task, type TaskQueryParams } from "../constants";
import axios from "axios";

const [allTasks, setAllTasks] = useState<Task[] | null>(null);

const testQuery: TaskQueryParams = {
  search: "gunsmith - part",
  isKappa: false,
  isLightKeeper: false,
  playerLvl: 99,
  objType: "any",
  limit: 50,
  offset: 0,
};

const params = new URLSearchParams();
for (const [key, value] of Object.entries(testQuery)) {
  if (key === "offset") continue;
  params.append(key, value.toString());
}

// grab all of the tasks that were marked completed
for (const key of Object.keys(localStorage)) {
  if (key.startsWith("task")) params.append("ids", key.slice("task-".length));
}

const query = BACKEND_ADDRESS + "/api/tasks?" + params.toString();

const fetchTasks = (offset: number) => {
  axios
    .get<Task[]>(query + "&offset=" + offset)
    .then((response) => {
      if (offset == 0) {
        setAllTasks(response.data);
      } else {
        setAllTasks((prev) => [...(prev ?? []), ...response.data]);
      }
    })
    .catch((err) => console.log(err));
};

//test('testing task backend query', () => expect(fetchTasks))
