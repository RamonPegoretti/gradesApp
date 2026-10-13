import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BANDS, distribution, format2, formatRaw, overallTimeline, round2, subjectAverage } from '../lib/grades';
import { useStudentData } from './StudentLayout';

// Kept in sync with the CSS tokens in styles.css.
const C = {
  accent: '#d4b06a',
  ink: '#e9e7e3',
  muted: '#8b8f98',
  grid: '#24272e',
  pass: '#6f7480',
  surface: '#16181d',
};

const axis = { stroke: C.muted, fontSize: 12, tickLine: false, axisLine: { stroke: C.grid } };
const tooltip = {
  contentStyle: { background: C.surface, border: `1px solid ${C.grid}`, borderRadius: 8, color: C.ink },
  labelStyle: { color: C.muted },
  itemStyle: { color: C.ink },
  cursor: { fill: 'rgba(255,255,255,0.04)', stroke: C.grid },
};
const passLine = <ReferenceLine y={4} stroke={C.pass} strokeDasharray="4 4" />;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Charts() {
  const { loading, activeYear, subjects, grades } = useStudentData();
  const [subjectId, setSubjectId] = useState<number | null>(null);

  if (loading) return <p className="muted">Caricamento…</p>;
  if (!activeYear) return <p className="muted">Nessun anno attivo.</p>;

  // a. subject averages
  const averages = subjects.map((s) => {
    const avg = subjectAverage(grades.filter((g) => g.subject_id === s.id));
    return { name: s.name, media: avg === null ? null : round2(avg) };
  });
  const barHeight = Math.max(160, subjects.length * 36 + 40);

  // b. grades of one subject in order of entry
  const selected = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const subjectLine = selected
    ? grades.filter((g) => g.subject_id === selected.id).map((g, i) => ({ n: i + 1, voto: g.value, peso: g.weight }))
    : [];

  // c. overall average as grades were added
  const timeline = overallTimeline(grades).map((v, i) => ({ n: i + 1, media: v === null ? null : round2(v) }));

  // d. distribution
  const dist = distribution(grades).map((count, i) => ({ fascia: BANDS[i], voti: count }));

  return (
    <>
      <h1>Grafici</h1>

      <Card title="Media per materia">
        {subjects.length === 0 ? (
          <p className="muted">Nessuna materia.</p>
        ) : (
          <ResponsiveContainer width="100%" height={barHeight}>
            <BarChart data={averages} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} stroke={C.grid} />
              <XAxis type="number" domain={[0, 6]} ticks={[0, 1, 2, 3, 4, 5, 6]} {...axis} />
              <YAxis type="category" dataKey="name" width={110} {...axis} />
              <Tooltip {...tooltip} formatter={(v) => [format2(Number(v)), 'Media']} />
              <ReferenceLine x={4} stroke={C.pass} strokeDasharray="4 4" />
              <Bar dataKey="media" fill={C.accent} radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Voti per materia">
        {subjects.length > 0 && (
          <select value={selected?.id ?? ''} onChange={(e) => setSubjectId(Number(e.target.value))}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {subjectLine.length === 0 ? (
          <p className="muted">Nessun voto.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={subjectLine} margin={{ left: -16, right: 16, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="n" {...axis} allowDecimals={false} />
              <YAxis domain={[0, 6]} ticks={[0, 1, 2, 3, 4, 5, 6]} {...axis} />
              <Tooltip
                {...tooltip}
                labelFormatter={(n) => `Voto n. ${n}`}
                formatter={(v, _name, item) => [`${formatRaw(Number(v))} (peso ${formatRaw(item.payload.peso)})`, 'Voto']}
              />
              {passLine}
              <Line type="linear" dataKey="voto" stroke={C.accent} strokeWidth={2} dot={{ r: 3, fill: C.accent }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Andamento della media generale">
        {timeline.every((p) => p.media === null) ? (
          <p className="muted">Nessun voto.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeline} margin={{ left: -16, right: 16, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="n" {...axis} allowDecimals={false} />
              <YAxis domain={[0, 6]} ticks={[0, 1, 2, 3, 4, 5, 6]} {...axis} />
              <Tooltip
                {...tooltip}
                labelFormatter={(n) => `Dopo ${n} ${Number(n) === 1 ? 'voto' : 'voti'}`}
                formatter={(v) => [format2(Number(v)), 'Media generale']}
              />
              {passLine}
              <Line type="linear" dataKey="media" stroke={C.accent} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Distribuzione dei voti">
        {grades.length === 0 ? (
          <p className="muted">Nessun voto.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dist} margin={{ left: -16, right: 16, top: 8 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="fascia" {...axis} />
              <YAxis allowDecimals={false} {...axis} />
              <Tooltip {...tooltip} formatter={(v) => [String(v), 'Voti']} />
              <Bar dataKey="voti" fill={C.accent} radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </>
  );
}
