import { Link } from "react-router-dom";

function PageSwitch() {
  return (
    <nav className="justify-start mt-1 ml-4 w-90">
      <Link to="/items">Items page</Link>
      <Link to="/tasks">Tasks page</Link>
      <Link to="/task_tree">Task Tree page</Link>
      <a onClick={() => window.history.back()}>Go Back</a>
    </nav>
  );
}

export default PageSwitch;
