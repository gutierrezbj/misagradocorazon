// Gráficos del panel siguiendo la guía de dataviz: una serie → un color, sin leyenda (el título la nombra),
// barras finas ancladas a la base con 4 px redondeados arriba y 2 px de separación, rejilla recesiva,
// tooltip por barra con zona de acierto mayor que la marca y vista de tabla como alternativa accesible.
import { useState } from "react";

import { useI18n } from "../i18n.tsx";

type Datum = { label: string; value: number; tooltip?: string };

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => (s * pow * 4) >= v) ?? 10;
  return step * pow * 4;
}

export function ColumnChart({ data, ariaLabel, height = 220 }: { data: Datum[]; ariaLabel: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;
  const pad = { top: 12, right: 8, bottom: 28, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const slot = innerW / Math.max(1, data.length);
  const gap = 2;
  const barW = Math.max(2, slot - gap);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const labelEvery = Math.ceil(data.length / 8);
  const h = hover === null ? null : data[hover];

  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${width} ${height}`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
            <text className="axis-label" x={pad.left - 8} y={y(t) + 5} textAnchor="end">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + i * slot + gap / 2;
          const top = y(d.value);
          const barH = pad.top + innerH - top;
          const r = Math.min(4, barW / 2, barH);
          // Rectángulo con solo las esquinas superiores redondeadas, anclado a la base.
          const path =
            barH <= 0
              ? ""
              : `M${x},${pad.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.top + innerH} Z`;
          return (
            <g key={d.label}>
              {path && <path className={`bar${hover === i ? " hover" : ""}`} d={path} />}
              <rect className="hit" x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} onMouseEnter={() => setHover(i)} />
              {i % labelEvery === 0 && (
                <text className="axis-label" x={x + barW / 2} y={height - 6} textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {h && hover !== null && (
        <div className="tooltip" style={{ left: `${((pad.left + hover * slot + slot / 2) / width) * 100}%`, top: `${(y(h.value) / height) * 100}%` }}>
          {h.tooltip ?? `${h.label}: ${h.value}`}
        </div>
      )}
    </div>
  );
}

export function BarList({ data, ariaLabel }: { data: Datum[]; ariaLabel: string }) {
  const { t } = useI18n();
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.every((d) => d.value === 0)) return <p className="muted">{t("noData")}</p>;
  return (
    <div role="list" aria-label={ariaLabel}>
      {data.map((d) => (
        <div className="hbar-row" role="listitem" key={d.label} title={d.tooltip}>
          <span>{d.label}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="hbar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DataTable({ columns, rows }: { columns: { key: string; label: string; num?: boolean }[]; rows: Record<string, string | number>[] }) {
  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={c.num ? "num" : undefined}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key} className={c.num ? "num" : undefined}>
                {r[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
