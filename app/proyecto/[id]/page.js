'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { simular } from '../../../lib/simulador'
import SimuladorPanel from '../../../components/SimuladorPanel'
import GraficosPanel from '../../../components/GraficosPanel'

const DEFAULTS = {
  m2_totales:5000, eficiencia_pct:78, plazo_meses:24,
  costo_directo_m2:900, indirectos_pct:20, contingencias_pct:5,
  precio_terreno:500000, capital_propio:400000,
  precio_mercado_m2:2200, ritmo_venta_m2:120,
  socios:[], modo_cochera:'fijo',
  cant_cocheras:0, precio_cochera_usd:0,
  m2_cochera:0, precio_m2_cochera:0, ritmo_venta_cocheras:0,
}

// Campos que cada sector puede modificar
const SECTOR_CAMPOS = {
  tecnica:   ['m2_totales','eficiencia_pct','plazo_meses'],
  obra:      ['costo_directo_m2','indirectos_pct','contingencias_pct'],
  finanzas:  ['precio_terreno','capital_propio','socios'],
  comercial: ['precio_mercado_m2','ritmo_venta_m2','modo_cochera',
              'cant_cocheras','precio_cochera_usd','m2_cochera',
              'precio_m2_cochera','ritmo_venta_cocheras'],
}

const ESTADO_STYLES = {
  planificacion:{ bg:'#EEEDFE', color:'#3C3489' },
  en_obra:      { bg:'#FAEEDA', color:'#633806' },
  terminado:    { bg:'#EAF3DE', color:'#27500A' },
  suspendido:   { bg:'#FCEBEB', color:'#791F1F' },
}
const SECTOR_COLOR = {
  finanzas: { bg:'#E6F1FB', color:'#0C447C' },
  tecnica:  { bg:'#EEEDFE', color:'#3C3489' },
  obra:     { bg:'#FAEEDA', color:'#633806' },
  comercial:{ bg:'#E1F5EE', color:'#085041' },
}

