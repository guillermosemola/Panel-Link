'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

const ESTADOS = ['planificacion','en_obra','terminado','suspendido']
const ESTADO_LABELS = {
  planificacion:'Planificación', en_obra:'En obra',
  terminado:'Terminado', suspendido:'Suspendido'
}

const s = {
  page:  { minHeight:'100vh', background:'#f8f8f6', fontFamily:'system-ui,sans-serif' },
  nav:   { background:'#fff', borderBottom:'0.5px solid #e0ddd6', padding:'0 2rem',
           height:52, display:'flex', alignItems:'center', justifyContent:'space-between' },
  navL:  { display:'flex', alignItems:'center', gap:12 },
  back:  { fontSize:13, color:'#888', cursor:'pointer', background:'none', border:'none' },
  title: { fontSize:14, fontWeight:500 },
  wrap:  { maxWidth:560, margin:'0 auto', padding:'2rem 1.5rem' },
  h1:    { fontSize:22, fontWeight:500, marginBottom:6 },
  sub:   { fontSize:14, color:'#888', marginBottom:28 },
  card:  { background:'#fff', border:'0.5px solid #e0ddd6', borderRadius:12,
           padding:'1.75rem', display:'flex', flexDirection:'column', gap:18 },
  label: { fontSize:13, color:'#555', marginBottom:5, display:'block' },
  input: { width:'100%', padding:'9px 12px', fontSize:14, borderRadius:8,
           border:'0.5px solid #ccc', background:'#fafafa', outline:'none' },
  select:{ width:'100%', padding:'9px 12px', fontSize:14, borderRadius:8,
           border:'0.5px solid #ccc', background:'#fafafa', outline:'none' },
  row2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  btn:   { padding:'11px', fontSize:14, fontWeight:500, borderRadius:8,
           border:'none', background:'#1a1a18', color:'#fff', cursor:'pointer' },
  btnSec:{ padding:'11px', fontSize:14, fontWeight:500, borderRadius:8,
           border:'0.5px solid #ccc', background:'#fff', color:'#555', cursor:'pointer' },
  err:   { fontSize:13, color:'#A32D2D', background:'#FCEBEB',
           borderRadius:6, padding:'8px 12px' },
  ok:    { fontSize:13, color:'#27500A', background:'#EAF3DE',
           borderRadius:6, padding:'8px 12px' },
  pill:  { fontSize:11, fontWeight:500, padding:'2px 9px', borderRadius:20 },
  locked:{ background:'#f8f8f6', border:'0.5px solid #e0ddd6', borderRadius:8,
           padding:'10px 12px', fontSize:13, color:'#aaa', fontStyle:'italic' },
  sectionLabel: { fontSize:11, fontWeight:500, letterSpacing:'0.07em',
    textTransform:'uppercase', color:'#aaa', borderBottom:'0.5px solid #e0ddd6',
    paddingBottom:8, marginBottom:4 },
}

const SECTOR_COLOR = {
  finanzas: { bg:'#E6F1FB', color:'#0C447C' },
  tecnica:  { bg:'#EEEDFE', color:'#3C3489' },
  obra:     { bg:'#FAEEDA', color:'#633806' },
  comercial:{ bg:'#E1F5EE', color:'#085041' },
}

