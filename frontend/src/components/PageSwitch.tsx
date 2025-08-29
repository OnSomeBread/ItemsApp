import { useNavigate } from "react-router-dom";

function PageSwitch() {
  const navigate = useNavigate();

  return (
    <nav
      style={{
        justifyContent: "left",
        gap: "20px",
        marginTop: 4,
        marginLeft: 18,
      }}
    >
      <a onClick={() => navigate("/items")}>Items page</a>
      <a onClick={() => navigate("/tasks")}>Tasks page</a>
      <a onClick={() => navigate("/task_tree")}>Task Tree page</a>
      <a onClick={() => window.history.back()}>Go Back</a>
    </nav>
  );
}

export default PageSwitch;
