'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { simular } from '../../../lib/simulador'
import SimuladorPanel from '../../../components/SimuladorPanel'
import GraficosPanel from '../../../components/GraficosPanel'

const SECTOR_CAMPOS = {
  tecnica:   ['m2_totales','eficiencia_pct','plazo_meses'],
  obra:      ['costo_directo_m2','indirectos_pct','contingencias_pct'],
  finanzas:  ['precio_terreno','capital_propio'],
  comercial: ['precio_mercado_m2','ritmo_venta_m2'],
}

const DEFAULTS = {
  m2_totales:5000, eficiencia_pct:78, plazo_meses:24,
  costo_directo_m2:900, indirectos_pct:20, contingencias_pct:5,
  precio_terreno:500000, capital_propio:400000,
  precio_mercado_m2:2200, ritmo_venta_m2:120,
}

const s = {
  page: { minHeight:'100vh', background:'#f8f8f6', fontFamily:'system-ui,sans-serif' },
  nav: { background:'#fff', borderBottom:'0.5px solid #e0ddd6',
    padding:'0 2rem', height:52, display:'flex', alignItems:'center',
    justifyContent:'space-between' },
  navLeft: { display:'flex', alignItems:'center', gap:12 },
  backBtn: { fontSize:13, color:'#888', cursor:'pointer',
    background:'none', border:'none' },
  navTitle: { fontSize:14, fontWeight:500 },
  estadoPill: { fontSize:11, fontWeight:500, padding:'2px 9px', borderRadius:20 },
  main: { maxWidth:1200, margin:'0 auto', padding:'2rem 1.5rem',
    display:'grid', gridTemplateColumns:'340px 1fr', gap:24 },
  saveBtn: { width:'100%', padding:'10px', marginTop:8, fontSize:13,
    fontWeight:500, borderRadius:8, border:'none',
    background:'#1a1a18', color:'#fff', cursor:'pointer' },
  savedMsg: { fontSize:12, color:'#27500A', textAlign:'center',
    background:'#EAF3DE', borderRadius:6, padding:'6px', marginTop:6 },
}

const ESTADO_STYLES = {
  planificacion: { bg:'#EEEDFE', color:'#3C3489' },
  en_obra:       { bg:'#FAEEDA', color:'#633806' },
  terminado:     { bg:'#EAF3DE', color:'#27500A' },
  suspendido:    { bg:'#FCEBEB', color:'#791F1F' },
}

export default function ProyectoPage() {
  const { id } = useParams()
  const router  = useRouter()
  const [proyecto, setProyecto]   = useState(null)
  const [perfil, setPerfil]       = useState(null)
  const [inputs, setInputs]       = useState(DEFAULTS)
  const [resultado, setResultado] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: perf } = await supabase.from('usuarios')
        .select('*').eq('id', user.id).single()
      setPerfil(perf)
      const { data: proj } = await supabase.from('proyectos')
        .select('*').eq('id', id).single()
      setProyecto(proj)
      // Cargar variables vigentes (última versión por sector)
      const { data: vars } = await supabase.from('v_variables_vigentes')
        .select('*').eq('proyecto_id', id)
      if (vars && vars.length > 0) {
        const merged = { ...DEFAULTS }
        vars.forEach(v => {
          Object.keys(DEFAULTS).forEach(k => {
            if (v[k] != null) merged[k] = +v[k]
          })
        })
        setInputs(merged)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (inputs && inputs.plazo_meses > 0) {
      setResultado(simular(inputs))
    }
  }, [inputs])

  function handleChange(key, val) {
    setInputs(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  async function guardarVariables() {
    setSaving(true)
    const sector = perfil?.sector
    const campos = SECTOR_CAMPOS[sector] || []
    const payload = { proyecto_id: id, modificado_por: perfil.id, sector_origen: sector }
    campos.forEach(k => { payload[k] = inputs[k] })
    await supabase.from('variables_proyecto').insert(payload)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!proyecto || !perfil) return (
    <div style={{...s.page,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'#aaa',fontSize:14}}>Cargando proyecto...</div>
    </div>
  )

  const es = ESTADO_STYLES[proyecto.estado] || ESTADO_STYLES.planificacion
  const sectorCampos = SECTOR_CAMPOS[perfil.sector] || []

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <button style={s.backBtn} onClick={() => router.push('/dashboard')}>
            ← Inicio
          </button>
          <div style={s.navTitle}>{proyecto.nombre}</div>
          <span style={{...s.estadoPill, background:es.bg, color:es.color}}>
            {proyecto.estado.replace('_',' ')}
          </span>
        </div>
        <div style={{fontSize:13,color:'#888'}}>{perfil.nombre_completo} · {perfil.sector}</div>
      </nav>

      <div style={s.main}>
        <div>
          <SimuladorPanel
            inputs={inputs}
            onChange={handleChange}
            sector={perfil.sector}
            camposEditables={sectorCampos}
          />
          <button style={s.saveBtn} onClick={guardarVariables} disabled={saving}>
            {saving ? 'Guardando...' : `Guardar variables (${perfil.sector})`}
          </button>
          {saved && <div style={s.savedMsg}>Guardado correctamente.</div>}
        </div>
        <div>
          {resultado && (
            <GraficosPanel resultado={resultado} inputs={inputs} />
          )}
        </div>
      </div>
    </div>
  )
}
