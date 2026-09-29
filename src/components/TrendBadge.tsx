import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

interface Props {
  deltaPct: number;
  suffix?: string;
}

/** Direction reflects the actual sign of the change — no false up/down claim on a zero delta. */
export function TrendBadge({ deltaPct, suffix }: Props) {
  const direction = deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat";

  const styles = {
    up: "bg-danger/10 text-danger",
    down: "bg-success/10 text-success",
    flat: "bg-muted/10 text-muted",
  }[direction];

  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <span className={`flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-xs font-medium ${styles}`}>
      <Icon size={12} />
      {Math.abs(deltaPct).toFixed(1)}%{suffix ? ` ${suffix}` : ""}
    </span>
  );
}
