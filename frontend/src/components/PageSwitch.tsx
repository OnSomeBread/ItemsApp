import { useNavigate } from "react-router-dom";

function PageSwitch() {
  const navigate = useNavigate();

  const buttonClass = "outline contrast main-btn search-btn";

  return (
    <nav
      style={{
        justifyContent: "left",
        gap: "20px",
        marginTop: 12,
        marginLeft: 18,
        marginBottom: 4,
      }}
    >
      <button className={buttonClass} onClick={() => navigate("/items")}>
        Items page
      </button>
      <button className={buttonClass} onClick={() => navigate("/tasks")}>
        Tasks page
      </button>
      <button className={buttonClass} onClick={() => navigate("/task_tree")}>
        Task Tree page
      </button>
      <button className={buttonClass} onClick={() => window.history.back()}>
        Go Back
      </button>
    </nav>
  );
}

export default PageSwitch;
