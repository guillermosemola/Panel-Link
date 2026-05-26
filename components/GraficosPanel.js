'use client'
import { useEffect, useRef } from 'react'
import {
  Chart, LineController, BarController, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Tooltip, Filler
} from 'chart.js'

Chart.register(
  LineController, BarController, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Tooltip, Filler
)

const fmtK = n => {
  const a = Math.abs(n), s = n < 0 ? '-' : ''
  if (a >= 1e6) return s + '$' + (a/1e6).toFixed(2) + 'M'
  if (a >= 1e3) return s + '$' + Math.round(a/1e3) + 'K'
  return s + '$' + Math.round(a)
}

const st = {
  wrap:   { display:'flex', flexDirection:'column', gap:16 },
  kpiRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 },
  kpi:    { background:'#fff', border:'0.5px solid #e0ddd6',
            borderRadius:12, padding:'1rem 1.1rem' },
  klbl:   { fontSize:11, color:'#aaa', marginBottom:4 },
  kval:   { fontSize:20, fontWeight:500, color:'#1a1a18' },
  ksub:   { fontSize:11, color:'#888', marginTop:2 },
  alert:  { borderRadius:10, padding:'0.75rem 1rem',
            display:'flex', alignItems:'center', gap:10,
            fontSize:13, fontWeight:500 },
  card:   { background:'#fff', border:'0.5px solid #e0ddd6',
            borderRadius:12, padding:'1rem 1.25rem' },
  ctitle: { fontSize:12, fontWeight:500, color:'#555', marginBottom:10 },
  legend: { display:'flex', gap:14, marginBottom:8, flexWrap:'wrap' },
  leg:    { display:'flex', alignItems:'center', gap:5,
            fontSize:11, color:'#888' },
  dot:    { width:10, height:3, borderRadius:2 },
}

function KpiCard({ label, value, sub }) {
  return (
    <div style={st.kpi}>
      <div style={st.klbl}>{label}</div>
      <div style={st.kval}>{value}</div>
      {sub && <div style={st.ksub}>{sub}</div>}
    </div>
  )
}

function LineChart({ labels, datasets }) {
  const ref = useRef()
  const chartRef = useRef()
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: { display:false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtK(ctx.raw)}` } }
        },
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
  const ref = useRef()
  const chartRef = useRef()
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Flujo neto',
          data,
          backgroundColor: data.map(v => v >= 0 ? 'rgba(24,95,165,0.75)' : 'rgba(163,45,45,0.75)'),
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display:false },
          tooltip: { callbacks: { label: ctx => ` ${fmtK(ctx.raw)}` } }
        },
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

  return (
    <div style={st.wrap}>
      {/* KPIs */}
      <div style={st.kpiRow}>
        <KpiCard
          label="Utilidad neta"
          value={fmtK(r.utilidad)}
          sub={`${r.roi >= 0 ? '+' : ''}${r.roi.toFixed(1)}% sobre inversión`}
        />
        <KpiCard
          label="Precio de equilibrio"
          value={`$${Math.round(r.precioEq).toLocaleString('es-AR')}/m²`}
          sub={`Mercado: $${inputs.precio_mercado_m2}/m²`}
        />
        <KpiCard
          label="Saldo mínimo de caja"
          value={fmtK(r.cajaMin)}
          sub={`Mes de máxima exposición: ${r.mesCajaMin}`}
        />
      </div>

      {/* Alerta de liquidez */}
      <div style={{
        ...st.alert,
        background: ok ? '#EAF3DE' : '#FCEBEB',
        border:     `0.5px solid ${ok ? '#C0DD97' : '#F09595'}`,
        color:      ok ? '#27500A' : '#791F1F',
      }}>
        <span style={{fontSize:18}}>{ok ? '✅' : '⚠️'}</span>
        <span>
          {ok
            ? 'Flujo calzado — la caja no entra en déficit con el capital propio ingresado.'
            : `Bache de caja en mes ${r.mesCajaMin} — déficit proyectado: ${fmtK(r.cajaMin)}. Requiere más fondeo o crédito puente.`
          }
        </span>
      </div>

      {/* Costos desglosados */}
      <div style={{...st.kpiRow, gridTemplateColumns:'repeat(3,1fr)'}}>
        <KpiCard label="Terreno"           value={fmtK(inputs.precio_terreno)} />
        <KpiCard label="Obra directa"      value={fmtK(r.costoObra)} />
        <KpiCard label="Indir. + Contg."   value={fmtK(r.costoTotal - inputs.precio_terreno - r.costoObra)} />
      </div>

      {/* Gráfico acumulado */}
      <div style={st.card}>
        <div style={st.ctitle}>Flujos acumulados en el tiempo</div>
        <div style={st.legend}>
          <span style={st.leg}><span style={{...st.dot,background:'#185FA5'}}></span>Ingresos acumulados</span>
          <span style={st.leg}><span style={{...st.dot,background:'#A32D2D'}}></span>Egresos acumulados</span>
          <span style={st.leg}><span style={{...st.dot,background:'#3B6D11'}}></span>Saldo neto</span>
        </div>
        <div style={{height:240}}>
          <LineChart
            labels={r.labels}
            datasets={[
              { label:'Ingresos acumulados', data:r.ingAcum, borderColor:'#185FA5',
                backgroundColor:'rgba(24,95,165,0.07)', tension:0.35, fill:false,
                pointRadius:0, borderWidth:2 },
              { label:'Egresos acumulados', data:r.egAcum, borderColor:'#A32D2D',
                backgroundColor:'rgba(163,45,45,0.07)', tension:0.35, fill:false,
                pointRadius:0, borderWidth:2, borderDash:[5,3] },
              { label:'Saldo neto', data:r.saldoAcum, borderColor:'#3B6D11',
                backgroundColor:'rgba(59,109,17,0.10)', tension:0.35, fill:true,
                pointRadius:0, borderWidth:2 },
            ]}
          />
        </div>
      </div>

      {/* Gráfico flujo mensual */}
      <div style={st.card}>
        <div style={st.ctitle}>Flujo neto mensual de caja</div>
        <div style={st.legend}>
          <span style={st.leg}><span style={{...st.dot,background:'#185FA5',width:10,height:10,borderRadius:2}}></span>Positivo</span>
          <span style={st.leg}><span style={{...st.dot,background:'#A32D2D',width:10,height:10,borderRadius:2}}></span>Negativo</span>
        </div>
        <div style={{height:180}}>
          <BarChart labels={r.labels} data={r.flujoNeto} />
        </div>
      </div>
    </div>
  )
}
