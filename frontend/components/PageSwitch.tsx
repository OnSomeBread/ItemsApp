import Link from "next/link";

function PageSwitch() {
  return (
    <nav className="justify-start mt-1 ml-4 w-90">
      <Link href="/items">Items page</Link>
      <Link href="/tasks">Tasks page</Link>
      <Link href="/task_tree">Task Tree page</Link>
      {/* <Link href="/items_compact">Items page compact</Link> */}
      {/* <a onClick={() => window.history.back()}>Go Back</a> */}
    </nav>
  );
}

export default PageSwitch;
