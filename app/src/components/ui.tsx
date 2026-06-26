import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/format";

/** Material Symbols icon. */
export function Icon({
  name,
  className,
  fill,
  size,
}: {
  name: string;
  className?: string;
  fill?: boolean;
  size?: number;
}) {
  return (
    <span
      className={cn("msi", fill && "fill", className)}
      style={size ? { fontSize: size } : undefined}
      aria-hidden
    >
      {name}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md";
  icon?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
  const sizes = {
    sm: "px-4 py-2 text-[13px] min-h-[40px]",
    md: "px-5 py-2.5 text-[14px] min-h-[44px]",
  };
  const variants = {
    primary: "bg-primary text-on-primary hover:bg-primary-container shadow-sm",
    secondary: "bg-secondary-container text-on-secondary-container hover:brightness-95",
    outline: "border border-border-hairline bg-surface text-on-surface hover:bg-surface-muted",
    ghost: "text-on-surface-variant hover:bg-surface-muted hover:text-primary",
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <As className={cn("rounded-[16px] border border-border-hairline bg-surface", className)}>
      {children}
    </As>
  );
}

export function Pill({
  children,
  className,
  color,
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none",
        className,
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("font-display text-[18px] font-semibold text-on-surface", className)}>
      {children}
    </h2>
  );
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-outline">
        <Icon name={icon} size={28} />
      </div>
      <p className="font-display text-[15px] font-semibold text-on-surface">{title}</p>
      {hint && <p className="max-w-[320px] text-[13px] text-text-secondary">{hint}</p>}
    </div>
  );
}
