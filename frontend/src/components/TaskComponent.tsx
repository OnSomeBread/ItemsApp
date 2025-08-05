import type { Task } from "../constants";
import { motion } from "framer-motion";
//import type { ReactNode } from "react";

interface Props {
  task: Task;
  onClick: (arg0: string) => void;
  //children: ReactNode;
}

function TaskComponent({ task, onClick }: Props) {
  return (
    <div>
      <p>{task.name}</p>
      {task.objectives.map((obj, index) => (
        <p key={obj._id}>
          {index + 1}. {obj.description}
        </p>
      ))}
      <motion.button
        value={task._id}
        onClick={() => onClick(task._id)}
        initial={{ x: 0 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.8 }}
      >
        Completed
      </motion.button>
    </div>
  );
}

export default TaskComponent;
