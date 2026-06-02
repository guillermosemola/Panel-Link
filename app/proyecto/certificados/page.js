'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

const ETAPAS = ['fundaciones','estructura','instalaciones','cerramientos','terminaciones','entrega']
const ETAPA_LABEL = {
  fundaciones:'Fundaciones', estructura:'Estructura', instalaciones:'Instalaciones',
  cerramientos:'Cerramientos', terminaciones:'Terminaciones', entrega:'Entrega'
}
const ETAPA_COLOR = {
  fundaciones:{ bg:'#FFF3E0', color:'#E65100' },
  estructura: { bg:'#FAEEDA', color:'#633806' },
  instalaciones:{ bg:'#EDE7F6', color:'#4527A0' },
  cerramientos:{ bg:'#E3F2FD', color:'#0D47A1' },
  terminaciones:{ bg:'#E8F5E9', color:'#1B5E20' },
  entrega:    { bg:'#EAF3DE', color:'#27500A' },
}
const SECTOR_COLOR = {
  finanzas: { bg:'#E6F1FB', color:'#0C447C' },
  tecnica:  { bg:'#EEEDFE', color:'#3C3489' },
  obra:     { bg:'#FAEEDA', color:'#633806' },
  comercial:{ bg:'#E1F5EE', color:'#085041' },
}

const fmtK = n => {
  if (!n && n !== 0) return '—'
  const a = Math.abs(n), s = n < 0 ? '-' : ''
  if (a >= 1e6) return s + '$' + (a/1e6).toFixed(2) + 'M'
  if (a >= 1e3) return s + '$' + Math.round(a/1e3) + 'K'
  return s + '$' + Math.round(a)
}

const s = {
  page:  { minHeight:'100vh', background:'#f8f8f6', fontFamily:'system-ui,sans-serif' },
  nav:   { background:'#fff', borderBottom:'0.5px solid #e0ddd6', padding:'0 1.5rem',
           height:52, display:'flex', alignItems:'center', justifyContent:'space-between' },
  navL:  { display:'flex', alignItems:'center', gap:10 },
  back:  { fontSize:13, color:'#888', cursor:'pointer', background:'none', border:'none' },
  pill:  { fontSize:11, fontWeight:500, padding:'2px 9px', borderRadius:20 },
  main:  { maxWidth:1100, margin:'0 auto', padding:'1.5rem' },
  h1:    { fontSize:20, fontWeight:500, marginBottom:4 },
  sub:   { fontSize:13, color:'#888', marginBottom:24 },
  grid:  { display:'grid', gridTemplateColumns:'400px 1fr', gap:24, alignItems:'start' },
  card:  { background:'#fff', border:'0.5px solid #e0ddd6', borderRadius:12, padding:'1.25rem' },
  sectionLabel: { fontSize:11, fontWeight:500, letterSpacing:'0.07em', textTransform:'uppercase',
    color:'#aaa', borderBottom:'0.5px solid #e0ddd6', paddingBottom:8, marginBottom:14 },
  label: { fontSize:12, color:'#555', marginBottom:4, display:'block' },
  input: { width:'100%', padding:'8px 10px', fontSize:13, borderRadius:8,
           border:'0.5px solid #ccc', background:'#fafafa', outline:'none', marginBottom:10 },
  select:{ width:'100%', padding:'8px 10px', fontSize:13, borderRadius:8,
           border:'0.5px solid #ccc', background:'#fafafa', outline:'none', marginBottom:10 },
  textarea:{ width:'100%', padding:'8px 10px', fontSize:13, borderRadius:8,
             border:'0.5px solid #ccc', background:'#fafafa', outline:'none',
             resize:'vertical', minHeight:70, marginBottom:10 },
  row2:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  btn:   { width:'100%', padding:'10px', fontSize:13, fontWeight:500, borderRadius:8,
           border:'none', background:'#1a1a18', color:'#fff', cursor:'pointer' },
  ok:    { fontSize:12, color:'#27500A', background:'#EAF3DE', borderRadius:6,
           padding:'8px 10px', marginBottom:10 },
  err:   { fontSize:12, color:'#A32D2D', background:'#FCEBEB', borderRadius:6,
           padding:'8px 10px', marginBottom:10 },
  // tabla certificados
  table: { width:'100%', borderCollapse:'collapse', fontSize:12 },
  th:    { textAlign:'left', padding:'8px 10px', fontSize:11, fontWeight:500,
           color:'#aaa', borderBottom:'0.5px solid #e0ddd6', letterSpacing:'0.04em' },
  td:    { padding:'10px', borderBottom:'0.5px solid #f0ede8', color:'#333',
           verticalAlign:'middle' },
  // resumen
  kpiRow:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 },
  kpi:   { background:'#f8f8f6', border:'0.5px solid #e0ddd6', borderRadius:10,
           padding:'0.75rem 1rem' },
  klbl:  { fontSize:11, color:'#aaa', marginBottom:2 },
  kval:  { fontSize:17, fontWeight:500, color:'#1a1a18' },
  // barra de avance
  barWrap:{ background:'#eee', borderRadius:20, height:8, marginTop:6 },
  bar:   { height:8, borderRadius:20, background:'#185FA5', transition:'width .3s' },
}

