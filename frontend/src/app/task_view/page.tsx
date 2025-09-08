import TaskView from "../pages/TaskView";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default function task_view({ searchParams }: PageProps) {
  return <TaskView searchParams={searchParams} />;
}
