import type { Task } from "../constants";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Props {
  task: Task;
  onClickButton: (arg0: string, arg1: string) => void;
}

function TaskComponent({ task, onClickButton }: Props) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ x: -20 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.8 }}
    >
      <a onClick={() => navigate("/task_view", { state: task })}>{task.name}</a>
      <p>Minimum Player Level: {task.minPlayerLevel}</p>
      <p>given by: {task.trader}</p>
      {task.objectives.map((obj, index) => (
        <p key={obj._id}>
          {index + 1}. {obj.description}
        </p>
      ))}
      <motion.button
        value={task._id}
        onClick={() => onClickButton(task._id, "requirement")}
        transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="outline contrast main-btn"
      >
        Completed
      </motion.button>
    </motion.div>
  );
}

export default TaskComponent;
