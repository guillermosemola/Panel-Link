'use client'
import { useState, useEffect, useRef } from 'react'
import ModalUnidad from './ModalUnidad'

const fmtM   = n => { if(n==null)return'—'; const a=Math.abs(n),s=n<0?'-':''; if(a>=1e6)return`${s}$${(a/1e6).toFixed(2)}M`; if(a>=1e3)return`${s}$${Math.round(a/1e3)}K`; return`${s}$${Math.round(a)}` }
const fmtPct = n => n==null?'—':`${Number(n).toFixed(1)}%`
const fmt2   = n => n==null?'—':new Intl.NumberFormat('es-AR').format(Math.round(n))

const SEM = {
  verde:    { color:'#22c55e', bg:'rgba(34,197,94,.1)',   border:'rgba(34,197,94,.2)',   label:'En control' },
  amarillo: { color:'#f59e0b', bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.2)',  label:'Atención' },
  rojo:     { color:'#ef4444', bg:'rgba(239,68,68,.1)',   border:'rgba(239,68,68,.2)',   label:'Crítico' },
  gris:     { color:'#9ca3af', bg:'rgba(156,163,175,.1)', border:'rgba(156,163,175,.2)', label:'Sin datos' },
  sin_datos:{ color:'#9ca3af', bg:'rgba(156,163,175,.1)', border:'rgba(156,163,175,.2)', label:'Sin datos' },
}
const BADGE = {
  disponible:     {color:'#22c55e', bg:'rgba(34,197,94,.1)',   label:'Disponible'},
  reservada:      {color:'#f59e0b', bg:'rgba(245,158,11,.1)',  label:'Reservada'},
  vendida:        {color:'#a78bfa', bg:'rgba(167,139,250,.1)', label:'Vendida'},
  canje_proveedor:{color:'#fb923c', bg:'rgba(251,146,60,.1)',  label:'Canje'},
}
const TIPO = {departamento:'Depto', cochera:'Cochera', local:'Local', baulera:'Baulera'}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;500;600&display=swap');
.pg{--bg:#0a0c0e;--s1:#111418;--s2:#161a1f;--bd:#1f2937;--tx:#e8ecef;--dim:#6b7280;--fnt:#4b5563;
  font-family:'Geist',system-ui,sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;padding:28px 36px 60px}
