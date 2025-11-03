import Link from "next/link";

function PageSwitch() {
  return (
    <nav className="mt-1 ml-4 w-160 justify-start">
      <Link href="/items">Items</Link>
      <Link href="/items_compact">Items compact</Link>
      <Link href="/tasks">Tasks</Link>
      <Link href="/needed_items">Needed Items</Link>
      <Link href="/task_tree">Task Tree</Link>
      <Link href="/ammo">Ammo</Link>
      <Link href="/bitcoin">BitCoin</Link>
      <a href="https://github.com/OnSomeBread/ItemsApp">Project Code</a>
      {/* <a onClick={() => window.history.back()}>Go Back</a> */}
    </nav>
  );
}

export default PageSwitch;