export default function CertificadosPage() {
  const { id } = useParams()
  const router  = useRouter()
  const [perfil,       setPerfil]       = useState(null)
  const [proyecto,     setProyecto]     = useState(null)
  const [certs,        setCerts]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState({ type:'', text:'' })
  const [form,         setForm]         = useState({
    mes_numero:'', etapa:'estructura',
    pct_avance_fisico:'', costo_real_mes:'',
    costo_presupuestado_mes:'', observaciones:''
  })

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setPerfil(perf)
    const { data: proj } = await supabase.from('proyectos').select('*').eq('id', id).single()
    setProyecto(proj)
    const { data: av } = await supabase.from('avance_obra')
      .select('*').eq('proyecto_id', id).order('mes_numero')
    setCerts(av || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function guardar(e) {
    e.preventDefault()
    setSaving(true); setMsg({ type:'', text:'' })
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      proyecto_id:             id,
      cargado_por:             user.id,
      mes_numero:              +form.mes_numero,
      etapa:                   form.etapa,
      pct_avance_fisico:       +form.pct_avance_fisico,
      costo_real_mes:          +form.costo_real_mes,
      costo_presupuestado_mes: +form.costo_presupuestado_mes,
      observaciones:           form.observaciones || null,
      fecha_carga:             new Date().toISOString().split('T')[0],
    }
    const { error } = await supabase.from('avance_obra')
      .upsert(payload, { onConflict: 'proyecto_id,mes_numero' })
    if (error) {
      setMsg({ type:'err', text: error.message })
    } else {
      setMsg({ type:'ok', text: `Certificado mes ${form.mes_numero} guardado correctamente.` })
      setForm({ mes_numero:'', etapa:'estructura', pct_avance_fisico:'',
                costo_real_mes:'', costo_presupuestado_mes:'', observaciones:'' })
      loadData()
    }
    setSaving(false)
  }

  async function eliminar(mesNumero) {
    if (!confirm(`¿Eliminar el certificado del mes ${mesNumero}?`)) return
    await supabase.from('avance_obra')
      .delete().eq('proyecto_id', id).eq('mes_numero', mesNumero)
    loadData()
  }

  if (loading) return (
    <div style={{ ...s.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#aaa', fontSize:14 }}>Cargando...</div>
    </div>
  )

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas

  // KPIs resumen
  const totalReal    = certs.reduce((a, c) => a + (+c.costo_real_mes || 0), 0)
  const totalPresup  = certs.reduce((a, c) => a + (+c.costo_presupuestado_mes || 0), 0)
  const desvio       = totalReal - totalPresup
  const ultimoCert   = certs.length > 0 ? certs[certs.length - 1] : null
  const avanceActual = ultimoCert ? +ultimoCert.pct_avance_fisico : 0

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navL}>
          <button style={s.back} onClick={() => router.push(`/proyecto/${id}`)}>
            ← Simulador
          </button>
          <div style={{ fontSize:14, fontWeight:500 }}>
            {proyecto?.nombre} · Certificados de avance
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ ...s.pill, background:sc.bg, color:sc.color }}>{perfil?.sector}</span>
          <span style={{ fontSize:13, color:'#888' }}>{perfil?.nombre_completo}</span>
        </div>
      </nav>

      <div style={s.main}>
        <div style={s.h1}>Certificados de obra</div>
        <div style={s.sub}>
          Registrá el avance físico y el costo ejecutado por mes. 
          Si ya existe un certificado para ese mes, se actualiza automáticamente.
        </div>

        {/* KPIs resumen */}
        <div style={s.kpiRow}>
          <div style={s.kpi}>
            <div style={s.klbl}>Avance físico actual</div>
            <div style={s.kval}>{avanceActual.toFixed(1)}%</div>
            <div style={s.barWrap}>
              <div style={{ ...s.bar, width: `${Math.min(avanceActual,100)}%` }} />
            </div>
          </div>
          <div style={s.kpi}>
            <div style={s.klbl}>Costo real acumulado</div>
            <div style={s.kval}>{fmtK(totalReal)}</div>
            <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
              Presupuestado: {fmtK(totalPresup)}
            </div>
          </div>
          <div style={{ ...s.kpi, borderColor: desvio > 0 ? '#F09595' : '#C0DD97',
            background: desvio > 0 ? '#FCEBEB' : '#EAF3DE' }}>
            <div style={s.klbl}>Desvío acumulado</div>
            <div style={{ ...s.kval, color: desvio > 0 ? '#A32D2D' : '#27500A' }}>
              {desvio > 0 ? '+' : ''}{fmtK(desvio)}
            </div>
            <div style={{ fontSize:11, color:'#888', marginTop:2 }}>
              {desvio > 0 ? '↑ por encima del presupuesto' : desvio < 0 ? '↓ por debajo del presupuesto' : 'sin desvío'}
            </div>
          </div>
        </div>

        <div style={s.grid}>
          {/* Formulario */}
          <div style={s.card}>
            <div style={s.sectionLabel}>Nuevo certificado</div>
            {msg.text && (
              <div style={msg.type === 'ok' ? s.ok : s.err}>
                {msg.type === 'ok' ? '✅ ' : '⚠️ '}{msg.text}
              </div>
            )}
            <form onSubmit={guardar}>
              <div style={s.row2}>
                <div>
                  <label style={s.label}>Mes de obra *</label>
                  <input style={s.input} type="number" min="1" max="60" required
                    placeholder="Ej: 3"
                    value={form.mes_numero}
                    onChange={e => setF('mes_numero', e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Avance físico (%) *</label>
                  <input style={s.input} type="number" min="0" max="100" step="0.1" required
                    placeholder="Ej: 35.5"
                    value={form.pct_avance_fisico}
                    onChange={e => setF('pct_avance_fisico', e.target.value)} />
                </div>
              </div>

              <label style={s.label}>Etapa</label>
              <select style={s.select} value={form.etapa}
                onChange={e => setF('etapa', e.target.value)}>
                {ETAPAS.map(et => (
                  <option key={et} value={et}>{ETAPA_LABEL[et]}</option>
                ))}
              </select>

              <div style={s.row2}>
                <div>
                  <label style={s.label}>Costo real del mes (USD) *</label>
                  <input style={s.input} type="number" min="0" required
                    placeholder="Ej: 85000"
                    value={form.costo_real_mes}
                    onChange={e => setF('costo_real_mes', e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Costo presupuestado (USD) *</label>
                  <input style={s.input} type="number" min="0" required
                    placeholder="Ej: 80000"
                    value={form.costo_presupuestado_mes}
                    onChange={e => setF('costo_presupuestado_mes', e.target.value)} />
                </div>
              </div>

              <label style={s.label}>Observaciones</label>
              <textarea style={s.textarea}
                placeholder="Descripción del avance, trabajos ejecutados, novedades..."
                value={form.observaciones}
                onChange={e => setF('observaciones', e.target.value)} />

              <button style={s.btn} type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar certificado'}
              </button>
            </form>
          </div>

          {/* Tabla de certificados */}
          <div style={s.card}>
            <div style={s.sectionLabel}>
              Historial · {certs.length} certificado{certs.length !== 1 ? 's' : ''} cargado{certs.length !== 1 ? 's' : ''}
            </div>
            {certs.length === 0 ? (
              <div style={{ color:'#aaa', fontSize:13, padding:'1rem 0', textAlign:'center' }}>
                No hay certificados cargados aún.
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Mes</th>
                      <th style={s.th}>Etapa</th>
                      <th style={s.th}>Avance</th>
                      <th style={s.th}>Real</th>
                      <th style={s.th}>Presup.</th>
                      <th style={s.th}>Desvío</th>
                      <th style={s.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {certs.map(c => {
                      const dev = (+c.costo_real_mes) - (+c.costo_presupuestado_mes)
                      const ec  = ETAPA_COLOR[c.etapa] || ETAPA_COLOR.estructura
                      return (
                        <tr key={c.id}>
                          <td style={s.td}>
                            <span style={{ fontWeight:500 }}>M{c.mes_numero}</span>
                            <div style={{ fontSize:10, color:'#aaa' }}>
                              {c.fecha_carga ? new Date(c.fecha_carga).toLocaleDateString('es-AR') : ''}
                            </div>
                          </td>
                          <td style={s.td}>
                            <span style={{ ...s.pill, background:ec.bg, color:ec.color, fontSize:10 }}>
                              {ETAPA_LABEL[c.etapa] || c.etapa}
                            </span>
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight:500 }}>{(+c.pct_avance_fisico).toFixed(1)}%</div>
                            <div style={{ ...s.barWrap, width:60, marginTop:4 }}>
                              <div style={{ ...s.bar, width:`${Math.min(+c.pct_avance_fisico,100)}%`,
                                height:4, background:'#185FA5' }} />
                            </div>
                          </td>
                          <td style={s.td}>{fmtK(+c.costo_real_mes)}</td>
                          <td style={s.td}>{fmtK(+c.costo_presupuestado_mes)}</td>
                          <td style={{ ...s.td,
                            color: dev > 0 ? '#A32D2D' : dev < 0 ? '#27500A' : '#888',
                            fontWeight: Math.abs(dev) > 0 ? 500 : 400 }}>
                            {dev > 0 ? '+' : ''}{fmtK(dev)}
                          </td>
                          <td style={s.td}>
                            <button onClick={() => eliminar(c.mes_numero)}
                              style={{ fontSize:11, color:'#aaa', background:'none',
                                border:'none', cursor:'pointer' }}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {c => c.observaciones && (
                  <div style={{ fontSize:11, color:'#888', marginTop:4, fontStyle:'italic' }}>
                    {c.observaciones}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
