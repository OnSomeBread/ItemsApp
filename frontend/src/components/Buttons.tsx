import { useState } from "react";

// creates 2 buttons and text input for modifying how many of that item the user wants
function Buttons() {
  const [count, setCount] = useState(0);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <button
        style={{ height: "20px", width: "80px" }}
        onClick={() => {
          setCount(Math.max(count - 1, 0));
        }}
      >
        Remove
      </button>
      <input
        type="text"
        value={count}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (isNaN(n)) {
            setCount(count);
            return;
          }
          setCount(n);
        }}
      />
      <button
        style={{ height: "20px", width: "80px" }}
        onClick={() => {
          setCount(count + 1);
        }}
      >
        Add
      </button>
    </div>
  );
}

export default Buttons;
