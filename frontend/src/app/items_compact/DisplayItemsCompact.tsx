//import InfiniteScroll from "react-infinite-scroll-component";
import ImageComponent from "../../components/ImageComponent";
import { DEFAULT_ITEM_QUERY_PARAMS, DOCKER_BACKEND } from "../../constants";
import { Item, ItemQueryParams } from "../../types";
import { cookies } from "next/headers";

type PageProps = {
  searchParams: Promise<{ queryParams?: ItemQueryParams }>;
};

async function DisplayItemsCompact({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  let { queryParams } = (await searchParams) ?? {
    id: cookieStore.has("items-query")
      ? cookieStore.get("items-query")
      : DEFAULT_ITEM_QUERY_PARAMS,
  };

  if (queryParams === undefined) queryParams = DEFAULT_ITEM_QUERY_PARAMS;

  const params = new URLSearchParams();

  Object.entries(queryParams).forEach(([key, value]) => {
    params.append(key, value.toString());
  });

  const res1 = await fetch(DOCKER_BACKEND + "/api/items?" + params.toString());
  const items: Item[] = await res1.json();

  //const getMoreItems = () => {};

  return (
    <div className="text-[15px]">
      {items.map((item) => (
        <div key={item._id} className="flex gap-10">
          <ImageComponent item={item} width={32} height={32} />
          <p className="p-4">{item.name}</p>
          <p>{item.avg24hPrice}</p>
        </div>
      ))}
    </div>
    // <InfiniteScroll
    //   dataLength={items?.length ?? 0}
    //   next={getMoreItems}
    //   hasMore={false}
    //   loader={<article aria-busy="true"></article>}
    // >
    //   {items.map((item) => (
    //     <p>{item.name}</p>
    //   ))}
    // </InfiniteScroll>
  );
}

export default DisplayItemsCompact;
