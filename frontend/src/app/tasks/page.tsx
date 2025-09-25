import { TaskQueryParams } from "../../types";
import DisplayTasks from "./DisplayTasks";

export const metadata = { title: "Tarkov Tasks" };

type PageProps = {
  searchParams: Promise<{ queryParams?: TaskQueryParams }>;
};

export default function tasks({ searchParams }: PageProps) {
  return <DisplayTasks searchParams={searchParams} />;
}
