'use client'
import { useEffect, useRef } from 'react'
import {
  Chart, LineController, BarController, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Tooltip, Filler
} from 'chart.js'

Chart.register(LineController, BarController, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Tooltip, Filler)

const fmtK = n => {
  const a = Math.abs(n), s = n < 0 ? '-' : ''
  if (a >= 1e6) return s + '$' + (a/1e6).toFixed(2) + 'M'
  if (a >= 1e3) return s + '$' + Math.round(a/1e3) + 'K'
  return s + '$' + Math.round(a)
}

const st = {
  wrap:   { display:'flex', flexDirection:'column', gap:14 },
  kpiRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 },
  kpi:    { background:'#fff', border:'0.5px solid #e0ddd6', borderRadius:12, padding:'0.875rem 1rem' },
  klbl:   { fontSize:11, color:'#aaa', marginBottom:3 },
  kval:   { fontSize:19, fontWeight:500, color:'#1a1a18' },
  ksub:   { fontSize:11, color:'#888', marginTop:2 },
  alert:  { borderRadius:10, padding:'0.75rem 1rem', display:'flex', alignItems:'center',
            gap:10, fontSize:13, fontWeight:500 },
  card:   { background:'#fff', border:'0.5px solid #e0ddd6', borderRadius:12, padding:'1rem 1.1rem' },
  ctitle: { fontSize:12, fontWeight:500, color:'#555', marginBottom:8 },
  legend: { display:'flex', gap:14, marginBottom:8, flexWrap:'wrap' },
  leg:    { display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#888' },
  dot:    { width:10, height:3, borderRadius:2 },
  socBox: { background:'#E6F1FB', border:'0.5px solid #B5D4F4', borderRadius:10,
            padding:'0.875rem 1rem' },
  cochBox:{ background:'#E1F5EE', border:'0.5px solid #A3D9BE', borderRadius:10,
            padding:'0.875rem 1rem' },
  boxRow: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 },
  boxLbl: { fontSize:11, color:'#555', marginBottom:2 },
  boxVal: { fontSize:15, fontWeight:500, color:'#1a1a18' },
  secTitle:{ fontSize:12, fontWeight:600, color:'#1a1a18', marginBottom:8 },
}

function KpiCard({ label, value, sub, highlight }) {
  return (
    <div style={{ ...st.kpi, ...(highlight ? { borderColor: highlight, background: highlight + '18' } : {}) }}>
      <div style={st.klbl}>{label}</div>
      <div style={st.kval}>{value}</div>
      {sub && <div style={st.ksub}>{sub}</div>}
    </div>
  )
}

