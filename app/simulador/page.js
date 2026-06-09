'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import SimuladorEV from '../../components/SimuladorEV'

const SECTOR_COLOR = {
  finanzas: { bg:'#E6F1FB', color:'#0C447C' },
  tecnica:  { bg:'#EEEDFE', color:'#3C3489' },
  obra:     { bg:'#FAEEDA', color:'#633806' },
  comercial:{ bg:'#E1F5EE', color:'#085041' },
}

export default function SimuladorEVPage() {
  const router = useRouter()
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      if (!perf) { router.push('/login'); return }
      setPerfil(perf)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8f8f6', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ color:'#aaa', fontSize:14 }}>Cargando simulador...</div>
    </div>
  )

  const sc = SECTOR_COLOR[perfil?.sector] || SECTOR_COLOR.finanzas

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      {/* Navbar */}
      <nav style={{ background:'#fff', borderBottom:'0.5px solid #e0ddd6', padding:'0 1.5rem',
        height:52, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ fontSize:13, color:'#888', cursor:'pointer', background:'none', border:'none' }}>
            ← Inicio
          </button>
          <div style={{ fontSize:14, fontWeight:500 }}>Simulador de Viabilidad Económica</div>
          <span style={{ fontSize:11, color:'#aaa', background:'#f0ede8',
            padding:'2px 8px', borderRadius:10 }}>Análisis de nuevo proyecto</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, fontWeight:500, padding:'2px 9px', borderRadius:20,
            background:sc.bg, color:sc.color }}>{perfil?.sector}</span>
          <span style={{ fontSize:13, color:'#888' }}>{perfil?.nombre_completo}</span>
        </div>
      </nav>

      <SimuladorEV readOnly={false} />
    </div>
  )
}
