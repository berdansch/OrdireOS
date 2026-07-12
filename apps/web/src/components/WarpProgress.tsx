// WarpProgress — elemento de assinatura visual do OrdireOS.
// Em vez de uma barra flat genérica, representa o progresso como fios de
// urdume sendo tecidos — referência literal ao nome do produto (ordiri:
// "montar o urdume no tear"). Sempre comunica um número real (%), nunca é
// puramente decorativo.

const SEGMENTS = 24;

const COLOR_MAP = {
  anil: "bg-anil",
  novelo: "bg-novelo",
  "linha-verde": "bg-linha-verde",
  retalho: "bg-retalho",
} as const;

type WarpProgressProps = {
  value: number; // 0-100
  label?: string;
  color?: keyof typeof COLOR_MAP;
  size?: "sm" | "md";
};

export function WarpProgress({ value, label, color = "anil", size = "md" }: WarpProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const filledSegments = Math.round((clamped / 100) * SEGMENTS);
  const barHeight = size === "sm" ? "h-3" : "h-5";
  const gap = size === "sm" ? "gap-[1.5px]" : "gap-[2px]";

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progresso"}
      className={`flex ${gap} ${barHeight} w-full overflow-hidden rounded-sm`}
    >
      {Array.from({ length: SEGMENTS }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 rounded-[1px] transition-colors duration-300 ${
            i < filledSegments ? COLOR_MAP[color] : "bg-carvao/10"
          }`}
        />
      ))}
    </div>
  );
}
