"use client";
import Image from "next/image";
import { useState } from "react";

interface Props {
  imgSrc: string;
  alt: string;
  width: number;
  height: number;
}
// /icons/" + item._id + ".webp
function ImageComponent({ imgSrc, alt, width, height }: Props) {
  const [src, setSrc] = useState(imgSrc);

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      onError={() => setSrc("/unknown.webp")}
    />
  );
}

export default ImageComponent;
