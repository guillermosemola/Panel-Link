'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const fmt2  = n => n==null?'—':new Intl.NumberFormat('es-AR').format(Math.round(n))
const fmtM  = n => { if(n==null||n===0)return'—'; const a=Math.abs(n),s=n<0?'-':''; if(a>=1e6)return`${s}$${(a/1e6).toFixed(2)}M`; if(a>=1e3)return`${s}$${Math.round(a/1e3)}K`; return`${s}$${Math.round(a)}` }
const fmtTC = n => n==null?'—':`$${new Intl.NumberFormat('es-AR').format(Math.round(n))}`
const fmtP  = n => n==null?'—':`${Number(n).toFixed(1)}%`

const SECTOR_COLOR = {
  finanzas:{bg:'#E6F1FB',color:'#0C447C'}, tecnica:{bg:'#EEEDFE',color:'#3C3489'},
  obra:{bg:'#FAEEDA',color:'#633806'}, comercial:{bg:'#E1F5EE',color:'#085041'},
}

const s = {
  page:  {minHeight:'100vh',background:'#f8f8f6',fontFamily:'system-ui,sans-serif'},
  main:  {maxWidth:1100,margin:'0 auto',padding:'2rem 1.5rem'},
  card:  {background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:12,padding:'1.5rem',marginBottom:16},
  h2:    {fontSize:15,fontWeight:600,color:'#1a1a18',marginBottom:14},
  label: {fontSize:12,color:'#888',display:'block',marginBottom:5,fontWeight:500},
  input: {width:'100%',padding:'9px 12px',fontSize:14,borderRadius:8,border:'0.5px solid #ccc',
    background:'#fafafa',outline:'none',boxSizing:'border-box',fontFamily:'monospace'},
  btn:   {padding:'10px 22px',fontSize:13,fontWeight:600,borderRadius:8,border:'none',
    background:'#1a1a18',color:'#fff',cursor:'pointer'},
  btnSm: {padding:'6px 14px',fontSize:12,borderRadius:7,border:'0.5px solid #ddd',
    background:'#fff',color:'#555',cursor:'pointer'},
  msg_ok:{fontSize:12,color:'#27500A',background:'#EAF3DE',borderRadius:7,padding:'9px 13px',marginBottom:12},
  msg_er:{fontSize:12,color:'#A32D2D',background:'#FCEBEB',borderRadius:7,padding:'9px 13px',marginBottom:12},
  tbl:   {width:'100%',borderCollapse:'collapse',fontSize:13},
  th:    {textAlign:'left',padding:'9px 12px',fontSize:10,fontWeight:600,letterSpacing:'.08em',
    textTransform:'uppercase',color:'#aaa',borderBottom:'0.5px solid #e0ddd6',background:'#fafafa',whiteSpace:'nowrap'},
  td:    {padding:'10px 12px',borderBottom:'0.5px solid #f5f3ef',color:'#444',verticalAlign:'middle'},
  kpi:   {background:'#f8f8f6',border:'0.5px solid #e0ddd6',borderRadius:10,padding:'16px',textAlign:'center'},
  kpiL:  {fontSize:10,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#aaa',marginBottom:6},
  kpiV:  {fontSize:20,fontWeight:600,fontFamily:'monospace',color:'#1a1a18'},
  kpiS:  {fontSize:11,color:'#aaa',marginTop:3},
}

export default function TipoCambioPage() {
  const router = useRouter()
  const [perfil,    setPerfil]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState(null)
  const [historial, setHistorial] = useState([])
  const [valuacion, setValuacion] = useState([])
  const [slider,    setSlider]    = useState(1405)

  // Formulario nuevo TC
  const [fecha,     setFecha]     = useState(new Date().toISOString().split('T')[0])
  const [valor,     setValor]     = useState('')
  const [tipo,      setTipo]      = useState('valuacion')
  const [notas,     setNotas]     = useState('')

  const load = useCallback(async () => {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    if (!perf) { router.push('/login'); return }
    setPerfil(perf)

    const [{ data:hist }, { data:val }] = await Promise.all([
      supabase.from('tipos_cambio').select('*')
        .eq('empresa_id', perf.empresa_id)
        .order('fecha', {ascending:false})
        .limit(36),
      supabase.from('v_valuacion_stock_por_proyecto').select('*')
        .eq('empresa_id', perf.empresa_id),
    ])

    setHistorial(hist || [])
    setValuacion(val || [])

    // Setear slider con TC de valuación actual
    const tcActual = (hist||[]).find(h=>h.tipo==='valuacion')
    if (tcActual) setSlider(tcActual.valor)

    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function guardarTC(e) {
    e.preventDefault()
    if (!valor || +valor <= 0) { setMsg({ok:false,text:'Ingresá un valor de TC válido.'}); return }
    setSaving(true); setMsg(null)

    const { error } = await supabase.from('tipos_cambio').insert({
      empresa_id:    perfil.empresa_id,
      fecha:         fecha,
      valor:         +valor,
      tipo:          tipo,
      cargado_por:   perfil.id,
      notas:         notas.trim() || null,
    })

    setSaving(false)
    if (error) { setMsg({ok:false,text:error.message}); return }
    setMsg({ok:true,text:`✅ TC ${tipo} de $${fmt2(+valor)} cargado para el ${new Date(fecha+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})}.`})
    setValor(''); setNotas('')
    load()
  }

  if (loading) return (
    <div style={{...s.page,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'#aaa',fontSize:14}}>Cargando...</div>
    </div>
  )

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas
  const tcActual = historial.find(h=>h.tipo==='valuacion')
  const tcAnterior = historial.filter(h=>h.tipo==='valuacion')[1]
  const variacion = tcActual && tcAnterior ? ((tcActual.valor - tcAnterior.valor) / tcAnterior.valor) * 100 : null

  // Valuación total con TC actual y con slider
  const totalUSD   = valuacion.reduce((a,v)=>a+(+v.valor_disponible_usd_actual||0), 0)
  const totalARS   = totalUSD * (tcActual?.valor || slider)
  const totalSimul = totalUSD * slider

  const puedeCargar = ['finanzas','admin'].includes(perfil?.sector)

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={{background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'0 1.5rem',
        height:52,display:'flex',alignItems:'center',justifyContent:'space-between',
        position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push('/dashboard')}
            style={{fontSize:13,color:'#888',background:'none',border:'none',cursor:'pointer'}}>
            ← Dashboard
          </button>
          <span style={{fontSize:12,color:'#ddd'}}>|</span>
          <span style={{fontSize:14,fontWeight:500}}>Tipo de cambio</span>
        </div>
        <span style={{fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,
          background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
      </nav>

      <div style={s.main}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:22,fontWeight:600,color:'#1a1a18',marginBottom:4}}>Tipo de cambio</h1>
          <div style={{fontSize:13,color:'#aaa'}}>Historial de cotizaciones y valuación del stock disponible</div>
        </div>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          <div style={s.kpi}>
            <div style={s.kpiL}>TC Valuación actual</div>
            <div style={{...s.kpiV,color:'#1a1a18'}}>{tcActual?fmtTC(tcActual.valor):'—'}</div>
            <div style={s.kpiS}>{tcActual?new Date(tcActual.fecha+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'}):'Sin datos'}</div>
          </div>
          <div style={s.kpi}>
            <div style={s.kpiL}>Variación vs anterior</div>
            <div style={{...s.kpiV,color:variacion==null?'#aaa':variacion>=0?'#ef4444':'#22c55e'}}>
              {variacion!=null?`${variacion>=0?'+':''}${variacion.toFixed(1)}%`:'—'}
            </div>
            <div style={s.kpiS}>{tcAnterior?fmtTC(tcAnterior.valor)+' anterior':'Sin histórico'}</div>
          </div>
          <div style={s.kpi}>
            <div style={s.kpiL}>Stock disponible (USD)</div>
            <div style={{...s.kpiV,color:'#0C447C'}}>{fmtM(totalUSD)}</div>
            <div style={s.kpiS}>{valuacion.length} proyectos con stock</div>
          </div>
          <div style={s.kpi}>
            <div style={s.kpiL}>Stock disponible (ARS)</div>
            <div style={{...s.kpiV,color:'#633806'}}>{fmtM(totalARS)}</div>
            <div style={s.kpiS}>Al TC de valuación actual</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

          {/* Simulador TC */}
          <div style={s.card}>
            <div style={s.h2}>💱 Simulador de impacto</div>
            <div style={{fontSize:12,color:'#888',marginBottom:16}}>
              Mové el slider para ver cómo cambia la valuación del stock ante variaciones del TC.
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:12,color:'#888'}}>TC simulado</span>
              <span style={{fontFamily:'monospace',fontWeight:600,fontSize:16,color:'#1a1a18'}}>{fmtTC(slider)}</span>
            </div>
            <input type="range" min={800} max={3000} step={5} value={slider}
              onChange={e=>setSlider(+e.target.value)}
              style={{width:'100%',accentColor:'#1a1a18',cursor:'pointer',marginBottom:16}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              {[
                {l:'Stock en USD',    v:fmtM(totalUSD),    c:'#0C447C'},
                {l:'Stock en ARS',    v:fmtM(totalSimul),  c:'#633806'},
                {l:'TC actual',       v:fmtTC(tcActual?.valor), c:'#888'},
                {l:'Diferencia',      v:fmtM(totalSimul - totalARS), c:totalSimul>totalARS?'#22c55e':'#ef4444'},
              ].map((k,i)=>(
                <div key={i} style={{background:'#f8f8f6',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:10,color:'#aaa',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4}}>{k.l}</div>
                  <div style={{fontFamily:'monospace',fontSize:14,fontWeight:600,color:k.c}}>{k.v}</div>
                </div>
              ))}
            </div>
            {tcActual && (
              <div style={{fontSize:12,color:'#888',background:'#f8f8f6',borderRadius:8,padding:'10px 12px'}}>
                {slider > tcActual.valor
                  ? `📈 Con TC ${fmtTC(slider)}, el stock vale ${fmtP((slider/tcActual.valor-1)*100)} más en ARS`
                  : slider < tcActual.valor
                  ? `📉 Con TC ${fmtTC(slider)}, el stock vale ${fmtP((1-slider/tcActual.valor)*100)} menos en ARS`
                  : '→ TC igual al actual'
                }
              </div>
            )}
          </div>

          {/* Cargar nuevo TC */}
          <div style={s.card}>
            <div style={s.h2}>📥 Cargar nuevo tipo de cambio</div>
            {!puedeCargar ? (
              <div style={{fontSize:13,color:'#888',fontStyle:'italic'}}>
                Solo Finanzas y Admin pueden cargar nuevos tipos de cambio.
              </div>
            ) : (
              <form onSubmit={guardarTC}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                  <div>
                    <label style={s.label}>Fecha</label>
                    <input style={s.input} type="date" value={fecha} onChange={e=>setFecha(e.target.value)} required/>
                  </div>
                  <div>
                    <label style={s.label}>Valor (ARS por USD)</label>
                    <input style={s.input} type="number" value={valor} onChange={e=>setValor(e.target.value)}
                      placeholder="Ej: 1450" step="0.01" required/>
                  </div>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={s.label}>Tipo de cotización</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                    {[
                      ['valuacion','📊 Valuación','Para revaluar el stock'],
                      ['operacion','💼 Operación','Se congela en ventas'],
                      ['referencia','📰 Referencia','Solo informativo'],
                    ].map(([val,label,desc])=>(
                      <button key={val} type="button" onClick={()=>setTipo(val)}
                        style={{padding:'8px',borderRadius:8,fontSize:12,cursor:'pointer',textAlign:'left',
                          border:tipo===val?'1.5px solid #1a1a18':'0.5px solid #ddd',
                          background:tipo===val?'#1a1a18':'#fff',
                          color:tipo===val?'#fff':'#555'}}>
                        <div style={{fontWeight:600,marginBottom:2}}>{label}</div>
                        <div style={{fontSize:10,opacity:.7}}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={s.label}>Notas (opcional)</label>
                  <input style={s.input} value={notas} onChange={e=>setNotas(e.target.value)}
                    placeholder="Ej: Dólar MEP cierre del día, fuente Rava"/>
                </div>
                {msg && <div style={msg.ok?s.msg_ok:s.msg_er}>{msg.text}</div>}
                <button type="submit" style={s.btn} disabled={saving}>
                  {saving?'Guardando...':'💾 Guardar TC'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Valuación por proyecto */}
        {valuacion.length > 0 && (
          <div style={s.card}>
            <div style={s.h2}>🏢 Valuación de stock por proyecto</div>
            <table style={s.tbl}>
              <thead><tr>
                <th style={s.th}>Proyecto</th>
                <th style={{...s.th,textAlign:'right'}}>Uds. disponibles</th>
                <th style={{...s.th,textAlign:'right'}}>m² disponibles</th>
                <th style={{...s.th,textAlign:'right'}}>Valor USD</th>
                <th style={{...s.th,textAlign:'right'}}>Valor ARS (TC actual)</th>
                <th style={{...s.th,textAlign:'right'}}>Valor ARS (TC simulado)</th>
                <th style={{...s.th,textAlign:'right'}}>Diferencia</th>
              </tr></thead>
              <tbody>
                {valuacion.map((v,i)=>{
                  const arsActual = (+v.valor_disponible_usd_actual||0) * (tcActual?.valor||slider)
                  const arsSimul  = (+v.valor_disponible_usd_actual||0) * slider
                  const diff      = arsSimul - arsActual
                  return (
                    <tr key={i} style={{cursor:'pointer'}}
                      onClick={()=>router.push(`/proyecto/${v.proyecto_id}`)}>
                      <td style={{...s.td,fontWeight:600}}>{v.proyecto_nombre}</td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace'}}>{fmt2(v.unidades_disponibles)}</td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace'}}>{fmt2(v.m2_disponibles)} m²</td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace',color:'#0C447C',fontWeight:600}}>{fmtM(+v.valor_disponible_usd_actual)}</td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace'}}>{fmtM(arsActual)}</td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace',color:'#633806'}}>{fmtM(arsSimul)}</td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace',
                        color:diff>0?'#22c55e':diff<0?'#ef4444':'#aaa',fontWeight:500}}>
                        {diff!==0?(diff>0?'+':'')+fmtM(diff):'—'}
                      </td>
                    </tr>
                  )
                })}
                <tr style={{background:'#f8f8f6'}}>
                  <td style={{...s.td,fontWeight:600}}>TOTAL</td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>
                    {fmt2(valuacion.reduce((a,v)=>a+(+v.unidades_disponibles||0),0))}
                  </td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>
                    {fmt2(valuacion.reduce((a,v)=>a+(+v.m2_disponibles||0),0))} m²
                  </td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600,color:'#0C447C'}}>
                    {fmtM(totalUSD)}
                  </td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>
                    {fmtM(totalARS)}
                  </td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600,color:'#633806'}}>
                    {fmtM(totalSimul)}
                  </td>
                  <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600,
                    color:totalSimul>totalARS?'#22c55e':totalSimul<totalARS?'#ef4444':'#aaa'}}>
                    {totalSimul!==totalARS?(totalSimul>totalARS?'+':'')+fmtM(totalSimul-totalARS):'—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Historial */}
        <div style={s.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={s.h2}>📋 Historial de tipos de cambio</div>
            <span style={{fontSize:12,color:'#aaa'}}>{historial.length} registros</span>
          </div>
          {historial.length === 0 ? (
            <div style={{textAlign:'center',padding:'30px',color:'#aaa',fontSize:13}}>
              Sin registros. Cargá el primer tipo de cambio arriba.
            </div>
          ) : (
            <table style={s.tbl}>
              <thead><tr>
                <th style={s.th}>Fecha</th>
                <th style={{...s.th,textAlign:'right'}}>Valor (ARS/USD)</th>
                <th style={s.th}>Tipo</th>
                <th style={{...s.th,textAlign:'right'}}>Variación</th>
                <th style={s.th}>Notas</th>
                <th style={s.th}>Cargado por</th>
              </tr></thead>
              <tbody>
                {historial.map((h,i)=>{
                  const prev = historial.filter(x=>x.tipo===h.tipo)[historial.filter(x=>x.tipo===h.tipo).indexOf(h)+1]
                  const varPct = prev ? ((h.valor - prev.valor) / prev.valor) * 100 : null
                  const TIPO_BADGE = {
                    valuacion:  {bg:'#E6F1FB',color:'#0C447C',label:'Valuación'},
                    operacion:  {bg:'#EAF3DE',color:'#27500A',label:'Operación'},
                    referencia: {bg:'#f8f8f6',color:'#888',   label:'Referencia'},
                  }
                  const tb = TIPO_BADGE[h.tipo] || TIPO_BADGE.referencia
                  return (
                    <tr key={h.id}>
                      <td style={{...s.td,fontFamily:'monospace',fontSize:12}}>
                        {new Date(h.fecha+'T12:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace',fontWeight:600,fontSize:15}}>
                        {fmtTC(h.valor)}
                      </td>
                      <td style={s.td}>
                        <span style={{fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:12,
                          background:tb.bg,color:tb.color}}>{tb.label}</span>
                      </td>
                      <td style={{...s.td,textAlign:'right',fontFamily:'monospace',
                        color:varPct==null?'#aaa':varPct>=0?'#ef4444':'#22c55e'}}>
                        {varPct!=null?`${varPct>=0?'+':''}${varPct.toFixed(1)}%`:'—'}
                      </td>
                      <td style={{...s.td,fontSize:12,color:'#888',maxWidth:200,
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {h.notas||'—'}
                      </td>
                      <td style={{...s.td,fontSize:11,color:'#aaa'}}>{h.cargado_por_nombre||'Finanzas'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
