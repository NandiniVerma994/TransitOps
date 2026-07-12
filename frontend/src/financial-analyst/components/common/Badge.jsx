import { cn } from "../../utils/financeHelpers";

export default function Badge({ children, className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        className
      )}
    >
      {children}
    </span>
  );
}
