'use client'
import { useState, useEffect, useRef } from 'react'
import { simularEV, PRESETS, DEFAULTS } from '../lib/simuladorEV'

// ── Helpers ──────────────────────────────────────────────────────────────
const fmt  = (n, d=0) => n == null ? '—' : new Intl.NumberFormat('es-AR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const fmtM = n => n == null ? '—' : n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${Math.round(n/1e3)}K` : `$${Math.round(n)}`

// ── Estilos ───────────────────────────────────────────────────────────────
const s = {
  wrap:   { fontFamily:'system-ui,sans-serif', background:'#f8f8f6', minHeight:'100vh' },
  grid:   { display:'grid', gridTemplateColumns:'360px 1fr', minHeight:'calc(100vh - 52px)' },
  left:   { borderRight:'0.5px solid #e0ddd6', padding:'20px', overflowY:'auto',
            maxHeight:'calc(100vh - 52px)', background:'#fff' },
  right:  { padding:'24px 28px', overflowY:'auto', maxHeight:'calc(100vh - 52px)' },

  // Sección
  secTitle: { fontSize:10, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase',
    color:'#aaa', marginBottom:12, marginTop:20, display:'flex', alignItems:'center', gap:8 },
  secLine:  { flex:1, height:'0.5px', background:'#e0ddd6' },

  // Fields
  field:  { marginBottom:12 },
  flabel: { display:'flex', justifyContent:'space-between', alignItems:'center',
            fontSize:12, color:'#888', marginBottom:4 },
  fval:   { fontFamily:'monospace', fontWeight:600, color:'#1a1a18', fontSize:13 },
  range:  { width:'100%', accentColor:'#1a1a18', cursor:'pointer' },
  grid2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 },
  minput: { width:'100%', padding:'7px 10px', fontSize:13, borderRadius:6,
            border:'0.5px solid #ddd', background:'#fafafa', fontFamily:'monospace' },
  select: { width:'100%', padding:'7px 10px', fontSize:12, borderRadius:6,
            border:'0.5px solid #ddd', background:'#fafafa', cursor:'pointer' },
  toggle: { display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'8px 0', borderBottom:'0.5px solid #f0ede8', fontSize:13, color:'#555' },
  tswitch:{ position:'relative', width:34, height:18, flexShrink:0 },

  // Presets
  presetRow: { display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 },
  preset:    { padding:'4px 12px', borderRadius:20, border:'0.5px solid #ddd',
               fontSize:12, cursor:'pointer', background:'#fafafa', color:'#666',
               transition:'all .15s' },
  presetAct: { background:'#1a1a18', color:'#fff', borderColor:'#1a1a18' },

  // KPIs
  kpiGrid:  { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 },
  kpi:      { background:'#fff', border:'0.5px solid #e0ddd6', borderRadius:10, padding:'14px' },
  kpiLabel: { fontSize:10, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase',
              color:'#aaa', marginBottom:6 },
  kpiVal:   { fontFamily:'monospace', fontSize:22, fontWeight:600, color:'#1a1a18' },
  kpiSub:   { fontSize:11, color:'#aaa', marginTop:3 },

  // Escenarios
  escRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 },
  esc:    { background:'#fff', border:'0.5px solid #e0ddd6', borderRadius:10,
            padding:'14px', textAlign:'center', cursor:'pointer', transition:'all .15s' },
  escAct: { borderColor:'#1a1a18', background:'#fafaf8' },
  escLabel:{ fontSize:10, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'#aaa', marginBottom:6 },
  escPrice:{ fontFamily:'monospace', fontSize:20, fontWeight:600, color:'#1a1a18', marginBottom:2 },
  escRoi:  { fontSize:12, fontFamily:'monospace' },

  // Cards
  card:   { background:'#fff', border:'0.5px solid #e0ddd6', borderRadius:10, padding:'18px', marginBottom:14 },
  cardTitle: { fontSize:10, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase',
               color:'#aaa', marginBottom:14 },
  charts2:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 },

  // Tabla costos
  table:  { width:'100%', borderCollapse:'collapse' },
  th:     { fontSize:10, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase',
            color:'#aaa', textAlign:'left', padding:'5px 0', borderBottom:'0.5px solid #e0ddd6' },
  td:     { fontSize:12, padding:'7px 0', borderBottom:'0.5px solid #f5f3ef', color:'#444' },
  tdNum:  { fontFamily:'monospace', textAlign:'right', color:'#1a1a18' },
  tdBar:  { width:100 },

  // Inversor
  invRow: { display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'5px 0', borderBottom:'0.5px solid #f5f3ef', fontSize:12 },
  invLbl: { color:'#888' },
  invVal: { fontFamily:'monospace', fontWeight:500, color:'#1a1a18' },

  // Alerta
  alert: { borderRadius:8, padding:'10px 14px', fontSize:12, marginBottom:16,
           display:'flex', alignItems:'center', gap:8 },
  alertWarn: { background:'#FAEEDA', border:'0.5px solid #E8C170', color:'#7A4A00' },
  alertDanger:{ background:'#FCEBEB', border:'0.5px solid #F09595', color:'#7A1A1A' },
  alertOk:   { background:'#EAF3DE', border:'0.5px solid #C0DD97', color:'#275010' },

  // Ref table
  refTr: { fontSize:12 },
  refTd: { padding:'6px 8px', borderBottom:'0.5px solid #f5f3ef', color:'#444' },
}

