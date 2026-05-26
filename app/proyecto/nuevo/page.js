'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

const s = {
  page: { minHeight:'100vh', background:'#f8f8f6', fontFamily:'system-ui,sans-serif' },
  wrap: { maxWidth:560, margin:'0 auto', padding:'2.5rem 1.5rem' },
  back: { fontSize:13, color:'#888', cursor:'pointer', marginBottom:24,
    display:'inline-flex', alignItems:'center', gap:6, background:'none', border:'none' },
  title: { fontSize:22, fontWeight:500, marginBottom:6 },
  sub: { fontSize:14, color:'#888', marginBottom:28 },
  card: { background:'#fff', border:'0.5px solid #e0ddd6',
    borderRadius:12, padding:'1.75rem', display:'flex', flexDirection:'column', gap:18 },
  label: { fontSize:13, color:'#555', marginBottom:5, display:'block' },
  input: { width:'100%', padding:'9px 12px', fontSize:14, borderRadius:8,
    border:'0.5px solid #ccc', background:'#fafafa', outline:'none' },
  select: { width:'100%', padding:'9px 12px', fontSize:14, borderRadius:8,
    border:'0.5px solid #ccc', background:'#fafafa', outline:'none' },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  btn: { padding:'11px', fontSize:14, fontWeight:500, borderRadius:8,
    border:'none', background:'#1a1a18', color:'#fff', cursor:'pointer' },
  err: { fontSize:13, color:'#A32D2D', background:'#FCEBEB', borderRadius:6, padding:'8px 12px' },
}

export default function NuevoProyecto() {
  const [form, setForm] = useState({
    nombre:'', descripcion:'', estado:'planificacion',
    m2_totales:'', plazo_meses:'', fecha_inicio:''
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const router = useRouter()

  function set(k, v) { setForm(f => ({...f, [k]: v})) }

  async function guardar(e) {
    e.preventDefault(); setLoading(true); setErr('')
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perf } = await supabase.from('usuarios')
      .select('empresa_id,sector').eq('id', user.id).single()
    if (perf?.sector !== 'finanzas') {
      setErr('Solo finanzas puede crear proyectos.'); setLoading(false); return
    }
    const { data, error } = await supabase.from('proyectos').insert({
      empresa_id: perf.empresa_id,
      nombre: form.nombre, descripcion: form.descripcion || null,
      estado: form.estado,
      m2_totales: form.m2_totales ? +form.m2_totales : null,
      plazo_meses: form.plazo_meses ? +form.plazo_meses : null,
      fecha_inicio: form.fecha_inicio || null,
    }).select().single()
    if (error) { setErr(error.message); setLoading(false) }
    else router.push('/proyecto/' + data.id)
  }

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <button style={s.back} onClick={() => router.push('/dashboard')}>
          ← Volver al inicio
        </button>
        <div style={s.title}>Nuevo proyecto</div>
        <div style={s.sub}>Las variables financieras se cargan desde el simulador una vez creado.</div>
        {err && <div style={{...s.err, marginBottom:16}}>{err}</div>}
        <form onSubmit={guardar} style={s.card}>
          <div>
            <label style={s.label}>Nombre del proyecto *</label>
            <input style={s.input} value={form.nombre} required
              onChange={e=>set('nombre',e.target.value)}
              placeholder="Ej: Torre Belgrano · Etapa 1" />
          </div>
          <div>
            <label style={s.label}>Descripción</label>
            <input style={s.input} value={form.descripcion}
              onChange={e=>set('descripcion',e.target.value)} />
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>Estado</label>
              <select style={s.select} value={form.estado}
                onChange={e=>set('estado',e.target.value)}>
                <option value="planificacion">Planificación</option>
                <option value="en_obra">En obra</option>
                <option value="terminado">Terminado</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Fecha de inicio</label>
              <input style={s.input} type="date" value={form.fecha_inicio}
                onChange={e=>set('fecha_inicio',e.target.value)} />
            </div>
          </div>
          <div style={s.row}>
            <div>
              <label style={s.label}>m² totales</label>
              <input style={s.input} type="number" value={form.m2_totales}
                onChange={e=>set('m2_totales',e.target.value)} placeholder="5000" />
            </div>
            <div>
              <label style={s.label}>Plazo (meses)</label>
              <input style={s.input} type="number" value={form.plazo_meses}
                onChange={e=>set('plazo_meses',e.target.value)} placeholder="24" />
            </div>
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Crear proyecto'}
          </button>
        </form>
      </div>
    </div>
  )
}
