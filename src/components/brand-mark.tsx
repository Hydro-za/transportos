import { Truck } from "lucide-react";

export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <Truck size={size * 0.52} strokeWidth={1.9} />
      <span className="brand-mark-route" />
    </span>
  );
}