// ── Mini componentes ──────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label style={s.tswitch}>
      <input type="checkbox" style={{display:'none'}} checked={checked} onChange={e=>onChange(e.target.checked)}/>
      <div style={{
        position:'absolute', inset:0, borderRadius:10, cursor:'pointer',
        background: checked ? '#1a1a18' : '#e0ddd6', transition:'background .2s',
      }}>
        <div style={{
          position:'absolute', top:2, left: checked ? 18 : 2, width:14, height:14,
          borderRadius:'50%', background:'#fff', transition:'left .2s',
        }}/>
      </div>
    </label>
  )
}

function MiniBar({ pct, color='#1a1a18' }) {
  return (
    <div style={{ background:'#f0ede8', borderRadius:3, height:4, width:'100%' }}>
      <div style={{ width:`${Math.min(pct,100).toFixed(1)}%`, height:'100%',
        borderRadius:3, background:color, transition:'width .3s' }} />
    </div>
  )
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────
export default function SimuladorEV({ onGuardar, readOnly = false }) {
  const [P, setP]       = useState({ ...DEFAULTS })
  const [R, setR]       = useState(null)
  const [escSel, setEsc] = useState(1)
  const [preset, setPre] = useState('boulevard')
  const ffRef = useRef(null)
  const costsRef = useRef(null)
  const mtsRef = useRef(null)
  const ffChart = useRef(null)
  const costsChart = useRef(null)
  const mtsChart = useRef(null)

  // Calcular resultado cada vez que cambia P
  useEffect(() => { setR(simularEV(P)) }, [P])

  // Gráficos con Chart.js (cargado dinámicamente)
  useEffect(() => {
    if (!R) return
    if (typeof window === 'undefined') return
    import('chart.js/auto').then(({ default: Chart }) => {
      // Flujo de fondos
      if (ffRef.current) {
        if (ffChart.current) ffChart.current.destroy()
        ffChart.current = new Chart(ffRef.current, {
          type: 'line',
          data: {
            labels: R.flujo_acum.map((_,i)=>`M${i+1}`),
            datasets: [
              { label:'Flujo acum.', data:R.flujo_acum, borderColor:'#1a1a18', backgroundColor:'rgba(26,26,24,.06)', tension:.4, fill:true, pointRadius:0, borderWidth:2 },
              { label:'Costos', data:R.costos_mes, borderColor:'#E8504A', backgroundColor:'transparent', tension:.4, pointRadius:0, borderWidth:1.5, borderDash:[4,4] },
              { label:'Ingresos', data:R.ingresos_mes, borderColor:'#4A9E60', backgroundColor:'transparent', tension:.4, pointRadius:0, borderWidth:1.5, borderDash:[4,4] },
            ]
          },
          options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ display:false } },
            scales:{
              x:{ ticks:{ color:'#aaa', font:{size:10}, maxTicksLimit:8 }, grid:{ color:'#f0ede8' } },
              y:{ ticks:{ color:'#aaa', font:{size:10}, callback:v=>fmtM(v) }, grid:{ color:'#f0ede8' } }
            }
          }
        })
      }
      // Costos
      if (costsRef.current) {
        if (costsChart.current) costsChart.current.destroy()
        const colors = ['#1a1a18','#4A6B9E','#4A9E60','#9E4A8A','#E8A44A','#E8504A','#8A8A80']
        costsChart.current = new Chart(costsRef.current, {
          type: 'doughnut',
          data: {
            labels: R.rubros.map(r=>r.nombre),
            datasets: [{ data: R.rubros.map(r=>+r.valor.toFixed(1)), backgroundColor:colors, borderColor:'#fff', borderWidth:2 }]
          },
          options: {
            responsive:true, maintainAspectRatio:false, cutout:'65%',
            plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label: c => `$${c.parsed.toFixed(1)}/m²` } } }
          }
        })
      }
      // Distribución metros
      if (mtsRef.current) {
        if (mtsChart.current) mtsChart.current.destroy()
        mtsChart.current = new Chart(mtsRef.current, {
          type:'bar',
          data:{
            labels:['Distribución'],
            datasets:[
              { label:'Fondeo socios', data:[R.m2_fondeo], backgroundColor:'#1a1a18' },
              { label:'Link proyecto', data:[R.m2_dep - R.m2_fondeo], backgroundColor:'#e0ddd6' },
              { label:'Cocheras',      data:[R.m2_coch],  backgroundColor:'#4A6B9E' },
            ]
          },
          options:{
            responsive:true, maintainAspectRatio:false, indexAxis:'y',
            plugins:{ legend:{ position:'bottom', labels:{ font:{size:10}, boxWidth:10, color:'#888' } } },
            scales:{
              x:{ stacked:true, ticks:{ color:'#aaa', font:{size:10}, callback:v=>`${fmt(v)}m²` }, grid:{ color:'#f0ede8' } },
              y:{ stacked:true, ticks:{ display:false }, grid:{ display:false } }
            }
          }
        })
      }
    })
  }, [R])

  function set(key, val) {
    setP(prev => ({ ...prev, [key]: val }))
    setPre(null)
  }

  function loadPreset(name) {
    setP({ ...PRESETS[name] })
    setPre(name)
  }

  if (!R) return <div style={{padding:40,color:'#aaa',fontSize:13}}>Calculando...</div>

  const esc = R.escenarios[escSel]
  const alertColor = !R.viable ? s.alertDanger : R.margen_fondeo < 0.1 ? s.alertWarn : s.alertOk
  const alertMsg   = !R.viable
    ? `⚠️ Costo (${fmt(R.c_total_impl.toFixed(1))}/m²) supera el precio de fondeo (${fmt(P.pfondeo)}/m²). Proyecto inviable.`
    : R.margen_fondeo < 0.1
    ? `Margen ajustado: ${(R.margen_fondeo*100).toFixed(1)}%. Revisar variables.`
    : `✅ Proyecto viable. Margen de fondeo: ${(R.margen_fondeo*100).toFixed(1)}%`

  return (
    <div style={s.wrap}>
      <div style={s.grid}>

        {/* ══ PANEL IZQUIERDO ══════════════════════════════ */}
        <div style={s.left}>
          {/* Presets */}
          <div style={{ ...s.secTitle, marginTop:0 }}>
            Cargar proyecto real<div style={s.secLine}/>
          </div>
          <div style={s.presetRow}>
            {Object.keys(PRESETS).map(name => (
              <button key={name} disabled={readOnly}
                style={{ ...s.preset, ...(preset===name ? s.presetAct : {}) }}
                onClick={()=>loadPreset(name)}>
                {name.charAt(0).toUpperCase()+name.slice(1)}
              </button>
            ))}
          </div>

          {/* Arquitectura */}
          <div style={s.secTitle}>Arquitectura<div style={s.secLine}/></div>

          <div style={s.field}>
            <div style={s.flabel}>m² totales construidos <span style={s.fval}>{fmt(P.m2)}</span></div>
            <input type="range" style={s.range} min={500} max={25000} step={50}
              value={P.m2} disabled={readOnly} onChange={e=>set('m2',+e.target.value)}/>
          </div>
          <div style={s.grid2}>
            <div>
              <div style={{...s.flabel,marginBottom:5}}>% Cocheras</div>
              <input type="number" style={s.minput} value={P.pct_coch} disabled={readOnly}
                min={0} max={60} onChange={e=>set('pct_coch',+e.target.value)}/>
            </div>
            <div>
              <div style={{...s.flabel,marginBottom:5}}>Unidad prom (m²)</div>
              <input type="number" style={s.minput} value={P.ud_prom} disabled={readOnly}
                min={20} max={150} onChange={e=>set('ud_prom',+e.target.value)}/>
            </div>
          </div>
          <div style={s.field}>
            <div style={s.flabel}>Plazo de obra (meses) <span style={s.fval}>{P.plazo}</span></div>
            <input type="range" style={s.range} min={12} max={72} step={1}
              value={P.plazo} disabled={readOnly} onChange={e=>set('plazo',+e.target.value)}/>
          </div>

          {/* Costos */}
          <div style={s.secTitle}>Costos (USD/m²)<div style={s.secLine}/></div>

          <div style={s.field}>
            <div style={s.flabel}>Construcción <span style={s.fval}>${P.construccion}</span></div>
            <input type="range" style={s.range} min={200} max={800} step={5}
              value={P.construccion} disabled={readOnly} onChange={e=>set('construccion',+e.target.value)}/>
          </div>
          <div style={s.field}>
            <div style={s.flabel}>Terreno + Infraestructura <span style={s.fval}>${P.terreno}</span></div>
            <input type="range" style={s.range} min={0} max={600} step={5}
              value={P.terreno} disabled={readOnly} onChange={e=>set('terreno',+e.target.value)}/>
          </div>
          <div style={s.toggle}>
            <span>Terreno por canje (no cash)</span>
            <Toggle checked={P.canje} onChange={v=>set('canje',v)}/>
          </div>
          <div style={{height:10}}/>
          {[
            { key:'comercial', label:'Comercialización %', min:0, max:10, step:.1 },
            { key:'iva',       label:'IVA construcción %', min:0, max:15, step:.1 },
            { key:'iibb',      label:'IIBB + TEM %',       min:0, max:8,  step:.05 },
            { key:'admin',     label:'Administración USD/m²', min:0, max:50, step:.5 },
            { key:'honorarios',label:'Honorarios Link %',  min:5, max:20, step:.5 },
          ].map(f => (
            <div key={f.key} style={s.field}>
              <div style={s.flabel}>{f.label} <span style={s.fval}>{P[f.key].toFixed(f.step<1?2:1)}{f.key!=='admin'?'%':''}</span></div>
              <input type="range" style={s.range} min={f.min} max={f.max} step={f.step}
                value={P[f.key]} disabled={readOnly} onChange={e=>set(f.key,+e.target.value)}/>
            </div>
          ))}

          {/* Precios */}
          <div style={s.secTitle}>Precios de venta<div style={s.secLine}/></div>

          <div style={s.field}>
            <div style={s.flabel}>Precio de fondeo (USD/m²) <span style={s.fval}>${fmt(P.pfondeo)}</span></div>
            <input type="range" style={s.range} min={500} max={2500} step={25}
              value={P.pfondeo} disabled={readOnly} onChange={e=>set('pfondeo',+e.target.value)}/>
          </div>
          <div style={s.grid2}>
            <div>
              <div style={{...s.flabel,marginBottom:5}}>Prop. contado</div>
              <select style={s.select} value={P.pct_contado} disabled={readOnly} onChange={e=>set('pct_contado',+e.target.value)}>
                <option value={70}>70% contado</option>
                <option value={60}>60% contado</option>
              </select>
            </div>
            <div>
              <div style={{...s.flabel,marginBottom:5}}>Cuotas financiado</div>
              <input type="number" style={s.minput} value={P.cuotas} disabled={readOnly}
                min={6} max={60} onChange={e=>set('cuotas',+e.target.value)}/>
            </div>
          </div>
          {[
            { key:'p1', label:'Precio pesimista (USD/m²)' },
            { key:'p2', label:'Precio esperado (USD/m²)' },
            { key:'p3', label:'Precio optimista (USD/m²)' },
          ].map(f => (
            <div key={f.key} style={s.field}>
              <div style={s.flabel}>{f.label} <span style={s.fval}>${fmt(P[f.key])}</span></div>
              <input type="range" style={s.range} min={600} max={2500} step={25}
                value={P[f.key]} disabled={readOnly} onChange={e=>set(f.key,+e.target.value)}/>
            </div>
          ))}

          {/* Modelo inversor */}
          <div style={s.secTitle}>Modelo inversor<div style={s.secLine}/></div>

          <div style={s.field}>
            <div style={s.flabel}>% metros a fondear <span style={s.fval}>{P.pct_fondeo.toFixed(1)}%</span></div>
            <input type="range" style={s.range} min={0} max={80} step={.5}
              value={P.pct_fondeo} disabled={readOnly} onChange={e=>set('pct_fondeo',+e.target.value)}/>
          </div>
          <div style={s.grid2}>
            <div>
              <div style={{...s.flabel,marginBottom:5}}>Cuotas de obra</div>
              <input type="number" style={s.minput} value={P.cuotas_obra} disabled={readOnly}
                min={6} max={48} onChange={e=>set('cuotas_obra',+e.target.value)}/>
            </div>
            <div>
              <div style={{...s.flabel,marginBottom:5}}>N° de cupos</div>
              <input type="number" style={s.minput} value={P.cupos} disabled={readOnly}
                min={1} max={20} onChange={e=>set('cupos',+e.target.value)}/>
            </div>
          </div>

          {/* Botón guardar */}
          {onGuardar && !readOnly && (
            <button onClick={()=>onGuardar(P,R)}
              style={{ width:'100%', marginTop:16, padding:'11px', fontSize:13, fontWeight:600,
                borderRadius:8, border:'none', background:'#1a1a18', color:'#fff', cursor:'pointer' }}>
              Guardar simulación en proyecto
            </button>
          )}
        </div>

        {/* ══ PANEL RESULTADOS ═════════════════════════════ */}
        <div style={s.right}>

          {/* Alerta viabilidad */}
          <div style={{ ...s.alert, ...alertColor }}>{alertMsg}</div>

          {/* KPIs */}
          <div style={s.kpiGrid}>
            <div style={s.kpi}>
              <div style={s.kpiLabel}>Costo total / m²</div>
              <div style={s.kpiVal}>${fmt(Math.round(R.c_total_impl))}</div>
              <div style={s.kpiSub}>{P.canje ? `Cash: $${fmt(Math.round(R.c_total_cash))}` : 'sin canje'}</div>
            </div>
            <div style={s.kpi}>
              <div style={s.kpiLabel}>Precio de fondeo</div>
              <div style={s.kpiVal}>${fmt(P.pfondeo)}</div>
              <div style={s.kpiSub}>Margen: {(R.margen_fondeo*100).toFixed(1)}%</div>
            </div>
            <div style={s.kpi}>
              <div style={s.kpiLabel}>TIR anual inv.</div>
              <div style={s.kpiVal}>{R.tir_a != null ? `${(R.tir_a*100).toFixed(1)}%` : '—'}</div>
              <div style={s.kpiSub}>Mensual: {R.tir_m != null ? `${(R.tir_m*100).toFixed(2)}%` : '—'}</div>
            </div>
            <div style={s.kpi}>
              <div style={s.kpiLabel}>Costo total obra</div>
              <div style={s.kpiVal}>{fmtM(R.costo_total_impl)}</div>
              <div style={s.kpiSub}>{fmt(R.n_uds)} unidades · {fmt(Math.round(R.m2_dep))} m² dep.</div>
            </div>
          </div>

          {/* Escenarios */}
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'#aaa', marginBottom:10 }}>
            Escenarios de precio de salida
          </div>
          <div style={s.escRow}>
            {['Pesimista','Esperado','Optimista'].map((lbl,i) => {
              const e = R.escenarios[i]
              return (
                <div key={i} onClick={()=>setEsc(i)}
                  style={{ ...s.esc, ...(escSel===i ? s.escAct : {}) }}>
                  <div style={s.escLabel}>{lbl}</div>
                  <div style={s.escPrice}>${fmt(e.precio)}/m²</div>
                  <div style={{ ...s.escRoi, color: e.roi >= 0 ? '#27500A' : '#A32D2D' }}>
                    ROI: {(e.roi*100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:3 }}>
                    {fmtM(e.beneficio)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Gráficos */}
          <div style={s.charts2}>
            <div style={s.card}>
              <div style={s.cardTitle}>Flujo de fondos acumulado</div>
              <div style={{ height:200 }}><canvas ref={ffRef}/></div>
            </div>
            <div style={s.card}>
              <div style={s.cardTitle}>Estructura de costos</div>
              <div style={{ height:200 }}><canvas ref={costsRef}/></div>
            </div>
          </div>

          {/* Tabla costos */}
          <div style={s.card}>
            <div style={s.cardTitle}>Desglose de costos — fideicomiso al costo</div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Rubro</th>
                  <th style={{ ...s.th, textAlign:'right' }}>USD/m²</th>
                  <th style={{ ...s.th, textAlign:'right' }}>Total</th>
                  <th style={{ ...s.th, width:120 }}>% del costo</th>
                </tr>
              </thead>
              <tbody>
                {R.rubros.map((r,i) => (
                  <tr key={i}>
                    <td style={s.td}>{r.nombre}</td>
                    <td style={{ ...s.td, ...s.tdNum }}>${r.valor.toFixed(1)}</td>
                    <td style={{ ...s.td, ...s.tdNum }}>{fmtM(r.total)}</td>
                    <td style={{ ...s.td, ...s.tdBar }}>
                      <MiniBar pct={r.valor/R.c_total_impl*100}/>
                      <span style={{ fontSize:10, color:'#aaa' }}>
                        {(r.valor/R.c_total_impl*100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                <tr style={{ background:'#f8f8f6' }}>
                  <td style={{ ...s.td, fontWeight:600, color:'#1a1a18', borderTop:'0.5px solid #e0ddd6' }}>TOTAL</td>
                  <td style={{ ...s.td, ...s.tdNum, fontWeight:600, color:'#1a1a18', borderTop:'0.5px solid #e0ddd6' }}>${R.c_total_impl.toFixed(1)}</td>
                  <td style={{ ...s.td, ...s.tdNum, fontWeight:600, color:'#1a1a18', borderTop:'0.5px solid #e0ddd6' }}>{fmtM(R.costo_total_impl)}</td>
                  <td style={{ borderTop:'0.5px solid #e0ddd6' }}/>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Modelo inversor + distribución metros */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div style={s.card}>
              <div style={s.cardTitle}>Modelo inversor — por cupo</div>
              {[
                ['Metros por cupo',        `${fmt(R.metros_x_cupo.toFixed(1))} m²`],
                ['Valor del cupo',         fmtM(R.valor_cupo)],
                ['Desembolso mensual',      fmtM(R.desembolso_mensual)],
                ['Cuotas de obra',         `${P.cuotas_obra} meses`],
                ['N° de cupos',            P.cupos],
                ['Precio de fondeo/m²',    `$${fmt(P.pfondeo)}`],
                ['Precio salida esperado', `$${fmt(P.p2)}/m²`],
                ['Valor cupo al vencer',   fmtM(R.metros_x_cupo * P.p2)],
                ['TIR anual inversor',     R.tir_a != null ? `${(R.tir_a*100).toFixed(1)}%` : '—'],
                ['% proyecto fondeado',    `${P.pct_fondeo.toFixed(1)}%`],
              ].map(([l,v]) => (
                <div key={l} style={s.invRow}>
                  <span style={s.invLbl}>{l}</span>
                  <strong style={s.invVal}>{v}</strong>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <div style={s.cardTitle}>Distribución de metros</div>
              <div style={{ height:150, marginBottom:12 }}><canvas ref={mtsRef}/></div>
              <div style={{ fontSize:11, color:'#aaa', display:'flex', flexDirection:'column', gap:4 }}>
                <div>Fondeo socios: <strong style={{ color:'#1a1a18' }}>{fmt(Math.round(R.m2_fondeo))} m²</strong></div>
                <div>Link proyecto: <strong style={{ color:'#1a1a18' }}>{fmt(Math.round(R.m2_dep - R.m2_fondeo))} m²</strong></div>
                <div>Cocheras: <strong style={{ color:'#1a1a18' }}>{fmt(Math.round(R.m2_coch))} m²</strong></div>
              </div>
            </div>
          </div>

          {/* Tabla de referencia histórica */}
          <div style={s.card}>
            <div style={s.cardTitle}>Referencia precios históricos — Link Inversiones</div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Proyecto</th>
                  <th style={{ ...s.th, textAlign:'right' }}>Precio fondeo</th>
                  <th style={s.th}>Prop.</th>
                  <th style={{ ...s.th, textAlign:'right' }}>Plazo</th>
                  <th style={s.th}>Terreno</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Isaura',     '$817/m²',  '70/30', '26m', 'CANJE'],
                  ['Green',      '$800/m²',  '70/30', '25m', 'CANJE'],
                  ['Blue',       '$890/m²',  '70/30', '32m', 'CANJE'],
                  ['Red',        '$740/m²',  '70/30', '24m', 'CANJE'],
                  ['2UO',        '$841/m²',  '60/40', '42m', 'CANJE'],
                  ['Boulevard',  '$1.038/m²','60/40', '30m', 'CASH'],
                ].map(([n,p,pr,pl,t]) => (
                  <tr key={n}>
                    <td style={s.refTd}>{n}</td>
                    <td style={{ ...s.refTd, textAlign:'right', fontFamily:'monospace' }}>{p}</td>
                    <td style={{ ...s.refTd, fontSize:11, color:'#888' }}>{pr}</td>
                    <td style={{ ...s.refTd, textAlign:'right', fontFamily:'monospace' }}>{pl}</td>
                    <td style={{ ...s.refTd, fontSize:11, color: t==='CANJE' ? '#4A9E60' : '#888' }}>{t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}
