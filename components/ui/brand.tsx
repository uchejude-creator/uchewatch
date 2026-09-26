import Link from "next/link";
import { brand } from "@/lib/brand";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label={`${brand.name} home`}>
      <span className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <span>▶</span>
      </span>
      <span>{brand.name}</span>
    </Link>
  );
}
