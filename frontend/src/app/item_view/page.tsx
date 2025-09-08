import ItemView from "../pages/ItemView";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function item_view({ searchParams }: PageProps) {
  return <ItemView searchParams={searchParams} />;
}
