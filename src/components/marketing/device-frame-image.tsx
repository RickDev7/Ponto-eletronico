"use client";

import Image from "next/image";
import { useState } from "react";

export function DeviceFrameImage({
  src,
  alt,
  fallback,
}: {
  src: string;
  alt: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className="p-1">{fallback}</div>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1280}
      height={720}
      className="h-auto w-full"
      priority
      onError={() => setFailed(true)}
    />
  );
}
