import { TaskQueryParams } from "../../types";
import DisplayTasksSSR from "./DisplayTasksSSR";

export const metadata = { title: "Tarkov Tasks" };

type PageProps = {
  searchParams: Promise<{ queryParams?: TaskQueryParams }>;
};

export default function tasks({ searchParams }: PageProps) {
  return <DisplayTasksSSR searchParams={searchParams} />;
}
