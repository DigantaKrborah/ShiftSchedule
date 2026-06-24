import type { ShiftCode } from "@/lib/engine";

const STYLES: Record<ShiftCode, string> = {
  A:   "bg-[#bfdbfe] text-blue-900",
  B:   "bg-[#bbf7d0] text-green-900",
  C:   "bg-[#fde68a] text-yellow-900",
  G:   "bg-[#e9d5ff] text-purple-900",
  D12: "bg-[#fed7aa] text-orange-900",
  N12: "bg-[#fecaca] text-red-900",
  OFF: "bg-[#f3f4f6] text-gray-500",
};

export default function ShiftBadge({
  code,
  size = "sm",
}: {
  code: ShiftCode;
  size?: "sm" | "xs";
}) {
  const base = size === "xs"
    ? "inline-block px-1 py-px rounded text-[10px] font-semibold leading-tight"
    : "inline-block px-2 py-0.5 rounded text-xs font-semibold leading-tight";
  return <span className={`${base} ${STYLES[code]}`}>{code}</span>;
}
