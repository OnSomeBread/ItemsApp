import ItemView from "./ItemView";

export const metadata = { title: "Tarkov Item View" };

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default function item_view({ searchParams }: PageProps) {
  return <ItemView searchParams={searchParams} />;
}
