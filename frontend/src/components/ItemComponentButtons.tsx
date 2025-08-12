import type { Item } from "../constants";
import { motion } from "framer-motion";

interface Props {
  item: Item;
  idx: number;
  onChangeCount: (idx: number, newNumber: number) => void;
}

// creates 2 buttons and text input for modifying how many of that item the user wants
function ItemComponentButtons({ item, idx, onChangeCount }: Props) {
  return (
    <div className="div-align">
      <motion.button
        className="outline contrast main-btn stepper-btn"
        onClick={() => {
          onChangeCount(idx, Math.max(item.count - 1, 0));
        }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Remove
      </motion.button>
      <input
        className="stepper-input"
        type="text"
        value={item.count}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (isNaN(n)) {
            return;
          }
          onChangeCount(idx, n);
        }}
      />
      <motion.button
        className="outline contrast main-btn stepper-btn"
        onClick={() => {
          onChangeCount(idx, item.count + 1);
        }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Add
      </motion.button>
    </div>
  );
}

export default ItemComponentButtons;
