import type { Item } from "../constants";

interface Props {
  item: Item;
}

function ItemComponent({ item }: Props) {
  return (
    <>
      <p>{item.name}</p>
      <p>{item.shortName}</p>
    </>
  );
}

export default ItemComponent;
