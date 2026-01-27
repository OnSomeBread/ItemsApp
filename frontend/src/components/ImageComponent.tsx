"use client";
import Image from "next/image";

interface Props {
  imgSrc: string;
  alt: string;
  width: number;
  height: number;
  priority: boolean;
}

// low-quality placeholder image (1x1 transparent gray pixel)
const BLUR_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%23e5e7eb' width='1' height='1'/%3E%3C/svg%3E";

function ImageComponent({ imgSrc, width, height, priority }: Props) {
  // responsive sizes for different screen sizes
  const sizes =
    width <= 64
      ? "(max-width: 640px) 32px, (max-width: 1024px) 48px, 64px"
      : "(max-width: 640px) 100px, (max-width: 1024px) 150px, 200px";

  return (
    <Image
      src={imgSrc.replace(/ /g, "_")}
      alt=""
      width={width}
      height={height}
      priority={priority}
      fetchPriority={priority ? "high" : "auto"}
      placeholder="blur"
      blurDataURL={BLUR_PLACEHOLDER}
      sizes={sizes}
      quality={85}
      //onError={() => setSrc("/unknown.webp")}
    />
  );
}

export default ImageComponent;