export default function EditarProyecto() {
  const { id } = useParams()
  const router  = useRouter()
  const [perfil,   setPerfil]   = useState(null)
  const [form,     setForm]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState({ type:'', text:'' })

  // Sectores que pueden editar datos del proyecto
  const puedeEditar = perfil && ['finanzas','tecnica'].includes(perfil.sector)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: perf } = await supabase.from('usuarios')
        .select('*').eq('id', user.id).single()
      setPerfil(perf)
      const { data: proj } = await supabase.from('proyectos')
        .select('*').eq('id', id).single()
      if (proj) setForm({
        nombre:      proj.nombre      || '',
        descripcion: proj.descripcion || '',
        estado:      proj.estado      || 'planificacion',
        m2_totales:  proj.m2_totales  || '',
        plazo_meses: proj.plazo_meses || '',
        fecha_inicio:proj.fecha_inicio || '',
      })
      setLoading(false)
    }
    load()
  }, [id])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function guardar(e) {
    e.preventDefault()
    if (!puedeEditar) return
    setSaving(true); setMsg({ type:'', text:'' })

    const { error } = await supabase.from('proyectos').update({
      nombre:      form.nombre,
      descripcion: form.descripcion || null,
      estado:      form.estado,
      m2_totales:  form.m2_totales  ? +form.m2_totales  : null,
      plazo_meses: form.plazo_meses ? +form.plazo_meses : null,
      fecha_inicio:form.fecha_inicio || null,
    }).eq('id', id)

    setSaving(false)
    if (error) setMsg({ type:'err', text: error.message })
    else       setMsg({ type:'ok',  text: 'Cambios guardados correctamente.' })
  }

  if (loading || !form) return (
    <div style={{ ...s.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#aaa', fontSize:14 }}>Cargando...</div>
    </div>
  )

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navL}>
          <button style={s.back} onClick={() => router.push(`/proyecto/${id}`)}>
            ← Volver al simulador
          </button>
          <div style={s.title}>Datos del proyecto</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ ...s.pill, background:sc.bg, color:sc.color }}>
            {perfil?.sector}
          </span>
          <span style={{ fontSize:13, color:'#888' }}>{perfil?.nombre_completo}</span>
        </div>
      </nav>

      <div style={s.wrap}>
        <div style={s.h1}>{form.nombre}</div>
        <div style={s.sub}>
          {puedeEditar
            ? 'Editá los datos generales del proyecto. Los cambios son visibles para todos los sectores.'
            : 'Solo Finanzas y Técnica pueden editar los datos del proyecto.'}
        </div>

        {msg.text && (
          <div style={{ ...(msg.type === 'ok' ? s.ok : s.err), marginBottom:20 }}>
            {msg.type === 'ok' ? '✅ ' : '⚠️ '}{msg.text}
          </div>
        )}

        <form onSubmit={guardar} style={s.card}>

          {/* ── Identificación ── */}
          <div style={s.sectionLabel}>Identificación</div>
          <div>
            <label style={s.label}>Nombre del proyecto</label>
            {puedeEditar
              ? <input style={s.input} value={form.nombre} required
                  onChange={e => set('nombre', e.target.value)} />
              : <div style={s.locked}>{form.nombre}</div>}
          </div>
          <div>
            <label style={s.label}>Descripción</label>
            {puedeEditar
              ? <input style={s.input} value={form.descripcion}
                  onChange={e => set('descripcion', e.target.value)}
                  placeholder="Breve descripción" />
              : <div style={s.locked}>{form.descripcion || '—'}</div>}
          </div>
          <div>
            <label style={s.label}>Estado</label>
            {puedeEditar
              ? <select style={s.select} value={form.estado}
                  onChange={e => set('estado', e.target.value)}>
                  {ESTADOS.map(e => (
                    <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
                  ))}
                </select>
              : <div style={s.locked}>{ESTADO_LABELS[form.estado]}</div>}
          </div>

          {/* ── Escala y plazos ── */}
          <div style={{ ...s.sectionLabel, marginTop:8 }}>Escala y plazos</div>
          <div style={s.row2}>
            <div>
              <label style={s.label}>m² totales construidos</label>
              {puedeEditar
                ? <input style={s.input} type="number" value={form.m2_totales}
                    onChange={e => set('m2_totales', e.target.value)}
                    placeholder="5000" />
                : <div style={s.locked}>{form.m2_totales || '—'}</div>}
            </div>
            <div>
              <label style={s.label}>Plazo de obra (meses)</label>
              {puedeEditar
                ? <input style={s.input} type="number" value={form.plazo_meses}
                    onChange={e => set('plazo_meses', e.target.value)}
                    placeholder="24" min="1" max="60" />
                : <div style={s.locked}>{form.plazo_meses || '—'}</div>}
            </div>
          </div>
          <div>
            <label style={s.label}>Fecha de inicio de obra</label>
            {puedeEditar
              ? <input style={s.input} type="date" value={form.fecha_inicio}
                  onChange={e => set('fecha_inicio', e.target.value)} />
              : <div style={s.locked}>
                  {form.fecha_inicio
                    ? new Date(form.fecha_inicio).toLocaleDateString('es-AR')
                    : '—'}
                </div>}
          </div>

          {/* ── Botones ── */}
          {puedeEditar && (
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button style={s.btn} type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button style={s.btnSec} type="button"
                onClick={() => router.push(`/proyecto/${id}`)}>
                Cancelar
              </button>
            </div>
          )}

          {!puedeEditar && (
            <div style={s.locked}>
              Tu sector ({perfil?.sector}) tiene acceso de solo lectura a esta pantalla.
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
