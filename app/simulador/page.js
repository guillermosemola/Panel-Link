'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { simularEV, PRESETS, DEFAULTS } from '../../lib/simuladorEV'

const fmt  = (n,d=0) => n==null?'—':new Intl.NumberFormat('es-AR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)
const fmtM = n => n==null?'—':n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1e3?`$${Math.round(n/1e3)}K`:`$${Math.round(n)}`
const SECTOR_COLOR = { finanzas:{bg:'#E6F1FB',color:'#0C447C'}, tecnica:{bg:'#EEEDFE',color:'#3C3489'}, obra:{bg:'#FAEEDA',color:'#633806'}, comercial:{bg:'#E1F5EE',color:'#085041'} }
const sLabel = { fontSize:10, fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'#aaa', marginBottom:12, marginTop:20, display:'block' }
const sRange  = { width:'100%', accentColor:'#1a1a18', cursor:'pointer' }
const sMini   = { width:'100%', padding:'7px 10px', fontSize:13, borderRadius:6, border:'0.5px solid #ddd', background:'#fafafa', fontFamily:'monospace' }

function Field({ label, val, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, fontSize:12, color:'#888' }}>
        <span>{label}</span>
        <span style={{ fontFamily:'monospace', fontWeight:600, color:'#1a1a18', fontSize:13 }}>{val}</span>
      </div>
      {children}
    </div>
  )
}

