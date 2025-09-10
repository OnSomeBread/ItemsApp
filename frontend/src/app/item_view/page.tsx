import ItemView from "./ItemView";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default function item_view({ searchParams }: PageProps) {
  return <ItemView searchParams={searchParams} />;
}
