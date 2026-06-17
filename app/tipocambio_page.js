'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const fmtUSD = n => n==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)
const fmtARS = n => n==null?'—':'$'+new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(n)
const fmtM   = n => {if(n==null)return'—';const a=Math.abs(n);if(a>=1e6)return`$${(n/1e6).toFixed(2)}M`;if(a>=1e3)return`$${Math.round(n/1e3)}K`;return`$${Math.round(n)}`}
const fmt2   = n => n==null?'—':new Intl.NumberFormat('es-AR').format(Math.round(n))

const SECTOR_COLOR = {finanzas:{bg:'#E6F1FB',color:'#0C447C'},tecnica:{bg:'#EEEDFE',color:'#3C3489'},obra:{bg:'#FAEEDA',color:'#633806'},comercial:{bg:'#E1F5EE',color:'#085041'}}

const s = {
  page:{minHeight:'100vh',background:'#f8f8f6',fontFamily:'system-ui,sans-serif'},
  nav: {background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'0 1.5rem',height:52,display:'flex',alignItems:'center',justifyContent:'space-between'},
  back:{fontSize:13,color:'#888',background:'none',border:'none',cursor:'pointer'},
  pill:{fontSize:11,fontWeight:500,padding:'2px 9px',borderRadius:20},
  main:{maxWidth:1000,margin:'0 auto',padding:'2rem 1.5rem'},
  h1:  {fontSize:22,fontWeight:500,marginBottom:6},
  sub: {fontSize:13,color:'#888',marginBottom:28},
  card:{background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:12,padding:'1.5rem',marginBottom:20},
  cardTitle:{fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#aaa',marginBottom:16},
  kpiRow:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:24},
  kpi:{background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:12,padding:'1.25rem'},
  kpiLabel:{fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#aaa',marginBottom:8},
  kpiVal:{fontFamily:'monospace',fontSize:26,fontWeight:600,color:'#1a1a18'},
  kpiSub:{fontSize:12,color:'#aaa',marginTop:4},
  simRow:{display:'flex',alignItems:'center',gap:16,marginBottom:8},
  simLabel:{fontSize:13,color:'#555',width:160},
  slider:{flex:1,accentColor:'#1a1a18'},
  simVal:{fontFamily:'monospace',fontWeight:600,fontSize:16,color:'#1a1a18',width:90,textAlign:'right'},
  btnRow:{display:'flex',gap:8,marginBottom:20},
  chip:{padding:'6px 14px',borderRadius:20,border:'0.5px solid #ddd',fontSize:12,cursor:'pointer',background:'#fafafa',color:'#666'},
  formRow:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12},
  label:{fontSize:12,color:'#888',marginBottom:5,display:'block'},
  input:{width:'100%',padding:'9px 12px',fontSize:14,borderRadius:8,border:'0.5px solid #ccc',background:'#fafafa',fontFamily:'monospace'},
  textarea:{width:'100%',padding:'9px 12px',fontSize:13,borderRadius:8,border:'0.5px solid #ccc',background:'#fafafa',resize:'vertical',minHeight:60},
  btn:{padding:'11px 20px',fontSize:13,fontWeight:600,borderRadius:8,border:'none',background:'#1a1a18',color:'#fff',cursor:'pointer'},
  msg_ok:{fontSize:12,color:'#27500A',background:'#EAF3DE',borderRadius:6,padding:'8px 12px',marginTop:10},
  msg_err:{fontSize:12,color:'#A32D2D',background:'#FCEBEB',borderRadius:6,padding:'8px 12px',marginTop:10},
  table:{width:'100%',borderCollapse:'collapse',fontSize:13},
  th:{textAlign:'left',padding:'8px 0',fontSize:11,fontWeight:600,color:'#aaa',borderBottom:'0.5px solid #e0ddd6',textTransform:'uppercase',letterSpacing:'.05em'},
  td:{padding:'10px 0',borderBottom:'0.5px solid #f5f3ef',color:'#444'},
  tdNum:{fontFamily:'monospace',textAlign:'right'},
  histTag:{fontSize:10,padding:'2px 8px',borderRadius:10,fontWeight:500},
}

