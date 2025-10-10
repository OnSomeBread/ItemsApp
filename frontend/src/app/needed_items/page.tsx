import { TaskQueryParams } from "../../types";
import DisplayNeededItems from "./DisplayNeededItems";

export const metadata = { title: "Tarkov Needed Items" };

type PageProps = {
  searchParams: Promise<{ queryParams?: TaskQueryParams }>;
};

export default function tasks({ searchParams }: PageProps) {
  return <DisplayNeededItems searchParams={searchParams} />;
}
