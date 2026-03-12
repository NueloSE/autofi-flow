import Image from "next/image";

const TOKEN_ICONS: Record<string, string> = {
  FLOW: "/flow-logo.svg",
  USDC: "/usdc-logo.svg",
  STFLOW: "/stflow-logo.svg",
  DUST: "/dust-logo.png",
};

export function TokenIcon({
  token,
  size = 16,
  className = "",
}: {
  token: string;
  size?: number;
  className?: string;
}) {
  const src = TOKEN_ICONS[token.toUpperCase()];
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={token}
      width={size}
      height={size}
      className={`inline-block rounded-full shrink-0 ${className}`}
    />
  );
}