.pg-ey{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#22c55e;margin-bottom:6px;font-family:'Geist Mono',monospace}
.pg-h1{font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0 0 8px}
.pg-meta{font-size:13px;color:var(--dim);margin-bottom:24px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.pg-bento{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
@media(max-width:1100px){.pg-bento{grid-template-columns:repeat(2,1fr)}}
.pg-card{background:var(--s1);border:1px solid var(--bd);border-radius:12px;padding:18px;transition:border-color .2s}
.pg-card.verde  {border-color:rgba(34,197,94,.25); box-shadow:0 0 24px -10px rgba(34,197,94,.2)}
.pg-card.amarillo{border-color:rgba(245,158,11,.25);box-shadow:0 0 24px -10px rgba(245,158,11,.2)}
.pg-card.rojo   {border-color:rgba(239,68,68,.25); box-shadow:0 0 24px -10px rgba(239,68,68,.25)}
.pg-lbl{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
.pg-val{font-family:'Geist Mono',monospace;font-size:26px;font-weight:600;line-height:1;margin-bottom:4px}
.pg-sub{font-size:12px;color:var(--dim);margin-bottom:12px}
.pg-bar{height:5px;background:var(--s2);border-radius:6px;overflow:hidden;margin-bottom:8px}
.pg-bar-fill{height:100%;border-radius:6px;transition:width .5s}
.pg-delta{font-family:'Geist Mono',monospace;font-size:11px;font-weight:500;margin-top:8px}
.pg-dot{width:7px;height:7px;border-radius:50%;position:relative;flex-shrink:0}
.pg-dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;animation:pg-p 2.4s ease-out infinite;opacity:0}
.pg-dot.verde{background:#22c55e}.pg-dot.verde::after{background:#22c55e;opacity:1}
.pg-dot.amarillo{background:#f59e0b}.pg-dot.amarillo::after{background:#f59e0b;opacity:1}
.pg-dot.rojo{background:#ef4444}.pg-dot.rojo::after{background:#ef4444;opacity:1}
.pg-dot.gris,.pg-dot.sin_datos{background:#9ca3af}
@keyframes pg-p{0%{opacity:.5;transform:scale(.6)}70%{opacity:0;transform:scale(1.8)}100%{opacity:0}}
.pg-tabs{display:flex;border-bottom:1px solid var(--bd);margin-bottom:20px;gap:0}
.pg-tab{background:none;border:none;color:var(--dim);font-size:13px;font-weight:500;padding:10px 0;
  margin-right:24px;cursor:pointer;position:relative;font-family:inherit;transition:color .15s}
.pg-tab:hover{color:var(--tx)}.pg-tab.act{color:var(--tx)}
.pg-tab.act::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:#22c55e;border-radius:2px 2px 0 0}
.pg-cnt{font-family:'Geist Mono',monospace;font-size:11px;background:var(--s2);color:var(--fnt);padding:1px 7px;border-radius:10px;margin-left:6px}
.pg-tab.act .pg-cnt{color:#22c55e;background:rgba(34,197,94,.08)}
.pg-charts{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}
@media(max-width:900px){.pg-charts{grid-template-columns:1fr}}
.pg-chart-card{background:var(--s1);border:1px solid var(--bd);border-radius:12px;padding:20px}
.pg-chart-title{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--fnt);margin-bottom:16px}
.pg-tbl-wrap{background:var(--s1);border:1px solid var(--bd);border-radius:12px;overflow:auto;margin-bottom:20px}
.pg-tbl{width:100%;border-collapse:collapse;font-size:13px}
.pg-tbl thead th{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--fnt);
  padding:11px 14px;border-bottom:1px solid var(--bd);background:var(--s2);text-align:left;white-space:nowrap}
.pg-tbl th.r,.pg-tbl td.r{text-align:right}
.pg-tbl tbody td{padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.03);color:var(--tx);vertical-align:middle}
.pg-tbl tbody tr:last-child td{border-bottom:none}
.pg-tbl tbody tr.click{cursor:pointer}.pg-tbl tbody tr.click:hover{background:rgba(255,255,255,.02)}
.pg-mono{font-family:'Geist Mono',monospace}
.pg-badge{display:inline-block;font-size:11px;font-weight:500;padding:2px 9px;border-radius:12px}
.pg-empty{text-align:center;color:var(--fnt);padding:40px;font-size:13px}
.pg-sinev{background:rgba(96,165,250,.07);border:1px solid rgba(96,165,250,.2);border-radius:10px;
  padding:14px 18px;font-size:13px;color:var(--dim);margin-bottom:20px}
.pg-filters{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;align-items:center}
.pg-chip{background:var(--s1);border:1px solid var(--bd);color:var(--dim);font-size:12px;
  padding:5px 12px;border-radius:20px;cursor:pointer;font-family:inherit;transition:all .15s}
.pg-chip:hover{border-color:var(--fnt);color:var(--tx)}
.pg-chip.act{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.3);color:#22c55e}
`

export default function PanelGestion({
  proyecto, kpisActuales, flujoDatos=[], earnedValueData=[],
  descalce, unidades=[], transacciones=[], puedeEditar=false, empresaId, onRefresh
}) {
  const [tab, setTab] = useState('flujo')
  const [filtroTipo, setFT] = useState('todos')
  const [filtroEstado, setFE] = useState('todos')
  const [modalUnidad, setModalUnidad] = useState(null)

  // Refs de canvas — siempre montados, solo visibilidad CSS
  const refFF  = useRef(null)
  const refSaldo = useRef(null)
  const refEV  = useRef(null)
  const charts = useRef({})

  const hasEV   = !!proyecto?.ev_costo_total_usd
  const hasData = earnedValueData.length > 0
  const hasFlujo = flujoDatos.length > 0

  const sem      = SEM[kpisActuales?.semaforo || 'gris']
  const cpi      = kpisActuales?.cpi_actual
  const cpiColor = !cpi?'gris':cpi>=0.95?'verde':cpi>=0.85?'amarillo':'rojo'
  const dColor   = !descalce?'gris':Math.abs(descalce)<=10?'verde':Math.abs(descalce)<=20?'amarillo':'rojo'

  // ── Inicializar gráficos UNA SOLA VEZ al montar ──────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    import('chart.js/auto').then(({ default: Chart }) => {

      // Gráfico 1: Flujo de fondos barras
      if (refFF.current && hasFlujo && !charts.current.ff) {
        charts.current.ff = new Chart(refFF.current, {
          type: 'bar',
          data: {
            labels: flujoDatos.map(d=>`M${d.mes_numero}`),
            datasets: [
              { label:'Egreso proy.', data:flujoDatos.map(d=>d.egreso_proyectado_mes),
                backgroundColor:'rgba(239,68,68,.25)', borderColor:'#ef4444', borderWidth:1 },
              { label:'Egreso real',  data:flujoDatos.map(d=>d.egreso_real_mes||0),
                backgroundColor:'rgba(239,68,68,.5)',  borderColor:'#ef4444', borderWidth:1 },
              { label:'Ingreso proy.',data:flujoDatos.map(d=>d.ingreso_proyectado_mes),
                backgroundColor:'rgba(34,197,94,.2)',  borderColor:'#22c55e', borderWidth:1 },
              { label:'Ingreso real', data:flujoDatos.map(d=>d.ingreso_real_mes||0),
                backgroundColor:'rgba(34,197,94,.45)', borderColor:'#22c55e', borderWidth:1 },
            ]
          },
          options: chartOpts(v=>fmtM(v))
        })
      }

      // Gráfico 2: Saldo acumulado línea
      if (refSaldo.current && hasFlujo && !charts.current.saldo) {
        charts.current.saldo = new Chart(refSaldo.current, {
          type: 'line',
          data: {
            labels: flujoDatos.map(d=>`M${d.mes_numero}`),
            datasets: [
              { label:'Saldo acum. proyectado', data:flujoDatos.map(d=>d.saldo_proyectado_acum),
                borderColor:'#60a5fa', backgroundColor:'rgba(96,165,250,.06)', tension:.4, fill:true, pointRadius:0, borderWidth:2 },
              { label:'Saldo acum. real', data:flujoDatos.map(d=>d.saldo_real_acum||null),
                borderColor:'#22c55e', backgroundColor:'transparent', tension:.4, pointRadius:3, borderWidth:2 },
            ]
          },
          options: chartOpts(v=>fmtM(v))
        })
      }

      // Gráfico 3: Earned Value
      if (refEV.current && hasData && !charts.current.ev) {
        charts.current.ev = new Chart(refEV.current, {
          type: 'line',
          data: {
            labels: earnedValueData.map(d=>`M${d.mes_numero}`),
            datasets: [
              { label:'PV (Planificado)', data:earnedValueData.map(d=>d.pv),
                borderColor:'#60a5fa', backgroundColor:'rgba(96,165,250,.06)', tension:.4, fill:true, pointRadius:0, borderWidth:2 },
              { label:'AC (Real)',        data:earnedValueData.map(d=>d.ac),
                borderColor:'#ef4444', backgroundColor:'transparent', tension:.4, pointRadius:0, borderWidth:2, borderDash:[5,3] },
              { label:'EV (Ganado)',      data:earnedValueData.map(d=>d.ev_tecnico),
                borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.06)', tension:.4, fill:true, pointRadius:0, borderWidth:2 },
            ]
          },
          options: chartOpts(v=>fmtM(v))
        })
      }
    })

    return () => {
      Object.values(charts.current).forEach(c => c?.destroy())
      charts.current = {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flujoDatos, earnedValueData])

  function chartOpts(yFmt) {
    return {
      responsive:true, maintainAspectRatio:false,
      animation:false,
      plugins:{ legend:{ position:'bottom', labels:{ color:'#6b7280', font:{size:10}, boxWidth:10 }}},
      scales:{
        x:{ ticks:{color:'#4b5563',font:{size:10},maxTicksLimit:12}, grid:{color:'#1f2937'} },
        y:{ ticks:{color:'#4b5563',font:{size:10},callback:yFmt},    grid:{color:'#1f2937'} }
      }
    }
  }

  const uFiltradas = unidades.filter(u =>
    (filtroTipo==='todos'   || u.tipologia===filtroTipo) &&
    (filtroEstado==='todos' || u.estado===filtroEstado)
  )

  const countDisp  = unidades.filter(u=>u.estado==='disponible').length
  const countVend  = unidades.filter(u=>u.estado==='vendida').length
  const countCanje = unidades.filter(u=>u.estado==='canje_proveedor').length

  return (
    <div className="pg">
      <style>{CSS}</style>

      {/* Header */}
      <div className="pg-ey">Control de gestión · Proyecto</div>
      <h1 className="pg-h1">{proyecto?.nombre}</h1>
      <div className="pg-meta">
        {proyecto?.estado && <span>{proyecto.estado.replace('_',' ')}</span>}
        {proyecto?.m2_totales && <><span style={{color:'#1f2937'}}>·</span><span>📐 {fmt2(proyecto.m2_totales)} m²</span></>}
        {proyecto?.plazo_meses && <><span style={{color:'#1f2937'}}>·</span><span>⏱ {proyecto.plazo_meses} meses</span></>}
        {kpisActuales?.ultimo_mes_cargado && <><span style={{color:'#1f2937'}}>·</span><span>Mes {kpisActuales.ultimo_mes_cargado} cargado</span></>}
        {!hasEV && <span style={{color:'#60a5fa',fontStyle:'italic'}}>Sin EV cargado</span>}
        <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,
          background:sem.bg,color:sem.color,border:`1px solid ${sem.border}`}}>
          {kpisActuales?.semaforo==='verde'?'🟢':kpisActuales?.semaforo==='amarillo'?'🟡':kpisActuales?.semaforo==='rojo'?'🔴':'⚪'} {sem.label}
        </span>
      </div>

      {!hasEV && <div className="pg-sinev">ℹ️ Sin EV cargado — los indicadores de presupuesto estarán disponibles una vez que se configure el EV.</div>}

      {/* Bento KPIs */}
      <div className="pg-bento">
        {/* CPI */}
        <div className={`pg-card ${cpiColor}`}>
          <div className="pg-lbl">CPI — Eficiencia de costo <span className={`pg-dot ${cpiColor}`}/></div>
          <div className={`pg-val`} style={{color:SEM[cpiColor]?.color||'#9ca3af'}}>{cpi?cpi.toFixed(3):'—'}</div>
          <div className="pg-sub">{!cpi?'Sin datos':cpi>=0.95?'Bajo presupuesto ✓':cpi>=0.85?'Leve desvío':'Sobre costo ⚠'}</div>
          {cpi && <div className="pg-bar"><div className="pg-bar-fill" style={{width:`${Math.min(100,cpi*100)}%`,background:SEM[cpiColor].color}}/></div>}
          {cpi && <div className="pg-delta" style={{color:SEM[cpiColor].color}}>
            {cpi>=1?'+':''}{((cpi-1)*100).toFixed(1)}% vs objetivo · EAC: {fmtM(kpisActuales?.eac)}
          </div>}
        </div>

        {/* Avance vs Presupuesto */}
        <div className="pg-card">
          <div className="pg-lbl">Avance vs Presupuesto</div>
          <div className="pg-val">{kpisActuales?.pct_avance_fisico!=null?fmtPct(kpisActuales.pct_avance_fisico):'—'}</div>
          <div className="pg-sub">Costo real: {fmtM(kpisActuales?.costo_real_acum)} / EV: {fmtM(proyecto?.ev_costo_total_usd)}</div>
          {hasEV && kpisActuales?.costo_real_acum && (
            <>
              <div className="pg-bar">
                <div className="pg-bar-fill" style={{width:`${Math.min(100,(+kpisActuales.costo_real_acum/+proyecto.ev_costo_total_usd)*100)}%`,background:'#60a5fa'}}/>
              </div>
              <div className="pg-delta" style={{color:'#60a5fa'}}>
                {fmtPct((+kpisActuales.costo_real_acum/+proyecto.ev_costo_total_usd)*100)} del presupuesto consumido
              </div>
            </>
          )}
        </div>

        {/* Descalce */}
        <div className={`pg-card ${dColor}`}>
          <div className="pg-lbl">Descalce comercial <span className={`pg-dot ${dColor}`}/></div>
          <div className="pg-val" style={{color:SEM[dColor]?.color||'#9ca3af'}}>
            {descalce!=null?`${descalce>0?'+':''}${descalce.toFixed(1)}%`:'—'}
          </div>
          <div className="pg-sub">Avance físico vs m² vendidos</div>
          {kpisActuales && (
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:6}}>
              {[['Avance físico',kpisActuales.pct_avance_fisico||0,'#60a5fa'],
                ['% Vendido',kpisActuales.pct_m2_vendidos||0,SEM[dColor]?.color||'#9ca3af']].map(([l,v,c])=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'var(--dim)'}}>
                  <span style={{width:80,flexShrink:0}}>{l}</span>
                  <div className="pg-bar" style={{flex:1,marginBottom:0}}>
                    <div style={{width:`${Math.min(100,v)}%`,height:'100%',borderRadius:6,background:c}}/>
                  </div>
                  <span className="pg-mono" style={{fontSize:11,width:36,textAlign:'right'}}>{Number(v).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Margen real */}
        <div className="pg-card">
          <div className="pg-lbl">Margen real proyectado</div>
          <div className="pg-val" style={{color:kpisActuales?.margen_real_pct>=20?'#22c55e':kpisActuales?.margen_real_pct>=10?'#f59e0b':'#9ca3af'}}>
            {fmtPct(kpisActuales?.margen_real_pct)}
          </div>
          <div className="pg-sub">EV objetivo: {fmtPct(proyecto?.ev_margen_objetivo_pct)}</div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {[['Real',kpisActuales?.margen_real_pct||0,'#22c55e'],
              ['EV obj.',proyecto?.ev_margen_objetivo_pct||0,'#60a5fa']].map(([l,v,c])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'var(--dim)'}}>
                <span style={{width:44,flexShrink:0}}>{l}</span>
                <div className="pg-bar" style={{flex:1,marginBottom:0}}>
                  <div style={{width:`${Math.min(100,Math.max(0,v))}%`,height:'100%',borderRadius:6,background:c}}/>
                </div>
                <span className="pg-mono" style={{fontSize:11,width:36,textAlign:'right'}}>{Number(v||0).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="pg-tabs">
        {[
          ['flujo',      '📊 Flujo de fondos'],
          ['ev',         '📈 Earned Value'],
          ['inventario', `🏢 Inventario`, unidades.length],
          ['operaciones','💼 Operaciones', transacciones.length],
        ].map(([key,label,cnt])=>(
          <button key={key} className={`pg-tab ${tab===key?'act':''}`} onClick={()=>setTab(key)}>
            {label}{cnt!=null && <span className="pg-cnt">{cnt}</span>}
          </button>
        ))}
      </div>

      {/* ── CONTENIDOS: siempre montados, visibilidad por CSS ── */}

      {/* Flujo de fondos */}
      <div style={{display:tab==='flujo'?'block':'none'}}>
        {!hasFlujo ? (
          <div className="pg-empty">Sin flujo proyectado. Generá el EV para ver los gráficos.</div>
        ) : (
          <>
            <div className="pg-charts">
              <div className="pg-chart-card">
                <div className="pg-chart-title">Ingresos y egresos por mes — Proyectado vs Real</div>
                <div style={{height:240,position:'relative'}}><canvas ref={refFF}/></div>
              </div>
              <div className="pg-chart-card">
                <div className="pg-chart-title">Saldo de caja acumulado — Proyectado vs Real</div>
                <div style={{height:240,position:'relative'}}><canvas ref={refSaldo}/></div>
              </div>
            </div>
            <div className="pg-tbl-wrap">
              <table className="pg-tbl">
                <thead><tr>
                  <th>Mes</th>
                  <th className="r">Egreso proy.</th><th className="r">Egreso real</th>
                  <th className="r">Ingreso proy.</th><th className="r">Ingreso real</th>
                  <th className="r">Saldo acum. proy.</th><th className="r">Saldo acum. real</th>
                  <th className="r">Desvío</th>
                </tr></thead>
                <tbody>
                  {flujoDatos.slice(0,18).map(d=>{
                    const dev = (d.egreso_real_mes||0) - d.egreso_proyectado_mes
                    return (
                      <tr key={d.mes_numero}>
                        <td className="pg-mono">M{d.mes_numero} <span style={{fontSize:10,color:'var(--fnt)'}}>{d.fecha_mes?.slice(0,7)}</span></td>
                        <td className="r pg-mono">{fmtM(d.egreso_proyectado_mes)}</td>
                        <td className="r pg-mono" style={{color:d.egreso_real_mes?'#e8ecef':'var(--fnt)'}}>{d.egreso_real_mes?fmtM(d.egreso_real_mes):'—'}</td>
                        <td className="r pg-mono">{fmtM(d.ingreso_proyectado_mes)}</td>
                        <td className="r pg-mono" style={{color:'#22c55e'}}>{d.ingreso_real_mes?fmtM(d.ingreso_real_mes):'—'}</td>
                        <td className="r pg-mono" style={{color:d.saldo_proyectado_acum>=0?'#22c55e':'#ef4444'}}>{fmtM(d.saldo_proyectado_acum)}</td>
                        <td className="r pg-mono" style={{color:d.saldo_real_acum!=null?(d.saldo_real_acum>=0?'#22c55e':'#ef4444'):'var(--fnt)'}}>{d.saldo_real_acum!=null?fmtM(d.saldo_real_acum):'—'}</td>
                        <td className="r pg-mono" style={{color:dev>0?'#ef4444':dev<0?'#22c55e':'var(--fnt)'}}>{d.egreso_real_mes?(dev>0?'+':'')+fmtM(dev):'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Earned Value */}
      <div style={{display:tab==='ev'?'block':'none'}}>
        {!hasData ? (
          <div className="pg-empty">Sin certificados de avance. Cargá el avance mensual para ver el Earned Value.</div>
        ) : (
          <>
            <div className="pg-chart-card" style={{marginBottom:14}}>
              <div className="pg-chart-title">EVM — PV (Planificado) vs AC (Real) vs EV Técnico (Ganado) — Acumulado</div>
              <div style={{height:260,position:'relative'}}><canvas ref={refEV}/></div>
            </div>
            <div className="pg-tbl-wrap">
              <table className="pg-tbl">
                <thead><tr>
                  <th>Mes</th><th className="r">% Avance</th>
                  <th className="r">PV</th><th className="r">AC</th><th className="r">EV técnico</th>
                  <th className="r">CPI</th><th className="r">SPI</th><th className="r">EAC</th>
                </tr></thead>
                <tbody>
                  {earnedValueData.map(d=>{
                    const cc = !d.cpi?'#6b7280':d.cpi>=0.95?'#22c55e':d.cpi>=0.85?'#f59e0b':'#ef4444'
                    const sc = !d.spi?'#6b7280':d.spi>=0.9?'#22c55e':d.spi>=0.8?'#f59e0b':'#ef4444'
                    return (
                      <tr key={d.mes_numero}>
                        <td className="pg-mono">M{d.mes_numero}</td>
                        <td className="r pg-mono">{fmtPct(d.pct_avance_fisico)}</td>
                        <td className="r pg-mono">{fmtM(d.pv)}</td>
                        <td className="r pg-mono">{fmtM(d.ac)}</td>
                        <td className="r pg-mono">{fmtM(d.ev_tecnico)}</td>
                        <td className="r pg-mono" style={{color:cc,fontWeight:600}}>{d.cpi?d.cpi.toFixed(3):'—'}</td>
                        <td className="r pg-mono" style={{color:sc}}>{d.spi?d.spi.toFixed(3):'—'}</td>
                        <td className="r pg-mono">{fmtM(d.eac)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Inventario */}
      <div style={{display:tab==='inventario'?'block':'none'}}>
        <div className="pg-filters">
          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:11,color:'var(--fnt)',textTransform:'uppercase',letterSpacing:'.08em'}}>Tipo</span>
            {['todos','departamento','cochera','local','baulera'].map(t=>(
              <button key={t} className={`pg-chip ${filtroTipo===t?'act':''}`} onClick={()=>setFT(t)}>
                {t==='todos'?'Todos':TIPO[t]||t}
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:11,color:'var(--fnt)',textTransform:'uppercase',letterSpacing:'.08em'}}>Estado</span>
            {['todos','disponible','reservada','vendida','canje_proveedor'].map(e=>(
              <button key={e} className={`pg-chip ${filtroEstado===e?'act':''}`} onClick={()=>setFE(e)}>
                {e==='todos'?'Todos':BADGE[e]?.label||e}
              </button>
            ))}
          </div>
        </div>
        {puedeEditar && <div style={{fontSize:10,color:'var(--fnt)',textAlign:'right',marginBottom:8}}>Clic en una unidad para editar asignación o registrar venta →</div>}
        <div className="pg-tbl-wrap">
          <table className="pg-tbl">
            <thead><tr>
              <th>Unidad</th><th>Tipo</th><th className="r">m²</th>
              <th className="r">Precio/m²</th><th className="r">Total USD</th>
              <th>Estado</th><th>Asignado a</th>
            </tr></thead>
            <tbody>
              {uFiltradas.length===0 && <tr><td colSpan={7} className="pg-empty">Sin unidades con estos filtros.</td></tr>}
              {uFiltradas.map(u=>{
                const b = BADGE[u.estado]||BADGE.disponible
                const precio = u.precio_lista_ars_m2 ? u.precio_lista_ars_m2/1405 : (u.precio_lista_usd_m2||0)
                return (
                  <tr key={u.id} className={puedeEditar?'click':''} onClick={()=>puedeEditar&&setModalUnidad(u)}>
                    <td><div style={{display:'flex',flexDirection:'column',gap:1}}><strong>{u.unidad_codigo}</strong><span style={{fontSize:11,color:'var(--fnt)'}}>Piso {u.piso_nro}</span></div></td>
                    <td style={{fontSize:12,color:'var(--dim)'}}>{TIPO[u.tipologia]||u.tipologia}</td>
                    <td className="r pg-mono">{fmt2(u.m2_propios)}</td>
                    <td className="r pg-mono">{precio>0?`$${fmt2(precio)}`:'—'}</td>
                    <td className="r pg-mono">{precio>0?fmtM(precio*u.m2_propios):'—'}</td>
                    <td><span className="pg-badge" style={{background:b.bg,color:b.color}}>{b.label}</span></td>
                    <td style={{fontSize:11,color:'var(--dim)',maxWidth:140,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.asignado_a||u.comprador_nombre||'—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operaciones */}
      <div style={{display:tab==='operaciones'?'block':'none'}}>
        <div className="pg-tbl-wrap">
          <table className="pg-tbl">
            <thead><tr>
              <th>Fecha</th><th>Unidad</th><th>Cliente</th><th>Tipo</th>
              <th className="r">Cierre USD</th><th className="r">Margen</th><th>TC</th>
            </tr></thead>
            <tbody>
              {transacciones.length===0 && <tr><td colSpan={7} className="pg-empty">Sin operaciones registradas.</td></tr>}
              {transacciones.map(t=>(
                <tr key={t.id}>
                  <td className="pg-mono" style={{fontSize:12}}>{new Date(t.fecha_operacion).toLocaleDateString('es-AR')}</td>
                  <td><strong>{t.unidad_codigo}</strong></td>
                  <td style={{fontSize:12,color:'var(--dim)'}}>{t.cliente_nombre||'—'}</td>
                  <td style={{fontSize:11,color:'var(--dim)'}}>{({reserva:'Reserva',venta_contado:'Contado',venta_financiada:'Financiada',canje:'Canje'})[t.tipo_operacion]}</td>
                  <td className="r pg-mono">{t.precio_cierre_usd?`$${fmt2(t.precio_cierre_usd)}`:'—'}</td>
                  <td className="r pg-mono" style={{color:t.margen_operacion_usd>=0?'#22c55e':'#ef4444'}}>{t.margen_operacion_usd!=null?fmtM(t.margen_operacion_usd):'—'}</td>
                  <td className="pg-mono" style={{fontSize:11,color:'var(--dim)'}}>{t.moneda_pago==='ARS'?`$${fmt2(t.tipo_cambio_operacion)}`:'USD'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal edición unidad */}
      {modalUnidad && empresaId && (
        <ModalUnidad
          unidad={modalUnidad}
          empresaId={empresaId}
          onClose={()=>setModalUnidad(null)}
          onSaved={()=>{ if(onRefresh) onRefresh() }}
        />
      )}
    </div>
  )
}
//
