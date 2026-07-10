'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const fmtM  = n => { if(n==null||n===0)return'—'; const a=Math.abs(n),s=n<0?'-':''; if(a>=1e6)return`${s}$${(a/1e6).toFixed(2)}M`; if(a>=1e3)return`${s}$${Math.round(a/1e3)}K`; return`${s}$${Math.round(a)}` }
const fmt2  = n => n==null?'—':new Intl.NumberFormat('es-AR').format(Math.round(n))
const fmtP  = n => n==null?'—':`${Number(n).toFixed(1)}%`

const SEM = {
  verde:    { dot:'#22c55e', bg:'#052e16', border:'#166534', label:'En control',  icon:'🟢' },
  amarillo: { dot:'#f59e0b', bg:'#1c1400', border:'#854d0e', label:'Atención',    icon:'🟡' },
  rojo:     { dot:'#ef4444', bg:'#1c0a0a', border:'#7f1d1d', label:'Crítico',     icon:'🔴' },
  gris:     { dot:'#6b7280', bg:'#111418', border:'#374151', label:'Sin datos',   icon:'⚪' },
}
const SECTOR_COLOR = {
  finanzas:{bg:'#E6F1FB',color:'#0C447C'}, tecnica:{bg:'#EEEDFE',color:'#3C3489'},
  obra:{bg:'#FAEEDA',color:'#633806'}, comercial:{bg:'#E1F5EE',color:'#085041'},
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;500;600&display=swap');
.db { --bg:#0a0c0e; --s1:#111418; --s2:#161a1f; --bd:#1f2937; --tx:#e8ecef; --dim:#6b7280; --fnt:#4b5563;
  font-family:'Geist',system-ui,sans-serif; background:var(--bg); color:var(--tx); min-height:100vh }
.db-nav { background:#0a0c0e; border-bottom:1px solid var(--bd); padding:0 2rem; height:54px;
  display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10 }
.db-brand { display:flex; align-items:center; gap:10px }
.db-logo { width:30px; height:30px; background:#fff; border-radius:7px; display:flex; align-items:center; justify-content:center }
.db-logo span { color:#0a0c0e; font-size:15px; font-weight:800 }
.db-brand-name { font-size:14px; font-weight:600 }
.db-brand-sub { font-size:10px; color:var(--dim) }
.db-main { max-width:1400px; margin:0 auto; padding:2rem 1.5rem }
.db-head { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:14px }
.db-h1 { font-size:28px; font-weight:600; letter-spacing:-.02em; margin:0 0 4px }
.db-sub { font-size:13px; color:var(--dim) }
.db-btns { display:flex; gap:10px }
.db-btn-pri { display:flex; align-items:center; gap:8px; padding:10px 20px; background:#fff; color:#0a0c0e;
  border:none; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit }
.db-btn-sec { display:flex; align-items:center; gap:8px; padding:10px 18px; background:var(--s1); color:var(--tx);
  border:1px solid var(--bd); border-radius:9px; font-size:13px; cursor:pointer; font-family:inherit }
.db-kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:24px }
@media(max-width:1100px){ .db-kpis { grid-template-columns:repeat(3,1fr) } }
@media(max-width:700px){ .db-kpis { grid-template-columns:1fr 1fr } }
.db-kpi { background:var(--s1); border:1px solid var(--bd); border-radius:12px; padding:16px }
.db-kpi-l { font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--fnt); margin-bottom:8px }
.db-kpi-v { font-family:'Geist Mono',monospace; font-size:22px; font-weight:600; line-height:1; margin-bottom:4px }
.db-kpi-s { font-size:11px; color:var(--dim) }
.db-section { font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--fnt); margin-bottom:14px; margin-top:28px }
.db-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; margin-bottom:28px }
.db-pcard { background:var(--s1); border:1px solid var(--bd); border-radius:12px; padding:18px; cursor:pointer; transition:all .15s }
.db-pcard:hover { border-color:#374151; box-shadow:0 4px 20px rgba(0,0,0,.3) }
.db-pcard-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px }
.db-pcard-name { font-size:15px; font-weight:600; margin-bottom:3px }
.db-pcard-desc { font-size:12px; color:var(--dim) }
.db-sem-badge { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:600;
  padding:3px 10px; border-radius:20px; border:1px solid; white-space:nowrap; flex-shrink:0 }