export default function TipoCambioPage() {
  const router = useRouter()
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [global, setGlobal] = useState(null)
  const [porProyecto, setPorProyecto] = useState([])
  const [historico, setHistorico] = useState([])
  const [simTC, setSimTC] = useState(1405)
  const [nuevoTC, setNuevoTC] = useState('')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function loadAll() {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    if (!perf) { router.push('/login'); return }
    setPerfil(perf)

    const [{ data:g }, { data:pp }, { data:hist }] = await Promise.all([
      supabase.from('v_valuacion_stock_global').select('*').eq('empresa_id', perf.empresa_id).maybeSingle(),
      supabase.from('v_valuacion_stock_por_proyecto').select('*').eq('empresa_id', perf.empresa_id),
      supabase.from('tipos_cambio').select('*').eq('empresa_id', perf.empresa_id).order('fecha', {ascending:false}).limit(20),
    ])
    setGlobal(g)
    setPorProyecto(pp || [])
    setHistorico(hist || [])
    if (g?.tc_valuacion_actual) setSimTC(+g.tc_valuacion_actual)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const puedeEditar = perfil && ['finanzas','admin'].includes(perfil.sector)

  async function actualizarTC(e) {
    e.preventDefault()
    if (!nuevoTC || +nuevoTC <= 0) { setMsg({ok:false,text:'Ingresá un valor de TC válido.'}); return }
    setSaving(true); setMsg(null)
    const { data:{ user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('tipos_cambio').insert({
      empresa_id: perfil.empresa_id,
      fecha: new Date().toISOString().split('T')[0],
      valor: +nuevoTC,
      tipo: 'valuacion',
      nota: nota || 'Actualización manual desde módulo TC',
      creado_por: user.id,
    })
    setSaving(false)
    if (error) { setMsg({ok:false,text:error.message}); return }
    setMsg({ok:true,text:`✅ TC de valuación actualizado a $${nuevoTC}. El inventario se revaluó automáticamente.`})
    setNuevoTC(''); setNota('')
    loadAll()
  }

  if (loading) return <div style={{...s.page,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#aaa',fontSize:14}}>Cargando...</div></div>

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas
  const tcActual = global?.tc_valuacion_actual ? +global.tc_valuacion_actual : 1405
  const valorARS = global?.valor_disponible_ars ? +global.valor_disponible_ars : 0
  const valorSimulado = simTC > 0 ? valorARS / simTC : 0
  const valorActualUSD = global?.valor_disponible_usd_actual ? +global.valor_disponible_usd_actual : 0
  const diffPct = valorActualUSD > 0 ? ((valorSimulado - valorActualUSD) / valorActualUSD) * 100 : 0

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button style={s.back} onClick={()=>router.push('/dashboard')}>← Dashboard</button>
          <span style={{fontSize:14,fontWeight:500}}>Tipo de Cambio</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{...s.pill,background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
          <span style={{fontSize:13,color:'#888'}}>{perfil?.nombre_completo}</span>
        </div>
      </nav>

      <div style={s.main}>
        <div style={s.h1}>Valuación de stock e historial de tipo de cambio</div>
        <div style={s.sub}>TC de valuación vigente: <strong style={{color:'#1a1a18',fontFamily:'monospace'}}>${fmt2(tcActual)}</strong> ARS/USD. Cambiarlo revalúa automáticamente todo el inventario disponible.</div>

        {/* KPIs globales */}
        <div style={s.kpiRow}>
          <div style={s.kpi}>
            <div style={s.kpiLabel}>Stock disponible (USD)</div>
            <div style={s.kpiVal}>{fmtM(valorActualUSD)}</div>
            <div style={s.kpiSub}>{global?.unidades_disponibles || 0} unidades · {fmt2(global?.m2_disponibles)} m²</div>
          </div>
          <div style={s.kpi}>
            <div style={s.kpiLabel}>Stock disponible (ARS)</div>
            <div style={s.kpiVal}>{fmtARS(valorARS)}</div>
            <div style={s.kpiSub}>Valor fijo del pricing original</div>
          </div>
          <div style={s.kpi}>
            <div style={s.kpiLabel}>TC de valuación actual</div>
            <div style={s.kpiVal}>${fmt2(tcActual)}</div>
            <div style={s.kpiSub}>ARS por USD</div>
          </div>
        </div>

        {/* Simulador de TC */}
        <div style={s.card}>
          <div style={s.cardTitle}>Simular valuación con otro tipo de cambio</div>
          <div style={s.simRow}>
            <span style={s.simLabel}>TC simulado</span>
            <input type="range" style={s.slider} min={500} max={3000} step={5} value={simTC} onChange={e=>setSimTC(+e.target.value)}/>
            <span style={s.simVal}>${fmt2(simTC)}</span>
          </div>
          <div style={s.btnRow}>
            {[1000,1200,1405,1600,1800,2000].map(v=>(
              <button key={v} style={{...s.chip, ...(simTC===v?{background:'#1a1a18',color:'#fff',borderColor:'#1a1a18'}:{})}} onClick={()=>setSimTC(v)}>${v}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:20,alignItems:'baseline',marginTop:8}}>
            <div>
              <div style={{fontSize:11,color:'#aaa',marginBottom:2}}>Valor de stock al TC simulado</div>
              <div style={{fontFamily:'monospace',fontSize:24,fontWeight:600,color:'#1a1a18'}}>{fmtM(valorSimulado)}</div>
            </div>
            <div style={{fontSize:13,fontFamily:'monospace',color: diffPct>=0?'#27500A':'#A32D2D'}}>
              {diffPct>=0?'+':''}{diffPct.toFixed(1)}% vs TC actual
            </div>
          </div>
        </div>

        {/* Actualizar TC real */}
        {puedeEditar && (
          <div style={s.card}>
            <div style={s.cardTitle}>Actualizar TC de valuación (Finanzas)</div>
            <form onSubmit={actualizarTC}>
              <div style={s.formRow}>
                <div>
                  <label style={s.label}>Nuevo valor (ARS por USD) *</label>
                  <input style={s.input} type="number" placeholder="Ej: 1450" value={nuevoTC} onChange={e=>setNuevoTC(e.target.value)} required/>
                </div>
                <div>
                  <label style={s.label}>Nota (opcional)</label>
                  <input style={s.input} type="text" placeholder="Ej: ajuste por cotización oficial" value={nota} onChange={e=>setNota(e.target.value)}/>
                </div>
              </div>
              {msg && <div style={msg.ok?s.msg_ok:s.msg_err}>{msg.text}</div>}
              <button style={{...s.btn,marginTop:12}} type="submit" disabled={saving}>
                {saving ? 'Actualizando...' : 'Actualizar TC y revaluar inventario'}
              </button>
            </form>
          </div>
        )}

        {/* Desglose por proyecto */}
        <div style={s.card}>
          <div style={s.cardTitle}>Valuación por proyecto (TC actual: ${fmt2(tcActual)})</div>
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Proyecto</th><th style={{...s.th,textAlign:'right'}}>Unidades disp.</th>
              <th style={{...s.th,textAlign:'right'}}>m² disp.</th><th style={{...s.th,textAlign:'right'}}>Valor ARS</th>
              <th style={{...s.th,textAlign:'right'}}>Valor USD</th>
            </tr></thead>
            <tbody>
              {porProyecto.map(p => (
                <tr key={p.proyecto_id}>
                  <td style={s.td}>{p.proyecto_nombre}</td>
                  <td style={{...s.td,...s.tdNum}}>{p.unidades_disponibles}</td>
                  <td style={{...s.td,...s.tdNum}}>{fmt2(p.m2_disponibles)}</td>
                  <td style={{...s.td,...s.tdNum}}>{fmtARS(p.valor_disponible_ars)}</td>
                  <td style={{...s.td,...s.tdNum,fontWeight:600,color:'#1a1a18'}}>{fmtM(p.valor_disponible_usd_actual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Historial de TC */}
        <div style={s.card}>
          <div style={s.cardTitle}>Historial de tipos de cambio</div>
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>Fecha</th><th style={s.th}>Tipo</th>
              <th style={{...s.th,textAlign:'right'}}>Valor</th><th style={s.th}>Nota</th>
            </tr></thead>
            <tbody>
              {historico.map(h => {
                const tagColor = h.tipo==='valuacion' ? {bg:'#E6F1FB',color:'#0C447C'} : h.tipo==='operacion' ? {bg:'#FAEEDA',color:'#633806'} : {bg:'#f0ede8',color:'#888'}
                return (
                  <tr key={h.id}>
                    <td style={s.td}>{new Date(h.fecha).toLocaleDateString('es-AR')}</td>
                    <td style={s.td}><span style={{...s.histTag,background:tagColor.bg,color:tagColor.color}}>{h.tipo}</span></td>
                    <td style={{...s.td,...s.tdNum}}>${fmt2(h.valor)}</td>
                    <td style={{...s.td,fontSize:12,color:'#aaa'}}>{h.nota || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
