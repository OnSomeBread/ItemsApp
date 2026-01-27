import InfiniteScroll from "react-infinite-scroll-component";
import ItemComponentButtons from "./ItemComponentButtons.tsx";
import { AnimatePresence, motion } from "framer-motion";
import type { Item, ItemQueryParams } from "../types.ts";
import ItemComponent from "./ItemComponent.tsx";
import { memo, useMemo } from "react";

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
  const isFirstLoad = useMemo(() => {
    return !allItems || allItems.length <= queryParams.limit;
  }, [allItems?.length, queryParams.limit]);

  const containerVarients = useMemo(
    () => ({
      show: {
        transition: {
          staggerChildren: isFirstLoad ? 0.04 : 0,
        },
      },
    }),
    [isFirstLoad]
  );

  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      show: { opacity: 1 },
    }),
    []
  );

  return (
    <InfiniteScroll
      dataLength={allItems?.length ?? 0}
      next={getMoreItems}
      hasMore={hasMore}
      loader={<article aria-busy="true"></article>}
    >
      <AnimatePresence>
        <motion.ul
          variants={containerVarients}
          initial="hidden"
          animate="show"
          className="!grid !grid-cols-[repeat(auto-fill,minmax(275px,1fr))] gap-2 p-5"
        >
          {allItems?.map((x, i) => (
            <motion.li
              key={x._id}
              transition={{
                duration: isFirstLoad ? 0.8 : 0,
              }}
              variants={itemVariants}
              style={{ listStyleType: "none" }}
            >
              <ItemComponent
                item={x}
                idx={i}
                fields={["name", "icon", "traders"]}
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

export default memo(ItemScroll);
