"use client";
import Image from "next/image";
import { Item } from "../types";
import { useState } from "react";

interface Props {
  item: Item;
  width: number;
  height: number;
}

function ImageComponent({ item, width, height }: Props) {
  const [src, setSrc] = useState("/icons/" + item._id + ".webp");

  return (
    <Image
      src={src}
      alt={item.name}
      width={width}
      height={height}
      quality={100}
      onError={() => setSrc("/icons/unknown.webp")}
    />
  );
}

export default ImageComponent;
