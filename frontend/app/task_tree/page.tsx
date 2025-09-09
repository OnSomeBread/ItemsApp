import TaskTree from "./TaskTree";

type PageProps = {
  searchParams: Promise<{ trader?: string }>;
};

export default function task_tree({ searchParams }: PageProps) {
  return <TaskTree searchParams={searchParams} />;
}
