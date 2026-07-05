import { render } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import './styles.css';

type SpringParams = {
  mass: number;
  stiffness: number;
  damping: number;
  duration: number;
  samples: number;
  clamp: boolean;
};

type ParamKey = keyof Pick<SpringParams, 'mass' | 'stiffness' | 'damping' | 'duration' | 'samples'>;

type Preset = {
  label: string;
  icon: string;
  tone: 'mint' | 'blue' | 'violet' | 'pink';
  values: SpringParams;
};

const presets: Preset[] = [
  {
    label: 'Gentle',
    icon: 'leaf',
    tone: 'mint',
    values: { mass: 1, stiffness: 100, damping: 15, duration: 800, samples: 10, clamp: false },
  },
  {
    label: 'Quick',
    icon: 'bolt',
    tone: 'blue',
    values: { mass: 1, stiffness: 300, damping: 20, duration: 600, samples: 20, clamp: false },
  },
  {
    label: 'Bouncy',
    icon: 'spring',
    tone: 'pink',
    values: { mass: 1, stiffness: 600, damping: 15, duration: 800, samples: 40, clamp: false },
  },
  {
    label: 'Slow',
    icon: 'shield',
    tone: 'violet',
    values: { mass: 1, stiffness: 80, damping: 20, duration: 600, samples: 10, clamp: false },
  },
];

const initialParams = presets[2].values;

const controls: Array<{
  key: ParamKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  range: string;
  icon: string;
  tone: string;
}> = [
  {
    key: 'stiffness',
    label: 'ばねの強さ (Stiffness)',
    hint: 'ばねの強さ。大きいほど速く戻ります',
    min: 10,
    max: 1000,
    step: 1,
    range: '10 – 1000',
    icon: 'spring',
    tone: 'blue',
  },
  {
    key: 'damping',
    label: '減衰 (Damping)',
    hint: '揺れを抑える力。大きいほどオーバーシュートが減ります',
    min: 0,
    max: 200,
    step: 1,
    range: '0 – 200',
    icon: 'wave',
    tone: 'violet',
  },
  {
    key: 'mass',
    label: '質量 (Mass)',
    hint: '重さ。大きいほどゆっくり動きます',
    min: 0.1,
    max: 10,
    step: 0.1,
    range: '0.1 – 10',
    icon: 'mass',
    tone: 'mint',
  },
  {
    key: 'duration',
    label: '時間 (ms)',
    hint: 'アニメーションの長さ',
    min: 100,
    max: 5000,
    step: 10,
    range: '100 – 5000',
    icon: 'clock',
    tone: 'orange',
  },
  {
    key: 'samples',
    label: 'サンプル数',
    hint: '曲線を近似するポイントの数（多いほど滑らか）',
    min: 10,
    max: 200,
    step: 1,
    range: '10 – 200',
    icon: 'dots',
    tone: 'yellow',
  },
];

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function springValue(t: number, mass: number, stiffness: number, damping: number) {
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (Math.abs(zeta - 1) < 0.0001) {
    return 1 - (1 + omega0 * t) * Math.exp(-omega0 * t);
  }

  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * omega0 * t);
    return 1 - envelope * (Math.cos(omegaD * t) + (zeta * omega0 / omegaD) * Math.sin(omegaD * t));
  }

  const s1 = -omega0 * (zeta - Math.sqrt(zeta * zeta - 1));
  const s2 = -omega0 * (zeta + Math.sqrt(zeta * zeta - 1));
  const c1 = s2 / (s2 - s1);
  const c2 = -s1 / (s2 - s1);
  return 1 - c1 * Math.exp(s1 * t) - c2 * Math.exp(s2 * t);
}

function sampleSpring(params: SpringParams) {
  const durationSeconds = params.duration / 1000;
  return Array.from({ length: params.samples + 1 }, (_, index) => {
    const progress = index / params.samples;
    let y = springValue(progress * durationSeconds, params.mass, params.stiffness, params.damping);
    if (params.clamp) y = clamp01(y);
    return { progress, y };
  });
}

function formatNumber(value: number) {
  const rounded = Number(value.toFixed(4));
  return String(rounded);
}

function generateLinear(params: SpringParams) {
  const points = sampleSpring(params).map((point, index) => {
    const value = formatNumber(point.y);
    if (index === 0 || index === params.samples) return value;
    const percent = Number((point.progress * 100).toFixed(1));
    return `${value} ${percent}%`;
  });
  return `linear(${points.join(', ')})`;
}

