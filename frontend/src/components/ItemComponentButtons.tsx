import type { Item } from "../types";
import { motion } from "framer-motion";

interface Props {
  item: Item;
  idx: number;
  onChangeCount: (idx: number, newNumber: number) => void;
}

// creates 2 buttons and text input for modifying how many of that item the user wants
function ItemComponentButtons({ item, idx, onChangeCount }: Props) {
  const buttonClass =
    "outline contrast !border !rounded-[8px] relative bottom-2 w-30";

  return (
    <div className="flex items-center justify-between gap-1">
      <motion.button
        className={buttonClass}
        onClick={() => {
          onChangeCount(idx, Math.max(item.count - 1, 0));
        }}
        transition={{ duration: 0.1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Remove
      </motion.button>
      <input
        id={"ItemComponent-stepper" + idx}
        className="!w-16 !rounded-[10px] !border !border-[#ccc] text-center"
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
        className={buttonClass}
        onClick={() => {
          onChangeCount(idx, item.count + 1);
        }}
        transition={{ duration: 0.1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Add
      </motion.button>
    </div>
  );
}

export default ItemComponentButtons;
