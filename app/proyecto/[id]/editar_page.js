'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

const SECTOR_COLOR = {
  finanzas:{bg:'#E6F1FB',color:'#0C447C'}, tecnica:{bg:'#EEEDFE',color:'#3C3489'},
  obra:{bg:'#FAEEDA',color:'#633806'}, comercial:{bg:'#E1F5EE',color:'#085041'},
}

const s = {
  page:  {minHeight:'100vh',background:'#f8f8f6',fontFamily:'system-ui,sans-serif'},
  main:  {maxWidth:640,margin:'0 auto',padding:'2rem 1.5rem'},
  card:  {background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:14,padding:'2rem',marginBottom:16},
  h2:    {fontSize:18,fontWeight:600,color:'#1a1a18',marginBottom:4},
  sub:   {fontSize:13,color:'#aaa',marginBottom:24},
  field: {marginBottom:18},
  label: {fontSize:12,color:'#888',display:'block',marginBottom:6,fontWeight:500},
  input: {width:'100%',padding:'10px 14px',fontSize:14,borderRadius:9,border:'0.5px solid #ccc',
    background:'#fafafa',outline:'none',boxSizing:'border-box',fontFamily:'inherit',
    transition:'border-color .15s'},
  textarea:{width:'100%',padding:'10px 14px',fontSize:13,borderRadius:9,border:'0.5px solid #ccc',
    background:'#fafafa',outline:'none',boxSizing:'border-box',fontFamily:'inherit',
    resize:'vertical',minHeight:72},
  row2:  {display:'grid',gridTemplateColumns:'1fr 1fr',gap:14},
  row3:  {display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14},
  estados:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8},
  estadoBtn:{padding:'9px 8px',borderRadius:8,fontSize:12,cursor:'pointer',
    border:'0.5px solid #ddd',background:'#fff',color:'#666',textAlign:'center',
    transition:'all .15s',fontFamily:'inherit'},
  btnRow:{display:'flex',gap:10,marginTop:8},
  btn:   {flex:2,padding:'12px',fontSize:14,fontWeight:600,borderRadius:9,border:'none',
    background:'#1a1a18',color:'#fff',cursor:'pointer'},
  btnCancel:{flex:1,padding:'12px',fontSize:13,borderRadius:9,cursor:'pointer',
    border:'0.5px solid #ddd',background:'#fff',color:'#666'},
  msg_ok:{fontSize:12,color:'#27500A',background:'#EAF3DE',borderRadius:7,padding:'10px 14px',marginBottom:14},
  msg_er:{fontSize:12,color:'#A32D2D',background:'#FCEBEB',borderRadius:7,padding:'10px 14px',marginBottom:14},
  divider:{borderTop:'0.5px solid #f0ede8',margin:'20px 0'},
  danger:{background:'#fff5f5',border:'0.5px solid #feb2b2',borderRadius:14,padding:'1.5rem',marginBottom:16},
  dangerTitle:{fontSize:14,fontWeight:600,color:'#c53030',marginBottom:6},
  dangerDesc:{fontSize:12,color:'#aaa',marginBottom:14},
  dangerBtn:{padding:'9px 18px',fontSize:12,fontWeight:600,borderRadius:7,border:'0.5px solid #fc8181',
    background:'#fff5f5',color:'#c53030',cursor:'pointer'},
}

const ESTADOS = [
  {val:'planificacion', label:'📐 Planificación'},
  {val:'en_obra',       label:'🏗 En obra'},
  {val:'terminado',     label:'✅ Terminado'},
  {val:'suspendido',    label:'⏸ Suspendido'},
]