function makeGraphPoints(params: SpringParams) {
  const width = 520;
  const height = 270;
  const paddingX = 54;
  const paddingY = 30;
  const points = sampleSpring(params);
  const visibleMin = -0.5;
  const visibleMax = 1.5;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const polyline = points
    .map(({ progress, y }) => {
      const normalized = (Math.max(visibleMin, Math.min(visibleMax, y)) - visibleMin) / (visibleMax - visibleMin);
      const x = paddingX + progress * innerWidth;
      const yPos = height - paddingY - normalized * innerHeight;
      return `${x.toFixed(2)},${yPos.toFixed(2)}`;
    })
    .join(' ');

  const yToPixel = (value: number) => {
    const normalized = (value - visibleMin) / (visibleMax - visibleMin);
    return height - paddingY - normalized * innerHeight;
  };

  return { width, height, paddingX, paddingY, innerWidth, innerHeight, polyline, yToPixel };
}

function Icon({ name }: { name: string }) {
  if (name === 'sliders') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h8M16 7h4M12 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 17h4M12 17h8M8 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM4 12h2M10 12h10M6 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" /></svg>
    );
  }
  if (name === 'mass') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9h8l1.4 9H6.6L8 9ZM9.5 9a2.5 2.5 0 0 1 5 0" /></svg>;
  if (name === 'spring') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5c6 0 6 3 0 3s-6 3 0 3 6 3 0 3-6 3 0 3 6 2 0 2" /></svg>;
  if (name === 'wave') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h3l2-7 4 13 2-7h5" /></svg>;
  if (name === 'clock') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
  if (name === 'dots') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01" /></svg>;
  if (name === 'leaf') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5c-7.5.2-12.5 3.6-14 10 4.7 1.2 10.2-.4 14-10ZM6 15c2.2-2.2 4.8-3.6 8-4.2" /></svg>;
  if (name === 'bolt') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-8 12h6l-1 8 9-13h-6l0-7Z" /></svg>;
  if (name === 'shield') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 2.8 8.2 7 10 4.2-1.8 7-5.6 7-10V6l-7-3Z" /></svg>;
  if (name === 'copy') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h10v12H8zM6 16H4V4h12v2" /></svg>;
  if (name === 'play') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7-11-7Z" /></svg>;
  if (name === 'reset') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.8V3M4 8.8h6" /></svg>;
  if (name === 'code') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18-6-6 6-6M15 6l6 6-6 6" /></svg>;
  if (name === 'graph') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M7 15l4-4 3 3 5-7" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /></svg>;
}

