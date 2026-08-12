'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
 
// ── Utilidades ──────────────────────────────────────────────────────────────
const fmtM   = n => { if(!n&&n!==0)return'—'; const a=Math.abs(n),s=n<0?'-':''; if(a>=1e6)return`${s}$${(a/1e6).toFixed(2)}M`; if(a>=1e3)return`${s}$${(a/1e3).toFixed(0)}K`; return`${s}$${Math.round(a)}` }
const fmtP   = n => n==null?'—':`${Number(n).toFixed(1)}%`
const fmtNum = n => n==null?'—':new Intl.NumberFormat('es-AR').format(Math.round(n))
const fmtTC  = n => n?`$${new Intl.NumberFormat('es-AR').format(Math.round(n))}`:'—'
 
const SECTOR_COLOR = {
  finanzas:{bg:'rgba(200,169,110,.12)',color:'#C8A96E'},
  tecnica: {bg:'rgba(96,165,250,.12)', color:'#60A5FA'},
  obra:    {bg:'rgba(245,158,11,.12)', color:'#F5A623'},
  comercial:{bg:'rgba(61,214,140,.12)',color:'#3DD68C'},
}
 
const SEM_CFG = {
  verde:    {color:'#3DD68C',bg:'rgba(61,214,140,.08)', border:'rgba(61,214,140,.2)', label:'En control'},
  amarillo: {color:'#F5A623',bg:'rgba(245,166,35,.08)', border:'rgba(245,166,35,.2)', label:'Atención'},
  rojo:     {color:'#F75555',bg:'rgba(247,85,85,.08)',  border:'rgba(247,85,85,.2)',  label:'Crítico'},
  gris:     {color:'#5A5F66',bg:'rgba(90,95,102,.08)',  border:'rgba(90,95,102,.2)',  label:'Sin datos'},
}
 
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
 
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0E0F11}
 
.db{
  --bg:#0E0F11; --s1:#16181C; --s2:#1E2126; --s3:#24282F;
  --bd:rgba(255,255,255,.06); --bd2:rgba(255,255,255,.1);
  --tx:#E8E9EB; --dim:#7C8186; --fnt:#4A4F56;
  --gold:#C8A96E; --green:#3DD68C; --red:#F75555; --amber:#F5A623;
  font-family:'Inter',system-ui,sans-serif;
  background:var(--bg); color:var(--tx);
  min-height:100vh; font-size:13px;
}
 
