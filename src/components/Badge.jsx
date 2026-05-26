import { tone } from "../constants/uiThemes";

const SIZES = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

const SHAPES = {
  pill: "rounded-full",
  square: "rounded-md",
};

export default function Badge({
  children,
  tone: toneName = "slate",
  size = "sm",
  shape = "pill",
  variant = "soft",
  className = "",
  icon,
  title,
}) {
  const t = tone(toneName);
  const base = variant === "solid" ? t.bgStrong : t.chip;
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${SHAPES[shape] ?? SHAPES.pill} ${SIZES[size] ?? SIZES.sm} ${base} ${className}`}
      title={title}
    >
      {icon && <span aria-hidden="true" className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
}
