import type { Item } from "../constants";
import ItemComponent from "./ItemComponent";
import "../App.css";

interface Props {
  items: Item[];
}

function ItemsComponent({ items }: Props) {
  return (
    <div className="list_item ">
      {items.map((x, i) => (
        <ItemComponent item={x} idx={i + 1} />
      ))}
    </div>
  );
}

export default ItemsComponent;
