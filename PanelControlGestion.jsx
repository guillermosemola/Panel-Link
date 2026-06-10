'use client'
import { useEffect, useState, useRef } from 'react'

// ── Helpers ────────────────────────────────────────────────────────────
const fmtUSD = n => n == null ? '—' :
  new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)
const fmtUSDM = n => {
  if (n == null) return '—'
  const a = Math.abs(n)
  if (a >= 1e6) return `$${(n/1e6).toFixed(2)}M`
  if (a >= 1e3) return `$${(n/1e3).toFixed(0)}K`
  return `$${Math.round(n)}`
}
const fmtPct = n => n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
const fmtM2  = n => n == null ? '—' : new Intl.NumberFormat('es-AR').format(Math.round(n))

const ESTADO_BADGE = {
  disponible:      { bg:'rgba(94,234,212,0.1)',  border:'rgba(94,234,212,0.25)',  color:'#5eead4', label:'Disponible' },
  reservada:       { bg:'rgba(250,204,21,0.1)',  border:'rgba(250,204,21,0.25)',  color:'#facc15', label:'Reservada' },
  vendida:         { bg:'rgba(167,139,250,0.1)', border:'rgba(167,139,250,0.25)', color:'#a78bfa', label:'Vendida' },
  canje_proveedor: { bg:'rgba(251,146,60,0.1)',  border:'rgba(251,146,60,0.25)',  color:'#fb923c', label:'Canje' },
}

const TIPO_LABEL = {
  departamento: 'Depto', cochera: 'Cochera', local: 'Local', baulera: 'Baulera'
}

