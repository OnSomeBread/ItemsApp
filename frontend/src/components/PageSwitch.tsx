import Link from "next/link";

function PageSwitch() {
  return (
    <nav className="mt-1 ml-4 w-100 justify-start">
      <Link href="/items" prefetch={false}>
        Items
      </Link>
      <Link href="/items_compact" prefetch={false}>
        Items compact
      </Link>
      <Link href="/tasks" prefetch={false}>
        Tasks
      </Link>
      <Link href="/task_tree" prefetch={false}>
        Task Tree
      </Link>
      <Link href="/bitcoin" prefetch={false}>
        BitCoin
      </Link>
      {/* <a onClick={() => window.history.back()}>Go Back</a> */}
    </nav>
  );
}

export default PageSwitch;