.db-sem-dot { width:6px; height:6px; border-radius:50%; animation:db-pulse 2.4s ease-out infinite }
@keyframes db-pulse { 0%{opacity:.5;transform:scale(.6)} 70%{opacity:0;transform:scale(1.8)} 100%{opacity:0} }
.db-pcard-metrics { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:14px }
.db-metric { display:flex; flex-direction:column; gap:2px }
.db-metric-l { font-size:10px; color:var(--fnt); text-transform:uppercase; letter-spacing:.06em }
.db-metric-v { font-family:'Geist Mono',monospace; font-size:14px; font-weight:600 }
.db-pcard-bar { background:var(--s2); border-radius:6px; height:4px; overflow:hidden; margin-bottom:12px }
.db-pcard-bar-fill { height:100%; border-radius:6px; transition:width .5s }
.db-pcard-btns { display:flex; gap:8px }
.db-pcard-btn { flex:1; padding:8px; font-size:12px; font-weight:500; border-radius:7px; border:1px solid var(--bd);
  background:transparent; color:var(--tx); cursor:pointer; font-family:inherit; transition:all .15s }
.db-pcard-btn:hover { background:var(--s2) }
.db-pcard-btn.pri { background:#fff; color:#0a0c0e; border-color:#fff; font-weight:600 }
.db-pcard-btn.pri:hover { background:#e5e7eb }
.db-sinev { border-color:#374151; opacity:.7 }
.db-alert { background:#1c0a0a; border:1px solid #7f1d1d; border-radius:10px; padding:12px 16px;
  font-size:12px; color:#fca5a5; margin-bottom:20px; display:flex; gap:10px; align-items:flex-start }
.db-chart-wrap { background:var(--s1); border:1px solid var(--bd); border-radius:12px; padding:20px; margin-bottom:20px }
.db-chart-title { font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--fnt); margin-bottom:16px }
.db-sem-table { background:var(--s1); border:1px solid var(--bd); border-radius:12px; overflow:auto; margin-bottom:20px }
.db-sem-tbl { width:100%; border-collapse:collapse; font-size:13px }
.db-sem-tbl th { font-size:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--fnt);
  padding:12px 14px; border-bottom:1px solid var(--bd); background:var(--s2); text-align:left; white-space:nowrap }
.db-sem-tbl th.r,.db-sem-tbl td.r { text-align:right }
.db-sem-tbl td { padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.04); color:var(--tx) }
.db-sem-tbl tr:last-child td { border-bottom:none }
.db-sem-tbl tr { cursor:pointer; transition:background .1s }
.db-sem-tbl tr:hover td { background:rgba(255,255,255,.02) }
.db-mono { font-family:'Geist Mono',monospace }
`

export default function Dashboard() {
  const router = useRouter()
  const chartRef = useRef(null)
  const chartInst = useRef(null)
  const [perfil,    setPerfil]    = useState(null)
  const [proyectos, setProyectos] = useState([])
  const [semaforos, setSemaforos] = useState([])
  const [flujoConsolidado, setFlujoConsolidado] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [busqueda,  setBusqueda]  = useState('')

  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      if (!perf) { await supabase.auth.signOut(); router.push('/login'); return }
      setPerfil(perf)

      const [{ data:projs }, { data:sems }, { data:flujo }] = await Promise.all([
        supabase.from('proyectos').select('*').eq('empresa_id', perf.empresa_id).order('created_at', {ascending:false}),
        supabase.from('v_semaforos_cartera').select('*').eq('empresa_id', perf.empresa_id),
        // Flujo consolidado: suma de todos los proyectos mes a mes (próximos 18 meses)
        supabase.rpc('get_flujo_consolidado', { p_empresa_id: perf.empresa_id, p_meses: 18 }).catch(() => ({ data: [] })),
      ])

      setProyectos(projs || [])
      setSemaforos(sems || [])

      // Calcular flujo consolidado manualmente desde flujo_proyectado
      const { data:flujoProy } = await supabase
        .from('flujo_proyectado')
        .select('mes_numero, costo_planificado, ingreso_proyectado, saldo_mes, proyecto_id')
        .in('proyecto_id', (projs||[]).map(p=>p.id))
        .order('mes_numero')

      if (flujoProy) {
        const consolidated = {}
        flujoProy.forEach(f => {
          if (!consolidated[f.mes_numero]) consolidated[f.mes_numero] = { mes:f.mes_numero, egresos:0, ingresos:0 }
          consolidated[f.mes_numero].egresos  += +f.costo_planificado
          consolidated[f.mes_numero].ingresos += +f.ingreso_proyectado
        })
        setFlujoConsolidado(Object.values(consolidated).slice(0, 18))
      }

      setLoading(false)
    }
    load()
  }, [])

  // Gráfico flujo consolidado
  useEffect(() => {
    if (!flujoConsolidado.length || !chartRef.current) return
    import('chart.js/auto').then(({ default: Chart }) => {
      if (chartInst.current) chartInst.current.destroy()
      const labels = flujoConsolidado.map(f => `M${f.mes}`)
      chartInst.current = new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label:'Egresos proyectados', data: flujoConsolidado.map(f => -f.egresos),
              backgroundColor:'rgba(239,68,68,.35)', borderColor:'#ef4444', borderWidth:1, stack:'a' },
            { label:'Ingresos proyectados', data: flujoConsolidado.map(f => f.ingresos),
              backgroundColor:'rgba(34,197,94,.35)', borderColor:'#22c55e', borderWidth:1, stack:'b' },
          ]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ position:'bottom', labels:{ color:'#6b7280', font:{size:10}, boxWidth:10 } },
            tooltip:{ callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${fmtM(Math.abs(ctx.raw))}` } } },
          scales:{
            x:{ ticks:{color:'#4b5563',font:{size:10}}, grid:{color:'#1f2937'} },
            y:{ ticks:{color:'#4b5563',font:{size:10},callback:v=>fmtM(Math.abs(v))}, grid:{color:'#1f2937'} }
          }
        }
      })
    })
    return () => chartInst.current?.destroy()
  }, [flujoConsolidado])

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0a0c0e',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{color:'#22c55e',fontSize:13,fontFamily:'monospace'}}>Cargando panel...</div>
    </div>
  )

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas

  // KPIs empresa
  const totalM2       = proyectos.reduce((a,p)=>a+(+p.m2_totales||0), 0)
  const totalEvCosto  = proyectos.reduce((a,p)=>a+(+p.ev_costo_total_usd||0), 0)
  const totalEvIngreso= proyectos.reduce((a,p)=>a+(+p.ev_ingreso_total_usd||0), 0)
  const margenPond    = totalEvIngreso > 0 ? ((totalEvIngreso - totalEvCosto) / totalEvIngreso) * 100 : null
  const conEV         = proyectos.filter(p=>p.ev_costo_total_usd).length
  const enRiesgo      = semaforos.filter(s=>s.semaforo==='rojo').length
  const costoRealAcum = semaforos.reduce((a,s)=>a+(+s.costo_real_acum||0), 0)

  // GDV: stock disponible × precio estimado (aproximado con EV)
  const gdv = semaforos.reduce((a,s) => {
    if (!s.ev_ingreso_total_usd || !s.unidades_total) return a
    const pctDisp = s.unidades_total > 0 ? (s.unidades_total - (s.unidades_no_disponibles||0)) / s.unidades_total : 0
    return a + (+s.ev_ingreso_total_usd * pctDisp)
  }, 0)

  const filtrados = proyectos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  const activos   = filtrados.filter(p => p.estado === 'en_obra')
  const planif    = filtrados.filter(p => p.estado === 'planificacion')
  const otros     = filtrados.filter(p => !['en_obra','planificacion'].includes(p.estado))

  function getSem(proyId) {
    return semaforos.find(s => s.proyecto_id === proyId) || null
  }

  function ProyectoCard({ p }) {
    const sem = getSem(p.id)
    const tieneEV = !!p.ev_costo_total_usd
    const semStyle = SEM[sem?.semaforo || (tieneEV ? 'gris' : 'gris')]
    const cpi = sem?.cpi_actual

    return (
      <div className={`db-pcard ${!tieneEV?'db-sinev':''}`}>
        <div className="db-pcard-top">
          <div>
            <div className="db-pcard-name">{p.nombre}</div>
            {p.descripcion && <div className="db-pcard-desc">{p.descripcion}</div>}
          </div>
          <div className="db-sem-badge" style={{background:semStyle.bg, borderColor:semStyle.border, color:semStyle.dot}}>
            <div className="db-sem-dot" style={{background:semStyle.dot}}/>
            {semStyle.label}
          </div>
        </div>

        {tieneEV ? (
          <>
            <div className="db-pcard-metrics">
              <div className="db-metric">
                <span className="db-metric-l">CPI</span>
                <span className="db-metric-v" style={{color: !cpi?'#6b7280':cpi>=0.95?'#22c55e':cpi>=0.85?'#f59e0b':'#ef4444'}}>
                  {cpi ? cpi.toFixed(2) : '—'}
                </span>
              </div>
              <div className="db-metric">
                <span className="db-metric-l">Avance</span>
                <span className="db-metric-v">{sem?.pct_avance_fisico!=null?fmtP(sem.pct_avance_fisico):'—'}</span>
              </div>
              <div className="db-metric">
                <span className="db-metric-l">% Vendido</span>
                <span className="db-metric-v" style={{color:sem?.pct_m2_vendidos>=50?'#22c55e':'#f59e0b'}}>
                  {sem?.pct_m2_vendidos!=null?fmtP(sem.pct_m2_vendidos):'—'}
                </span>
              </div>
              <div className="db-metric">
                <span className="db-metric-l">EAC</span>
                <span className="db-metric-v">{fmtM(sem?.eac)}</span>
              </div>
            </div>
            {sem?.pct_avance_fisico != null && (
              <div className="db-pcard-bar">
                <div className="db-pcard-bar-fill" style={{
                  width:`${Math.min(100,sem.pct_avance_fisico)}%`,
                  background: cpi>=0.95?'#22c55e':cpi>=0.85?'#f59e0b':'#ef4444'
                }}/>
              </div>
            )}
          </>
        ) : (
          <div style={{fontSize:12,color:'#6b7280',padding:'8px 0 12px',fontStyle:'italic'}}>
            Sin EV cargado — hacé clic para configurarlo
          </div>
        )}

        <div className="db-pcard-btns">
          {tieneEV ? (
            <button className="db-pcard-btn pri" onClick={()=>router.push(`/proyecto/${p.id}/gestion`)}>
              📊 Panel
            </button>
          ) : (
            <button className="db-pcard-btn pri" onClick={()=>router.push(`/nuevo-proyecto?id=${p.id}`)}>
              📊 Cargar EV
            </button>
          )}
          <button className="db-pcard-btn" onClick={()=>router.push(`/proyecto/${p.id}`)}>
            → Ver proyecto
          </button>
        </div>
      </div>
    )
  }

  function Seccion({ titulo, lista }) {
    if (!lista.length) return null
    return (
      <>
        <div className="db-section">{titulo} <span style={{color:'#374151'}}>({lista.length})</span></div>
        <div className="db-grid">{lista.map(p => <ProyectoCard key={p.id} p={p}/>)}</div>
      </>
    )
  }

  return (
    <div className="db">
      <style>{STYLES}</style>

      {/* Navbar */}
      <nav className="db-nav">
        <div className="db-brand">
          <div className="db-logo"><span>L</span></div>
          <div>
            <div className="db-brand-name">Panel-Link</div>
            <div className="db-brand-sub">Link Inversiones · SIGMA</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button className="db-btn-sec" onClick={()=>router.push('/tipo-cambio')}>💱 Tipo de cambio</button>
          <button className="db-btn-sec" onClick={()=>router.push('/simulador')}>📊 Simulador EV</button>
          <span style={{fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
          <span style={{fontSize:13,color:'#6b7280'}}>{perfil?.nombre_completo}</span>
          <button onClick={async()=>{await supabase.auth.signOut();router.push('/login')}}
            style={{fontSize:12,color:'#4b5563',background:'none',border:'none',cursor:'pointer'}}>Salir</button>
        </div>
      </nav>

      <div className="db-main">

        {/* Header */}
        <div className="db-head">
          <div>
            <h1 className="db-h1">Control de Gestión</h1>
            <div className="db-sub">{proyectos.length} proyectos · {conEV} con EV cargado · {new Date().toLocaleDateString('es-AR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
          </div>
          <div className="db-btns">
            <button className="db-btn-pri" onClick={()=>router.push('/nuevo-proyecto')}>
              <span style={{fontSize:18,lineHeight:1}}>+</span> Nuevo proyecto
            </button>
          </div>
        </div>

        {/* Alertas */}
        {enRiesgo > 0 && (
          <div className="db-alert">
            <span style={{fontSize:16}}>⚠️</span>
            <div>
              <strong>{enRiesgo} proyecto{enRiesgo>1?'s':''} en estado crítico</strong> — CPI por debajo de 0.85 o descalce comercial superior al 20%. Revisá el panel financiero de cada uno.
              {semaforos.filter(s=>s.semaforo==='rojo').map(s=>(
                <button key={s.proyecto_id} onClick={()=>router.push(`/proyecto/${s.proyecto_id}/gestion`)}
                  style={{marginLeft:12,fontSize:11,color:'#fca5a5',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>
                  → {s.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KPIs globales */}
        <div className="db-kpis">
          {[
            { l:'GDV Cartera', v:fmtM(gdv), s:'Gross Development Value disponible', c:'#22c55e' },
            { l:'Costo EV consolidado', v:fmtM(totalEvCosto), s:`${conEV} proyectos con EV`, c:'#e8ecef' },
            { l:'Costo real acumulado', v:fmtM(costoRealAcum), s:'Suma de todos los proyectos', c:'#e8ecef' },
            { l:'Margen EV ponderado', v:margenPond?fmtP(margenPond):'—', s:'Sobre precio de venta', c:margenPond>=20?'#22c55e':margenPond>=15?'#f59e0b':'#ef4444' },
            { l:'Proyectos en riesgo', v:String(enRiesgo), s:enRiesgo===0?'Todos en control':'Requieren atención', c:enRiesgo===0?'#22c55e':'#ef4444' },
          ].map((k,i)=>(
            <div key={i} className="db-kpi">
              <div className="db-kpi-l">{k.l}</div>
              <div className="db-kpi-v" style={{color:k.c}}>{k.v}</div>
              <div className="db-kpi-s">{k.s}</div>
            </div>
          ))}
        </div>

        {/* Flujo consolidado */}
        {flujoConsolidado.length > 0 && (
          <div className="db-chart-wrap">
            <div className="db-chart-title">Flujo de fondos proyectado consolidado — todos los proyectos (próximos 18 meses)</div>
            <div style={{height:220}}><canvas ref={chartRef}/></div>
          </div>
        )}

        {/* Tabla semáforo */}
        {semaforos.length > 0 && (
          <div className="db-sem-table">
            <table className="db-sem-tbl">
              <thead><tr>
                <th>Proyecto</th><th className="r">Avance</th><th className="r">% Vendido</th>
                <th className="r">Descalce</th><th className="r">CPI</th><th className="r">EAC</th>
                <th className="r">Costo real acum.</th><th className="r">Margen real</th><th>Estado</th>
              </tr></thead>
              <tbody>
                {semaforos.map(s => {
                  const ss = SEM[s.semaforo||'gris']
                  const cpiC = !s.cpi_actual?'#6b7280':s.cpi_actual>=0.95?'#22c55e':s.cpi_actual>=0.85?'#f59e0b':'#ef4444'
                  const descalce = (s.pct_avance_fisico||0) - (s.pct_m2_vendidos||0)
                  const descC = Math.abs(descalce)<=10?'#22c55e':Math.abs(descalce)<=20?'#f59e0b':'#ef4444'
                  return (
                    <tr key={s.proyecto_id} onClick={()=>router.push(`/proyecto/${s.proyecto_id}/gestion`)}>
                      <td><strong>{s.nombre}</strong></td>
                      <td className="r db-mono">{s.pct_avance_fisico!=null?fmtP(s.pct_avance_fisico):'—'}</td>
                      <td className="r db-mono" style={{color:'#22c55e'}}>{s.pct_m2_vendidos!=null?fmtP(s.pct_m2_vendidos):'—'}</td>
                      <td className="r db-mono" style={{color:descC}}>{s.pct_avance_fisico!=null?`${descalce>0?'+':''}${descalce.toFixed(1)}%`:'—'}</td>
                      <td className="r db-mono" style={{color:cpiC,fontWeight:600}}>{s.cpi_actual?s.cpi_actual.toFixed(3):'—'}</td>
                      <td className="r db-mono">{fmtM(s.eac)}</td>
                      <td className="r db-mono">{fmtM(s.costo_real_acum)}</td>
                      <td className="r db-mono" style={{color:s.margen_real_pct>=20?'#22c55e':s.margen_real_pct>=10?'#f59e0b':'#6b7280'}}>
                        {s.margen_real_pct!=null?fmtP(s.margen_real_pct):'—'}
                      </td>
                      <td><span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,
                        padding:'3px 10px',borderRadius:20,width:'fit-content',
                        background:ss.bg,border:`1px solid ${ss.border}`,color:ss.dot}}>
                        <span style={{width:6,height:6,borderRadius:'50%',background:ss.dot,display:'inline-block',flexShrink:0}}/>
                        {ss.label}
                      </span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Buscador + Grid de proyectos */}
        <div style={{display:'flex',gap:10,marginBottom:20,alignItems:'center'}}>
          <input placeholder="Buscar proyecto..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}
            style={{padding:'8px 14px',borderRadius:8,border:'1px solid #1f2937',background:'#111418',
              color:'#e8ecef',fontSize:13,width:220,outline:'none',fontFamily:'inherit'}}/>
          <span style={{fontSize:12,color:'#4b5563'}}>{filtrados.length} proyectos</span>
        </div>

        <Seccion titulo="En obra" lista={activos}/>
        <Seccion titulo="Planificación" lista={planif}/>
        <Seccion titulo="Otros" lista={otros}/>

        {filtrados.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#4b5563'}}>
            <div style={{fontSize:36,marginBottom:12}}>📭</div>
            <div style={{fontSize:15,color:'#6b7280'}}>No hay proyectos con ese nombre.</div>
          </div>
        )}
      </div>
    </div>
  )
}
