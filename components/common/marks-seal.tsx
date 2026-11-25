import { cn } from "@/lib/utils";

type MarksSealProps = {
  marks: number | null | undefined;
  /** Pixel size of the whole seal. */
  size?: number;
  /** Print "MARKS" under the number. Off for the small ones. */
  label?: boolean;
  className?: string;
};

const SCALLOPS = 28;

/**
 * The mark total as an official-looking seal: a red disc with a scalloped
 * white rim, a thin white ring inside it, and the number in white. Drawn as
 * SVG so it stays sharp at any size and needs no image request.
 */
export function MarksSeal({ marks, size = 76, label = true, className }: MarksSealProps) {
  const text = marks == null ? "·" : String(marks);
  const noun = marks === 1 ? "MARK" : "MARKS";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={marks == null ? "Marks not stated" : `${marks} ${marks === 1 ? "mark" : "marks"}`}
      className={cn("drop-shadow-[0_8px_10px_rgba(60,8,4,0.55)]", className)}
    >
      <defs>
        <radialGradient id="sw-seal-face" cx="32%" cy="24%" r="85%">
          <stop offset="0" stopColor="#f2705f" />
          <stop offset="0.46" stopColor="#c0392b" />
          <stop offset="1" stopColor="#7c150c" />
        </radialGradient>
      </defs>
      {/* Scalloped rim: a ring of white dots under the red disc. */}
      <g fill="#fff">
        {Array.from({ length: SCALLOPS }, (_, i) => {
          const a = (i / SCALLOPS) * Math.PI * 2;
          return <circle key={i} cx={50 + Math.cos(a) * 45} cy={50 + Math.sin(a) * 45} r="5.2" />;
        })}
        <circle cx="50" cy="50" r="45" />
      </g>
      <circle cx="50" cy="50" r="42" fill="url(#sw-seal-face)" />
      <circle cx="50" cy="50" r="35.5" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="50" cy="50" r="32" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="1.6 2.4" />
      <text
        x="50"
        y={label ? 53 : 60}
        textAnchor="middle"
        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
        fontSize={text.length > 2 ? 24 : 32}
        fontWeight="700"
        fill="#fff"
      >
        {text}
      </text>
      {label && (
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fontFamily="var(--font-plex-mono), ui-monospace, monospace"
          fontSize="8.5"
          fontWeight="600"
          letterSpacing="1.4"
          fill="#fff"
        >
          {noun}
        </text>
      )}
    </svg>
  );
}
