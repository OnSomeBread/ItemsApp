import type { Task } from "../types";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DEFAULT_TASK_QUERY_PARAMS } from "../constants";
const ImageComponent = dynamic(() => import("./ImageComponent"), {
  ssr: false,
});

interface Props {
  task: Task;
  idx: number;
  onClickButton: (arg0: string, arg1: string) => void;
}

function TaskComponent({ task, idx, onClickButton }: Props) {
  return (
    <motion.div
      className="pl-8"
      initial={{ x: -20 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex">
        <div>
          <Link href={{ pathname: "/task_view", query: "id=" + task._id }}>
            {task.name}
          </Link>
          <p>Minimum Player Level: {task.minPlayerLevel}</p>
        </div>
        <div className="relative top-2 left-4 h-12">
          <ImageComponent
            imgSrc={"/" + task.trader + ".webp"}
            alt={task.trader}
            width={36} // ????? TODO why does this width and height make a square
            height={8}
            priority={idx <= DEFAULT_TASK_QUERY_PARAMS["limit"]}
          />
        </div>
      </div>

      {task.objectives.map((obj, index) => (
        <p key={obj._id}>
          {index + 1}. {obj.description}
        </p>
      ))}
      <motion.button
        value={task._id}
        onClick={() => onClickButton(task._id, "prerequisite")}
        transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="!h-12 !rounded-[8px] !border"
      >
        Completed
      </motion.button>
    </motion.div>
  );
}

export default TaskComponent;
