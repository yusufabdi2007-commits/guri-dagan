"use client";

interface Props {
  value: number;      // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export function StreakRing({ value, size = 120, strokeWidth = 10, label, sublabel, color = "#7c3aed" }: Props) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        {/* Center label */}
        {label && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-foreground leading-none">{label}</span>
            {sublabel && <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{sublabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
