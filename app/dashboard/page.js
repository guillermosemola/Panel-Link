'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const SECTOR_COLOR = {
  finanzas: { bg:'#E6F1FB', color:'#0C447C' },
  obra:     { bg:'#FAEEDA', color:'#633806' },
  tecnica:  { bg:'#EEEDFE', color:'#3C3489' },
  comercial:{ bg:'#E1F5EE', color:'#085041' },
}

const s = {
  page: { minHeight:'100vh', background:'#f8f8f6', fontFamily:'system-ui,sans-serif' },
  nav: { background:'#fff', borderBottom:'0.5px solid #e0ddd6',
    padding:'0 2rem', height:52, display:'flex', alignItems:'center',
    justifyContent:'space-between' },
  navTitle: { fontSize:14, fontWeight:500, color:'#1a1a18' },
  navRight: { display:'flex', alignItems:'center', gap:12 },
  badge: { fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20 },
  logout: { fontSize:13, color:'#888', cursor:'pointer', background:'none',
    border:'none', padding:'4px 8px' },
  main: { maxWidth:1100, margin:'0 auto', padding:'2rem 1.5rem' },
  greeting: { fontSize:22, fontWeight:500, color:'#1a1a18', marginBottom:6 },
  sub: { fontSize:14, color:'#888', marginBottom:28 },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',
    gap:16 },
  projCard: { background:'#fff', border:'0.5px solid #e0ddd6',
    borderRadius:12, padding:'1.25rem', cursor:'pointer',
    transition:'border-color .15s' },
  projNombre: { fontSize:15, fontWeight:500, color:'#1a1a18', marginBottom:4 },
  projMeta: { fontSize:12, color:'#888' },
  estadoPill: { display:'inline-block', fontSize:11, fontWeight:500,
    padding:'2px 9px', borderRadius:20, marginTop:10 },
  newBtn: { display:'flex', alignItems:'center', justifyContent:'center',
    gap:8, border:'0.5px dashed #ccc', borderRadius:12, padding:'1.25rem',
    cursor:'pointer', color:'#aaa', fontSize:14, background:'none' },
  empty: { textAlign:'center', color:'#aaa', padding:'4rem 0', fontSize:14 },
}

const ESTADO_STYLES = {
  planificacion: { bg:'#EEEDFE', color:'#3C3489' },
  en_obra:       { bg:'#FAEEDA', color:'#633806' },
  terminado:     { bg:'#EAF3DE', color:'#27500A' },
  suspendido:    { bg:'#FCEBEB', color:'#791F1F' },
}

export default function Dashboard() {
  const [user, setUser]         = useState(null)
  const [perfil, setPerfil]     = useState(null)
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading]   = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: perf } = await supabase.from('usuarios')
        .select('*').eq('id', user.id).single()
      setPerfil(perf)
      if (perf) {
        const { data: projs } = await supabase.from('proyectos')
          .select('*').order('created_at', { ascending: false })
        setProyectos(projs || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{...s.page,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'#aaa',fontSize:14}}>Cargando...</div>
    </div>
  )

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navTitle}>Sistema financiero · Constructora</div>
        <div style={s.navRight}>
          {perfil && (
            <span style={{...s.badge, background:sc.bg, color:sc.color}}>
              {perfil.sector}
            </span>
          )}
          <span style={{fontSize:13,color:'#888'}}>{perfil?.nombre_completo}</span>
          <button style={s.logout} onClick={logout}>Salir</button>
        </div>
      </nav>
      <main style={s.main}>
        <div style={s.greeting}>
          Buen día{perfil ? `, ${perfil.nombre_completo.split(' ')[0]}` : ''}.
        </div>
        <div style={s.sub}>
          {proyectos.length
            ? `${proyectos.length} proyecto${proyectos.length>1?'s':''} activo${proyectos.length>1?'s':''}.`
            : 'No hay proyectos aún.'}
        </div>

        <div style={s.grid}>
          {proyectos.map(p => {
            const es = ESTADO_STYLES[p.estado] || ESTADO_STYLES.planificacion
            return (
              <div key={p.id} style={s.projCard}
                onClick={() => router.push(`/proyecto/${p.id}`)}>
                <div style={s.projNombre}>{p.nombre}</div>
                <div style={s.projMeta}>
                  {p.m2_totales ? `${p.m2_totales.toLocaleString('es-AR')} m²` : '—'}
                  {p.plazo_meses ? ` · ${p.plazo_meses} meses` : ''}
                  {p.fecha_inicio ? ` · Inicio: ${new Date(p.fecha_inicio).toLocaleDateString('es-AR')}` : ''}
                </div>
                <div>
                  <span style={{...s.estadoPill,background:es.bg,color:es.color}}>
                    {p.estado.replace('_',' ')}
                  </span>
                </div>
              </div>
            )
          })}
          {perfil?.sector === 'finanzas' && (
            <button style={s.newBtn}
              onClick={() => router.push('/proyecto/nuevo')}>
              + Nuevo proyecto
            </button>
          )}
        </div>
        {proyectos.length === 0 && (
          <div style={s.empty}>
            {perfil?.sector === 'finanzas'
              ? 'Creá el primer proyecto para empezar.'
              : 'Finanzas aún no creó proyectos.'}
          </div>
        )}
      </main>
    </div>
  )
}
