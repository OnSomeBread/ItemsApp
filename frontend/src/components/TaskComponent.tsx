import type { Task } from "../constants";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Props {
  task: Task;
  onClick: (arg0: string) => void;
}

function TaskComponent({ task, onClick }: Props) {
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
        onClick={() => onClick(task._id)}
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
