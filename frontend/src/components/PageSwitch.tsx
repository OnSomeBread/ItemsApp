import { useNavigate } from "react-router-dom";

function PageSwitch() {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <a onClick={() => navigate("/")}>Items page</a>
      <a onClick={() => navigate("/tasks")}>Tasks page</a>
      <a onClick={() => navigate("/task_tree")}>Task Tree page</a>
    </div>
  );
}

export default PageSwitch;
