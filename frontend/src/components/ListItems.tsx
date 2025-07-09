import type { Item } from "../constants";
import ItemComponent from "./ItemComponent";
import "../App.css";

interface Props {
  items: Item[];
  onChangeCount: (idx: number, newNumber: number) => void;
}

function ItemsComponent({ items, onChangeCount }: Props) {
  return (
    <div className="list_item ">
      {items.map((x, i) => (
        <ItemComponent item={x} idx={i} onChangeCount={onChangeCount} />
      ))}
    </div>
  );
}

export default ItemsComponent;
