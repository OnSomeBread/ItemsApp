import type { Task } from "../types";
import { motion } from "framer-motion";
import Link from "next/link";
import { DEFAULT_TASK_QUERY_PARAMS } from "../constants";
import ImageComponent from "./ImageComponent";

interface Props {
  task: Task;
  idx: number;
  onClickButton: (arg0: string, arg1: boolean) => void;
}

function TaskComponent({ task, idx, onClickButton }: Props) {
  return (
    <motion.div
      initial={{ x: -20 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-lg rounded-xl border border-gray-200 bg-neutral-800/80 p-4 shadow-sm hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Link
            href={{ pathname: "/task_view", query: "id=" + task._id }}
            className="text-lg font-semibold text-gray-800 hover:text-blue-600"
          >
            {task.task_name}
          </Link>
          <p className="text-sm text-gray-500">
            Minimum Player Level:{" "}
            <span className="font-medium">{task.min_player_level}</span>
          </p>
        </div>
        <div className="relative bottom-1 h-12">
          <ImageComponent
            imgSrc={"/" + task.trader + ".webp"}
            alt={task.trader}
            width={36} // ????? TODO why does this width and height make a square
            height={8}
            priority={idx <= DEFAULT_TASK_QUERY_PARAMS["limit"]}
          />
        </div>
      </div>

      <ul className="mt-3 space-y-1 px-4">
        {task.objectives.map((obj, index) => (
          <li key={"I" + idx + "O" + index.toString()}>
            <span className="font-semibold">{index + 1}.</span>{" "}
            {obj.obj_description}
          </li>
        ))}
      </ul>

      <motion.button
        value={task._id}
        onClick={() => onClickButton(task._id, false)}
        transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="w-full"
      >
        Mark Completed
      </motion.button>
    </motion.div>
  );
}

export default TaskComponent;