const s = {
  page:    { minHeight:'100vh', background:'#f8f8f6', fontFamily:'system-ui,sans-serif' },
  nav:     { background:'#fff', borderBottom:'0.5px solid #e0ddd6', padding:'0 1.5rem',
             height:52, display:'flex', alignItems:'center', justifyContent:'space-between' },
  navL:    { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' },
  back:    { fontSize:13, color:'#888', cursor:'pointer', background:'none', border:'none' },
  navTitle:{ fontSize:14, fontWeight:500 },
  pill:    { fontSize:11, fontWeight:500, padding:'2px 9px', borderRadius:20 },
  editBtn: { fontSize:12, color:'#555', background:'#f0ede8',
             border:'0.5px solid #ddd', borderRadius:6, padding:'4px 12px', cursor:'pointer' },
  main:    { maxWidth:1200, margin:'0 auto', padding:'1.5rem',
             display:'grid', gridTemplateColumns:'340px 1fr', gap:24 },
  saveBtn: { width:'100%', padding:'10px', marginTop:8, fontSize:13,
             fontWeight:500, borderRadius:8, border:'none',
             background:'#1a1a18', color:'#fff', cursor:'pointer' },
  savedMsg:{ fontSize:12, textAlign:'center', borderRadius:6, padding:'6px', marginTop:6 },
}

export default function ProyectoPage() {
  const { id } = useParams()
  const router  = useRouter()
  const [proyecto,  setProyecto]  = useState(null)
  const [perfil,    setPerfil]    = useState(null)
  const [inputs,    setInputs]    = useState(DEFAULTS)
  const [resultado, setResultado] = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState({ text:'', ok:true })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: perf } = await supabase.from('usuarios')
        .select('*').eq('id', user.id).single()

      // Si el usuario no está en la tabla usuarios, mostrar error claro
      if (!perf) {
        alert('Tu usuario no está registrado en el sistema. Contactá al administrador.')
        await supabase.auth.signOut()
        router.push('/login')
        return
      }
      setPerfil(perf)

      const { data: proj } = await supabase.from('proyectos')
        .select('*').eq('id', id).single()
      setProyecto(proj)

      // Cargar variables consolidadas (una fila con todos los sectores combinados)
      const { data: vars } = await supabase
        .from('v_variables_vigentes')
        .select('*')
        .eq('proyecto_id', id)
        .single()

      if (vars) {
        const merged = { ...DEFAULTS }
        Object.keys(DEFAULTS).forEach(k => {
          if (vars[k] != null) {
            if (k === 'socios') {
              merged[k] = Array.isArray(vars[k]) ? vars[k] : []
            } else if (typeof DEFAULTS[k] === 'number') {
              merged[k] = +vars[k]
            } else {
              merged[k] = vars[k]
            }
          }
        })
        setInputs(merged)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (inputs?.plazo_meses > 0) setResultado(simular(inputs))
  }, [inputs])

  function handleChange(key, val) {
    setInputs(prev => ({ ...prev, [key]: val }))
    setSaveMsg({ text:'', ok:true })
  }

  async function guardarVariables() {
    setSaving(true)
    setSaveMsg({ text:'', ok:true })
    const sector = perfil?.sector
    const campos = SECTOR_CAMPOS[sector] || []

    // Construir payload con solo los campos de su sector
    const payload = {
      proyecto_id:   id,
      modificado_por: perfil.id,
      sector_origen: sector,
    }
    campos.forEach(k => {
      payload[k] = inputs[k] ?? null
    })

    const { error } = await supabase.from('variables_proyecto').insert(payload)
    setSaving(false)

    if (error) {
      setSaveMsg({ text: `Error: ${error.message}`, ok: false })
    } else {
      setSaveMsg({ text: `✅ Variables de ${sector} guardadas.`, ok: true })
      setTimeout(() => setSaveMsg({ text:'', ok:true }), 4000)
    }
  }

  if (!proyecto || !perfil) return (
    <div style={{ ...s.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#aaa', fontSize:14 }}>Cargando proyecto...</div>
    </div>
  )

  const es = ESTADO_STYLES[proyecto.estado] || ESTADO_STYLES.planificacion
  const sc = SECTOR_COLOR[perfil.sector] || SECTOR_COLOR.finanzas
  const puedeEditarDatos = ['finanzas','tecnica'].includes(perfil.sector)

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navL}>
          <button style={s.back} onClick={() => router.push('/dashboard')}>← Inicio</button>
          <div style={s.navTitle}>{proyecto.nombre}</div>
          <span style={{ ...s.pill, background:es.bg, color:es.color }}>
            {proyecto.estado.replace('_',' ')}
          </span>
          {proyecto.fecha_inicio && (
            <span style={{ fontSize:12, color:'#aaa' }}>
              Inicio: {new Date(proyecto.fecha_inicio).toLocaleDateString('es-AR')}
            </span>
          )}
          <button style={s.editBtn}
            onClick={() => router.push(`/proyecto/${id}/certificados`)}>
            📋 Certificados
          </button>
          {puedeEditarDatos && (
            <button style={s.editBtn}
              onClick={() => router.push(`/proyecto/${id}/editar`)}>
              ✏️ Datos del proyecto
            </button>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ ...s.pill, background:sc.bg, color:sc.color }}>{perfil.sector}</span>
          <span style={{ fontSize:13, color:'#888' }}>{perfil.nombre_completo}</span>
        </div>
      </nav>

      <div style={s.main}>
        <div>
          <SimuladorPanel
            inputs={inputs}
            onChange={handleChange}
            sector={perfil.sector}
            camposEditables={SECTOR_CAMPOS[perfil.sector] || []}
          />
          <button style={s.saveBtn} onClick={guardarVariables} disabled={saving}>
            {saving ? 'Guardando...' : `Guardar variables (${perfil.sector})`}
          </button>
          {saveMsg.text && (
            <div style={{
              ...s.savedMsg,
              background: saveMsg.ok ? '#EAF3DE' : '#FCEBEB',
              color: saveMsg.ok ? '#27500A' : '#A32D2D',
            }}>
              {saveMsg.text}
            </div>
          )}
          <div style={{ fontSize:11, color:'#bbb', marginTop:8, textAlign:'center' }}>
            Solo se guardan las variables de tu sector. Los otros sectores deben guardar las suyas.
          </div>
        </div>
        <div>
          {resultado && <GraficosPanel resultado={resultado} inputs={inputs} />}
        </div>
      </div>
    </div>
  )
}
