"use client";

import { useId, useState } from "react";

type SeriesPoint = { date: string; pieces: number; reworkPieces: number };

type TimeSeriesChartProps = {
  series: SeriesPoint[];
  loading?: boolean;
};

function formatDayLabel(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

function formatFullDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

const WIDTH = 640;
const HEIGHT = 200;
const PADDING = { top: 16, right: 12, bottom: 24, left: 12 };

export function TimeSeriesChart({ series, loading }: TimeSeriesChartProps) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-[200px] bg-carvao/8 rounded-xl" />
      </div>
    );
  }

  if (series.length === 0 || series.every((p) => p.pieces === 0)) {
    return (
      <div
        role="img"
        aria-label="Sem producao registrada no periodo"
        className="h-[200px] flex flex-col items-center justify-center text-center"
      >
        <p className="text-2xl mb-1">📈</p>
        <p className="text-sm text-carvao/40">Sem producao registrada no periodo.</p>
      </div>
    );
  }

  const maxPieces = Math.max(...series.map((p) => p.pieces), 1);
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const points = series.map((p, i) => {
    const x = PADDING.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const y = PADDING.top + innerH - (p.pieces / maxPieces) * innerH;
    return { x, y, ...p };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PADDING.top + innerH} L ${points[0].x} ${PADDING.top + innerH} Z`;

  // Rótulos do eixo X: no máximo ~6 marcações, para não poluir em séries longas
  const labelStep = Math.max(1, Math.ceil(series.length / 6));
  const hovered = hoverIndex != null ? points[hoverIndex] : null;
  const totalPieces = series.reduce((sum, p) => sum + p.pieces, 0);
  const totalRework = series.reduce((sum, p) => sum + p.reworkPieces, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 text-xs text-carvao/50">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-anil inline-block" />
            Pecas por dia
          </span>
          {totalRework > 0 && (
            <span className="flex items-center gap-1.5 text-novelo">
              {totalRework.toLocaleString("pt-BR")} retrabalho no periodo
            </span>
          )}
        </div>
        <p className="text-xs text-carvao/40 tabular">{totalPieces.toLocaleString("pt-BR")} pecas no total</p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-[200px]"
        role="img"
        aria-label={`Grafico de producao diaria: ${totalPieces.toLocaleString("pt-BR")} pecas no periodo, pico de ${maxPieces.toLocaleString("pt-BR")} pecas em um dia`}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-anil)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-anil)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Linhas de grade horizontais (0%, 50%, 100%) */}
        {[0, 0.5, 1].map((frac) => (
          <line
            key={frac}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={PADDING.top + innerH * frac}
            y2={PADDING.top + innerH * frac}
            stroke="var(--color-carvao)"
            strokeOpacity="0.06"
            strokeWidth="1"
          />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke="var(--color-anil)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Pontos de retrabalho — só marca dias com retrabalho > 0 */}
        {points.map((p, i) =>
          p.reworkPieces > 0 ? (
            <circle key={`rw-${i}`} cx={p.x} cy={p.y} r="2.5" fill="var(--color-novelo)" />
          ) : null
        )}

        {/* Área de interação (hover/tap) — uma faixa vertical por ponto, alvo generoso p/ mobile */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={p.x - innerW / series.length / 2}
            y={0}
            width={innerW / series.length}
            height={HEIGHT}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
            onTouchStart={() => setHoverIndex(i)}
          />
        ))}

        {hovered && (
          <>
            <line x1={hovered.x} x2={hovered.x} y1={PADDING.top} y2={PADDING.top + innerH} stroke="var(--color-anil)" strokeOpacity="0.3" strokeWidth="1" />
            <circle cx={hovered.x} cy={hovered.y} r="4" fill="var(--color-anil)" stroke="white" strokeWidth="2" />
          </>
        )}

        {/* Rótulos do eixo X */}
        {points.map((p, i) =>
          i % labelStep === 0 || i === points.length - 1 ? (
            <text key={`lbl-${i}`} x={p.x} y={HEIGHT - 6} fontSize="10" fill="var(--color-carvao)" fillOpacity="0.4" textAnchor="middle">
              {formatDayLabel(p.date)}
            </text>
          ) : null
        )}
      </svg>

      {hovered && (
        <div className="mt-1 text-center">
          <p className="text-xs text-carvao/50">
            <span className="font-medium text-carvao">{formatFullDate(hovered.date)}</span>
            {" — "}
            <span className="tabular">{hovered.pieces.toLocaleString("pt-BR")} pecas</span>
            {hovered.reworkPieces > 0 && (
              <span className="text-novelo"> · {hovered.reworkPieces.toLocaleString("pt-BR")} retrabalho</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