export default function EditarProyectoPage() {
  const { id }  = useParams()
  const router  = useRouter()
  const [perfil,   setPerfil]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)
  const [confirm,  setConfirm]  = useState(false)

  // Campos del formulario
  const [nombre,      setNombre]      = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [estado,      setEstado]      = useState('planificacion')
  const [ubicacion,   setUbicacion]   = useState('')
  const [m2,          setM2]          = useState('')
  const [plazo,       setPlazo]       = useState('')
  const [responsable, setResponsable] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin,    setFechaFin]    = useState('')

  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      if (!perf) { router.push('/login'); return }
      setPerfil(perf)

      const { data:proy } = await supabase.from('proyectos').select('*').eq('id', id).single()
      if (!proy) { router.push('/dashboard'); return }

      setNombre(proy.nombre || '')
      setDescripcion(proy.descripcion || '')
      setEstado(proy.estado || 'planificacion')
      setUbicacion(proy.ubicacion || '')
      setM2(proy.m2_totales || '')
      setPlazo(proy.plazo_meses || '')
      setResponsable(proy.responsable || '')
      setFechaInicio(proy.fecha_inicio ? proy.fecha_inicio.slice(0,10) : '')
      setFechaFin(proy.fecha_fin_estimada ? proy.fecha_fin_estimada.slice(0,10) : '')
      setLoading(false)
    }
    load()
  }, [id, router])

  async function guardar(e) {
    e.preventDefault()
    if (!nombre.trim()) { setMsg({ok:false,text:'El nombre es obligatorio.'}); return }
    setSaving(true); setMsg(null)

    const { error } = await supabase.from('proyectos').update({
      nombre:               nombre.trim(),
      descripcion:          descripcion.trim() || null,
      estado,
      ubicacion:            ubicacion.trim() || null,
      m2_totales:           m2 ? +m2 : null,
      plazo_meses:          plazo ? +plazo : null,
      responsable:          responsable.trim() || null,
      fecha_inicio:         fechaInicio || null,
      fecha_fin_estimada:   fechaFin || null,
      updated_at:           new Date().toISOString(),
    }).eq('id', id)

    setSaving(false)
    if (error) { setMsg({ok:false,text:error.message}); return }
    setMsg({ok:true,text:'✅ Proyecto actualizado correctamente.'})
    setTimeout(() => router.push(`/proyecto/${id}`), 1000)
  }

  if (loading) return (
    <div style={{...s.page,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'#aaa',fontSize:14}}>Cargando...</div>
    </div>
  )

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas
  const puedeEditar = ['finanzas','admin','tecnica'].includes(perfil?.sector)

  return (
    <div style={s.page}>
      {/* Navbar */}
      <nav style={{background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'0 1.5rem',
        height:52,display:'flex',alignItems:'center',justifyContent:'space-between',
        position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push(`/proyecto/${id}`)}
            style={{fontSize:13,color:'#888',background:'none',border:'none',cursor:'pointer'}}>
            ← {nombre||'Proyecto'}
          </button>
          <span style={{fontSize:12,color:'#ddd'}}>|</span>
          <span style={{fontSize:14,fontWeight:500}}>Editar datos</span>
        </div>
        <span style={{fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,
          background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
      </nav>

      <div style={s.main}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:22,fontWeight:600,color:'#1a1a18',marginBottom:4}}>Editar proyecto</h1>
          <div style={{fontSize:13,color:'#aaa'}}>Los cambios se reflejan inmediatamente en el dashboard y el panel de gestión.</div>
        </div>

        {!puedeEditar && (
          <div style={{background:'#FAEEDA',border:'0.5px solid #E07B00',borderRadius:10,
            padding:'12px 16px',fontSize:13,color:'#633806',marginBottom:16}}>
            ⚠️ Tu sector ({perfil?.sector}) tiene acceso de solo lectura a los datos del proyecto.
          </div>
        )}

        <form onSubmit={guardar}>
          {/* Datos principales */}
          <div style={s.card}>
            <div style={s.h2}>Datos principales</div>
            <div style={s.sub}>Información básica del proyecto que aparece en el dashboard.</div>

            <div style={s.field}>
              <label style={s.label}>Nombre del proyecto *</label>
              <input style={s.input} value={nombre} onChange={e=>setNombre(e.target.value)}
                placeholder="Ej: Torre Green, Live Boulevard..." disabled={!puedeEditar}/>
            </div>

            <div style={s.field}>
              <label style={s.label}>Descripción breve</label>
              <textarea style={s.textarea} value={descripcion} onChange={e=>setDescripcion(e.target.value)}
                placeholder="Ej: Edificio residencial en altura, 13 plantas..." disabled={!puedeEditar}/>
            </div>

            <div style={s.field}>
              <label style={s.label}>Ubicación / Localidad</label>
              <input style={s.input} value={ubicacion} onChange={e=>setUbicacion(e.target.value)}
                placeholder="Ej: San Miguel de Tucumán, Barrio Norte" disabled={!puedeEditar}/>
            </div>

            <div style={s.field}>
              <label style={s.label}>Estado del proyecto</label>
              <div style={s.estados}>
                {ESTADOS.map(e=>(
                  <button key={e.val} type="button" onClick={()=>puedeEditar&&setEstado(e.val)}
                    disabled={!puedeEditar}
                    style={{...s.estadoBtn,
                      background:estado===e.val?'#1a1a18':'#fff',
                      color:estado===e.val?'#fff':'#666',
                      border:estado===e.val?'0.5px solid #1a1a18':'0.5px solid #ddd',
                      fontWeight:estado===e.val?600:400,
                    }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Responsable / Director de proyecto</label>
              <input style={s.input} value={responsable} onChange={e=>setResponsable(e.target.value)}
                placeholder="Nombre del responsable" disabled={!puedeEditar}/>
            </div>
          </div>

          {/* Datos técnicos */}
          <div style={s.card}>
            <div style={s.h2}>Datos técnicos</div>
            <div style={s.sub}>Superficie y plazo. Modificar el plazo afecta la curva S del EV.</div>

            <div style={{...s.row2,...s.field}}>
              <div>
                <label style={s.label}>m² totales construidos</label>
                <input style={s.input} type="number" value={m2} onChange={e=>setM2(e.target.value)}
                  placeholder="Ej: 5153" disabled={!puedeEditar}/>
              </div>
              <div>
                <label style={s.label}>Plazo de obra (meses)</label>
                <input style={s.input} type="number" value={plazo} onChange={e=>setPlazo(e.target.value)}
                  placeholder="Ej: 30" disabled={!puedeEditar}/>
              </div>
            </div>

            <div style={{...s.row2,...s.field}}>
              <div>
                <label style={s.label}>Fecha de inicio de obra</label>
                <input style={s.input} type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)}
                  disabled={!puedeEditar}/>
              </div>
              <div>
                <label style={s.label}>Fecha fin estimada</label>
                <input style={s.input} type="date" value={fechaFin} onChange={e=>setFechaFin(e.target.value)}
                  disabled={!puedeEditar}/>
              </div>
            </div>

            {plazo && fechaInicio && (
              <div style={{fontSize:12,color:'#888',background:'#f8f8f6',borderRadius:8,padding:'10px 14px'}}>
                📅 Fin estimado automático: {(() => {
                  const d = new Date(fechaInicio)
                  d.setMonth(d.getMonth() + +plazo)
                  return d.toLocaleDateString('es-AR',{month:'long',year:'numeric'})
                })()}
              </div>
            )}
          </div>

          {/* EV resumen */}
          <div style={{...s.card,background:'#f8f8f6',border:'0.5px solid #e0ddd6'}}>
            <div style={s.h2}>Evaluación de Viabilidad (EV)</div>
            <div style={s.sub}>El EV es inmutable una vez aprobado. Para modificarlo, regeneralo desde el simulador.</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button type="button" onClick={()=>router.push(`/nuevo-proyecto?id=${id}`)}
                style={{padding:'9px 18px',fontSize:13,borderRadius:8,border:'0.5px solid #1A5276',
                  background:'#EBF5FB',color:'#0C447C',cursor:'pointer',fontWeight:500}}>
                📊 Ver / Regenerar EV
              </button>
            </div>
          </div>

          {/* Botones */}
          {msg && <div style={msg.ok?s.msg_ok:s.msg_er}>{msg.text}</div>}

          {puedeEditar && (
            <div style={s.btnRow}>
              <button type="button" style={s.btnCancel} onClick={()=>router.push(`/proyecto/${id}`)}>
                Cancelar
              </button>
              <button type="submit" style={s.btn} disabled={saving}>
                {saving ? 'Guardando...' : '✓ Guardar cambios'}
              </button>
            </div>
          )}
        </form>

        {/* Zona de peligro — solo admin/finanzas */}
        {['finanzas','admin'].includes(perfil?.sector) && (
          <div style={s.danger}>
            <div style={s.dangerTitle}>⚠️ Zona de peligro</div>
            <div style={s.dangerDesc}>
              Estas acciones son irreversibles. Procedé con cuidado.
            </div>
            {!confirm ? (
              <button type="button" style={s.dangerBtn} onClick={()=>setConfirm(true)}>
                Eliminar proyecto
              </button>
            ) : (
              <div>
                <div style={{fontSize:13,color:'#c53030',marginBottom:12,fontWeight:500}}>
                  ¿Estás seguro? Se eliminarán el proyecto, todas sus unidades y su historial de avance.
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button type="button" style={{...s.dangerBtn,background:'#c53030',color:'#fff',border:'none'}}
                    onClick={async()=>{
                      await supabase.from('proyectos').delete().eq('id', id)
                      router.push('/dashboard')
                    }}>
                    Sí, eliminar definitivamente
                  </button>
                  <button type="button" style={{...s.dangerBtn,color:'#888',borderColor:'#ddd'}}
                    onClick={()=>setConfirm(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