function App() {
  const [params, setParams] = useState<SpringParams>(initialParams);
  const [copied, setCopied] = useState<'main' | 'usage' | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const linear = useMemo(() => generateLinear(params), [params]);
  const graph = useMemo(() => makeGraphPoints(params), [params]);
  const usage = `.box {\n  transition: transform ${params.duration}ms ${linear};\n}`;

  const updateParam = (key: ParamKey, value: number) => {
    setCopied(null);
    setParams((current) => ({ ...current, [key]: key === 'samples' ? Math.round(value) : value }));
  };

  const copyText = async (value: string, target: 'main' | 'usage') => {
    await navigator.clipboard.writeText(value);
    setCopied(target);
  };

  return (
    <main class="shell">
      <header class="hero">
        <div class="brand-mark"><Icon name="spring" /></div>
        <div class="hero-copy">
          <h1>Figma Spring → linear() ジェネレーター</h1>
          <p>Figma のスプリングイージングを CSS の linear() で使える形に変換します</p>
        </div>
        <aside class="tip-card">
          <div class="tip-icon"><Icon name="sparkle" /></div>
          <div>
            <strong>数値を動かすとすぐに結果が変わります</strong>
          </div>
        </aside>
      </header>

      <section class="app-grid">
        <section class="card settings-card">
          <div class="section-heading">
            <span class="heading-icon ink"><Icon name="sliders" /></span>
            <h2>スプリング設定</h2>
            <span class="mini-badge">プレビューとグラフがリアルタイムで更新されます</span>
          </div>

          <div class="control-list">
            {controls.map((control) => (
              <label class={`control-row tone-${control.tone}`} key={control.key}>
                <span class={`round-icon tone-${control.tone}`}><Icon name={control.icon} /></span>
                <span class="control-content">
                  <span class="control-title">{control.label}</span>
                  <span class="control-hint">{control.hint}</span>
                  <input
                    class="range"
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={params[control.key]}
                    onInput={(event) => updateParam(control.key, Number(event.currentTarget.value))}
                  />
                </span>
                <span class="control-value">
                  <input
                    type="number"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={params[control.key]}
                    onInput={(event) => updateParam(control.key, Number(event.currentTarget.value))}
                  />
                  <small>{control.range}</small>
                </span>
              </label>
            ))}
          </div>

          <label class="toggle-row">
            <span class="round-icon tone-pink"><Icon name="wave" /></span>
            <span class="toggle-copy">
              <strong>オーバーシュートを抑える</strong>
              <span>有効にすると、値を調整してオーバーシュートを軽減します</span>
            </span>
            <input
              type="checkbox"
              checked={params.clamp}
              onChange={(event) => setParams((current) => ({ ...current, clamp: event.currentTarget.checked }))}
            />
            <span class="switch" aria-hidden="true" />
          </label>

          <div class="preset-area">
            <div class="preset-title"><Icon name="sparkle" /> <strong>プリセット</strong><span>よく使われる設定からはじめましょう</span></div>
            <div class="preset-buttons">
              {presets.map((preset) => (
                <button
                  class={`preset-button tone-${preset.tone}`}
                  type="button"
                  onClick={() => {
                    setParams(preset.values);
                    setCopied(null);
                    setPreviewKey((value) => value + 1);
                  }}
                >
                  <Icon name={preset.icon} />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <p class="hint-bar"><span>i</span> ヒント: ドラッグでも調整できます。数値をクリックして細かく入力も可能です。</p>
        </section>

        <section class="right-stack">
          <section class="card output-card">
            <div class="card-title-row">
              <div class="title-with-icon"><span class="soft-icon mint"><Icon name="code" /></span><h2>生成された linear() コード</h2></div>
              <span class="mini-badge">CSS でそのまま使えます</span>
            </div>
            <div class="code-panel">
              <code>{linear}</code>
              <button type="button" class="copy-button" onClick={() => copyText(linear, 'main')}><Icon name="copy" /> {copied === 'main' ? 'コピー済み' : 'コピー'}</button>
            </div>
            <p class="note">※ 小数点以下の値は丸められることがあります</p>
          </section>

          <section class="card usage-card">
            <div class="title-with-icon"><span class="soft-icon violet"><Icon name="code" /></span><h2>使い方（例）</h2></div>
            <div class="usage-code">
              <pre>{`.box {\n  transition: transform ${params.duration}ms linear(…上記の値…);\n}`}</pre>
              <button type="button" onClick={() => copyText(usage, 'usage')}><Icon name="copy" /> {copied === 'usage' ? '済み' : 'コピー'}</button>
            </div>
          </section>

          <section class="bottom-grid">
            <section class="card preview-card">
              <div class="title-with-icon"><span class="soft-icon mint"><Icon name="play" /></span><h2>プレビューで動きを確認</h2></div>
              <div class="preview-track">
                <div class="track-line"><span /><span /><span /><span /><span /></div>
                <div
                  key={previewKey}
                  class="preview-object"
                  style={{ animationDuration: `${params.duration}ms`, animationTimingFunction: linear }}
                />
              </div>
              <div class="ticks"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
              <p class="micro-hint"><span>💡</span> 再生ボタンを押すと、実際の動きを確認できます。</p>
              <div class="preview-actions">
                <button class="play-button" type="button" onClick={() => setPreviewKey((value) => value + 1)}><Icon name="play" /> 再生</button>
              </div>
            </section>

            <section class="card graph-card">
              <div class="title-with-icon"><span class="soft-icon violet"><Icon name="graph" /></span><h2>イージング曲線（参考）</h2></div>
              <svg class="graph" viewBox={`0 0 ${graph.width} ${graph.height}`} role="img" aria-label="イージング曲線グラフ">
                {[1.5, 1, 0.5, 0, -0.5].map((value) => (
                  <g key={value}>
                    <text x="12" y={graph.yToPixel(value) + 5}>{value}</text>
                    <line x1={graph.paddingX} x2={graph.paddingX + graph.innerWidth} y1={graph.yToPixel(value)} y2={graph.yToPixel(value)} class={value === 1 ? 'target-grid' : 'grid-line'} />
                  </g>
                ))}
                <polyline points={graph.polyline} class="curve-line" />
                {[0, 25, 50, 75, 100].map((value) => (
                  <text key={value} x={graph.paddingX + (value / 100) * graph.innerWidth} y={graph.height - 4} text-anchor="middle">{value}%</text>
                ))}
                <text x={graph.width / 2} y={graph.height - 20} text-anchor="middle" class="axis-caption">時間の経過</text>
              </svg>
              <p class="graph-note">縦軸は値の変化、横軸は時間の進みを表しています。</p>
            </section>
          </section>
        </section>
      </section>
    </main>
  );
}

render(<App />, document.getElementById('app')!);