/* NAVBAR */
.nav{
  background:rgba(14,15,17,.9);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--bd);
  padding:0 2rem; height:52px;
  display:flex; align-items:center; justify-content:space-between;
  position:sticky; top:0; z-index:100;
}
.nav-logo{display:flex;align-items:center;gap:10px}
.nav-mark{
  width:28px;height:28px;
  background:var(--gold);
  border-radius:6px;
  display:flex;align-items:center;justify-content:center;
  font-family:'DM Serif Display',serif;
  font-size:14px;color:#0E0F11;font-weight:400;
}
.nav-brand{font-size:13px;font-weight:600;letter-spacing:.02em}
.nav-sub{font-size:10px;color:var(--dim);letter-spacing:.04em;text-transform:uppercase}
.nav-actions{display:flex;align-items:center;gap:8px}
.nav-btn{
  padding:5px 12px; border-radius:6px; font-size:12px;
  border:1px solid var(--bd); background:transparent;
  color:var(--dim); cursor:pointer; font-family:inherit;
  transition:all .15s;
}
.nav-btn:hover{border-color:var(--bd2);color:var(--tx)}
.nav-btn.pri{background:var(--gold);color:#0E0F11;border-color:var(--gold);font-weight:600}
.nav-btn.pri:hover{background:#D4B97E}
.nav-sector{
  font-size:11px;font-weight:500;
  padding:3px 10px;border-radius:20px;
}
 
/* TICKER */
.ticker{
  border-bottom:1px solid var(--bd);
  padding:0 2rem;
  display:flex; align-items:stretch; gap:0;
  overflow-x:auto;
}
.ticker-item{
  display:flex;flex-direction:column;justify-content:center;
  padding:10px 20px;
  border-right:1px solid var(--bd);
  min-width:160px; flex-shrink:0;
}
.ticker-item:first-child{padding-left:0}
.ticker-label{font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--fnt);margin-bottom:3px}
.ticker-val{font-family:'DM Serif Display',serif;font-size:20px;color:var(--tx);line-height:1}
.ticker-sub{font-size:10px;color:var(--dim);margin-top:2px;font-family:'JetBrains Mono',monospace}
.ticker-delta{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:500}
 
/* MAIN */
.main{max-width:1400px;margin:0 auto;padding:1.5rem 2rem 4rem}
 
/* SECCIÓN HEADER */
.sec-head{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:12px;
}
.sec-title{
  font-size:10px;font-weight:600;letter-spacing:.12em;
  text-transform:uppercase;color:var(--fnt);
}
 
/* GRID LAYOUT */
.row{display:grid;gap:12px;margin-bottom:12px}
.row-2{grid-template-columns:1fr 1fr}
.row-3{grid-template-columns:repeat(3,1fr)}
.row-auto{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
 
/* CARDS */
.card{
  background:var(--s1);
  border:1px solid var(--bd);
  border-radius:10px;
  padding:18px;
}
.card-sm{padding:14px}
.card-title{
  font-size:10px;font-weight:600;letter-spacing:.1em;
  text-transform:uppercase;color:var(--fnt);
  margin-bottom:14px;
}
 
/* SEMAFORO GRID */
.sem-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(200px,1fr));
  gap:8px;
}
.sem-card{
  border-radius:8px;
  padding:12px 14px;
  border:1px solid;
  cursor:pointer;
  transition:all .15s;
  position:relative;
  overflow:hidden;
}
.sem-card::before{
  content:'';
  position:absolute;top:0;left:0;right:0;
  height:2px;
}
.sem-card:hover{transform:translateY(-1px);filter:brightness(1.08)}
.sem-card-name{font-size:13px;font-weight:600;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sem-card-metrics{display:flex;gap:12px;flex-wrap:wrap}
.sem-metric{display:flex;flex-direction:column;gap:1px}
.sem-metric-l{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--fnt)}
.sem-metric-v{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600}
.sem-bar-wrap{margin-top:8px;height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden}
.sem-bar{height:100%;border-radius:2px;transition:width .6s}
.sem-dot{
  width:6px;height:6px;border-radius:50%;
  position:absolute;top:12px;right:12px;
}
 
/* TABLA DE PROYECTOS */
.ptbl{width:100%;border-collapse:collapse}
.ptbl th{
  font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:var(--fnt);padding:8px 12px;
  border-bottom:1px solid var(--bd);
  text-align:left;white-space:nowrap;
  background:var(--s1);
}
.ptbl th.r,.ptbl td.r{text-align:right}
.ptbl td{
  padding:11px 12px;
  border-bottom:1px solid rgba(255,255,255,.03);
  vertical-align:middle;
}
.ptbl tbody tr{cursor:pointer;transition:background .1s}
.ptbl tbody tr:hover td{background:rgba(255,255,255,.025)}
.ptbl tbody tr:last-child td{border-bottom:none}
.mono{font-family:'JetBrains Mono',monospace}
.serif{font-family:'DM Serif Display',serif}
 
/* BADGE */
.badge{
  display:inline-flex;align-items:center;gap:4px;
  font-size:10px;font-weight:500;
  padding:2px 8px;border-radius:12px;
}
.badge-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
 
