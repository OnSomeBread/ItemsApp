import TaskTree from "./TaskTree";

export const metadata = { title: "Tarkov Task Tree" };

type PageProps = {
  searchParams: Promise<{ trader?: string }>;
};

export default function task_tree({ searchParams }: PageProps) {
  return <TaskTree searchParams={searchParams} />;
}
