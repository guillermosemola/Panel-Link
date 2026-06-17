'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const ESTADO = {
  planificacion:{ bg:'#EEEDFE', color:'#3C3489', label:'Planificación' },
  en_obra:      { bg:'#FAEEDA', color:'#633806', label:'En obra' },
  terminado:    { bg:'#EAF3DE', color:'#27500A', label:'Terminado' },
  suspendido:   { bg:'#FCEBEB', color:'#791F1F', label:'Suspendido' },
}
const SECTOR_COLOR = {
  finanzas:{bg:'#E6F1FB',color:'#0C447C'}, tecnica:{bg:'#EEEDFE',color:'#3C3489'},
  obra:{bg:'#FAEEDA',color:'#633806'}, comercial:{bg:'#E1F5EE',color:'#085041'},
}

const s = {
  page:  {minHeight:'100vh',background:'#f8f8f6',fontFamily:'system-ui,sans-serif'},
  nav:   {background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'0 2rem',height:52,display:'flex',alignItems:'center',justifyContent:'space-between'},
  brand: {fontSize:15,fontWeight:600},
  pill:  {fontSize:11,fontWeight:500,padding:'2px 9px',borderRadius:20},
  logout:{fontSize:12,color:'#aaa',background:'none',border:'none',cursor:'pointer'},
  main:  {maxWidth:1100,margin:'0 auto',padding:'2rem 1.5rem'},
  topRow:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:12},
  h1:    {fontSize:22,fontWeight:500,color:'#1a1a18'},
  actions:{display:'flex',gap:10},
  btnEV: {display:'flex',alignItems:'center',gap:8,padding:'10px 20px',background:'#1a1a18',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'},
  btnTC: {display:'flex',alignItems:'center',gap:8,padding:'10px 18px',background:'#fff',color:'#1a1a18',border:'0.5px solid #ccc',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'},
  secLabel:{fontSize:11,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'#bbb',marginBottom:12},
  grid:  {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14,marginBottom:28},
  card:  {background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:12,padding:'18px',cursor:'pointer',transition:'all .15s'},
  cardTop:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10},
  nombre:{fontSize:15,fontWeight:500,color:'#1a1a18',marginBottom:3},
  desc:  {fontSize:12,color:'#aaa'},
  meta:  {display:'flex',gap:6,flexWrap:'wrap',marginTop:10},
  metaItem:{fontSize:11,color:'#888',background:'#f8f8f6',padding:'3px 8px',borderRadius:6},
  btnGestion:{fontSize:11,fontWeight:500,padding:'4px 10px',borderRadius:6,border:'0.5px solid #e0ddd6',background:'#f8f8f6',color:'#555',cursor:'pointer',marginTop:10},
}

export default function Dashboard() {
  const router = useRouter()
  const [perfil, setPerfil] = useState(null)
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      if (!perf) { await supabase.auth.signOut(); router.push('/login'); return }
      setPerfil(perf)
      const { data:projs } = await supabase.from('proyectos').select('*')
        .eq('empresa_id', perf.empresa_id).order('created_at', {ascending:false})
      setProyectos(projs || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{...s.page,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#aaa',fontSize:14}}>Cargando...</div></div>

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas
  const activos = proyectos.filter(p => p.estado === 'en_obra')
  const planif  = proyectos.filter(p => p.estado === 'planificacion')
  const otros   = proyectos.filter(p => !['en_obra','planificacion'].includes(p.estado))

  function Card({ p }) {
    const es = ESTADO[p.estado] || ESTADO.planificacion
    return (
      <div style={s.card}
        onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.06)';e.currentTarget.style.borderColor='#ccc'}}
        onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='#e0ddd6'}}>
        <div style={s.cardTop}>
          <div>
            <div style={s.nombre}>{p.nombre}</div>
            {p.descripcion && <div style={s.desc}>{p.descripcion}</div>}
          </div>
          <span style={{...s.pill,background:es.bg,color:es.color}}>{es.label}</span>
        </div>
        <div style={s.meta}>
          {p.m2_totales && <span style={s.metaItem}>📐 {new Intl.NumberFormat('es-AR').format(p.m2_totales)} m²</span>}
          {p.plazo_meses && <span style={s.metaItem}>⏱ {p.plazo_meses} meses</span>}
          {p.ev_costo_total_usd && <span style={s.metaItem}>💰 EV cargado</span>}
        </div>
        <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
          <button style={s.btnGestion} onClick={() => router.push(`/proyecto/${p.id}/gestion`)}>
            📊 Panel de gestión
          </button>
          <button style={{...s.btnGestion,color:'#888'}} onClick={() => router.push(`/proyecto/${p.id}`)}>
            🔧 Simulador
          </button>
          <button style={{...s.btnGestion,color:'#888'}} onClick={() => router.push(`/proyecto/${p.id}/certificados`)}>
            📋 Certificados
          </button>
        </div>
      </div>
    )
  }

  function Seccion({titulo, lista}) {
    if (!lista.length) return null
    return (
      <div style={{marginBottom:28}}>
        <div style={s.secLabel}>{titulo} ({lista.length})</div>
        <div style={s.grid}>{lista.map(p => <Card key={p.id} p={p}/>)}</div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={s.brand}>Panel-Link</div>
          <span style={{fontSize:12,color:'#ccc'}}>|</span>
          <span style={{fontSize:13,color:'#888'}}>Link Inversiones</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{...s.pill,background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
          <span style={{fontSize:13,color:'#888'}}>{perfil?.nombre_completo}</span>
          <button style={s.logout} onClick={async()=>{await supabase.auth.signOut();router.push('/login')}}>Salir</button>
        </div>
      </nav>
      <div style={s.main}>
        <div style={s.topRow}>
          <div>
            <div style={s.h1}>Proyectos</div>
            <div style={{fontSize:13,color:'#aaa',marginTop:3}}>{proyectos.length} proyecto{proyectos.length!==1?'s':''} en cartera</div>
          </div>
          <div style={s.actions}>
            <button style={s.btnTC} onClick={()=>router.push('/tipo-cambio')}>
              💱 Tipo de cambio
            </button>
            <button style={s.btnEV} onClick={()=>router.push('/simulador')}>
              📊 Simulador EV — Nuevo proyecto
            </button>
          </div>
        </div>
        <Seccion titulo="En obra" lista={activos}/>
        <Seccion titulo="Planificación" lista={planif}/>
        <Seccion titulo="Otros" lista={otros}/>
        {proyectos.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#aaa'}}>
            <div style={{fontSize:16,fontWeight:500,marginBottom:8,color:'#888'}}>No hay proyectos cargados</div>
            <div style={{fontSize:13}}>Usá el Simulador EV para crear el primer proyecto.</div>
          </div>
        )}
      </div>
    </div>
  )
}
