type LogoMarkProps = {
  size?: number;
  className?: string;
};

export function LogoMark({ size = 28, className = "" }: LogoMarkProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/logo.svg"
      alt="AdMultiply"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={className}
    />
  );
}

/* The wordmark scales with the mark, or the text stays put while the mark
   grows around it and the lockup stops reading as one thing. */
export function Logo({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span
        className="font-bold tracking-tight"
        style={{ fontSize: Math.round(size * 0.57) }}
      >
        AdMultiply
      </span>
    </div>
  );
}
