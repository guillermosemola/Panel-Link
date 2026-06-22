'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const SECTOR_COLOR = {
  finanzas:{bg:'#E6F1FB',color:'#0C447C'}, tecnica:{bg:'#EEEDFE',color:'#3C3489'},
  obra:{bg:'#FAEEDA',color:'#633806'}, comercial:{bg:'#E1F5EE',color:'#085041'},
}
const ESTADO_STYLE = {
  planificacion:{ bg:'#EEEDFE', color:'#3C3489', label:'Planificación' },
  en_obra:      { bg:'#FAEEDA', color:'#633806', label:'En obra' },
  terminado:    { bg:'#EAF3DE', color:'#27500A', label:'Terminado' },
  suspendido:   { bg:'#FCEBEB', color:'#791F1F', label:'Suspendido' },
}
const fmtUSD = n => n ? '$'+new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(+n) : '—'
const fmtM2  = n => n ? new Intl.NumberFormat('es-AR').format(Math.round(+n))+' m²' : '—'
const fmtM   = n => n==null?'—':n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1e3?`$${Math.round(n/1e3)}K`:`$${Math.round(n)}`

export default function ProyectoPage() {
  const { id }  = useParams()
  const router  = useRouter()
  const [perfil,   setPerfil]   = useState(null)
  const [proyecto, setProyecto] = useState(null)
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      if (!perf) { router.push('/login'); return }
      setPerfil(perf)

      const { data:proy } = await supabase.from('proyectos').select('*').eq('id', id).single()
      if (!proy) { router.push('/dashboard'); return }
      setProyecto(proy)

      // Stats de unidades
      const { data:unidades } = await supabase.from('unidades').select('estado, m2_propios').eq('proyecto_id', id)
      if (unidades) {
        const tot   = unidades.length
        const disp  = unidades.filter(u=>u.estado==='disponible').length
        const vend  = unidades.filter(u=>u.estado==='vendida').length
        const canje = unidades.filter(u=>u.estado==='canje_proveedor').length
        const m2tot = unidades.reduce((a,u)=>a+(+u.m2_propios||0), 0)
        setStats({ tot, disp, vend, canje, m2tot })
      }

      // Si no tiene EV, redirigir directamente al wizard de EV
      if (!proy.ev_costo_total_usd) {
        router.replace(`/nuevo-proyecto?id=${id}`)
        return
      }

      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#f8f8f6',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{color:'#aaa',fontSize:14}}>Cargando proyecto...</div>
    </div>
  )
  if (!proyecto) return null

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas
  const es = ESTADO_STYLE[proyecto.estado] || ESTADO_STYLE.planificacion
  const ev = proyecto.ev_snapshot ? (() => { try { return JSON.parse(proyecto.ev_snapshot) } catch { return null } })() : null

  const ACCIONES = [
    {
      key: 'gestion',
      icon: '📊',
      titulo: 'Panel de gestión',
      desc: 'Control presupuestario, performance comercial, descalce financiero y semáforos en tiempo real.',
      color: '#1a1a18',
      bg: '#fff',
      border: '#1a1a18',
      ruta: `/proyecto/${id}/gestion`,
    },
    {
      key: 'stock',
      icon: '🏢',
      titulo: 'Stock de unidades',
      desc: `${stats?.tot||0} unidades · ${stats?.disp||0} disponibles · ${stats?.vend||0} vendidas`,
      color: '#0C447C',
      bg: '#EBF5FB',
      border: '#AED6F1',
      ruta: `/proyecto/${id}/gestion`,
      tab: 'inventario',
    },
    {
      key: 'certificados',
      icon: '📈',
      titulo: 'Certificados de avance',
      desc: 'Cargá el avance mensual de obra para comparar real vs. proyectado.',
      color: '#27500A',
      bg: '#EAF3DE',
      border: '#A9DFBF',
      ruta: `/proyecto/${id}/certificados`,
    },
    {
      key: 'ev',
      icon: '💰',
      titulo: 'Evaluación de Viabilidad (EV)',
      desc: proyecto.ev_costo_total_usd
        ? `Costo: ${fmtM(+proyecto.ev_costo_total_usd)} · Ingreso: ${fmtM(+proyecto.ev_ingreso_total_usd)} · Margen: ${Number(proyecto.ev_margen_objetivo_pct||0).toFixed(1)}%`
        : 'Sin EV cargado. Hacé clic para configurarlo.',
      color: '#633806',
      bg: '#FAEEDA',
      border: '#F0B27A',
      ruta: `/nuevo-proyecto?id=${id}`,
    },
    {
      key: 'editar',
      icon: '✏️',
      titulo: 'Editar datos del proyecto',
      desc: 'Modificá nombre, descripción, estado, m² y plazo.',
      color: '#3C3489',
      bg: '#EEEDFE',
      border: '#C39BD3',
      ruta: `/proyecto/${id}/editar`,
    },
  ]

  return (
    <div style={{minHeight:'100vh',background:'#f8f8f6',fontFamily:'system-ui,sans-serif'}}>

      {/* ── NAVBAR ── */}
      <nav style={{background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'0 2rem',height:52,
        display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push('/dashboard')}
            style={{fontSize:13,color:'#888',background:'none',border:'none',cursor:'pointer'}}>
            ← Dashboard
          </button>
          <span style={{fontSize:12,color:'#e0ddd6'}}>|</span>
          <span style={{fontSize:14,fontWeight:500,color:'#1a1a18'}}>{proyecto.nombre}</span>
          <span style={{fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,
            background:es.bg,color:es.color}}>{es.label}</span>
        </div>
        <span style={{fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,
          background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
      </nav>

      {/* ── HEADER DEL PROYECTO ── */}
      <div style={{background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'1.5rem 2rem'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'flex',justifyContent:'space-between',
          alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
          <div>
            <h1 style={{fontSize:28,fontWeight:700,color:'#1a1a18',margin:'0 0 6px'}}>{proyecto.nombre}</h1>
            {proyecto.descripcion && <div style={{fontSize:14,color:'#888',marginBottom:10}}>{proyecto.descripcion}</div>}
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {proyecto.m2_totales  && <span style={{fontSize:12,color:'#555',background:'#f8f8f6',padding:'4px 10px',borderRadius:8}}>📐 {fmtM2(proyecto.m2_totales)}</span>}
              {proyecto.plazo_meses && <span style={{fontSize:12,color:'#555',background:'#f8f8f6',padding:'4px 10px',borderRadius:8}}>⏱ {proyecto.plazo_meses} meses</span>}
              {proyecto.fecha_ev    && <span style={{fontSize:12,color:'#555',background:'#f8f8f6',padding:'4px 10px',borderRadius:8}}>EV: {new Date(proyecto.fecha_ev).toLocaleDateString('es-AR',{month:'short',year:'numeric'})}</span>}
            </div>
          </div>
          {/* KPIs rápidos del EV */}
          {proyecto.ev_costo_total_usd && (
            <div style={{display:'flex',gap:12}}>
              {[
                {l:'Costo EV',    v:fmtM(+proyecto.ev_costo_total_usd)},
                {l:'Ingreso EV',  v:fmtM(+proyecto.ev_ingreso_total_usd)},
                {l:'Margen obj.', v:`${Number(proyecto.ev_margen_objetivo_pct||0).toFixed(1)}%`},
              ].map((k,i)=>(
                <div key={i} style={{textAlign:'center',padding:'10px 16px',background:'#f8f8f6',borderRadius:10,border:'0.5px solid #e0ddd6'}}>
                  <div style={{fontSize:10,color:'#aaa',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4}}>{k.l}</div>
                  <div style={{fontSize:16,fontWeight:600,color:'#1a1a18',fontFamily:'monospace'}}>{k.v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── GRILLA DE ACCIONES ── */}
      <div style={{maxWidth:900,margin:'2rem auto',padding:'0 1.5rem'}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'#bbb',marginBottom:16}}>
          Acciones del proyecto
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
          {ACCIONES.map(a=>(
            <button key={a.key}
              onClick={()=>{ if(a.tab) router.push(a.ruta+'?tab='+a.tab); else router.push(a.ruta) }}
              style={{background:a.bg,border:`0.5px solid ${a.border}`,borderRadius:12,
                padding:'20px',textAlign:'left',cursor:'pointer',transition:'all .15s'}}>
              <div style={{fontSize:26,marginBottom:10}}>{a.icon}</div>
              <div style={{fontSize:14,fontWeight:600,color:a.color,marginBottom:6}}>{a.titulo}</div>
              <div style={{fontSize:12,color:'#888',lineHeight:1.5}}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
