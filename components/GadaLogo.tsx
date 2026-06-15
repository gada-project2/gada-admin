"use client";

interface GadaLogoProps {
  variant?: "light" | "dark";
  size?: number;
}

export default function GadaLogo({ variant = "dark", size = 120 }: GadaLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Gada Logo"
      width={size}
      height={Math.round(size * 0.55)}
      style={{
        objectFit: "contain",
        filter: variant === "light" ? "brightness(0) invert(1)" : "none",
      }}
    />
  );
}
