import InfiniteScroll from "react-infinite-scroll-component";
import ItemComponentButtons from "./ItemComponentButtons.tsx";
import { AnimatePresence, motion } from "framer-motion";
import type { Item, ItemQueryParams } from "../types.ts";
import ItemComponent from "./ItemComponent.tsx";

// const ItemComponent = lazy(() => import("./ItemComponent.tsx"));

interface Props {
  allItems: Item[] | null;
  getMoreItems: () => void;
  hasMore: boolean;
  queryParams: ItemQueryParams;
  changeCount: (arg0: number, arg1: number) => void;
}

function ItemScroll({
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
          className="!grid !grid-cols-[repeat(auto-fill,minmax(275px,1fr))] gap-2 p-5"
        >
          {allItems?.map((x, i) => (
            <motion.li
              transition={{ duration: 0.8 }}
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1 },
              }}
              style={{ listStyleType: "none" }}
            >
              <ItemComponent
                item={x}
                idx={i}
                fields={[
                  "name",
                  "shortName",
                  "icon",
                  "basePrice",
                  "traders",
                  // "fleaMarket",
                ]}
                height={130}
              >
                <ItemComponentButtons
                  item={x}
                  idx={i}
                  onChangeCount={changeCount}
                ></ItemComponentButtons>
              </ItemComponent>
            </motion.li>
          ))}
        </motion.ul>
      </AnimatePresence>
    </InfiniteScroll>
  );
}

export default ItemScroll;
