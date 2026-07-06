'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

const fmtM  = n => { if(n==null)return'—'; const a=Math.abs(n),s=n<0?'-':''; if(a>=1e6)return`${s}$${(a/1e6).toFixed(2)}M`; if(a>=1e3)return`${s}$${Math.round(a/1e3)}K`; return`${s}$${Math.round(a)}` }
const fmt2  = n => n==null?'—':new Intl.NumberFormat('es-AR').format(Math.round(n))
const fmtPct= n => n==null?'—':`${Number(n).toFixed(1)}%`

const s = {
  page:  {minHeight:'100vh',background:'#f8f8f6',fontFamily:'system-ui,sans-serif'},
  main:  {maxWidth:1000,margin:'0 auto',padding:'2rem 1.5rem'},
  card:  {background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:12,padding:'1.5rem',marginBottom:20},
  h2:    {fontSize:16,fontWeight:600,marginBottom:16,color:'#1a1a18'},
  label: {fontSize:12,color:'#888',display:'block',marginBottom:5},
  input: {width:'100%',padding:'9px 12px',fontSize:14,borderRadius:8,border:'0.5px solid #ccc',background:'#fafafa',outline:'none',boxSizing:'border-box',fontFamily:'monospace'},
  row2:  {display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14},
  row3:  {display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14},
  btn:   {padding:'11px 24px',fontSize:13,fontWeight:600,borderRadius:8,border:'none',background:'#1a1a18',color:'#fff',cursor:'pointer'},
  msg_ok:{fontSize:12,color:'#27500A',background:'#EAF3DE',borderRadius:6,padding:'8px 12px',marginBottom:12},
  msg_er:{fontSize:12,color:'#A32D2D',background:'#FCEBEB',borderRadius:6,padding:'8px 12px',marginBottom:12},
  tbl:   {width:'100%',borderCollapse:'collapse',fontSize:13},
  th:    {textAlign:'left',padding:'9px 12px',fontSize:10,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#aaa',borderBottom:'0.5px solid #e0ddd6',background:'#fafafa'},
  td:    {padding:'10px 12px',borderBottom:'0.5px solid #f5f3ef',color:'#444'},
  kpi:   {background:'#f8f8f6',border:'0.5px solid #e0ddd6',borderRadius:10,padding:'14px',textAlign:'center'},
  kpiL:  {fontSize:10,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#aaa',marginBottom:6},
  kpiV:  {fontSize:22,fontWeight:600,fontFamily:'monospace',color:'#1a1a18'},
}

export default function CertificadosPage() {
  const { id } = useParams()
  const router  = useRouter()
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)
  const [proyecto, setProyecto] = useState(null)
  const [perfil,   setPerfil]   = useState(null)
  const [historico,setHistorico]= useState([])
  const [flujo,    setFlujo]    = useState([])

  // Formulario
  const [mesNro,    setMesNro]    = useState(1)
  const [fechaMes,  setFechaMes]  = useState('')
  const [pctAvance, setPctAvance] = useState('')
  const [costoReal, setCostoReal] = useState('')
  const [cobros,    setCobros]    = useState('')
  const [notas,     setNotas]     = useState('')

  const load = useCallback(async () => {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setPerfil(perf)

    const [{ data:proy }, { data:hist }, { data:fl }] = await Promise.all([
      supabase.from('proyectos').select('*').eq('id', id).single(),
      supabase.from('avance_obra').select('*').eq('proyecto_id', id).order('mes_numero'),
      supabase.from('v_flujo_fondos_comparado').select('*').eq('proyecto_id', id).order('mes_numero'),
    ])

    setProyecto(proy)
    setHistorico(hist || [])
    setFlujo(fl || [])

    // Sugerir el siguiente mes a cargar
    if (hist && hist.length > 0) {
      const ultimoMes = Math.max(...hist.map(h => h.mes_numero))
      setMesNro(ultimoMes + 1)
    } else {
      setMesNro(1)
    }
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function guardar(e) {
    e.preventDefault()
    if (!pctAvance || !costoReal) { setMsg({ok:false,text:'% avance y costo real son obligatorios.'}); return }
    if (+pctAvance < 0 || +pctAvance > 100) { setMsg({ok:false,text:'El % de avance debe estar entre 0 y 100.'}); return }

    // Verificar que no exista ya ese mes
    const existe = historico.find(h => h.mes_numero === +mesNro)
    if (existe) { setMsg({ok:false,text:`El mes ${mesNro} ya fue cargado. Editá el registro existente.`}); return }

    setSaving(true); setMsg(null)

    const { error } = await supabase.from('avance_obra').insert({
      proyecto_id:       id,
      mes_numero:        +mesNro,
      fecha_carga:       fechaMes || new Date().toISOString().split('T')[0],
      pct_avance_fisico: +pctAvance,
      costo_real_mes:    +costoReal,
      cobros_reales_mes: +cobros || 0,
      notas_financieras: notas || null,
    })

    setSaving(false)
    if (error) { setMsg({ok:false,text:error.message}); return }

    setMsg({ok:true,text:`✅ Avance del mes ${mesNro} cargado. CPI y semáforos actualizados automáticamente.`})
    setPctAvance(''); setCostoReal(''); setCobros(''); setNotas(''); setFechaMes('')
    load()
  }

  if (loading) return <div style={{...s.page,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#aaa',fontSize:14}}>Cargando...</div></div>

  // KPIs calculados del último mes
  const ultimo = historico.length > 0 ? historico[historico.length-1] : null
  const costoAcum = historico.reduce((a,h)=>a+(+h.costo_real_mes||0),0)
  const cobrosAcum = historico.reduce((a,h)=>a+(+h.cobros_reales_mes||0),0)
  const evTecnico = ultimo ? (ultimo.pct_avance_fisico/100) * (+proyecto?.ev_costo_total_usd||0) : 0
  const cpi = costoAcum > 0 ? evTecnico / costoAcum : null
  const pvActual = flujo.find(f => f.mes_numero === ultimo?.mes_numero)?.egreso_proyectado_acum || 0
  const spi = pvActual > 0 ? evTecnico / pvActual : null

  const cpiColor = !cpi ? '#aaa' : cpi >= 0.95 ? '#22c55e' : cpi >= 0.85 ? '#f59e0b' : '#ef4444'
  const spiColor = !spi ? '#aaa' : spi >= 0.90 ? '#22c55e' : spi >= 0.80 ? '#f59e0b' : '#ef4444'

  const SECTOR_COLOR = {finanzas:{bg:'#E6F1FB',color:'#0C447C'},tecnica:{bg:'#EEEDFE',color:'#3C3489'},obra:{bg:'#FAEEDA',color:'#633806'},comercial:{bg:'#E1F5EE',color:'#085041'}}
  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.obra

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={{background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'0 1.5rem',height:52,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push(`/proyecto/${id}`)} style={{fontSize:13,color:'#888',background:'none',border:'none',cursor:'pointer'}}>← {proyecto?.nombre}</button>
          <span style={{fontSize:12,color:'#ddd'}}>|</span>
          <span style={{fontSize:14,fontWeight:500}}>Certificados de avance</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.push(`/proyecto/${id}/gestion`)} style={{fontSize:12,padding:'5px 12px',borderRadius:7,border:'0.5px solid #e0ddd6',background:'#f8f8f6',color:'#555',cursor:'pointer'}}>📊 Panel</button>
          <span style={{fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
        </div>
      </nav>

      <div style={s.main}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:22,fontWeight:600,color:'#1a1a18',marginBottom:4}}>{proyecto?.nombre}</h1>
          <div style={{fontSize:13,color:'#aaa'}}>Presupuesto EV: {fmtM(+proyecto?.ev_costo_total_usd||0)} · Plazo: {proyecto?.plazo_meses} meses · {historico.length} meses cargados</div>
        </div>

        {/* KPIs del estado actual */}
        {historico.length > 0 && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
            {[
              {l:'Avance físico actual', v:fmtPct(ultimo?.pct_avance_fisico), c: +ultimo?.pct_avance_fisico>=50?'#22c55e':'#f59e0b'},
              {l:'CPI (Eficiencia costo)', v:cpi?cpi.toFixed(3):'—', c:cpiColor},
              {l:'SPI (Eficiencia cronograma)', v:spi?spi.toFixed(3):'—', c:spiColor},
              {l:'Costo real acumulado', v:fmtM(costoAcum), c:'#1a1a18'},
              {l:'Cobros reales acumulados', v:fmtM(cobrosAcum), c: cobrosAcum>=costoAcum?'#22c55e':'#f59e0b'},
            ].map((k,i)=>(
              <div key={i} style={s.kpi}>
                <div style={s.kpiL}>{k.l}</div>
                <div style={{...s.kpiV,color:k.c,fontSize:18}}>{k.v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario de carga */}
        <div style={s.card}>
          <h2 style={s.h2}>Cargar avance mensual</h2>
          <form onSubmit={guardar}>
            <div style={s.row3}>
              <div>
                <label style={s.label}>Mes de obra *</label>
                <input style={s.input} type="number" min={1} max={proyecto?.plazo_meses||60}
                  value={mesNro} onChange={e=>setMesNro(+e.target.value)} required/>
                <div style={{fontSize:11,color:'#aaa',marginTop:4}}>
                  {flujo[mesNro-1] ? `Egreso proy.: ${fmtM(flujo[mesNro-1]?.egreso_proyectado_mes)}` : ''}
                </div>
              </div>
              <div>
                <label style={s.label}>Fecha del certificado</label>
                <input style={s.input} type="date" value={fechaMes} onChange={e=>setFechaMes(e.target.value)}/>
              </div>
              <div>
                <label style={s.label}>% Avance físico acumulado *</label>
                <input style={s.input} type="number" min={0} max={100} step={0.1} placeholder="Ej: 45.5"
                  value={pctAvance} onChange={e=>setPctAvance(e.target.value)} required/>
              </div>
            </div>
            <div style={s.row2}>
              <div>
                <label style={s.label}>Costo real del mes (USD) *</label>
                <input style={s.input} type="number" step={0.01} placeholder="Ej: 148500"
                  value={costoReal} onChange={e=>setCostoReal(e.target.value)} required/>
                {flujo[mesNro-1] && (
                  <div style={{fontSize:11,color:'#888',marginTop:4}}>
                    Proyectado EV: {fmtM(flujo[mesNro-1]?.egreso_proyectado_mes)} · 
                    Desvío: <span style={{color:+costoReal>flujo[mesNro-1]?.egreso_proyectado_mes?'#ef4444':'#22c55e',fontWeight:600}}>
                      {costoReal ? fmtM(+costoReal - flujo[mesNro-1]?.egreso_proyectado_mes) : '—'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label style={s.label}>Cobros reales del mes (USD)</label>
                <input style={s.input} type="number" step={0.01} placeholder="Ej: 220000"
                  value={cobros} onChange={e=>setCobros(e.target.value)}/>
                {flujo[mesNro-1] && cobros && (
                  <div style={{fontSize:11,color:'#888',marginTop:4}}>
                    Proyectado EV: {fmtM(flujo[mesNro-1]?.ingreso_proyectado_mes)}
                  </div>
                )}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={s.label}>Notas / Observaciones financieras</label>
              <textarea value={notas} onChange={e=>setNotas(e.target.value)}
                placeholder="Ej: Desvío por lluvia. Proveedor entregó tarde materiales..."
                style={{...s.input,minHeight:60,resize:'vertical',fontFamily:'system-ui,sans-serif'}}/>
            </div>
            {msg && <div style={msg.ok?s.msg_ok:s.msg_er}>{msg.text}</div>}
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <button type="submit" style={s.btn} disabled={saving}>
                {saving ? 'Guardando...' : '💾 Guardar certificado'}
              </button>
              <span style={{fontSize:12,color:'#aaa'}}>
                Al guardar se recalculan automáticamente CPI, SPI y semáforos del proyecto.
              </span>
            </div>
          </form>
        </div>

        {/* Historial de certificados */}
        <div style={s.card}>
          <h2 style={s.h2}>Historial de avance — Presupuestado vs Real</h2>
          {historico.length === 0 ? (
            <div style={{textAlign:'center',padding:'30px',color:'#aaa',fontSize:13}}>Sin certificados cargados todavía.</div>
          ) : (
            <table style={s.tbl}>
              <thead><tr>
                <th style={s.th}>Mes</th>
                <th style={{...s.th,textAlign:'right'}}>% Avance</th>
                <th style={{...s.th,textAlign:'right'}}>Costo proy. (EV)</th>
                <th style={{...s.th,textAlign:'right'}}>Costo real</th>
                <th style={{...s.th,textAlign:'right'}}>Desvío</th>
                <th style={{...s.th,textAlign:'right'}}>Cobros reales</th>
                <th style={{...s.th,textAlign:'right'}}>CPI</th>
                <th style={s.th}>Notas</th>
              </tr></thead>
              <tbody>
                {historico.map(h => {
                  const f = flujo.find(fl => fl.mes_numero === h.mes_numero)
                  const egProy = f?.egreso_proyectado_mes || 0
                  const desvio = (+h.costo_real_mes||0) - egProy
                  const costoAcumHasta = historico.slice(0,historico.indexOf(h)+1).reduce((a,x)=>a+(+x.costo_real_mes||0),0)
                  const evTecH = (h.pct_avance_fisico/100) * (+proyecto?.ev_costo_total_usd||0)
                  const cpiH = costoAcumHasta > 0 ? evTecH / costoAcumHasta : null
                  const cpiC = !cpiH?'#aaa':cpiH>=0.95?'#22c55e':cpiH>=0.85?'#f59e0b':'#ef4444'
                  return (
                    <tr key={h.id}>
                      <td style={s.td}><strong>M{h.mes_numero}</strong> <span style={{fontSize:11,color:'#aaa'}}>{h.fecha_carga?.slice(0,7)}</span></td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace'}}>{fmtPct(h.pct_avance_fisico)}</td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace',color:'#888'}}>{fmtM(egProy)}</td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace'}}>{fmtM(+h.costo_real_mes||0)}</td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace',color:desvio>0?'#ef4444':'#22c55e',fontWeight:600}}>
                        {desvio>0?'+':''}{fmtM(desvio)}
                      </td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace',color:'#22c55e'}}>{h.cobros_reales_mes>0?fmtM(+h.cobros_reales_mes):'—'}</td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600,color:cpiC}}>{cpiH?cpiH.toFixed(3):'—'}</td>
                      <td style={{...s.td,fontSize:11,color:'#888',maxWidth:160,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{h.notas_financieras||'—'}</td>
                    </tr>
                  )
                })}
                {/* Fila totales */}
                <tr style={{background:'#f8f8f6'}}>
                  <td style={{...s.td,fontWeight:600}}>TOTAL</td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{fmtPct(ultimo?.pct_avance_fisico)}</td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',color:'#888',fontWeight:600}}>{fmtM(flujo.reduce((a,f)=>a+(f.egreso_proyectado_mes||0),0))}</td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{fmtM(costoAcum)}</td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600,color:costoAcum>flujo.reduce((a,f)=>a+(f.egreso_proyectado_mes||0),0)?'#ef4444':'#22c55e'}}>
                    {fmtM(costoAcum - flujo.reduce((a,f)=>a+(f.egreso_proyectado_mes||0),0))}
                  </td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600,color:'#22c55e'}}>{fmtM(cobrosAcum)}</td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600,color:cpiColor}}>{cpi?cpi.toFixed(3):'—'}</td>
                  <td style={s.td}/>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
