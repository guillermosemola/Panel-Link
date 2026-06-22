'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const ESTADO_STYLE = {
  planificacion:{ bg:'#EEEDFE', color:'#3C3489', dot:'#7C6FD4', label:'Planificación' },
  en_obra:      { bg:'#FAEEDA', color:'#633806', dot:'#E07B00', label:'En obra' },
  terminado:    { bg:'#EAF3DE', color:'#27500A', dot:'#4A9E3F', label:'Terminado' },
  suspendido:   { bg:'#FCEBEB', color:'#791F1F', dot:'#E05050', label:'Suspendido' },
}
const SECTOR_COLOR = {
  finanzas:{bg:'#E6F1FB',color:'#0C447C'}, tecnica:{bg:'#EEEDFE',color:'#3C3489'},
  obra:{bg:'#FAEEDA',color:'#633806'}, comercial:{bg:'#E1F5EE',color:'#085041'},
}
const fmtNum = n => n ? new Intl.NumberFormat('es-AR').format(Math.round(n)) : '—'
const fmtUSD = n => n ? '$'+new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(n) : '—'

export default function Dashboard() {
  const router = useRouter()
  const [perfil, setPerfil]       = useState(null)
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtro, setFiltro]       = useState('todos')

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

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#f8f8f6',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{color:'#aaa',fontSize:14}}>Cargando...</div>
    </div>
  )

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas
  const filtrados = proyectos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
    (filtro === 'todos' || p.estado === filtro)
  )
  const totalM2    = proyectos.reduce((a,p)=>a+(p.m2_totales||0), 0)
  const totalCosto = proyectos.reduce((a,p)=>a+(+p.ev_costo_total_usd||0), 0)
  const conEV      = proyectos.filter(p=>p.ev_costo_total_usd).length

  return (
    <div style={{minHeight:'100vh',background:'#f8f8f6',fontFamily:'system-ui,sans-serif'}}>

      {/* ── NAVBAR ── */}
      <nav style={{background:'#fff',borderBottom:'0.5px solid #e0ddd6',padding:'0 2rem',height:56,
        display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:30,height:30,background:'#1a1a18',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{color:'#fff',fontSize:15,fontWeight:700}}>L</span>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:600,lineHeight:1.1}}>Panel-Link</div>
            <div style={{fontSize:10,color:'#aaa'}}>Link Inversiones</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.push('/tipo-cambio')}
            style={{fontSize:12,padding:'7px 14px',borderRadius:8,border:'0.5px solid #e0ddd6',background:'#fff',color:'#666',cursor:'pointer'}}>
            💱 Tipo de cambio
          </button>
          <span style={{fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,background:sc.bg,color:sc.color}}>{perfil?.sector}</span>
          <span style={{fontSize:13,color:'#888'}}>{perfil?.nombre_completo}</span>
          <button onClick={async()=>{await supabase.auth.signOut();router.push('/login')}}
            style={{fontSize:12,color:'#aaa',background:'none',border:'none',cursor:'pointer'}}>Salir</button>
        </div>
      </nav>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'2rem 1.5rem'}}>

        {/* ── HEADER ── */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,gap:16,flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontSize:26,fontWeight:600,color:'#1a1a18',margin:'0 0 4px'}}>Proyectos</h1>
            <div style={{fontSize:13,color:'#aaa'}}>{proyectos.length} en cartera · {conEV} con EV cargado</div>
          </div>
          {/* Botones principales del Dashboard */}
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>router.push('/simulador')}
              style={{padding:'10px 18px',fontSize:13,fontWeight:500,borderRadius:9,
                border:'0.5px solid #ccc',background:'#fff',color:'#1a1a18',cursor:'pointer',
                display:'flex',alignItems:'center',gap:8}}>
              📊 Simulador EV
            </button>
            <button onClick={()=>router.push('/nuevo-proyecto')}
              style={{padding:'10px 22px',fontSize:14,fontWeight:600,borderRadius:9,
                border:'none',background:'#1a1a18',color:'#fff',cursor:'pointer',
                display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:18,lineHeight:1}}>+</span> Nuevo proyecto
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[
            {label:'En obra',         val:proyectos.filter(p=>p.estado==='en_obra').length,       unit:'proyectos'},
            {label:'En planificación', val:proyectos.filter(p=>p.estado==='planificacion').length, unit:'proyectos'},
            {label:'m² cartera total', val:fmtNum(totalM2),                                        unit:'m²'},
            {label:'Costo EV total',   val:fmtUSD(totalCosto),                                     unit:'USD'},
          ].map((k,i)=>(
            <div key={i} style={{background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:12,padding:'16px 18px'}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#bbb',marginBottom:8}}>{k.label}</div>
              <div style={{fontSize:22,fontWeight:600,color:'#1a1a18',fontFamily:'monospace'}}>{k.val}</div>
              <div style={{fontSize:11,color:'#ccc',marginTop:2}}>{k.unit}</div>
            </div>
          ))}
        </div>

        {/* ── FILTROS ── */}
        <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
          <input placeholder="Buscar proyecto..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}
            style={{padding:'8px 14px',borderRadius:8,border:'0.5px solid #ddd',background:'#fff',fontSize:13,width:220,outline:'none'}}/>
          {['todos','en_obra','planificacion','terminado'].map(e=>(
            <button key={e} onClick={()=>setFiltro(e)}
              style={{padding:'7px 14px',borderRadius:20,fontSize:12,cursor:'pointer',
                border:filtro===e?'0.5px solid #1a1a18':'0.5px solid #ddd',
                background:filtro===e?'#1a1a18':'#fff',color:filtro===e?'#fff':'#666'}}>
              {e==='todos'?'Todos':ESTADO_STYLE[e]?.label||e}
            </button>
          ))}
        </div>

        {/* ── GRID DE PROYECTOS ── */}
        {filtrados.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#aaa'}}>
            <div style={{fontSize:36,marginBottom:12}}>📭</div>
            <div style={{fontSize:16,fontWeight:500,color:'#888',marginBottom:8}}>
              {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay proyectos todavía'}
            </div>
            <div style={{fontSize:13}}>Usá el botón <strong>"+ Nuevo proyecto"</strong> para comenzar.</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
            {filtrados.map(p => <ProyectoCard key={p.id} p={p} router={router}/>)}
          </div>
        )}
      </div>
    </div>
  )
}