export default function SimuladorEVPage() {
  const router = useRouter()
  const [perfil,   setPerfil]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [P,        setP]        = useState({...DEFAULTS})
  const [R,        setR]        = useState(null)
  const [escSel,   setEsc]      = useState(1)
  const [preset,   setPreset]   = useState('boulevard')
  const [saving,   setSaving]   = useState(false)
  const [saveMsg,  setSaveMsg]  = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [nombre,   setNombre]   = useState('')
  const [ubicacion,setUbicacion]= useState('')

  useEffect(()=>{
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data:perf } = await supabase.from('usuarios').select('*').eq('id',user.id).single()
      if (!perf) { router.push('/login'); return }
      setPerfil(perf); setLoading(false)
    }
    load()
  },[])

  useEffect(()=>{ if(P?.plazo>0) setR(simularEV(P)) },[P])

  function set(key,val){ setP(prev=>({...prev,[key]:val})); setPreset(null) }
  function loadPreset(name){ setP({...PRESETS[name]}); setPreset(name) }

  async function guardarProyecto() {
    if (!nombre.trim()) { setSaveMsg({ok:false,text:'Ingresá un nombre para el proyecto.'}); return }
    setSaving(true); setSaveMsg(null)
    const esc = R.escenarios[escSel]
    const { data:proyecto, error } = await supabase.from('proyectos').insert({
      empresa_id:            perfil.empresa_id,
      nombre:                nombre.trim(),
      descripcion:           ubicacion.trim()||null,
      estado:                'planificacion',
      m2_totales:            P.m2,
      plazo_meses:           P.plazo,
      ev_costo_total_usd:    R.costo_total_impl,
      ev_ingreso_total_usd:  esc.ingr_total,
      ev_margen_objetivo_pct:esc.margen*100,
      fecha_ev:              new Date().toISOString(),
      ev_snapshot:           JSON.stringify({inputs:P, resultado:{
        c_total_impl:R.c_total_impl, costo_total_impl:R.costo_total_impl,
        escenarios:R.escenarios, tir_a:R.tir_a, rubros:R.rubros,
        metros_x_cupo:R.metros_x_cupo, valor_cupo:R.valor_cupo,
      }}),
    }).select().single()
    if (error) { setSaveMsg({ok:false,text:error.message}); setSaving(false); return }
    await supabase.from('variables_proyecto').insert({
      proyecto_id:perfil.empresa_id?proyecto.id:null, modificado_por:perfil.id,
      sector_origen:'finanzas', m2_totales:P.m2, plazo_meses:P.plazo,
      costo_directo_m2:P.construccion, precio_mercado_m2:P.pfondeo, ritmo_venta_m2:P.ud_prom,
    })
    setSaving(false)
    setSaveMsg({ok:true,text:`✅ Proyecto "${nombre}" creado correctamente.`})
    setTimeout(()=>router.push(`/proyecto/${proyecto.id}/gestion`),1200)
  }

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f8f6',fontFamily:'system-ui,sans-serif',color:'#aaa',fontSize:13}}>Cargando...</div>
  if (!R) return null

  const sc  = SECTOR_COLOR[perfil?.sector]||SECTOR_COLOR.finanzas
  const esc = R.escenarios[escSel]

  return (
    <div style={{minHeight:'100vh',background:'#f8f8f6',fontFamily:'system-ui,sans-serif'}}>
      {/* NAVBAR */}
      <nav style={{background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'0 1.5rem',height:52,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push('/dashboard')} style={{fontSize:13,color:'#888',background:'none',border:'none',cursor:'pointer'}}>← Dashboard</button>
          <span style={{fontSize:12,color:'#ddd'}}>|</span>
          <span style={{fontSize:14,fontWeight:500}}>Simulador EV</span>
          <span style={{fontSize:11,background:'#f0ede8',color:'#888',padding:'2px 8px',borderRadius:10}}>Nuevo proyecto</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:11,fontWeight:500,padding:'2px 9px',borderRadius:20,background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
          <span style={{fontSize:13,color:'#888'}}>{perfil?.nombre_completo}</span>
        </div>
      </nav>

      <div style={{display:'grid',gridTemplateColumns:'360px 1fr',minHeight:'calc(100vh - 52px)'}}>
        {/* INPUTS */}
        <div style={{borderRight:'0.5px solid #e0ddd6',background:'#fff',padding:'20px',overflowY:'auto',maxHeight:'calc(100vh - 52px)'}}>
          <span style={sLabel}>Proyecto de referencia</span>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}}>
            {Object.keys(PRESETS).map(name=>(
              <button key={name} onClick={()=>loadPreset(name)} style={{padding:'4px 12px',borderRadius:20,fontSize:12,cursor:'pointer',background:preset===name?'#1a1a18':'#fafafa',color:preset===name?'#fff':'#666',border:preset===name?'0.5px solid #1a1a18':'0.5px solid #ddd'}}>
                {name.charAt(0).toUpperCase()+name.slice(1)}
              </button>
            ))}
          </div>

          <span style={sLabel}>Arquitectura</span>
          <Field label="m² totales" val={`${fmt(P.m2)} m²`}><input type="range" style={sRange} min={500} max={25000} step={50} value={P.m2} onChange={e=>set('m2',+e.target.value)}/></Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:4}}>
            <div><div style={{fontSize:11,color:'#888',marginBottom:5}}>% Cocheras</div><input type="number" style={sMini} value={P.pct_coch} min={0} max={60} onChange={e=>set('pct_coch',+e.target.value)}/></div>
            <div><div style={{fontSize:11,color:'#888',marginBottom:5}}>Ud. prom (m²)</div><input type="number" style={sMini} value={P.ud_prom} min={20} max={150} onChange={e=>set('ud_prom',+e.target.value)}/></div>
          </div>
          <Field label="Plazo de obra" val={`${P.plazo} meses`}><input type="range" style={sRange} min={12} max={72} step={1} value={P.plazo} onChange={e=>set('plazo',+e.target.value)}/></Field>

          <span style={sLabel}>Costos (USD/m²)</span>
          <Field label="Construcción" val={`$${P.construccion}`}><input type="range" style={sRange} min={200} max={800} step={5} value={P.construccion} onChange={e=>set('construccion',+e.target.value)}/></Field>
          <Field label="Terreno + Infraestructura" val={`$${P.terreno}`}><input type="range" style={sRange} min={0} max={600} step={5} value={P.terreno} onChange={e=>set('terreno',+e.target.value)}/></Field>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid #f0ede8',fontSize:13,color:'#555',marginBottom:8}}>
            <span>Terreno por canje</span>
            <label style={{position:'relative',width:34,height:18,cursor:'pointer'}}>
              <input type="checkbox" style={{display:'none'}} checked={P.canje} onChange={e=>set('canje',e.target.checked)}/>
              <div style={{position:'absolute',inset:0,borderRadius:10,background:P.canje?'#1a1a18':'#e0ddd6',transition:'background .2s'}}>
                <div style={{position:'absolute',top:2,left:P.canje?18:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
              </div>
            </label>
          </div>
          {[{key:'comercial',label:'Comercialización %',min:0,max:10,step:.1,fv:v=>`${v.toFixed(1)}%`},{key:'iva',label:'IVA construcción %',min:0,max:15,step:.1,fv:v=>`${v.toFixed(1)}%`},{key:'iibb',label:'IIBB + TEM %',min:0,max:8,step:.05,fv:v=>`${v.toFixed(2)}%`},{key:'admin',label:'Administración USD/m²',min:0,max:50,step:.5,fv:v=>`$${v}`},{key:'honorarios',label:'Honorarios Link %',min:5,max:20,step:.5,fv:v=>`${v.toFixed(1)}%`}].map(f=>(
            <Field key={f.key} label={f.label} val={f.fv(P[f.key])}><input type="range" style={sRange} min={f.min} max={f.max} step={f.step} value={P[f.key]} onChange={e=>set(f.key,+e.target.value)}/></Field>
          ))}

          <span style={sLabel}>Precios de venta</span>
          <Field label="Precio de fondeo (USD/m²)" val={`$${fmt(P.pfondeo)}`}><input type="range" style={sRange} min={500} max={2500} step={25} value={P.pfondeo} onChange={e=>set('pfondeo',+e.target.value)}/></Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div><div style={{fontSize:11,color:'#888',marginBottom:5}}>Prop. contado</div>
              <select style={sMini} value={P.pct_contado} onChange={e=>set('pct_contado',+e.target.value)}><option value={70}>70% contado</option><option value={60}>60% contado</option></select>
            </div>
            <div><div style={{fontSize:11,color:'#888',marginBottom:5}}>Cuotas financiado</div><input type="number" style={sMini} value={P.cuotas} min={6} max={60} onChange={e=>set('cuotas',+e.target.value)}/></div>
          </div>
          {[{key:'p1',label:'Precio pesimista (USD/m²)'},{key:'p2',label:'Precio esperado (USD/m²)'},{key:'p3',label:'Precio optimista (USD/m²)'}].map(f=>(
            <Field key={f.key} label={f.label} val={`$${fmt(P[f.key])}`}><input type="range" style={sRange} min={600} max={2500} step={25} value={P[f.key]} onChange={e=>set(f.key,+e.target.value)}/></Field>
          ))}

          <span style={sLabel}>Modelo inversor</span>
          <Field label="% metros a fondear" val={`${P.pct_fondeo.toFixed(1)}%`}><input type="range" style={sRange} min={0} max={80} step={.5} value={P.pct_fondeo} onChange={e=>set('pct_fondeo',+e.target.value)}/></Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:4}}>
            <div><div style={{fontSize:11,color:'#888',marginBottom:5}}>Cuotas de obra</div><input type="number" style={sMini} value={P.cuotas_obra} min={6} max={48} onChange={e=>set('cuotas_obra',+e.target.value)}/></div>
            <div><div style={{fontSize:11,color:'#888',marginBottom:5}}>N° de cupos</div><input type="number" style={sMini} value={P.cupos} min={1} max={20} onChange={e=>set('cupos',+e.target.value)}/></div>
          </div>

          {/* GUARDAR COMO PROYECTO */}
          <div style={{marginTop:24,paddingTop:20,borderTop:'0.5px solid #e0ddd6'}}>
            {!showForm ? (
              <button onClick={()=>setShowForm(true)}
                style={{width:'100%',padding:'12px',fontSize:14,fontWeight:600,borderRadius:8,border:'none',background:'#1a1a18',color:'#fff',cursor:'pointer'}}>
                💾 Guardar como proyecto
              </button>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{fontSize:12,color:'#888'}}>El EV quedará como presupuesto base fijo del proyecto.</div>
                <input placeholder="Nombre del proyecto *" value={nombre} onChange={e=>setNombre(e.target.value)}
                  style={{padding:'9px 12px',fontSize:13,borderRadius:8,border:'0.5px solid #ccc',background:'#fafafa',outline:'none'}}/>
                <input placeholder="Ubicación (opcional)" value={ubicacion} onChange={e=>setUbicacion(e.target.value)}
                  style={{padding:'9px 12px',fontSize:13,borderRadius:8,border:'0.5px solid #ccc',background:'#fafafa',outline:'none'}}/>
                {saveMsg && (
                  <div style={{fontSize:12,padding:'8px 10px',borderRadius:6,background:saveMsg.ok?'#EAF3DE':'#FCEBEB',color:saveMsg.ok?'#27500A':'#A32D2D'}}>{saveMsg.text}</div>
                )}
                <button onClick={guardarProyecto} disabled={saving}
                  style={{padding:'11px',fontSize:13,fontWeight:600,borderRadius:8,border:'none',background:'#1a1a18',color:'#fff',cursor:'pointer'}}>
                  {saving?'Creando proyecto...':'✓ Confirmar y crear proyecto'}
                </button>
                <button onClick={()=>setShowForm(false)}
                  style={{padding:'8px',fontSize:12,borderRadius:8,cursor:'pointer',border:'0.5px solid #ddd',background:'#fff',color:'#888'}}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RESULTADOS */}
        <div style={{padding:'24px 28px',overflowY:'auto',maxHeight:'calc(100vh - 52px)'}}>
          <div style={{borderRadius:8,padding:'10px 14px',fontSize:12,marginBottom:20,display:'flex',alignItems:'center',gap:8,...(R.viable?{background:'#EAF3DE',border:'0.5px solid #C0DD97',color:'#27500A'}:{background:'#FCEBEB',border:'0.5px solid #F09595',color:'#7A1A1A'})}}>
            {R.viable?`✅ Proyecto viable. Margen de fondeo: ${(R.margen_fondeo*100).toFixed(1)}%`:`⚠️ Costo ($${fmt(Math.round(R.c_total_impl))}/m²) supera precio de fondeo ($${fmt(P.pfondeo)}/m²).`}
          </div>

          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>
            {[
              {label:'Costo total / m²',val:`$${fmt(Math.round(R.c_total_impl))}`,sub:P.canje?`Cash: $${fmt(Math.round(R.c_total_cash))}`:'sin canje'},
              {label:'Precio de fondeo',val:`$${fmt(P.pfondeo)}`,sub:`Margen: ${(R.margen_fondeo*100).toFixed(1)}%`},
              {label:'TIR anual inv.',val:R.tir_a!=null?`${(R.tir_a*100).toFixed(1)}%`:'—',sub:`Mensual: ${R.tir_m!=null?`${(R.tir_m*100).toFixed(2)}%`:'—'}`},
              {label:'Costo total obra',val:fmtM(R.costo_total_impl),sub:`${fmt(R.n_uds)} uds · ${fmt(Math.round(R.m2_dep))} m²`},
            ].map((k,i)=>(
              <div key={i} style={{background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:10,padding:'14px'}}>
                <div style={{fontSize:10,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#aaa',marginBottom:6}}>{k.label}</div>
                <div style={{fontFamily:'monospace',fontSize:22,fontWeight:600,color:'#1a1a18'}}>{k.val}</div>
                <div style={{fontSize:11,color:'#aaa',marginTop:3}}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Escenarios */}
          <div style={{fontSize:11,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'#aaa',marginBottom:10}}>Escenarios de precio de salida</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
            {['Pesimista','Esperado','Optimista'].map((lbl,i)=>{
              const e=R.escenarios[i]
              return (
                <div key={i} onClick={()=>setEsc(i)} style={{background:escSel===i?'#fafaf8':'#fff',border:`0.5px solid ${escSel===i?'#1a1a18':'#e0ddd6'}`,borderRadius:10,padding:'14px',textAlign:'center',cursor:'pointer'}}>
                  <div style={{fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'#aaa',marginBottom:6}}>{lbl}</div>
                  <div style={{fontFamily:'monospace',fontSize:20,fontWeight:600,color:'#1a1a18',marginBottom:2}}>${fmt(e.precio)}/m²</div>
                  <div style={{fontSize:12,fontFamily:'monospace',color:e.roi>=0?'#27500A':'#A32D2D'}}>ROI: {(e.roi*100).toFixed(1)}%</div>
                  <div style={{fontSize:11,color:'#aaa',marginTop:3}}>{fmtM(e.beneficio)}</div>
                </div>
              )
            })}
          </div>

          {/* Tabla costos */}
          <div style={{background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:10,padding:'18px',marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'#aaa',marginBottom:14}}>Desglose de costos — fideicomiso al costo</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr>{['Rubro','USD/m²','Total','%'].map(h=><th key={h} style={{fontSize:10,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#aaa',textAlign:h==='Rubro'?'left':'right',padding:'5px 0',borderBottom:'0.5px solid #e0ddd6'}}>{h}</th>)}</tr></thead>
              <tbody>
                {R.rubros.map((r,i)=>(
                  <tr key={i}>
                    <td style={{fontSize:12,padding:'7px 0',borderBottom:'0.5px solid #f5f3ef',color:'#555'}}>{r.nombre}</td>
                    <td style={{fontFamily:'monospace',textAlign:'right',padding:'7px 0',borderBottom:'0.5px solid #f5f3ef'}}>${r.valor.toFixed(1)}</td>
                    <td style={{fontFamily:'monospace',textAlign:'right',padding:'7px 0',borderBottom:'0.5px solid #f5f3ef',color:'#888'}}>{fmtM(r.total)}</td>
                    <td style={{textAlign:'right',padding:'7px 0',borderBottom:'0.5px solid #f5f3ef'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6}}>
                        <div style={{background:'#f0ede8',borderRadius:3,height:4,width:60}}><div style={{width:`${(r.valor/R.c_total_impl*100).toFixed(1)}%`,height:'100%',borderRadius:3,background:'#1a1a18'}}/></div>
                        <span style={{fontSize:10,color:'#aaa',width:32,textAlign:'right'}}>{(r.valor/R.c_total_impl*100).toFixed(1)}%</span>
                      </div>
                    </td>
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

          {/* Inversor */}
          <div style={{background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:10,padding:'18px'}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'#aaa',marginBottom:14}}>Modelo inversor — por cupo</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 32px'}}>
              {[['Metros por cupo',`${fmt(R.metros_x_cupo.toFixed(1))} m²`],['Valor del cupo',fmtM(R.valor_cupo)],['Desembolso mensual',fmtM(R.desembolso_mensual)],['Cuotas de obra',`${P.cuotas_obra} meses`],['N° de cupos',P.cupos],['TIR anual inversor',R.tir_a!=null?`${(R.tir_a*100).toFixed(1)}%`:'—'],['Precio salida esp.',`$${fmt(P.p2)}/m²`],['Valor cupo al vencer',fmtM(R.metros_x_cupo*P.p2)]].map(([l,v])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'0.5px solid #f5f3ef',fontSize:12}}>
                  <span style={{color:'#888'}}>{l}</span>
                  <strong style={{fontFamily:'monospace',color:'#1a1a18'}}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
