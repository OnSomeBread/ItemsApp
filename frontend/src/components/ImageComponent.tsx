"use client";
import Image from "next/image";

interface Props {
  imgSrc: string;
  alt: string;
  width: number;
  height: number;
  priority: boolean;
}

function ImageComponent({ imgSrc, width, height, priority }: Props) {
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
    />
  );
}

export default ImageComponent;
