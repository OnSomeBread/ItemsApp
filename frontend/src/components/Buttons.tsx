import type { Item } from "../constants";

interface Props {
  item: Item;
  idx: number;
  onChangeCount: (idx: number, newNumber: number) => void;
}

// creates 2 buttons and text input for modifying how many of that item the user wants
function Buttons({ item, idx, onChangeCount }: Props) {
  if (isNaN(item.count)) onChangeCount(idx, 0);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <button
        className="stepper-btn"
        onClick={() => {
          onChangeCount(idx, Math.max(item.count - 1, 0));
        }}
      >
        Remove
      </button>
      <input
        className="stepper-input"
        type="text"
        value={item.count}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (isNaN(n)) {
            //setCount(count);
            return;
          }
          onChangeCount(idx, n);
        }}
      />
      <button
        className="stepper-btn"
        onClick={() => {
          onChangeCount(idx, item.count + 1);
        }}
      >
        Add
      </button>
    </div>
  );
}

export default Buttons;
