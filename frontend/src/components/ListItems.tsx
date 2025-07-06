import type { Item } from "../constants";
import ItemComponent from "./ItemComponent";

interface Props {
  items: Item[];
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
      {items.map((x, i) => (
        <ItemComponent item={x} idx={i + 1} />
      ))}
    </div>
  );
}

export default ItemsComponent;
