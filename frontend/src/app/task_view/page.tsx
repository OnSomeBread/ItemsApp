import TaskView from "./TaskView";

export const metadata = { title: "Tarkov Task View" };

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default function task_view({ searchParams }: PageProps) {
  return <TaskView searchParams={searchParams} />;
}
