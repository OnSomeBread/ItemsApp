"use client";
import Image from "next/image";
import { useState } from "react";

interface Props {
  imgSrc: string;
  alt: string;
  width: number;
  height: number;
  priority: boolean;
}
// /icons/" + item._id + ".webp
function ImageComponent({ imgSrc, alt, width, height, priority }: Props) {
  const [src, setSrc] = useState(imgSrc);

  return (
    <Image
      src={src.replace(/ /g, "_")}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      fetchPriority={priority ? "high" : "auto"}
      placeholder="empty"
      onError={() => setSrc("/unknown.webp")}
    />
  );
}

export default ImageComponent;
