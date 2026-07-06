'use client'
import { useState, useEffect, useRef } from 'react'

const fmtM   = n => { if(n==null)return'—'; const a=Math.abs(n),s=n<0?'-':''; if(a>=1e6)return`${s}$${(a/1e6).toFixed(2)}M`; if(a>=1e3)return`${s}$${Math.round(a/1e3)}K`; return`${s}$${Math.round(a)}` }
const fmtPct = n => n==null?'—':`${Number(n).toFixed(1)}%`
const fmt2   = n => n==null?'—':new Intl.NumberFormat('es-AR').format(Math.round(n))

const SEMAFORO = {
  verde:    { color:'#22c55e', bg:'rgba(34,197,94,.1)',  border:'rgba(34,197,94,.25)',  label:'En control',   icon:'🟢' },
  amarillo: { color:'#f59e0b', bg:'rgba(245,158,11,.1)', border:'rgba(245,158,11,.25)', label:'Atención',     icon:'🟡' },
  rojo:     { color:'#ef4444', bg:'rgba(239,68,68,.1)',  border:'rgba(239,68,68,.25)',  label:'Crítico',      icon:'🔴' },
  gris:     { color:'#9ca3af', bg:'rgba(156,163,175,.1)',border:'rgba(156,163,175,.25)',label:'Sin datos',    icon:'⚪' },
  sin_datos:{ color:'#9ca3af', bg:'rgba(156,163,175,.1)',border:'rgba(156,163,175,.25)',label:'Sin datos',    icon:'⚪' },
}

const STYLES = `
.pg { --bg:#0a0c0e; --s1:#111418; --s2:#161a1f; --bd:#1f2937; --tx:#e8ecef; --dim:#8b95a1; --fnt:#4b5563;
  font-family:'Geist',system-ui,sans-serif; background:var(--bg); color:var(--tx); min-height:100vh; padding:28px 36px 60px }
.pg-bento { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px }
@media(max-width:1100px){.pg-bento{grid-template-columns:repeat(2,1fr)}}
.pg-card { background:var(--s1); border:1px solid var(--bd); border-radius:12px; padding:18px }
.pg-card.verde  { border-color:rgba(34,197,94,.2);  box-shadow:0 0 24px -10px rgba(34,197,94,.25) }
.pg-card.amarillo{border-color:rgba(245,158,11,.2); box-shadow:0 0 24px -10px rgba(245,158,11,.25)}
.pg-card.rojo   { border-color:rgba(239,68,68,.2);  box-shadow:0 0 24px -10px rgba(239,68,68,.3) }
.pg-card.gris,.pg-card.sin_datos { border-color:var(--bd) }
.pg-lbl { font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--dim); margin-bottom:10px; display:flex; align-items:center; justify-content:space-between }
.pg-val { font-family:'Geist Mono',monospace; font-size:26px; font-weight:600; line-height:1; margin-bottom:4px }
.pg-sub { font-size:12px; color:var(--dim); margin-bottom:12px }
.pg-bar { height:5px; background:var(--s2); border-radius:6px; overflow:hidden; margin-bottom:8px }
.pg-bar-fill { height:100%; border-radius:6px; transition:width .5s }
.pg-delta { font-family:'Geist Mono',monospace; font-size:11px; font-weight:500 }
.pg-verde  { color:#22c55e } .pg-amarillo { color:#f59e0b } .pg-rojo { color:#ef4444 } .pg-azul { color:#60a5fa } .pg-dim { color:var(--dim) }
.pg-charts { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px }
@media(max-width:900px){.pg-charts{grid-template-columns:1fr}}
.pg-chart-card { background:var(--s1); border:1px solid var(--bd); border-radius:12px; padding:20px }
.pg-chart-title { font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--dim); margin-bottom:16px }
.pg-tbl-wrap { background:var(--s1); border:1px solid var(--bd); border-radius:12px; overflow:auto; margin-bottom:20px }
.pg-tbl { width:100%; border-collapse:collapse; font-size:13px }
.pg-tbl thead th { font-size:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--fnt); padding:11px 14px; border-bottom:1px solid var(--bd); background:var(--s2); text-align:left; white-space:nowrap }
.pg-tbl th.r,.pg-tbl td.r { text-align:right }
.pg-tbl tbody td { padding:11px 14px; border-bottom:1px solid rgba(255,255,255,.03); color:var(--tx) }
.pg-tbl tbody tr:last-child td { border-bottom:none }
.pg-tbl tbody tr:hover { background:rgba(255,255,255,.015) }
.pg-mono { font-family:'Geist Mono',monospace }
.pg-pulse { width:7px; height:7px; border-radius:50%; position:relative }
.pg-pulse::after { content:''; position:absolute; inset:-4px; border-radius:50%; animation:pg-p 2.4s ease-out infinite }
.pg-pulse.verde   { background:#22c55e } .pg-pulse.verde::after   { background:#22c55e }
.pg-pulse.amarillo{ background:#f59e0b } .pg-pulse.amarillo::after { background:#f59e0b }
.pg-pulse.rojo    { background:#ef4444 } .pg-pulse.rojo::after    { background:#ef4444 }
.pg-pulse.gris,.pg-pulse.sin_datos { background:#9ca3af }
@keyframes pg-p { 0%{opacity:.5;transform:scale(.6)} 70%{opacity:0;transform:scale(1.8)} 100%{opacity:0} }
.pg-empty { text-align:center; color:var(--fnt); padding:40px; font-size:13px }
.pg-sinev { background:rgba(96,165,250,.07); border:1px solid rgba(96,165,250,.2); border-radius:10px; padding:14px 18px; font-size:13px; color:var(--dim); margin-bottom:20px }
`

