"use client";

import { useState } from "react";
import { initialsOf } from "@/lib/utils/media";

/**
 * Image-or-initials avatar. Takes a resolved URL (use keyToUrl() at the call
 * site) and degrades to initials when there is no image or it fails to load —
 * a missing storage object must never render as a broken-image icon.
 */
export default function Avatar({
  url,
  name,
  size = 32,
  rounded = "full",
}: {
  url: string | null;
  name: string | null | undefined;
  size?: number;
  rounded?: "full" | "md";
}) {
  const [failed, setFailed] = useState(false);
  const radius = rounded === "full" ? "rounded-full" : "rounded-md";

  if (!url || failed) {
    return (
      <div
        className={`${radius} shrink-0 flex items-center justify-center text-white font-bold`}
        style={{ width: size, height: size, backgroundColor: "#9ca3af", fontSize: size * 0.4 }}
        aria-label={name ?? "No image"}
        role="img"
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name ?? ""}
      className={`${radius} shrink-0 object-cover`}
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
