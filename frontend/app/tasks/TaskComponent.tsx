import type { Task } from "../../utils/types.ts";
import { motion } from "framer-motion";
import Link from "next/link";

interface Props {
  task: Task;
  onClickButton: (arg0: string, arg1: string) => void;
}

function TaskComponent({ task, onClickButton }: Props) {
  return (
    <motion.div
      className="pl-8"
      initial={{ x: -20 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.8 }}
    >
      <Link href={{ pathname: "/task_view", query: "id=" + task._id }}>
        {task.name}
      </Link>
      <p>Minimum Player Level: {task.minPlayerLevel}</p>
      <p>given by: {task.trader}</p>
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
        className="outline contrast !border !rounded-[8px] !h-12"
      >
        Completed
      </motion.button>
    </motion.div>
  );
}

export default TaskComponent;