export default function PanelGestion({ proyecto, kpisActuales, flujoDatos, earnedValueData, descalce, unidades=[], transacciones=[] }) {
  const [tab, setTab] = useState('overview')
  const chartFFRef = useRef(null)
  const chartEVRef = useRef(null)
  const chartVentasRef = useRef(null)
  const chartsRef = useRef({})

  const sem = SEMAFORO[kpisActuales?.semaforo || 'gris']
  const hasEV = !!proyecto?.ev_costo_total_usd
  const hasData = earnedValueData && earnedValueData.length > 0

  // Gráficos con Chart.js
  useEffect(() => {
    if (typeof window === 'undefined') return
    import('chart.js/auto').then(({ default: Chart }) => {

      // ── Flujo de fondos: proyectado vs real ──
      if (chartFFRef.current && flujoDatos?.length > 0) {
        if (chartsRef.current.ff) chartsRef.current.ff.destroy()
        const labels = flujoDatos.map(d => `M${d.mes_numero}`)
        chartsRef.current.ff = new Chart(chartFFRef.current, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label:'Egreso proyectado', data: flujoDatos.map(d=>d.egreso_proyectado_mes), backgroundColor:'rgba(239,68,68,.25)', borderColor:'#ef4444', borderWidth:1 },
              { label:'Egreso real',        data: flujoDatos.map(d=>d.egreso_real_mes||0),  backgroundColor:'rgba(239,68,68,.5)',  borderColor:'#ef4444', borderWidth:1 },
              { label:'Ingreso proyectado', data: flujoDatos.map(d=>d.ingreso_proyectado_mes), backgroundColor:'rgba(34,197,94,.25)', borderColor:'#22c55e', borderWidth:1 },
              { label:'Ingreso real',       data: flujoDatos.map(d=>d.ingreso_real_mes||0), backgroundColor:'rgba(34,197,94,.5)',  borderColor:'#22c55e', borderWidth:1 },
            ]
          },
          options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ position:'bottom', labels:{ color:'#8b95a1', font:{size:10}, boxWidth:10 } } },
            scales:{
              x:{ ticks:{color:'#4b5563',font:{size:10},maxTicksLimit:12}, grid:{color:'#1f2937'} },
              y:{ ticks:{color:'#4b5563',font:{size:10},callback:v=>fmtM(v)}, grid:{color:'#1f2937'} }
            }
          }
        })
      }

      // ── Earned Value ──
      if (chartEVRef.current && hasData) {
        if (chartsRef.current.ev) chartsRef.current.ev.destroy()
        chartsRef.current.ev = new Chart(chartEVRef.current, {
          type: 'line',
          data: {
            labels: earnedValueData.map(d=>`M${d.mes_numero}`),
            datasets: [
              { label:'PV (Planificado)', data: earnedValueData.map(d=>d.pv), borderColor:'#60a5fa', backgroundColor:'rgba(96,165,250,.06)', tension:.4, fill:true, pointRadius:0, borderWidth:2 },
              { label:'AC (Real)',        data: earnedValueData.map(d=>d.ac), borderColor:'#ef4444', backgroundColor:'transparent',            tension:.4, pointRadius:0, borderWidth:2, borderDash:[6,3] },
              { label:'EV (Ganado)',      data: earnedValueData.map(d=>d.ev_tecnico), borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.06)', tension:.4, fill:true, pointRadius:0, borderWidth:2 },
            ]
          },
          options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ position:'bottom', labels:{ color:'#8b95a1', font:{size:10}, boxWidth:10 } } },
            scales:{
              x:{ ticks:{color:'#4b5563',font:{size:10}}, grid:{color:'#1f2937'} },
              y:{ ticks:{color:'#4b5563',font:{size:10},callback:v=>fmtM(v)}, grid:{color:'#1f2937'} }
            }
          }
        })
      }

      // ── Saldo acumulado ──
      if (chartVentasRef.current && flujoDatos?.length > 0) {
        if (chartsRef.current.ventas) chartsRef.current.ventas.destroy()
        chartsRef.current.ventas = new Chart(chartVentasRef.current, {
          type: 'line',
          data: {
            labels: flujoDatos.map(d=>`M${d.mes_numero}`),
            datasets: [
              { label:'Saldo acum. proyectado', data: flujoDatos.map(d=>d.saldo_proyectado_acum), borderColor:'#60a5fa', tension:.4, fill:false, pointRadius:0, borderWidth:2 },
              { label:'Saldo acum. real',       data: flujoDatos.map(d=>d.saldo_real_acum||null), borderColor:'#22c55e', tension:.4, fill:false, pointRadius:3, borderWidth:2 },
            ]
          },
          options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ position:'bottom', labels:{ color:'#8b95a1', font:{size:10}, boxWidth:10 } } },
            scales:{
              x:{ ticks:{color:'#4b5563',font:{size:10},maxTicksLimit:12}, grid:{color:'#1f2937'} },
              y:{ ticks:{color:'#4b5563',font:{size:10},callback:v=>fmtM(v)}, grid:{color:'#1f2937'} }
            }
          }
        })
      }
    })
    return () => { Object.values(chartsRef.current).forEach(c => c?.destroy()) }
  }, [flujoDatos, earnedValueData])

  const cpi = kpisActuales?.cpi_actual
  const cpiColor = !cpi ? 'gris' : cpi >= 0.95 ? 'verde' : cpi >= 0.85 ? 'amarillo' : 'rojo'
  const descalceColor = !descalce ? 'gris' : Math.abs(descalce) <= 10 ? 'verde' : Math.abs(descalce) <= 20 ? 'amarillo' : 'rojo'

  return (
    <div className="pg">
      <style>{STYLES}</style>

      {/* Header */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:'.14em',textTransform:'uppercase',color:'#22c55e',marginBottom:6,fontFamily:'Geist Mono,monospace'}}>
          Panel de gestión · Proyecto
        </div>
        <div style={{fontSize:26,fontWeight:600,letterSpacing:'-.02em',marginBottom:6}}>{proyecto?.nombre}</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          {proyecto?.m2_totales && <span style={{fontSize:12,color:'var(--dim)'}}>📐 {fmt2(proyecto.m2_totales)} m²</span>}
          {proyecto?.plazo_meses && <span style={{fontSize:12,color:'var(--dim)'}}>⏱ {proyecto.plazo_meses} meses</span>}
          {kpisActuales?.ultimo_mes_cargado && <span style={{fontSize:12,color:'var(--dim)'}}>Mes {kpisActuales.ultimo_mes_cargado} cargado</span>}
          <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:sem.bg,color:sem.color,border:`1px solid ${sem.border}`}}>
            {sem.icon} {sem.label}
          </span>
        </div>
      </div>

      {!hasEV && (
        <div className="pg-sinev">ℹ️ Sin EV cargado — los indicadores financieros estarán disponibles una vez que se configure el EV del proyecto.</div>
      )}

      {/* Bento grid — 4 KPIs */}
      <div className="pg-bento">

        {/* CPI */}
        <div className={`pg-card ${cpiColor}`}>
          <div className="pg-lbl">CPI — Eficiencia de costo <span className={`pg-pulse ${cpiColor}`}/></div>
          <div className={`pg-val pg-${cpiColor}`}>{cpi ? cpi.toFixed(3) : '—'}</div>
          <div className="pg-sub">
            {cpi >= 1 ? 'Bajo presupuesto ✓' : cpi >= 0.85 ? 'Leve desvío' : 'Sobre costo ⚠'}
          </div>
          <div style={{fontSize:11,color:'var(--dim)',lineHeight:1.5}}>
            {cpi ? `Por cada $1 gastado se obtiene $${cpi.toFixed(2)} de avance planificado` : 'Sin datos de avance cargados'}
          </div>
          {cpi && <div className={`pg-delta pg-${cpiColor}`} style={{marginTop:10}}>
            {cpi >= 1 ? `+${((cpi-1)*100).toFixed(1)}% sobre lo esperado` : `${((cpi-1)*100).toFixed(1)}% bajo lo esperado`}
          </div>}
        </div>

        {/* EAC */}
        <div className={`pg-card ${cpiColor}`}>
          <div className="pg-lbl">EAC — Costo estimado final <span className={`pg-pulse ${cpiColor}`}/></div>
          <div className={`pg-val pg-${cpiColor}`}>{fmtM(kpisActuales?.eac)}</div>
          <div className="pg-sub">Presupuesto EV: {fmtM(proyecto?.ev_costo_total_usd)}</div>
          {kpisActuales?.eac && proyecto?.ev_costo_total_usd && (
            <>
              <div className="pg-bar">
                <div className={`pg-bar-fill pg-${cpiColor === 'verde' ? 'verde' : cpiColor}`}
                  style={{width:`${Math.min(100,(+kpisActuales.eac/+proyecto.ev_costo_total_usd)*100)}%`,
                    background: cpiColor === 'verde' ? '#22c55e' : cpiColor === 'amarillo' ? '#f59e0b' : '#ef4444'}}/>
              </div>
              <div className={`pg-delta pg-${cpiColor}`}>
                Desvío al completar: {fmtM(kpisActuales.eac - proyecto.ev_costo_total_usd)}
              </div>
            </>
          )}
        </div>

        {/* Descalce comercial */}
        <div className={`pg-card ${descalceColor}`}>
          <div className="pg-lbl">Descalce comercial <span className={`pg-pulse ${descalceColor}`}/></div>
          <div className={`pg-val pg-${descalceColor}`}>{descalce != null ? `${descalce > 0 ? '+' : ''}${descalce.toFixed(1)}%` : '—'}</div>
          <div className="pg-sub">Avance físico vs m² vendidos</div>
          {kpisActuales && (
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:8}}>
              {[
                ['Avance físico', kpisActuales.pct_avance_fisico||0, '#60a5fa'],
                ['% m² vendidos', kpisActuales.pct_m2_vendidos||0, descalceColor==='verde'?'#22c55e':descalceColor==='amarillo'?'#f59e0b':'#ef4444'],
              ].map(([l,v,c])=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'var(--dim)'}}>
                  <span style={{width:90,flexShrink:0}}>{l}</span>
                  <div className="pg-bar" style={{flex:1}}>
                    <div style={{width:`${Math.min(100,v)}%`,height:'100%',borderRadius:6,background:c}}/>
                  </div>
                  <span style={{fontFamily:'Geist Mono,monospace',fontSize:12,width:36,textAlign:'right'}}>{Number(v).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
          <div className={`pg-delta pg-${descalceColor}`}>
            {descalceColor==='rojo'?'⚠ Crítico':descalceColor==='amarillo'?'◐ En alerta':'✓ En línea'}
          </div>
        </div>

        {/* Margen real */}
        <div className="pg-card">
          <div className="pg-lbl">Margen real proyectado</div>
          <div className={`pg-val ${kpisActuales?.margen_real_pct >= 20 ? 'pg-verde' : kpisActuales?.margen_real_pct >= 10 ? 'pg-amarillo' : 'pg-rojo'}`}>
            {fmtPct(kpisActuales?.margen_real_pct)}
          </div>
          <div className="pg-sub">EV objetivo: {fmtPct(proyecto?.ev_margen_objetivo_pct)}</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:8}}>
            {[
              ['Real', kpisActuales?.margen_real_pct||0, '#22c55e'],
              ['EV',   proyecto?.ev_margen_objetivo_pct||0, '#60a5fa'],
            ].map(([l,v,c])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'var(--dim)'}}>
                <span style={{width:28}}>{l}</span>
                <div className="pg-bar" style={{flex:1}}>
                  <div style={{width:`${Math.min(100,Math.max(0,v))}%`,height:'100%',borderRadius:6,background:c}}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--dim)'}}>
            Ingreso EV: {fmtM(proyecto?.ev_ingreso_total_usd)} · Costo real: {fmtM(kpisActuales?.costo_real_acum)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--bd)',marginBottom:20}}>
        {[['overview','📊 Flujo de fondos'],['ev','📈 Earned Value'],['inventario',`🏢 Inventario (${unidades.length})`],['operaciones',`💼 Operaciones (${transacciones.length})`]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{background:'none',border:'none',color:tab===key?'var(--tx)':'var(--dim)',fontSize:13,
              fontWeight:tab===key?600:400,padding:'10px 0',marginRight:24,cursor:'pointer',
              fontFamily:'inherit',position:'relative',paddingBottom:10}}>
            {label}
            {tab===key && <div style={{position:'absolute',bottom:-1,left:0,right:0,height:2,background:'#22c55e',borderRadius:'2px 2px 0 0'}}/>}
          </button>
        ))}
      </div>

      {/* Tab: Flujo de fondos */}
      {tab === 'overview' && (
        <>
          {!flujoDatos?.length ? (
            <div className="pg-empty">Sin flujo proyectado. Generá el EV para ver los gráficos.</div>
          ) : (
            <div className="pg-charts">
              <div className="pg-chart-card">
                <div className="pg-chart-title">Ingresos y egresos por mes — Proyectado vs Real</div>
                <div style={{height:240}}><canvas ref={chartFFRef}/></div>
              </div>
              <div className="pg-chart-card">
                <div className="pg-chart-title">Saldo de caja acumulado — Proyectado vs Real</div>
                <div style={{height:240}}><canvas ref={chartVentasRef}/></div>
              </div>
            </div>
          )}

          {/* Resumen numérico del flujo */}
          {flujoDatos?.length > 0 && (
            <div className="pg-tbl-wrap">
              <table className="pg-tbl">
                <thead><tr>
                  <th>Mes</th>
                  <th className="r">Egreso proy.</th><th className="r">Egreso real</th>
                  <th className="r">Ingreso proy.</th><th className="r">Ingreso real</th>
                  <th className="r">Saldo acum. proy.</th><th className="r">Saldo acum. real</th>
                  <th className="r">Desvío costo</th>
                </tr></thead>
                <tbody>
                  {flujoDatos.slice(0,15).map(d=>{
                    const desvio = (d.egreso_real_mes||0) - d.egreso_proyectado_mes
                    return (
                      <tr key={d.mes_numero}>
                        <td className="pg-mono">M{d.mes_numero} <span style={{fontSize:10,color:'var(--fnt)'}}>{d.fecha_mes?.slice(0,7)}</span></td>
                        <td className="r pg-mono">{fmtM(d.egreso_proyectado_mes)}</td>
                        <td className="r pg-mono" style={{color:d.egreso_real_mes?'#e8ecef':'var(--fnt)'}}>{d.egreso_real_mes?fmtM(d.egreso_real_mes):'—'}</td>
                        <td className="r pg-mono">{fmtM(d.ingreso_proyectado_mes)}</td>
                        <td className="r pg-mono" style={{color:d.ingreso_real_mes?'#22c55e':'var(--fnt)'}}>{d.ingreso_real_mes?fmtM(d.ingreso_real_mes):'—'}</td>
                        <td className="r pg-mono" style={{color:d.saldo_proyectado_acum>=0?'#22c55e':'#ef4444'}}>{fmtM(d.saldo_proyectado_acum)}</td>
                        <td className="r pg-mono" style={{color:d.saldo_real_acum!=null?(d.saldo_real_acum>=0?'#22c55e':'#ef4444'):'var(--fnt)'}}>{d.saldo_real_acum!=null?fmtM(d.saldo_real_acum):'—'}</td>
                        <td className="r pg-mono" style={{color:desvio>0?'#ef4444':desvio<0?'#22c55e':'var(--fnt)'}}>{d.egreso_real_mes?(desvio>0?'+':'')+fmtM(desvio):'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab: Earned Value */}
      {tab === 'ev' && (
        <>
          {!hasData ? (
            <div className="pg-empty">Sin certificados de avance cargados. Cargá el avance mensual para ver el Earned Value.</div>
          ) : (
            <>
              <div className="pg-chart-card" style={{marginBottom:14}}>
                <div className="pg-chart-title">Earned Value Management (EVM) — PV vs AC vs EV técnico acumulado</div>
                <div style={{height:260}}><canvas ref={chartEVRef}/></div>
              </div>
              <div className="pg-tbl-wrap">
                <table className="pg-tbl">
                  <thead><tr>
                    <th>Mes</th><th className="r">% Avance</th>
                    <th className="r">PV</th><th className="r">AC</th><th className="r">EV técnico</th>
                    <th className="r">CPI</th><th className="r">SPI</th><th className="r">EAC</th><th>Semáforo</th>
                  </tr></thead>
                  <tbody>
                    {earnedValueData.map(d=>{
                      const cpiColor = !d.cpi?'var(--fnt)':d.cpi>=0.95?'#22c55e':d.cpi>=0.85?'#f59e0b':'#ef4444'
                      const spiColor = !d.spi?'var(--fnt)':d.spi>=0.9?'#22c55e':d.spi>=0.8?'#f59e0b':'#ef4444'
                      const s = SEMAFORO[d.semaforo_costo||'gris']
                      return (
                        <tr key={d.mes_numero}>
                          <td className="pg-mono">M{d.mes_numero}</td>
                          <td className="r pg-mono">{fmtPct(d.pct_avance_fisico)}</td>
                          <td className="r pg-mono">{fmtM(d.pv)}</td>
                          <td className="r pg-mono">{fmtM(d.ac)}</td>
                          <td className="r pg-mono">{fmtM(d.ev_tecnico)}</td>
                          <td className="r pg-mono" style={{color:cpiColor}}>{d.cpi?d.cpi.toFixed(3):'—'}</td>
                          <td className="r pg-mono" style={{color:spiColor}}>{d.spi?d.spi.toFixed(3):'—'}</td>
                          <td className="r pg-mono">{fmtM(d.eac)}</td>
                          <td><span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:s.bg,color:s.color,border:`1px solid ${s.border}`}}>{s.icon} {s.label}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Tab: Inventario */}
      {tab === 'inventario' && (
        <div className="pg-tbl-wrap">
          <table className="pg-tbl">
            <thead><tr>
              <th>Unidad</th><th>Tipo</th><th className="r">m²</th>
              <th className="r">Precio/m²</th><th className="r">Total USD</th>
              <th>Estado</th><th>Asignado a</th>
            </tr></thead>
            <tbody>
              {unidades.length===0 && <tr><td colSpan={7} className="pg-empty">Sin unidades cargadas.</td></tr>}
              {unidades.map(u=>{
                const BADGE = {
                  disponible:{color:'#22c55e',bg:'rgba(34,197,94,.1)',label:'Disponible'},
                  reservada:{color:'#f59e0b',bg:'rgba(245,158,11,.1)',label:'Reservada'},
                  vendida:{color:'#a78bfa',bg:'rgba(167,139,250,.1)',label:'Vendida'},
                  canje_proveedor:{color:'#fb923c',bg:'rgba(251,146,60,.1)',label:'Canje'},
                }
                const b = BADGE[u.estado]||BADGE.disponible
                const precio = u.precio_lista_ars_m2 ? u.precio_lista_ars_m2/1405 : (u.precio_lista_usd_m2||0)
                return (
                  <tr key={u.id}>
                    <td><div style={{display:'flex',flexDirection:'column',gap:1}}><strong>{u.unidad_codigo}</strong><span style={{fontSize:11,color:'var(--fnt)'}}>Piso {u.piso_nro}</span></div></td>
                    <td style={{fontSize:12,color:'var(--dim)'}}>{({departamento:'Depto',cochera:'Cochera',local:'Local',baulera:'Baulera'})[u.tipologia]||u.tipologia}</td>
                    <td className="r pg-mono">{fmt2(u.m2_propios)}</td>
                    <td className="r pg-mono">{precio>0?`$${fmt2(precio)}`:'—'}</td>
                    <td className="r pg-mono">{precio>0?fmtM(precio*u.m2_propios):'—'}</td>
                    <td><span style={{fontSize:11,padding:'2px 8px',borderRadius:12,background:b.bg,color:b.color}}>{b.label}</span></td>
                    <td style={{fontSize:11,color:'var(--dim)',maxWidth:140,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{u.asignado_a||u.comprador_nombre||'—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Operaciones */}
      {tab === 'operaciones' && (
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
      )}
    </div>
  )
}
