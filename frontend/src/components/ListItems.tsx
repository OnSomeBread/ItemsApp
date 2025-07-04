import type { Item } from "../constants";
import ItemComponent from "./ItemComponent";

interface Props {
  items: Item[] | null;
}

function ItemsComponent({ items }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
        gap: "20px",
        padding: "20px",
      }}
    >
      {items ? items.map((x) => <ItemComponent item={x} />) : <h1>loading</h1>}
    </div>
  );
}

export default ItemsComponent;
