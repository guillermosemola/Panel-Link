'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { simularEV, PRESETS, DEFAULTS } from '../../lib/simuladorEV'

const fmt  = (n,d=0) => n==null?'—':new Intl.NumberFormat('es-AR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const fmtM = n => n==null?'—':n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1e3?`$${Math.round(n/1e3)}K`:`$${Math.round(n)}`
const SECTOR_COLOR = {
  finanzas:{bg:'#E6F1FB',color:'#0C447C'}, tecnica:{bg:'#EEEDFE',color:'#3C3489'},
  obra:{bg:'#FAEEDA',color:'#633806'}, comercial:{bg:'#E1F5EE',color:'#085041'},
}
const sRange = { width:'100%', accentColor:'#1a1a18', cursor:'pointer' }
const sMini  = { width:'100%',padding:'8px 10px',fontSize:13,borderRadius:8,border:'0.5px solid #ddd',background:'#fafafa',fontFamily:'monospace' }
const sLabel = { fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#aaa',marginBottom:12,marginTop:20,display:'block' }

function Field({ label, val, children }) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5,fontSize:12,color:'#888'}}>
        <span>{label}</span>
        <span style={{fontFamily:'monospace',fontWeight:600,color:'#1a1a18',fontSize:13}}>{val}</span>
      </div>
      {children}
    </div>
  )
}

