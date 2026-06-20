"use client";

interface CompletionRingProps {
  percentage: number;
  size?: number;
  stroke?: number;
}

export function CompletionRing({
  percentage,
  size = 64,
  stroke = 6,
}: CompletionRingProps) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 80
      ? "#10b981" // emerald
      : percentage >= 50
        ? "#f59e0b" // amber
        : "#ef4444"; // red

  return (
    <svg width={size} height={size} className="-rotate-90">
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-muted/40"
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}
