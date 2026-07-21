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

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={28} />
      <span className="text-base font-bold tracking-tight">AdMultiply</span>
    </div>
  );
}