// ════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════
export default function PanelControlGestion({
  proyecto,            // { id, nombre, ev_costo_total_usd, ev_ingreso_total_usd, ev_margen_objetivo_pct, fecha_ev, estado }
  controlPresupuestario, // de v_control_presupuestario
  performanceComercial,  // de v_performance_comercial
  descalceFinanciero,    // de v_descalce_financiero
  margenTeoricoVsReal,   // de v_margen_teorico_vs_real
  unidades = [],
  transacciones = [],
}) {
  const [tab, setTab]           = useState('inventario')
  const [filtroTipo, setFT]     = useState('todos')
  const [filtroEstado, setFE]   = useState('todos')

  const cp  = controlPresupuestario || {}
  const pc  = performanceComercial  || {}
  const df  = descalceFinanciero    || {}
  const mtr = margenTeoricoVsReal   || {}

  // Estados de semáforo
  const presupuestoOk = (cp.desvio_pct ?? 0) <= 5
  const presupuestoWarn = (cp.desvio_pct ?? 0) > 5 && (cp.desvio_pct ?? 0) <= 15
  const presupuestoColor = presupuestoOk ? 'green' : presupuestoWarn ? 'amber' : 'red'

  const comercialOk = (pc.pct_vs_ev ?? 0) >= 95
  const comercialWarn = (pc.pct_vs_ev ?? 0) >= 80 && (pc.pct_vs_ev ?? 0) < 95
  const comercialColor = comercialOk ? 'green' : comercialWarn ? 'amber' : 'red'

  const margenDelta = (mtr.margen_real_pct ?? 0) - (mtr.margen_teorico_pct ?? 0)
  const margenColor = margenDelta >= -2 ? 'green' : margenDelta >= -8 ? 'amber' : 'red'

  const descalceColor = df.estado_descalce === 'ok' ? 'green' : df.estado_descalce === 'alerta' ? 'amber' : 'red'

  // Filtrado de inventario
  const unidadesFiltradas = unidades.filter(u => {
    if (filtroTipo !== 'todos' && u.tipologia !== filtroTipo) return false
    if (filtroEstado !== 'todos' && u.estado !== filtroEstado) return false
    return true
  })

  return (
    <div className="pcg">
      <style>{STYLES}</style>

      {/* ── HEADER ── */}
      <div className="pcg-header">
        <div>
          <div className="pcg-eyebrow">Control de gestión · Proyecto</div>
          <h1 className="pcg-title">{proyecto?.nombre || 'Proyecto'}</h1>
          <div className="pcg-meta">
            {proyecto?.ubicacion && <span>{proyecto.ubicacion}</span>}
            {proyecto?.estado && <span className="pcg-dot-sep">·</span>}
            {proyecto?.estado && <span>{proyecto.estado}</span>}
            {proyecto?.fecha_ev && <span className="pcg-dot-sep">·</span>}
            {proyecto?.fecha_ev && <span>EV: {new Date(proyecto.fecha_ev).toLocaleDateString('es-AR',{month:'short',year:'numeric'})}</span>}
          </div>
        </div>
      </div>

      {/* ── BENTO GRID — 4 KPIs ── */}
      <div className="pcg-bento">

        {/* 1. CONTROL PRESUPUESTARIO */}
        <div className={`pcg-card pcg-glow-${presupuestoColor}`}>
          <div className="pcg-card-head">
            <span className="pcg-card-label">Control Presupuestario</span>
            <span className={`pcg-pulse pcg-pulse-${presupuestoColor}`}/>
          </div>
          <div className="pcg-card-main">{fmtUSDM(cp.costo_actual_usd)}</div>
          <div className="pcg-card-sub">de {fmtUSDM(cp.ev_costo_total_usd)} presupuestado</div>
          <div className="pcg-bar-track">
            <div className={`pcg-bar-fill pcg-bar-${presupuestoColor}`}
              style={{width:`${Math.min(100, ((cp.costo_actual_usd||0)/(cp.ev_costo_total_usd||1))*100)}%`}}/>
          </div>
          <div className={`pcg-delta pcg-delta-${presupuestoColor}`}>
            {fmtPct(cp.desvio_pct)} vs EV
          </div>
        </div>

        {/* 2. PERFORMANCE COMERCIAL */}
        <div className={`pcg-card pcg-glow-${comercialColor}`}>
          <div className="pcg-card-head">
            <span className="pcg-card-label">Performance Comercial</span>
            <span className={`pcg-pulse pcg-pulse-${comercialColor}`}/>
          </div>
          <div className="pcg-card-main">{fmtUSDM(pc.valor_proyectado_total_usd)}</div>
          <div className="pcg-card-sub">de {fmtUSDM(pc.ev_ingreso_total_usd)} proyectado en EV</div>
          <div className="pcg-bar-track">
            <div className={`pcg-bar-fill pcg-bar-${comercialColor}`}
              style={{width:`${Math.min(100, pc.pct_vs_ev||0)}%`}}/>
          </div>
          <div className={`pcg-delta pcg-delta-${comercialColor}`}>
            {pc.pct_vs_ev != null ? `${pc.pct_vs_ev.toFixed(1)}%` : '—'} del EV defendido
          </div>
        </div>

        {/* 3. MARGEN TEÓRICO VS REAL */}
        <div className={`pcg-card pcg-glow-${margenColor}`}>
          <div className="pcg-card-head">
            <span className="pcg-card-label">Margen Teórico vs Real</span>
            <span className={`pcg-pulse pcg-pulse-${margenColor}`}/>
          </div>
          <div className="pcg-card-main">{mtr.margen_real_pct != null ? `${mtr.margen_real_pct.toFixed(1)}%` : '—'}</div>
          <div className="pcg-card-sub">teórico EV: {mtr.margen_teorico_pct != null ? `${mtr.margen_teorico_pct.toFixed(1)}%` : '—'}</div>
          <div className="pcg-margin-compare">
            <div className="pcg-margin-row">
              <span>Real</span>
              <div className="pcg-bar-track" style={{flex:1}}>
                <div className={`pcg-bar-fill pcg-bar-${margenColor}`} style={{width:`${Math.max(0,Math.min(100,(mtr.margen_real_pct||0)))}%`}}/>
              </div>
            </div>
            <div className="pcg-margin-row">
              <span>EV</span>
              <div className="pcg-bar-track" style={{flex:1}}>
                <div className="pcg-bar-fill pcg-bar-ghost" style={{width:`${Math.max(0,Math.min(100,(mtr.margen_teorico_pct||0)))}%`}}/>
              </div>
            </div>
          </div>
          <div className={`pcg-delta pcg-delta-${margenColor}`}>
            {fmtPct(margenDelta)} pts vs objetivo
          </div>
        </div>

        {/* 4. SEMÁFORO DESCALCE FINANCIERO — signature element */}
        <div className={`pcg-card pcg-card-descalce pcg-glow-${descalceColor}`}>
          <div className="pcg-card-head">
            <span className="pcg-card-label">Descalce Financiero</span>
            <span className={`pcg-pulse pcg-pulse-${descalceColor}`}/>
          </div>
          <div className="pcg-descalce-viz">
            <div className="pcg-descalce-bars">
              <div className="pcg-descalce-row">
                <span className="pcg-descalce-tag">Avance físico</span>
                <div className="pcg-bar-track">
                  <div className="pcg-bar-fill pcg-bar-blue" style={{width:`${Math.min(100,df.avance_fisico_pct||0)}%`}}/>
                </div>
                <span className="pcg-descalce-val">{(df.avance_fisico_pct||0).toFixed(0)}%</span>
              </div>
              <div className="pcg-descalce-row">
                <span className="pcg-descalce-tag">m² vendidos</span>
                <div className="pcg-bar-track">
                  <div className={`pcg-bar-fill pcg-bar-${descalceColor}`} style={{width:`${Math.min(100,df.pct_vendido||0)}%`}}/>
                </div>
                <span className="pcg-descalce-val">{(df.pct_vendido||0).toFixed(0)}%</span>
              </div>
            </div>
          </div>
          <div className={`pcg-delta pcg-delta-${descalceColor}`}>
            {df.estado_descalce === 'critico' && '⚠ Gap crítico — '}
            {df.estado_descalce === 'alerta' && '◐ Gap en alerta — '}
            {df.estado_descalce === 'ok' && '✓ En línea — '}
            gap de {Math.abs(df.gap_pct||0).toFixed(1)} pts
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="pcg-tabs">
        <button className={`pcg-tab ${tab==='inventario'?'active':''}`} onClick={()=>setTab('inventario')}>
          Inventario de unidades
          <span className="pcg-tab-count">{unidades.length}</span>
        </button>
        <button className={`pcg-tab ${tab==='operaciones'?'active':''}`} onClick={()=>setTab('operaciones')}>
          Historial de operaciones
          <span className="pcg-tab-count">{transacciones.length}</span>
        </button>
      </div>

      {/* ── TAB: INVENTARIO ── */}
      {tab === 'inventario' && (
        <div className="pcg-panel">
          <div className="pcg-filters">
            <div className="pcg-filter-group">
              <span className="pcg-filter-label">Tipología</span>
              {['todos','departamento','cochera','local','baulera'].map(t => (
                <button key={t} className={`pcg-chip ${filtroTipo===t?'active':''}`} onClick={()=>setFT(t)}>
                  {t === 'todos' ? 'Todas' : TIPO_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="pcg-filter-group">
              <span className="pcg-filter-label">Estado</span>
              {['todos','disponible','reservada','vendida','canje_proveedor'].map(e => (
                <button key={e} className={`pcg-chip ${filtroEstado===e?'active':''}`} onClick={()=>setFE(e)}>
                  {e === 'todos' ? 'Todos' : ESTADO_BADGE[e].label}
                </button>
              ))}
            </div>
          </div>

          <div className="pcg-table-wrap">
            <table className="pcg-table">
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Tipología</th>
                  <th className="num">m²</th>
                  <th className="num">Costo EV/m²</th>
                  <th className="num">Precio lista/m²</th>
                  <th className="num">Margen/m²</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {unidadesFiltradas.length === 0 && (
                  <tr><td colSpan={7} className="pcg-empty">No hay unidades cargadas con estos filtros.</td></tr>
                )}
                {unidadesFiltradas.map(u => {
                  const badge = ESTADO_BADGE[u.estado] || ESTADO_BADGE.disponible
                  const margenM2 = u.precio_lista_usd_m2 - u.costo_usd_m2
                  const margenPct = u.precio_lista_usd_m2 > 0 ? (margenM2/u.precio_lista_usd_m2*100) : 0
                  return (
                    <tr key={u.id}>
                      <td className="pcg-td-unidad">
                        <strong>{u.unidad_codigo}</strong>
                        <span className="pcg-td-piso">Piso {u.piso_nro}</span>
                      </td>
                      <td>{TIPO_LABEL[u.tipologia] || u.tipologia}</td>
                      <td className="num mono">{fmtM2(u.m2_propios)}</td>
                      <td className="num mono">${fmtM2(u.costo_usd_m2)}</td>
                      <td className="num mono">${fmtM2(u.precio_lista_usd_m2)}</td>
                      <td className="num mono" style={{color: margenM2 >= 0 ? '#5eead4' : '#fb7185'}}>
                        ${fmtM2(margenM2)} <span style={{opacity:.5,fontSize:11}}>({margenPct.toFixed(0)}%)</span>
                      </td>
                      <td>
                        <span className="pcg-badge" style={{background:badge.bg,borderColor:badge.border,color:badge.color}}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: OPERACIONES ── */}
      {tab === 'operaciones' && (
        <div className="pcg-panel">
          <div className="pcg-table-wrap">
            <table className="pcg-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Unidad</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th className="num">Precio cierre</th>
                  <th className="num">Descuento</th>
                  <th className="num">Margen</th>
                  <th>TC / Moneda</th>
                  <th>Contrato</th>
                </tr>
              </thead>
              <tbody>
                {transacciones.length === 0 && (
                  <tr><td colSpan={9} className="pcg-empty">Sin operaciones registradas todavía.</td></tr>
                )}
                {transacciones.map(t => (
                  <tr key={t.id}>
                    <td className="mono">{new Date(t.fecha_operacion).toLocaleDateString('es-AR')}</td>
                    <td><strong>{t.unidad_codigo}</strong></td>
                    <td>{t.cliente_nombre}</td>
                    <td>
                      <span className="pcg-tipo-tag">{
                        {reserva:'Reserva',venta_contado:'Venta contado',venta_financiada:'Venta financiada',canje:'Canje'}[t.tipo_operacion]
                      }</span>
                    </td>
                    <td className="num mono">{fmtUSD(t.precio_cierre_usd)}</td>
                    <td className="num mono" style={{color: t.descuento_otorgado_usd > 0 ? '#fb923c':'#666'}}>
                      {t.descuento_otorgado_usd > 0 ? `-${fmtUSD(t.descuento_otorgado_usd)}` : '—'}
                    </td>
                    <td className="num mono" style={{color: t.margen_operacion_usd >= 0 ? '#5eead4':'#fb7185'}}>
                      {fmtUSD(t.margen_operacion_usd)}
                    </td>
                    <td className="mono" style={{fontSize:12,opacity:.7}}>
                      {t.moneda_pago === 'ARS' ? `$${fmtM2(t.tipo_cambio_operacion)} ARS/USD` : 'USD'}
                    </td>
                    <td>
                      <span className="pcg-contrato-tag">{
                        {reserva:'Reserva',boleto:'Boleto',escritura:'Escritura',rescindido:'Rescindido'}[t.estado_contrato]
                      }</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// ESTILOS — Dark mode, acento teal/financiero
// ════════════════════════════════════════════════════════════════════════
const STYLES = `
.pcg {
  --bg: #0a0c0e;
  --surface: #111418;
  --surface-2: #161a1f;
  --border: #23282f;
  --text: #e8ecef;
  --text-dim: #8b95a1;
  --text-faint: #565e69;
  --teal: #5eead4;
  --amber: #facc15;
  --red: #fb7185;
  --blue: #60a5fa;
  --purple: #a78bfa;
  font-family: 'Geist', -apple-system, system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding: 32px 40px 60px;
}

.pcg-header { margin-bottom: 28px; }
.pcg-eyebrow {
  font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase;
  color: var(--teal); margin-bottom: 8px; font-family: 'Geist Mono', monospace;
}
.pcg-title { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 6px; }
.pcg-meta { font-size: 13px; color: var(--text-dim); display: flex; gap: 8px; align-items: center; }
.pcg-dot-sep { color: var(--text-faint); }

/* ── BENTO GRID ── */
.pcg-bento {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px;
}
@media (max-width: 1100px) { .pcg-bento { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .pcg-bento { grid-template-columns: 1fr; } }

.pcg-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: border-color .2s, box-shadow .3s;
}
.pcg-glow-green  { box-shadow: inset 0 1px 0 rgba(94,234,212,.04), 0 0 32px -16px rgba(94,234,212,.35); border-color: rgba(94,234,212,.15); }
.pcg-glow-amber  { box-shadow: inset 0 1px 0 rgba(250,204,21,.04), 0 0 32px -16px rgba(250,204,21,.35); border-color: rgba(250,204,21,.15); }
.pcg-glow-red    { box-shadow: inset 0 1px 0 rgba(251,113,133,.04), 0 0 32px -16px rgba(251,113,133,.4); border-color: rgba(251,113,133,.18); }

.pcg-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.pcg-card-label {
  font-size: 11px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--text-dim);
}
.pcg-pulse { width: 7px; height: 7px; border-radius: 50%; position: relative; }
.pcg-pulse::after {
  content: ''; position: absolute; inset: -4px; border-radius: 50%;
  animation: pcg-pulse-anim 2.4s ease-out infinite;
}
.pcg-pulse-green  { background: var(--teal); }  .pcg-pulse-green::after  { background: var(--teal); }
.pcg-pulse-amber  { background: var(--amber); } .pcg-pulse-amber::after  { background: var(--amber); }
.pcg-pulse-red    { background: var(--red); }   .pcg-pulse-red::after    { background: var(--red); }
@keyframes pcg-pulse-anim {
  0% { opacity: .5; transform: scale(0.6); }
  70% { opacity: 0; transform: scale(1.8); }
  100% { opacity: 0; transform: scale(1.8); }
}

.pcg-card-main {
  font-family: 'Geist Mono', monospace; font-size: 26px; font-weight: 600; letter-spacing: -0.02em;
  line-height: 1; margin-bottom: 4px;
}
.pcg-card-sub { font-size: 12px; color: var(--text-dim); margin-bottom: 14px; }

.pcg-bar-track { background: var(--surface-2); border-radius: 6px; height: 6px; overflow: hidden; flex: 1; }
.pcg-bar-fill { height: 100%; border-radius: 6px; transition: width .5s ease; }
.pcg-bar-green { background: var(--teal); }
.pcg-bar-amber { background: var(--amber); }
.pcg-bar-red   { background: var(--red); }
.pcg-bar-blue  { background: var(--blue); }
.pcg-bar-ghost { background: var(--text-faint); }

.pcg-delta {
  font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 500; margin-top: 10px;
}
.pcg-delta-green { color: var(--teal); }
.pcg-delta-amber { color: var(--amber); }
.pcg-delta-red   { color: var(--red); }

/* Margen compare */
.pcg-margin-compare { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
.pcg-margin-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-dim); }
.pcg-margin-row span { width: 32px; flex-shrink: 0; font-family: 'Geist Mono', monospace; }

/* Descalce — signature card */
.pcg-card-descalce { display: flex; flex-direction: column; }
.pcg-descalce-viz { flex: 1; display: flex; flex-direction: column; justify-content: center; margin-bottom: 14px; }
.pcg-descalce-bars { display: flex; flex-direction: column; gap: 14px; }
.pcg-descalce-row { display: flex; align-items: center; gap: 10px; }
.pcg-descalce-tag { font-size: 11px; color: var(--text-dim); width: 86px; flex-shrink: 0; }
.pcg-descalce-val { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 600; width: 36px; text-align: right; }

/* ── TABS ── */
.pcg-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 0; }
.pcg-tab {
  background: none; border: none; color: var(--text-dim); font-size: 13px; font-weight: 500;
  padding: 10px 4px; margin-right: 24px; cursor: pointer; position: relative;
  display: flex; align-items: center; gap: 8px; font-family: inherit;
  transition: color .15s;
}
.pcg-tab:hover { color: var(--text); }
.pcg-tab.active { color: var(--text); }
.pcg-tab.active::after {
  content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--teal);
  border-radius: 2px 2px 0 0;
}
.pcg-tab-count {
  font-family: 'Geist Mono', monospace; font-size: 11px; background: var(--surface-2);
  color: var(--text-faint); padding: 1px 7px; border-radius: 10px;
}
.pcg-tab.active .pcg-tab-count { color: var(--teal); background: rgba(94,234,212,.08); }

/* ── PANEL ── */
.pcg-panel { padding-top: 20px; }

/* Filters */
.pcg-filters { display: flex; gap: 24px; margin-bottom: 18px; flex-wrap: wrap; }
.pcg-filter-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pcg-filter-label { font-size: 11px; color: var(--text-faint); text-transform: uppercase; letter-spacing: .08em; margin-right: 4px; }
.pcg-chip {
  background: var(--surface); border: 1px solid var(--border); color: var(--text-dim);
  font-size: 12px; padding: 5px 12px; border-radius: 20px; cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.pcg-chip:hover { border-color: var(--text-faint); color: var(--text); }
.pcg-chip.active { background: rgba(94,234,212,.08); border-color: rgba(94,234,212,.35); color: var(--teal); }

/* Table */
.pcg-table-wrap {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
}
.pcg-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pcg-table thead th {
  text-align: left; font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase;
  color: var(--text-faint); padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--surface-2);
}
.pcg-table thead th.num { text-align: right; }
.pcg-table tbody td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text); }
.pcg-table tbody tr:last-child td { border-bottom: none; }
.pcg-table tbody tr:hover { background: rgba(255,255,255,0.015); }
.pcg-table td.num { text-align: right; }
.pcg-table .mono { font-family: 'Geist Mono', monospace; }

.pcg-td-unidad { display: flex; flex-direction: column; gap: 2px; }
.pcg-td-piso { font-size: 11px; color: var(--text-faint); }

.pcg-badge {
  display: inline-block; font-size: 11px; font-weight: 500; padding: 3px 10px;
  border-radius: 20px; border: 1px solid; font-family: 'Geist Mono', monospace;
}

.pcg-tipo-tag, .pcg-contrato-tag {
  font-size: 11px; color: var(--text-dim); background: var(--surface-2);
  padding: 3px 9px; border-radius: 6px; border: 1px solid var(--border);
}

.pcg-empty { text-align: center; color: var(--text-faint); padding: 40px !important; font-size: 13px; }
`
