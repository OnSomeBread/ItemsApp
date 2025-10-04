"use client";
import Image from "next/image";
//import { useState } from "react";

interface Props {
  imgSrc: string;
  alt: string;
  width: number;
  height: number;
  priority: boolean;
}
// /icons/" + item._id + ".webp
function ImageComponent({ imgSrc, width, height, priority }: Props) {
  //const [src, setSrc] = useState(imgSrc);

  return (
    <Image
      src={imgSrc.replace(/ /g, "_")}
      alt=""
      width={width}
      height={height}
      priority={priority}
      fetchPriority={priority ? "high" : "auto"}
      placeholder="empty"
      //onError={() => setSrc("/unknown.webp")}
      className="rounded"
    />
  );
}

export default ImageComponent;