function LineChart({ labels, datasets }) {
  const ref = useRef(), chartRef = useRef()
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'line', data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode:'index', intersect:false },
        plugins: { legend:{ display:false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtK(ctx.raw)}` } } },
        scales: {
          x: { grid:{ color:'rgba(0,0,0,0.04)' }, ticks:{ color:'#aaa', font:{size:10}, maxTicksLimit:12 } },
          y: { grid:{ color:'rgba(0,0,0,0.04)' }, ticks:{ color:'#aaa', font:{size:10}, callback: v=>fmtK(v) } }
        }
      }
    })
    return () => chartRef.current?.destroy()
  }, [labels, datasets])
  return <canvas ref={ref} />
}

function BarChart({ labels, data }) {
  const ref = useRef(), chartRef = useRef()
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels, datasets: [{ label:'Flujo neto', data,
        backgroundColor: data.map(v => v >= 0 ? 'rgba(24,95,165,0.75)' : 'rgba(163,45,45,0.75)'),
        borderRadius: 3 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend:{ display:false },
          tooltip: { callbacks: { label: ctx => ` ${fmtK(ctx.raw)}` } } },
        scales: {
          x: { grid:{ display:false }, ticks:{ color:'#aaa', font:{size:10}, maxTicksLimit:12 } },
          y: { grid:{ color:'rgba(0,0,0,0.04)' }, ticks:{ color:'#aaa', font:{size:10}, callback: v=>fmtK(v) } }
        }
      }
    })
    return () => chartRef.current?.destroy()
  }, [labels, data])
  return <canvas ref={ref} />
}

export default function GraficosPanel({ resultado: r, inputs }) {
  const ok = r.cajaMin >= 0
  const tieneSocios   = (inputs.socios || []).length > 0
  const tieneCocheras = (inputs.cant_cocheras || 0) > 0 && inputs.modo_cochera !== 'combinado'

  return (
    <div style={st.wrap}>
      {/* KPIs principales */}
      <div style={st.kpiRow}>
        <KpiCard label="Utilidad neta"
          value={fmtK(r.utilidad)}
          sub={`${r.roi >= 0 ? '+' : ''}${r.roi.toFixed(1)}% sobre inversión`}
          highlight={r.utilidad >= 0 ? '#3B6D11' : '#A32D2D'} />
        <KpiCard label="Precio de equilibrio"
          value={`$${Math.round(r.precioEq).toLocaleString('es-AR')}/m²`}
          sub={`Mercado: $${inputs.precio_mercado_m2}/m²`} />
        <KpiCard label="Saldo mínimo de caja"
          value={fmtK(r.cajaMin)}
          sub={`Mes de máx. exposición: ${r.mesCajaMin}`} />
      </div>

      {/* Alerta liquidez */}
      <div style={{ ...st.alert,
        background: ok ? '#EAF3DE' : '#FCEBEB',
        border: `0.5px solid ${ok ? '#C0DD97' : '#F09595'}`,
        color: ok ? '#27500A' : '#791F1F' }}>
        <span style={{ fontSize:18 }}>{ok ? '✅' : '⚠️'}</span>
        <span>{ok
          ? 'Flujo calzado — la caja no entra en déficit.'
          : `Bache de caja en mes ${r.mesCajaMin} — déficit: ${fmtK(r.cajaMin)}. Requiere más fondeo.`
        }</span>
      </div>

      {/* Panel de socios */}
      {tieneSocios && (
        <div style={st.socBox}>
          <div style={st.secTitle}>📋 Socios aportantes</div>
          <div style={st.boxRow}>
            <div>
              <div style={st.boxLbl}>Aporte total recibido</div>
              <div style={st.boxVal}>{fmtK(r.aporteSocios)}</div>
            </div>
            <div>
              <div style={st.boxLbl}>Valor unidades cedidas</div>
              <div style={st.boxVal}>{fmtK(r.valorUnidSocios)}</div>
            </div>
            <div>
              <div style={st.boxLbl}>Costo apalancado</div>
              <div style={{ ...st.boxVal, color: r.costoApalancado <= 1 ? '#27500A' : '#A32D2D' }}>
                {r.costoApalancado.toFixed(2)}x
                <span style={{ fontSize:10, color:'#888', marginLeft:4 }}>
                  {r.costoApalancado <= 1 ? '✓ favorable' : '↑ costoso'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ fontSize:11, color:'#555', marginTop:8 }}>
            m² asignados a socios: <strong>{r.m2SociosTotales}</strong> m² · 
            m² vendibles libres: <strong>{Math.round(r.m2Vend)}</strong> m²
          </div>
        </div>
      )}

      {/* Panel de cocheras */}
      {tieneCocheras && (
        <div style={st.cochCard}>
          <div style={st.secTitle}>🅿️ Cocheras</div>
          <div style={st.boxRow}>
            <div>
              <div style={st.boxLbl}>Precio unitario</div>
              <div style={st.boxVal}>{fmtK(r.precioCochera)}</div>
            </div>
            <div>
              <div style={st.boxLbl}>Cocheras vendidas</div>
              <div style={st.boxVal}>{r.cocherasVendidas} / {inputs.cant_cocheras}</div>
            </div>
            <div>
              <div style={st.boxLbl}>Ingreso total cocheras</div>
              <div style={st.boxVal}>{fmtK(r.ingresoCocheras)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Estructura de costos */}
      <div style={st.kpiRow}>
        <KpiCard label="Terreno"          value={fmtK(inputs.precio_terreno)} />
        <KpiCard label="Obra directa"     value={fmtK(r.costoObra)} />
        <KpiCard label="Indir. + Contg."  value={fmtK(r.costoTotal - inputs.precio_terreno - r.costoObra)} />
      </div>

      {/* Gráfico acumulado */}
      <div style={st.card}>
        <div style={st.ctitle}>Flujos acumulados en el tiempo</div>
        <div style={st.legend}>
          <span style={st.leg}><span style={{ ...st.dot, background:'#185FA5' }}></span>Ingresos acum.</span>
          <span style={st.leg}><span style={{ ...st.dot, background:'#A32D2D' }}></span>Egresos acum.</span>
          <span style={st.leg}><span style={{ ...st.dot, background:'#3B6D11' }}></span>Saldo neto</span>
        </div>
        <div style={{ height:230 }}>
          <LineChart labels={r.labels} datasets={[
            { label:'Ingresos acumulados', data:r.ingAcum, borderColor:'#185FA5',
              backgroundColor:'rgba(24,95,165,0.07)', tension:0.35, fill:false, pointRadius:0, borderWidth:2 },
            { label:'Egresos acumulados', data:r.egAcum, borderColor:'#A32D2D',
              backgroundColor:'rgba(163,45,45,0.07)', tension:0.35, fill:false, pointRadius:0, borderWidth:2, borderDash:[5,3] },
            { label:'Saldo neto', data:r.saldoAcum, borderColor:'#3B6D11',
              backgroundColor:'rgba(59,109,17,0.10)', tension:0.35, fill:true, pointRadius:0, borderWidth:2 },
          ]} />
        </div>
      </div>

      {/* Gráfico barras */}
      <div style={st.card}>
        <div style={st.ctitle}>Flujo neto mensual de caja</div>
        <div style={{ height:175 }}>
          <BarChart labels={r.labels} data={r.flujoNeto} />
        </div>
      </div>
    </div>
  )
}
