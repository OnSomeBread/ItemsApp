import InfiniteScroll from "react-infinite-scroll-component";
import Buttons from "../components/Buttons";
import { lazy } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DISPLAY_ITEM_KEYS,
  type Item,
  type ItemQueryParams,
} from "../constants.ts";

const ItemComponentPreview = lazy(
  () => import("../components/ItemComponent.tsx")
);

interface Props {
  allItems: Item[] | null;
  getMoreItems: () => void;
  hasMore: boolean;
  queryParams: ItemQueryParams;
  changeCount: (arg0: number, arg1: number) => void;
}

function ItemScrollComponent({
  allItems,
  getMoreItems,
  hasMore,
  queryParams,
  changeCount,
}: Props) {
  const containerVarients = {
    show: {
      transition: {
        staggerChildren:
          // first load has a stagger animation but when infinite scrolling its turned off
          allItems && allItems.length > queryParams.limit ? 0 : 0.04,
      },
    },
  };

  return (
    <InfiniteScroll
      dataLength={allItems?.length ?? 0}
      next={getMoreItems}
      hasMore={hasMore}
      loader={<article aria-busy="true"></article>}
    >
      <AnimatePresence>
        <motion.ul
          key={allItems?.length}
          variants={containerVarients}
          initial="hidden"
          animate="show"
          className="list-item"
        >
          {allItems?.map((x, i) => (
            <motion.li
              key={x._id}
              transition={{ duration: 0.8 }}
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1 },
              }}
              style={{ listStyleType: "none" }}
            >
              <ItemComponentPreview item={x} idx={i} fields={DISPLAY_ITEM_KEYS}>
                <Buttons item={x} idx={i} onChangeCount={changeCount}></Buttons>
              </ItemComponentPreview>
            </motion.li>
          ))}
        </motion.ul>
      </AnimatePresence>
    </InfiniteScroll>
  );
}

export default ItemScrollComponent;
