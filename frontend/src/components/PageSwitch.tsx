import { Link } from "react-router-dom";

function PageSwitch() {
  return (
    <nav
      style={{
        justifyContent: "left",
        gap: "20px",
        marginTop: 4,
        marginLeft: 18,
      }}
    >
      <Link to="/items">Items page</Link>
      <Link to="/tasks">Tasks page</Link>
      <Link to="/task_tree">Task Tree page</Link>
      <a onClick={() => window.history.back()}>Go Back</a>
    </nav>
  );
}

export default PageSwitch;