// Componente interno que usa useSearchParams — envuelto en Suspense desde el export default
function NuevoProyectoInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const proyectoId   = searchParams.get('id')

  const [step,    setStep]    = useState(1)
  const [perfil,  setPerfil]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState(null)

  const [nombre,    setNombre]    = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [estado,    setEstado]    = useState('planificacion')
  const [proyExistente, setProyExistente] = useState(null)

  const [P,      setP]      = useState({...DEFAULTS})
  const [R,      setR]      = useState(null)
  const [escSel, setEsc]    = useState(1)
  const [preset, setPreset] = useState('boulevard')

  useEffect(() => { if (P?.plazo > 0) setR(simularEV(P)) }, [P])

  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      if (!perf) { router.push('/login'); return }
      setPerfil(perf)
      if (proyectoId) {
        const { data:proy } = await supabase.from('proyectos').select('*').eq('id', proyectoId).single()
        if (proy) {
          setProyExistente(proy)
          setNombre(proy.nombre)
          setUbicacion(proy.descripcion || '')
          setEstado(proy.estado || 'planificacion')
          setStep(2)
        }
      }
      setLoading(false)
    }
    load()
  }, [proyectoId, router])

  function setVal(key, val) { setP(prev => ({...prev,[key]:val})); setPreset(null) }
  function loadPreset(name)  { setP({...PRESETS[name]}); setPreset(name) }

  async function confirmarYGuardar() {
    setSaving(true); setMsg(null)
    const esc = R.escenarios[escSel]
    const evSnapshot = JSON.stringify({ inputs: P, resultado: {
      c_total_impl: R.c_total_impl, costo_total_impl: R.costo_total_impl,
      escenarios: R.escenarios, rubros: R.rubros, tir_a: R.tir_a,
      metros_x_cupo: R.metros_x_cupo, valor_cupo: R.valor_cupo,
    }})
    const evData = {
      estado, m2_totales: P.m2, plazo_meses: P.plazo,
      ev_costo_total_usd: R.costo_total_impl,
      ev_ingreso_total_usd: esc.ingr_total,
      ev_margen_objetivo_pct: esc.margen * 100,
      fecha_ev: new Date().toISOString(),
      ev_snapshot: evSnapshot,
    }

    let proyId = proyExistente?.id

    // PASO 1: Guardar / actualizar el proyecto
    setMsg({ok:true,text:'⏳ Paso 1/3 — Guardando EV...'})
    if (proyExistente) {
      const { error } = await supabase.from('proyectos').update({
        ...evData, nombre: nombre.trim(), descripcion: ubicacion.trim() || null,
      }).eq('id', proyExistente.id)
      if (error) { setSaving(false); setMsg({ok:false,text:error.message}); return }
    } else {
      const { data:newProy, error } = await supabase.from('proyectos').insert({
        empresa_id: perfil.empresa_id, nombre: nombre.trim(),
        descripcion: ubicacion.trim() || null, ...evData,
      }).select().single()
      if (error) { setSaving(false); setMsg({ok:false,text:error.message}); return }
      proyId = newProy.id
      // Guardar variables_proyecto
      await supabase.from('variables_proyecto').insert({
        proyecto_id: proyId, modificado_por: perfil.id, sector_origen: 'finanzas',
        m2_totales: P.m2, plazo_meses: P.plazo, costo_directo_m2: P.construccion,
        precio_mercado_m2: P.pfondeo,
      }).catch(()=>{})
    }

    // PASO 2: Generar flujo proyectado (curva S gaussiana) automáticamente
    setMsg({ok:true,text:'⏳ Paso 2/3 — Generando flujo de fondos proyectado (curva S)...'})
    const fechaInicio = new Date().toISOString().split('T')[0]
    const { error: errFlujo } = await supabase.rpc('generar_flujo_proyectado', {
      p_proyecto_id:   proyId,
      p_plazo_meses:   P.plazo,
      p_costo_total:   R.costo_total_impl,
      p_ingreso_total: esc.ingr_total,
      p_fecha_inicio:  fechaInicio,
    })
    if (errFlujo) {
      // No es fatal — el flujo se puede regenerar después
      console.warn('Error generando flujo:', errFlujo.message)
    }

    // PASO 3: Listo
    setSaving(false)
    setMsg({ok:true,text:`✅ Paso 3/3 — ${proyExistente?'EV actualizado':'Proyecto creado'} con flujo de fondos generado. Redirigiendo al panel...`})
    setTimeout(() => router.push(`/proyecto/${proyId}/gestion`), 1500)
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#f8f8f6',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{color:'#aaa',fontSize:14}}>Cargando...</div>
    </div>
  )

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas

  return (
    <div style={{minHeight:'100vh',background:'#f8f8f6',fontFamily:'system-ui,sans-serif'}}>
      {/* Navbar */}
      <nav style={{background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'0 1.5rem',height:52,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push('/dashboard')} style={{fontSize:13,color:'#888',background:'none',border:'none',cursor:'pointer'}}>← Dashboard</button>
          <span style={{fontSize:12,color:'#ddd'}}>|</span>
          <span style={{fontSize:14,fontWeight:500}}>{proyExistente?`Cargar EV — ${proyExistente.nombre}`:'Nuevo proyecto'}</span>
        </div>
        <span style={{fontSize:11,fontWeight:500,padding:'2px 9px',borderRadius:20,background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
      </nav>

      {/* Steps */}
      <div style={{background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'12px 2rem',display:'flex',alignItems:'center',gap:0}}>
        {[{n:1,label:proyExistente?'Proyecto existente':'Datos del proyecto'},{n:2,label:'Evaluación de Viabilidad (EV)'},{n:3,label:'Confirmar y crear'}].map((s,i)=>(
          <div key={s.n} style={{display:'flex',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,cursor:s.n<step?'pointer':'default'}} onClick={()=>s.n<step&&!proyExistente&&setStep(s.n)}>
              <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,
                background:step===s.n?'#1a1a18':step>s.n?'#4A9E3F':'#f0ede8',color:step>=s.n?'#fff':'#aaa'}}>
                {step>s.n?'✓':s.n}
              </div>
              <span style={{fontSize:13,color:step===s.n?'#1a1a18':step>s.n?'#4A9E3F':'#aaa',fontWeight:step===s.n?600:400}}>{s.label}</span>
            </div>
            {i<2&&<div style={{width:40,height:1,background:'#e0ddd6',margin:'0 12px'}}/>}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step===1&&(
        <div style={{maxWidth:560,margin:'3rem auto',padding:'0 1.5rem'}}>
          <div style={{background:'#fff',borderRadius:14,padding:'2rem',border:'0.5px solid #e0ddd6'}}>
            <h2 style={{fontSize:20,fontWeight:600,marginBottom:6}}>Datos del proyecto</h2>
            <p style={{fontSize:13,color:'#888',marginBottom:24}}>Completá la información básica. El EV se configurará en el siguiente paso.</p>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:'#888',display:'block',marginBottom:6}}>Nombre del proyecto *</label>
              <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Neuquén, Marcos Paz..."
                style={{width:'100%',padding:'10px 14px',fontSize:15,fontWeight:500,borderRadius:10,border:'0.5px solid #ccc',outline:'none',background:'#fafafa',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:'#888',display:'block',marginBottom:6}}>Ubicación / Descripción</label>
              <input value={ubicacion} onChange={e=>setUbicacion(e.target.value)} placeholder="Ej: Neuquén Capital, Barrio Centro"
                style={{width:'100%',padding:'10px 14px',fontSize:14,borderRadius:10,border:'0.5px solid #ccc',outline:'none',background:'#fafafa',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:28}}>
              <label style={{fontSize:12,color:'#888',display:'block',marginBottom:6}}>Estado inicial</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[['planificacion','📐 Planificación'],['en_obra','🏗 En obra']].map(([val,label])=>(
                  <button key={val} onClick={()=>setEstado(val)}
                    style={{padding:'10px',borderRadius:8,fontSize:13,cursor:'pointer',
                      border:estado===val?'1.5px solid #1a1a18':'0.5px solid #ddd',
                      background:estado===val?'#1a1a18':'#fff',
                      color:estado===val?'#fff':'#666',fontWeight:estado===val?600:400}}>{label}</button>
                ))}
              </div>
            </div>
            <button onClick={()=>nombre.trim()&&setStep(2)} disabled={!nombre.trim()}
              style={{width:'100%',padding:'13px',fontSize:14,fontWeight:600,borderRadius:10,border:'none',
                background:nombre.trim()?'#1a1a18':'#e0ddd6',color:nombre.trim()?'#fff':'#aaa',cursor:nombre.trim()?'pointer':'not-allowed'}}>
              Siguiente → Configurar EV
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step===2&&R&&(
        <div style={{display:'grid',gridTemplateColumns:'340px 1fr',minHeight:'calc(100vh - 110px)'}}>
          <div style={{borderRight:'0.5px solid #e0ddd6',background:'#fff',padding:'20px',overflowY:'auto',maxHeight:'calc(100vh - 110px)'}}>
            <span style={sLabel}>Referencia de proyectos similares</span>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
              {Object.keys(PRESETS).map(name=>(
                <button key={name} onClick={()=>loadPreset(name)}
                  style={{padding:'4px 12px',borderRadius:20,fontSize:12,cursor:'pointer',
                    background:preset===name?'#1a1a18':'#fafafa',color:preset===name?'#fff':'#666',
                    border:preset===name?'0.5px solid #1a1a18':'0.5px solid #ddd'}}>
                  {name.charAt(0).toUpperCase()+name.slice(1)}
                </button>
              ))}
            </div>
            <span style={sLabel}>Arquitectura</span>
            <Field label="m² totales" val={`${fmt(P.m2)} m²`}><input type="range" style={sRange} min={500} max={25000} step={50} value={P.m2} onChange={e=>setVal('m2',+e.target.value)}/></Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div><div style={{fontSize:11,color:'#888',marginBottom:4}}>% Cocheras</div><input type="number" style={sMini} value={P.pct_coch} min={0} max={60} onChange={e=>setVal('pct_coch',+e.target.value)}/></div>
              <div><div style={{fontSize:11,color:'#888',marginBottom:4}}>Ud. prom (m²)</div><input type="number" style={sMini} value={P.ud_prom} min={20} max={150} onChange={e=>setVal('ud_prom',+e.target.value)}/></div>
            </div>
            <Field label="Plazo de obra" val={`${P.plazo} meses`}><input type="range" style={sRange} min={12} max={72} step={1} value={P.plazo} onChange={e=>setVal('plazo',+e.target.value)}/></Field>
            <span style={sLabel}>Costos (USD/m²)</span>
            <Field label="Construcción" val={`$${P.construccion}`}><input type="range" style={sRange} min={200} max={800} step={5} value={P.construccion} onChange={e=>setVal('construccion',+e.target.value)}/></Field>
            <Field label="Terreno + Infraestructura" val={`$${P.terreno}`}><input type="range" style={sRange} min={0} max={600} step={5} value={P.terreno} onChange={e=>setVal('terreno',+e.target.value)}/></Field>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid #f0ede8',fontSize:13,color:'#555',marginBottom:8}}>
              <span>Terreno por canje</span>
              <label style={{position:'relative',width:34,height:18,cursor:'pointer'}}>
                <input type="checkbox" style={{display:'none'}} checked={P.canje} onChange={e=>setVal('canje',e.target.checked)}/>
                <div style={{position:'absolute',inset:0,borderRadius:10,background:P.canje?'#1a1a18':'#e0ddd6',transition:'background .2s'}}>
                  <div style={{position:'absolute',top:2,left:P.canje?18:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
                </div>
              </label>
            </div>
            {[{key:'comercial',label:'Comercialización %',min:0,max:10,step:.1,fv:v=>`${v.toFixed(1)}%`},
              {key:'iva',label:'IVA construcción %',min:0,max:15,step:.1,fv:v=>`${v.toFixed(1)}%`},
              {key:'iibb',label:'IIBB + TEM %',min:0,max:8,step:.05,fv:v=>`${v.toFixed(2)}%`},
              {key:'admin',label:'Administración USD/m²',min:0,max:50,step:.5,fv:v=>`$${v}`},
              {key:'honorarios',label:'Honorarios Link %',min:5,max:20,step:.5,fv:v=>`${v.toFixed(1)}%`},
            ].map(f=>(
              <Field key={f.key} label={f.label} val={f.fv(P[f.key])}><input type="range" style={sRange} min={f.min} max={f.max} step={f.step} value={P[f.key]} onChange={e=>setVal(f.key,+e.target.value)}/></Field>
            ))}
            <span style={sLabel}>Precios de venta</span>
            <Field label="Precio de fondeo (USD/m²)" val={`$${fmt(P.pfondeo)}`}><input type="range" style={sRange} min={500} max={2500} step={25} value={P.pfondeo} onChange={e=>setVal('pfondeo',+e.target.value)}/></Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
              <div><div style={{fontSize:11,color:'#888',marginBottom:4}}>Prop. contado</div>
                <select style={sMini} value={P.pct_contado} onChange={e=>setVal('pct_contado',+e.target.value)}><option value={70}>70% contado</option><option value={60}>60% contado</option></select></div>
              <div><div style={{fontSize:11,color:'#888',marginBottom:4}}>Cuotas financiado</div><input type="number" style={sMini} value={P.cuotas} min={6} max={60} onChange={e=>setVal('cuotas',+e.target.value)}/></div>
            </div>
            {[{key:'p1',label:'Precio pesimista'},{key:'p2',label:'Precio esperado'},{key:'p3',label:'Precio optimista'}].map(f=>(
              <Field key={f.key} label={`${f.label} (USD/m²)`} val={`$${fmt(P[f.key])}`}><input type="range" style={sRange} min={600} max={2500} step={25} value={P[f.key]} onChange={e=>setVal(f.key,+e.target.value)}/></Field>
            ))}
            <span style={sLabel}>Modelo inversor</span>
            <Field label="% metros a fondear" val={`${P.pct_fondeo.toFixed(1)}%`}><input type="range" style={sRange} min={0} max={80} step={.5} value={P.pct_fondeo} onChange={e=>setVal('pct_fondeo',+e.target.value)}/></Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:24}}>
              <div><div style={{fontSize:11,color:'#888',marginBottom:4}}>Cuotas de obra</div><input type="number" style={sMini} value={P.cuotas_obra} min={6} max={48} onChange={e=>setVal('cuotas_obra',+e.target.value)}/></div>
              <div><div style={{fontSize:11,color:'#888',marginBottom:4}}>N° de cupos</div><input type="number" style={sMini} value={P.cupos} min={1} max={20} onChange={e=>setVal('cupos',+e.target.value)}/></div>
            </div>
            <button onClick={()=>setStep(3)} style={{width:'100%',padding:'13px',fontSize:14,fontWeight:600,borderRadius:10,border:'none',background:'#1a1a18',color:'#fff',cursor:'pointer'}}>
              Siguiente → Confirmar EV
            </button>
          </div>

          <div style={{padding:'24px 28px',overflowY:'auto',maxHeight:'calc(100vh - 110px)'}}>
            <div style={{borderRadius:8,padding:'10px 14px',fontSize:12,marginBottom:20,...(R.viable?{background:'#EAF3DE',border:'0.5px solid #C0DD97',color:'#27500A'}:{background:'#FCEBEB',border:'0.5px solid #F09595',color:'#7A1A1A'})}}>
              {R.viable?`✅ Proyecto viable. Margen de fondeo: ${(R.margen_fondeo*100).toFixed(1)}%`:`⚠️ Costo ($${fmt(Math.round(R.c_total_impl))}/m²) supera precio de fondeo ($${fmt(P.pfondeo)}/m²).`}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
              {[{l:'Costo total/m²',v:`$${fmt(Math.round(R.c_total_impl))}`,s:P.canje?`Cash: $${fmt(Math.round(R.c_total_cash))}`:'sin canje'},
                {l:'Precio de fondeo',v:`$${fmt(P.pfondeo)}`,s:`Margen: ${(R.margen_fondeo*100).toFixed(1)}%`},
                {l:'TIR anual inv.',v:R.tir_a!=null?`${(R.tir_a*100).toFixed(1)}%`:'—',s:`Mensual: ${R.tir_m!=null?`${(R.tir_m*100).toFixed(2)}%`:'—'}`},
                {l:'Costo total obra',v:fmtM(R.costo_total_impl),s:`${fmt(R.n_uds)} uds · ${fmt(Math.round(R.m2_dep))} m²`},
              ].map((k,i)=>(
                <div key={i} style={{background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:10,padding:'14px'}}>
                  <div style={{fontSize:10,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#aaa',marginBottom:6}}>{k.l}</div>
                  <div style={{fontFamily:'monospace',fontSize:20,fontWeight:600,color:'#1a1a18'}}>{k.v}</div>
                  <div style={{fontSize:11,color:'#aaa',marginTop:3}}>{k.s}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'#aaa',marginBottom:10}}>Escenarios de precio de salida</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
              {['Pesimista','Esperado','Optimista'].map((lbl,i)=>{
                const e=R.escenarios[i]
                return (
                  <div key={i} onClick={()=>setEsc(i)} style={{background:escSel===i?'#fafaf8':'#fff',border:`0.5px solid ${escSel===i?'#1a1a18':'#e0ddd6'}`,borderRadius:10,padding:'14px',textAlign:'center',cursor:'pointer'}}>
                    <div style={{fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'#aaa',marginBottom:6}}>{lbl}</div>
                    <div style={{fontFamily:'monospace',fontSize:18,fontWeight:600,color:'#1a1a18',marginBottom:2}}>${fmt(e.precio)}/m²</div>
                    <div style={{fontSize:12,fontFamily:'monospace',color:e.roi>=0?'#27500A':'#A32D2D'}}>ROI: {(e.roi*100).toFixed(1)}%</div>
                    <div style={{fontSize:11,color:'#aaa',marginTop:3}}>{fmtM(e.beneficio)}</div>
                  </div>
                )
              })}
            </div>
            <div style={{background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:10,padding:'18px'}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'#aaa',marginBottom:14}}>Desglose de costos</div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>{['Rubro','USD/m²','Total','%'].map(h=><th key={h} style={{fontSize:10,fontWeight:600,color:'#aaa',textAlign:h==='Rubro'?'left':'right',padding:'5px 0',borderBottom:'0.5px solid #e0ddd6'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {R.rubros.map((r,i)=>(
                    <tr key={i}>
                      <td style={{fontSize:12,padding:'7px 0',borderBottom:'0.5px solid #f5f3ef',color:'#555'}}>{r.nombre}</td>
                      <td style={{fontFamily:'monospace',textAlign:'right',padding:'7px 0',borderBottom:'0.5px solid #f5f3ef'}}>${r.valor.toFixed(1)}</td>
                      <td style={{fontFamily:'monospace',textAlign:'right',padding:'7px 0',borderBottom:'0.5px solid #f5f3ef',color:'#888'}}>{fmtM(r.total)}</td>
                      <td style={{textAlign:'right',padding:'7px 0',borderBottom:'0.5px solid #f5f3ef',fontSize:11,color:'#aaa'}}>{(r.valor/R.c_total_impl*100).toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr style={{background:'#f8f8f6'}}>
                    <td style={{fontWeight:600,color:'#1a1a18',padding:'8px 0',borderTop:'0.5px solid #e0ddd6',fontSize:13}}>TOTAL</td>
                    <td style={{fontFamily:'monospace',textAlign:'right',fontWeight:600,color:'#1a1a18',padding:'8px 0',borderTop:'0.5px solid #e0ddd6'}}>${R.c_total_impl.toFixed(1)}</td>
                    <td style={{fontFamily:'monospace',textAlign:'right',fontWeight:600,color:'#1a1a18',padding:'8px 0',borderTop:'0.5px solid #e0ddd6'}}>{fmtM(R.costo_total_impl)}</td>
                    <td style={{borderTop:'0.5px solid #e0ddd6'}}/>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step===3&&R&&(
        <div style={{maxWidth:640,margin:'3rem auto',padding:'0 1.5rem'}}>
          <div style={{background:'#fff',borderRadius:14,padding:'2rem',border:'0.5px solid #e0ddd6'}}>
            <h2 style={{fontSize:20,fontWeight:600,marginBottom:6}}>Confirmar y crear proyecto</h2>
            <p style={{fontSize:13,color:'#888',marginBottom:24}}>El EV quedará guardado como <strong>presupuesto base inmutable</strong>. Es la línea de base del proyecto.</p>
            <div style={{background:'#f8f8f6',borderRadius:10,padding:'1.25rem',marginBottom:20,border:'0.5px solid #e0ddd6'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#888',marginBottom:12,textTransform:'uppercase',letterSpacing:'.08em'}}>Resumen</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 24px'}}>
                {[
                  ['Nombre', nombre],['Ubicación', ubicacion||'—'],['Estado', estado],
                  ['m² totales', `${fmt(P.m2)} m²`],['Plazo', `${P.plazo} meses`],
                  ['Costo total/m²', `$${fmt(Math.round(R.c_total_impl))}`],
                  ['Costo total obra', fmtM(R.costo_total_impl)],
                  ['Precio de fondeo', `$${fmt(P.pfondeo)}/m²`],
                  ['TIR anual inversor', R.tir_a!=null?`${(R.tir_a*100).toFixed(1)}%`:'—'],
                  ['Escenario', ['Pesimista','Esperado','Optimista'][escSel]],
                  ['Precio escenario', `$${fmt(R.escenarios[escSel].precio)}/m²`],
                  ['ROI proyectado', `${(R.escenarios[escSel].roi*100).toFixed(1)}%`],
                ].map(([l,v])=>(
                  <div key={l}>
                    <div style={{fontSize:11,color:'#aaa'}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:500,color:'#1a1a18'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {msg&&<div style={{fontSize:12,padding:'10px 14px',borderRadius:8,marginBottom:16,background:msg.ok?'#EAF3DE':'#FCEBEB',color:msg.ok?'#27500A':'#A32D2D'}}>{msg.text}</div>}
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setStep(2)} style={{flex:1,padding:'12px',fontSize:13,borderRadius:10,cursor:'pointer',border:'0.5px solid #ddd',background:'#fff',color:'#666'}}>← Volver al EV</button>
              <button onClick={confirmarYGuardar} disabled={saving}
                style={{flex:2,padding:'12px',fontSize:14,fontWeight:600,borderRadius:10,border:'none',background:'#1a1a18',color:'#fff',cursor:'pointer'}}>
                {saving?'Creando proyecto...':proyExistente?'✓ Guardar EV en proyecto':'✓ Crear proyecto con EV'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Export default con Suspense — requerido por Next.js 14 para useSearchParams
export default function NuevoProyectoPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',background:'#f8f8f6',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
        <div style={{color:'#aaa',fontSize:14}}>Cargando...</div>
      </div>
    }>
      <NuevoProyectoInner />
    </Suspense>
  )
}