/* STOCK BARS */
.stock-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.stock-name{font-size:12px;color:var(--dim);width:120px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stock-bar-bg{flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;display:flex}
.stock-vend{height:100%;background:#F75555;border-radius:3px 0 0 3px}
.stock-canje{height:100%;background:#C8A96E}
.stock-res{height:100%;background:#F5A623}
.stock-disp{height:100%;background:#3DD68C;border-radius:0 3px 3px 0}
.stock-pct{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);width:36px;text-align:right;flex-shrink:0}
 
/* CHART */
.chart-wrap{height:160px;position:relative}
 
/* ALERTA */
.alert-strip{
  background:rgba(247,85,85,.08);
  border:1px solid rgba(247,85,85,.2);
  border-radius:8px;padding:10px 14px;
  margin-bottom:12px;
  display:flex;align-items:center;gap:10px;
  font-size:12px;color:#F75555;
}
 
/* SCROLLBAR */
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}
`
 
export default function Dashboard() {
  const router = useRouter()
  const chartRef = useRef(null)
  const chartInst = useRef(null)
  const [perfil,    setPerfil]    = useState(null)
  const [proyectos, setProyectos] = useState([])
  const [semaforos, setSemaforos] = useState([])
  const [flujo,     setFlujo]     = useState([])
  const [tcActual,  setTcActual]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [busqueda,  setBusqueda]  = useState('')
 
  const load = useCallback(async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      if (!perf) { await supabase.auth.signOut(); router.push('/login'); return }
      setPerfil(perf)
 
      const [
        { data:projs },
        { data:sems },
        { data:flujoProy },
        { data:tc },
      ] = await Promise.all([
        supabase.from('proyectos').select('*').eq('empresa_id', perf.empresa_id).order('created_at',{ascending:false}),
        supabase.from('v_semaforos_cartera').select('*').eq('empresa_id', perf.empresa_id),
        supabase.from('flujo_proyectado').select('mes_numero,costo_planificado,ingreso_proyectado,proyecto_id').order('mes_numero'),
        supabase.from('tipos_cambio').select('valor,fecha').eq('tipo','valuacion').order('fecha',{ascending:false}).limit(1).maybeSingle(),
      ])
 
      setProyectos(projs || [])
      setSemaforos(sems || [])
      setTcActual(tc?.valor || null)
 
      if (flujoProy && projs) {
        const ids = new Set((projs||[]).map(p=>p.id))
        const cons = {}
        flujoProy.filter(f=>ids.has(f.proyecto_id)).forEach(f => {
          if (!cons[f.mes_numero]) cons[f.mes_numero] = {mes:f.mes_numero,egresos:0,ingresos:0}
          cons[f.mes_numero].egresos  += +f.costo_planificado
          cons[f.mes_numero].ingresos += +f.ingreso_proyectado
        })
        setFlujo(Object.values(cons).sort((a,b)=>a.mes-b.mes).slice(0,18))
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [router])
 
  useEffect(() => { load() }, [load])
 
  // Gráfico flujo consolidado
  useEffect(() => {
    if (!flujo.length || !chartRef.current) return
    import('chart.js/auto').then(({ default: Chart }) => {
      if (chartInst.current) chartInst.current.destroy()
      // Calcular saldo acumulado
      let acum = 0
      const saldoAcum = flujo.map(f => { acum += f.ingresos - f.egresos; return Math.round(acum) })
 
      chartInst.current = new Chart(chartRef.current, {
        data: {
          labels: flujo.map(f=>`M${f.mes}`),
          datasets: [
            {
              type: 'bar',
              label: 'Egresos',
              data: flujo.map(f=>Math.round(f.egresos)),
              backgroundColor: 'rgba(247,85,85,.35)',
              borderColor: 'rgba(247,85,85,.7)',
              borderWidth: 1,
              borderRadius: 3,
              order: 2,
            },
            {
              type: 'bar',
              label: 'Ingresos',
              data: flujo.map(f=>Math.round(f.ingresos)),
              backgroundColor: 'rgba(61,214,140,.3)',
              borderColor: 'rgba(61,214,140,.7)',
              borderWidth: 1,
              borderRadius: 3,
              order: 2,
            },
            {
              type: 'line',
              label: 'Saldo acumulado',
              data: saldoAcum,
              borderColor: '#C8A96E',
              backgroundColor: 'rgba(200,169,110,.08)',
              borderWidth: 2,
              pointRadius: 2,
              pointBackgroundColor: '#C8A96E',
              tension: 0.4,
              fill: true,
              yAxisID: 'y2',
              order: 1,
            },
          ]
        },
        options:{
          responsive:true, maintainAspectRatio:false, animation:false,
          interaction:{ mode:'index', intersect:false },
          plugins:{
            legend:{
              position:'bottom',
              labels:{ color:'#7C8186', font:{size:10,family:'Inter'}, boxWidth:10, padding:16 }
            },
            tooltip:{
              backgroundColor:'rgba(14,15,17,.95)',
              borderColor:'rgba(255,255,255,.1)',
              borderWidth:1,
              padding:10,
              callbacks:{
                label: ctx => {
                  const v = ctx.raw
                  const sign = v < 0 ? '-' : ''
                  const label = ctx.dataset.label
                  const fmt = `${sign}$${new Intl.NumberFormat('es-AR').format(Math.abs(Math.round(v)))}`
                  return ` ${label}: ${fmt}`
                }
              }
            }
          },
          scales:{
            x:{
              ticks:{ color:'#4A4F56', font:{size:9}, maxTicksLimit:12 },
              grid:{ color:'rgba(255,255,255,.04)' },
              border:{ display:false }
            },
            y:{
              position:'left',
              ticks:{
                color:'#4A4F56', font:{size:9},
                callback: v => v>=1e6?`$${(v/1e6).toFixed(1)}M`:v>=1e3?`$${(v/1e3).toFixed(0)}K`:`$${v}`
              },
              grid:{ color:'rgba(255,255,255,.04)' },
              border:{ display:false }
            },
            y2:{
              position:'right',
              ticks:{
                color:'#C8A96E', font:{size:9},
                callback: v => { const s=v<0?'-':''; const a=Math.abs(v); return a>=1e6?`${s}$${(a/1e6).toFixed(1)}M`:a>=1e3?`${s}$${(a/1e3).toFixed(0)}K`:`${s}$${a}` }
              },
              grid:{ drawOnChartArea:false },
              border:{ display:false }
            }
          }
        }
      })
    })
    return () => chartInst.current?.destroy()
  }, [flujo])
 
  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0E0F11',display:'flex',alignItems:'center',
      justifyContent:'center',fontFamily:'Inter,system-ui,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontFamily:'DM Serif Display,serif',fontSize:28,color:'#C8A96E',marginBottom:8}}>L</div>
        <div style={{fontSize:11,color:'#4A4F56',letterSpacing:'.1em',textTransform:'uppercase'}}>Cargando panel</div>
      </div>
    </div>
  )
 
  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas
 
  // KPIs consolidados
  const totalEvCosto   = proyectos.reduce((a,p)=>a+(+p.ev_costo_total_usd||0), 0)
  const totalEvIngreso = proyectos.reduce((a,p)=>a+(+p.ev_ingreso_total_usd||0), 0)
  const costoRealAcum  = semaforos.reduce((a,s)=>a+(+s.costo_real_acum||0), 0)
  const margenPond     = totalEvIngreso>0 ? ((totalEvIngreso-totalEvCosto)/totalEvIngreso)*100 : null
  const enRiesgo       = semaforos.filter(s=>s.semaforo==='rojo').length
  const conEV          = proyectos.filter(p=>p.ev_costo_total_usd).length
 
  // Stock disponible (GDV aproximado)
  const gdv = semaforos.reduce((a,s) => {
    if (!s.ev_ingreso_total_usd||!s.unidades_total) return a
    const pctDisp = (s.unidades_total-(s.unidades_no_disponibles||0))/s.unidades_total
    return a + (+s.ev_ingreso_total_usd*pctDisp)
  }, 0)
 
  const filtrados = proyectos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
 
  function getSem(id) { return semaforos.find(s=>s.proyecto_id===id) }
 
  return (
    <div className="db">
      <style>{CSS}</style>
 
      {/* NAVBAR */}
      <nav className="nav">
        <div className="nav-logo">
          <div className="nav-mark">L</div>
          <div>
            <div className="nav-brand">Panel-Link</div>
            <div className="nav-sub">Link Inversiones · SIGMA</div>
          </div>
        </div>
        <div className="nav-actions">
          <input
            placeholder="Buscar proyecto..."
            value={busqueda} onChange={e=>setBusqueda(e.target.value)}
            style={{padding:'5px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,.08)',
              background:'rgba(255,255,255,.04)',color:'#E8E9EB',fontSize:12,
              fontFamily:'Inter,sans-serif',outline:'none',width:180}}
          />
          <button className="nav-btn" onClick={()=>router.push('/tipo-cambio')}>💱 TC</button>
          <button className="nav-btn" onClick={()=>router.push('/simulador')}>📊 Simulador</button>
          <button className="nav-btn pri" onClick={()=>router.push('/nuevo-proyecto')}>+ Nuevo proyecto</button>
          <span className="nav-sector" style={{background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
          <span style={{fontSize:12,color:'#4A4F56'}}>{perfil?.nombre_completo}</span>
          <button onClick={async()=>{await supabase.auth.signOut();router.push('/login')}}
            style={{fontSize:11,color:'#4A4F56',background:'none',border:'none',cursor:'pointer'}}>Salir</button>
        </div>
      </nav>
 
      {/* TICKER */}
      <div className="ticker">
        {[
          {label:'GDV disponible', val:fmtM(gdv), sub:'Stock al precio EV', color:'#C8A96E'},
          {label:'EV consolidado', val:fmtM(totalEvCosto), sub:`${conEV} proyectos`, color:'#E8E9EB'},
          {label:'Costo real acum.', val:fmtM(costoRealAcum), sub:'Certificados cargados', color:'#E8E9EB'},
          {label:'Margen EV pond.', val:margenPond?fmtP(margenPond):'—', sub:'Sobre precio de venta',
           color:margenPond>=20?'#3DD68C':margenPond>=15?'#F5A623':'#F75555'},
          {label:'TC valuación', val:tcActual?fmtTC(tcActual):'—', sub:'ARS/USD vigente', color:'#E8E9EB'},
          {label:'En riesgo', val:String(enRiesgo), sub:enRiesgo===0?'Todos en control':'CPI < 0.85',
           color:enRiesgo===0?'#3DD68C':'#F75555'},
        ].map((k,i)=>(
          <div key={i} className="ticker-item">
            <div className="ticker-label">{k.label}</div>
            <div className="ticker-val" style={{color:k.color}}>{k.val}</div>
            <div className="ticker-sub">{k.sub}</div>
          </div>
        ))}
      </div>
 
      <div className="main">
 
        {/* ALERTAS */}
        {enRiesgo>0 && (
          <div className="alert-strip">
            <span style={{fontSize:16}}>⚠</span>
            <span><strong>{enRiesgo} proyecto{enRiesgo>1?'s':''} en estado crítico</strong> — CPI por debajo de 0.85 o descalce comercial superior al 20%.</span>
            {semaforos.filter(s=>s.semaforo==='rojo').map(s=>(
              <button key={s.proyecto_id} onClick={()=>router.push(`/proyecto/${s.proyecto_id}/gestion`)}
                style={{marginLeft:4,fontSize:11,color:'#F75555',background:'none',border:'none',
                  cursor:'pointer',textDecoration:'underline',fontFamily:'inherit'}}>
                → {s.nombre}
              </button>
            ))}
          </div>
        )}
 
        {/* ROW 1: Semáforos + Flujo */}
        <div className="row row-2" style={{gridTemplateColumns:'1.4fr 1fr'}}>
 
          {/* Semáforos */}
          <div className="card">
            <div className="sec-head">
              <span className="card-title">Estado de proyectos</span>
              <span style={{fontSize:10,color:'#4A4F56'}}>{semaforos.length} con EV</span>
            </div>
            <div className="sem-grid">
              {filtrados.map(p => {
                const s = getSem(p.id)
                const tieneEV = !!p.ev_costo_total_usd
                const ss = SEM_CFG[s?.semaforo||(tieneEV?'gris':'gris')]
                const cpi = s?.cpi_actual
                const avance = s?.pct_avance_fisico
                return (
                  <div key={p.id} className="sem-card"
                    style={{background:ss.bg, borderColor:ss.border}}
                    onClick={()=>router.push(tieneEV?`/proyecto/${p.id}/gestion`:`/nuevo-proyecto?id=${p.id}`)}>
                    <div className="sem-dot" style={{background:ss.color}}/>
                    <div className="sem-card-name" style={{color:ss.color,paddingRight:14}}>{p.nombre}</div>
                    {tieneEV && s ? (
                      <>
                        <div className="sem-card-metrics">
                          <div className="sem-metric">
                            <span className="sem-metric-l">CPI</span>
                            <span className="sem-metric-v" style={{color:ss.color}}>{cpi?cpi.toFixed(2):'—'}</span>
                          </div>
                          <div className="sem-metric">
                            <span className="sem-metric-l">Avance</span>
                            <span className="sem-metric-v">{avance!=null?fmtP(avance):'—'}</span>
                          </div>
                          <div className="sem-metric">
                            <span className="sem-metric-l">Vendido</span>
                            <span className="sem-metric-v" style={{color:'#3DD68C'}}>
                              {s.pct_m2_vendidos!=null?fmtP(s.pct_m2_vendidos):'—'}
                            </span>
                          </div>
                        </div>
                        {avance!=null && (
                          <div className="sem-bar-wrap">
                            <div className="sem-bar"
                              style={{width:`${Math.min(100,avance)}%`,background:ss.color}}/>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{fontSize:11,color:'#4A4F56',fontStyle:'italic',marginTop:4}}>
                        {tieneEV?'Sin avance cargado':'Sin EV — clic para configurar'}
                      </div>
                    )}
                  </div>
                )
              })}
              {filtrados.length===0 && (
                <div style={{gridColumn:'1/-1',textAlign:'center',padding:'30px',color:'#4A4F56',fontSize:12}}>
                  Sin proyectos con ese nombre
                </div>
              )}
            </div>
          </div>
 
          {/* Flujo consolidado */}
          <div className="card">
            <div className="sec-head">
              <span className="card-title">Flujo de fondos proyectado</span>
              <span style={{fontSize:10,color:'#4A4F56'}}>Consolidado · 18 meses</span>
            </div>
            {flujo.length > 0
              ? <div className="chart-wrap"><canvas ref={chartRef}/></div>
              : <div style={{height:160,display:'flex',alignItems:'center',justifyContent:'center',color:'#4A4F56',fontSize:12}}>
                  Sin datos de flujo proyectado
                </div>
            }
            {flujo.length > 0 && (
              <div style={{display:'flex',gap:16,marginTop:12,paddingTop:10,borderTop:'1px solid rgba(255,255,255,.06)'}}>
                {[
                  {l:'Total egresos 18m', v:fmtM(flujo.reduce((a,f)=>a+f.egresos,0)), c:'#F75555'},
                  {l:'Total ingresos 18m', v:fmtM(flujo.reduce((a,f)=>a+f.ingresos,0)), c:'#3DD68C'},
                  {l:'Saldo neto', v:fmtM(flujo.reduce((a,f)=>a+f.ingresos-f.egresos,0)),
                   c:flujo.reduce((a,f)=>a+f.ingresos-f.egresos,0)>=0?'#3DD68C':'#F75555'},
                ].map((k,i)=>(
                  <div key={i}>
                    <div style={{fontSize:9,letterSpacing:'.08em',textTransform:'uppercase',color:'#4A4F56',marginBottom:2}}>{k.l}</div>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:k.c}}>{k.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
 
        {/* ROW 2: Tabla proyectos */}
        <div className="card" style={{marginBottom:12,padding:0,overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            <span className="card-title">Detalle de cartera</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="ptbl">
              <thead><tr>
                <th>Proyecto</th>
                <th>Estado</th>
                <th className="r">Avance</th>
                <th className="r">% Vendido</th>
                <th className="r">Descalce</th>
                <th className="r">CPI</th>
                <th className="r">EAC</th>
                <th className="r">Costo real</th>
                <th className="r">Margen real</th>
                <th>Semáforo</th>
              </tr></thead>
              <tbody>
                {semaforos.length===0 && (
                  <tr><td colSpan={10} style={{textAlign:'center',padding:'30px',color:'#4A4F56'}}>
                    Sin datos de avance. Cargá el primer certificado de avance mensual.
                  </td></tr>
                )}
                {semaforos.map(s => {
                  const ss = SEM_CFG[s.semaforo||'gris']
                  const cpiC = !s.cpi_actual?'#4A4F56':s.cpi_actual>=0.95?'#3DD68C':s.cpi_actual>=0.85?'#F5A623':'#F75555'
                  const desc = (s.pct_avance_fisico||0)-(s.pct_m2_vendidos||0)
                  const dC = Math.abs(desc)<=10?'#3DD68C':Math.abs(desc)<=20?'#F5A623':'#F75555'
                  const mC = s.margen_real_pct>=20?'#3DD68C':s.margen_real_pct>=10?'#F5A623':'#4A4F56'
                  return (
                    <tr key={s.proyecto_id} onClick={()=>router.push(`/proyecto/${s.proyecto_id}/gestion`)}>
                      <td><strong style={{fontSize:13}}>{s.nombre}</strong></td>
                      <td>
                        <span style={{fontSize:10,color:'#7C8186',textTransform:'capitalize'}}>
                          {s.estado?.replace('_',' ')||'—'}
                        </span>
                      </td>
                      <td className="r mono">{s.pct_avance_fisico!=null?fmtP(s.pct_avance_fisico):'—'}</td>
                      <td className="r mono" style={{color:'#3DD68C'}}>{s.pct_m2_vendidos!=null?fmtP(s.pct_m2_vendidos):'—'}</td>
                      <td className="r mono" style={{color:dC}}>
                        {s.pct_avance_fisico!=null?`${desc>0?'+':''}${desc.toFixed(1)}%`:'—'}
                      </td>
                      <td className="r mono" style={{color:cpiC,fontWeight:600}}>
                        {s.cpi_actual?s.cpi_actual.toFixed(3):'—'}
                      </td>
                      <td className="r mono">{fmtM(s.eac)}</td>
                      <td className="r mono">{fmtM(s.costo_real_acum)}</td>
                      <td className="r mono" style={{color:mC}}>{s.margen_real_pct!=null?fmtP(s.margen_real_pct):'—'}</td>
                      <td>
                        <span className="badge" style={{background:ss.bg,border:`1px solid ${ss.border}`,color:ss.color}}>
                          <span className="badge-dot" style={{background:ss.color}}/>
                          {ss.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
 
        {/* ROW 3: Stock disponible */}
        <div className="row row-2">
          <div className="card">
            <div className="card-title">Disponibilidad de stock por proyecto</div>
            <div style={{marginBottom:10,display:'flex',gap:12,fontSize:9,letterSpacing:'.08em',textTransform:'uppercase',color:'#4A4F56'}}>
              {[['#F75555','Vendido'],['#C8A96E','Canje'],['#F5A623','Reservado'],['#3DD68C','Disponible']].map(([c,l])=>(
                <span key={l} style={{display:'flex',alignItems:'center',gap:4}}>
                  <span style={{width:8,height:8,borderRadius:2,background:c,display:'inline-block'}}/>
                  {l}
                </span>
              ))}
            </div>
            {semaforos.map(s => {
              if (!s.unidades_total) return null
              const tot = s.unidades_total
              const noDisp = s.unidades_no_disponibles||0
              const disp = tot - noDisp
              const pVend = (noDisp/tot)*80  // aprox split
              const pDisp = (disp/tot)*100
              return (
                <div key={s.proyecto_id} className="stock-row"
                  onClick={()=>router.push(`/proyecto/${s.proyecto_id}/gestion`)}
                  style={{cursor:'pointer'}}>
                  <div className="stock-name">{s.nombre}</div>
                  <div className="stock-bar-bg">
                    <div className="stock-vend"  style={{width:`${pVend}%`}}/>
                    <div className="stock-disp"  style={{width:`${pDisp}%`}}/>
                  </div>
                  <div className="stock-pct">{fmtP(pDisp)}</div>
                </div>
              )
            })}
            {semaforos.length===0 && <div style={{color:'#4A4F56',fontSize:12,textAlign:'center',padding:20}}>Sin datos de stock</div>}
          </div>
 
          {/* KPIs rápidos */}
          <div className="card">
            <div className="card-title">Indicadores clave de cartera</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                {l:'Proyectos activos (en obra)', v:proyectos.filter(p=>p.estado==='en_obra').length, unit:'proyectos'},
                {l:'Proyectos en planificación',  v:proyectos.filter(p=>p.estado==='planificacion').length, unit:'proyectos'},
                {l:'Con EV cargado',               v:conEV, unit:`de ${proyectos.length}`},
                {l:'m² cartera total',             v:fmtNum(proyectos.reduce((a,p)=>a+(+p.m2_totales||0),0)), unit:'m²'},
                {l:'Costo EV total',               v:fmtM(totalEvCosto), unit:'USD'},
                {l:'Ingreso EV proyectado',        v:fmtM(totalEvIngreso), unit:'USD'},
                {l:'GDV disponible',               v:fmtM(gdv), unit:'USD'},
                {l:'TC valuación vigente',         v:tcActual?fmtTC(tcActual):'No cargado', unit:'ARS/USD'},
              ].map((k,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',
                  padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                  <span style={{fontSize:12,color:'#7C8186'}}>{k.l}</span>
                  <div style={{textAlign:'right'}}>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:600,color:'#E8E9EB'}}>{k.v}</span>
                    <span style={{fontSize:10,color:'#4A4F56',marginLeft:4}}>{k.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
 
        {/* ROW 4: Proyectos sin EV */}
        {proyectos.filter(p=>!p.ev_costo_total_usd).length > 0 && (
          <div className="card" style={{borderColor:'rgba(200,169,110,.15)'}}>
            <div className="card-title" style={{color:'#C8A96E'}}>Proyectos sin EV — pendientes de configurar</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {proyectos.filter(p=>!p.ev_costo_total_usd).map(p=>(
                <button key={p.id}
                  onClick={()=>router.push(`/nuevo-proyecto?id=${p.id}`)}
                  style={{padding:'6px 14px',borderRadius:6,fontSize:12,cursor:'pointer',
                    border:'1px solid rgba(200,169,110,.3)',background:'rgba(200,169,110,.06)',
                    color:'#C8A96E',fontFamily:'inherit',transition:'all .15s'}}>
                  {p.nombre} →
                </button>
              ))}
            </div>
          </div>
        )}
 
      </div>
    </div>
  )
}
