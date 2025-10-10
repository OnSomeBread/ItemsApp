import Link from "next/link";

function PageSwitch() {
  return (
    <nav className="mt-1 ml-4 w-120 justify-start">
      <Link href="/items">Items</Link>
      <Link href="/items_compact">Items compact</Link>
      <Link href="/tasks">Tasks</Link>
      <Link href="/task_tree">Task Tree</Link>
      <Link href="/bitcoin">BitCoin</Link>
      <Link href="/ammo">Ammo</Link>
      {/* <a onClick={() => window.history.back()}>Go Back</a> */}
    </nav>
  );
}

export default PageSwitch;