function ProyectoCard({ p, router }) {
  const es = ESTADO_STYLE[p.estado] || ESTADO_STYLE.planificacion
  const tieneEV = !!p.ev_costo_total_usd
  const fmtM = n => n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1e3?`$${Math.round(n/1e3)}K`:`$${Math.round(n)}`

  return (
    <div style={{background:'#fff',border:'0.5px solid #e0ddd6',borderRadius:14,padding:'20px',
      transition:'all .15s',cursor:'default'}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,.07)';e.currentTarget.style.borderColor='#c8c4bc'}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='#e0ddd6'}}>

      {/* Header card */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
        <div>
          <div style={{fontSize:16,fontWeight:600,color:'#1a1a18',marginBottom:3}}>{p.nombre}</div>
          {p.descripcion && <div style={{fontSize:12,color:'#aaa'}}>{p.descripcion}</div>}
        </div>
        <span style={{fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,
          background:es.bg,color:es.color,whiteSpace:'nowrap',marginLeft:8,flexShrink:0}}>
          <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',
            background:es.dot,marginRight:4,verticalAlign:'middle'}}/>
          {es.label}
        </span>
      </div>

      {/* Métricas */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
        {p.m2_totales && <span style={{fontSize:11,color:'#888',background:'#f8f8f6',padding:'3px 8px',borderRadius:6}}>📐 {new Intl.NumberFormat('es-AR').format(p.m2_totales)} m²</span>}
        {p.plazo_meses && <span style={{fontSize:11,color:'#888',background:'#f8f8f6',padding:'3px 8px',borderRadius:6}}>⏱ {p.plazo_meses}m</span>}
        {tieneEV
          ? <span style={{fontSize:11,color:'#085041',background:'#E1F5EE',padding:'3px 8px',borderRadius:6}}>✓ EV {fmtM(+p.ev_costo_total_usd)}</span>
          : <span style={{fontSize:11,color:'#633806',background:'#FAEEDA',padding:'3px 8px',borderRadius:6}}>⚠ Sin EV</span>}
      </div>

      {/* Botón principal: ir al proyecto */}
      <button onClick={()=>router.push(`/proyecto/${p.id}`)}
        style={{width:'100%',padding:'10px',fontSize:13,fontWeight:600,borderRadius:9,
          border:'none',background:tieneEV?'#1a1a18':'#1A5276',color:'#fff',cursor:'pointer',marginBottom:0}}>
        {tieneEV ? '→ Abrir proyecto' : '→ Cargar EV y configurar'}
      </button>
    </div>
  )
}
