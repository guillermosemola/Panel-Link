'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const s = {
  wrap: { minHeight:'100vh', display:'flex', alignItems:'center',
    justifyContent:'center', background:'#f8f8f6' },
  card: { background:'#fff', border:'0.5px solid #e0ddd6',
    borderRadius:16, padding:'2.5rem 2rem', width:360,
    display:'flex', flexDirection:'column', gap:20 },
  logo: { fontSize:13, fontWeight:500, color:'#888', letterSpacing:'0.06em',
    textTransform:'uppercase', textAlign:'center' },
  title: { fontSize:22, fontWeight:500, textAlign:'center', color:'#1a1a18' },
  label: { fontSize:13, color:'#666', marginBottom:5, display:'block' },
  input: { width:'100%', padding:'9px 12px', fontSize:14, borderRadius:8,
    border:'0.5px solid #ccc', background:'#fafafa', outline:'none' },
  btn: { width:'100%', padding:'10px', fontSize:14, fontWeight:500,
    borderRadius:8, border:'none', background:'#1a1a18', color:'#fff',
    cursor:'pointer', marginTop:4 },
  err: { fontSize:13, color:'#A32D2D', textAlign:'center',
    background:'#FCEBEB', borderRadius:6, padding:'8px 12px' },
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [err, setErr]     = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) { setErr(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>Constructora · Sistema financiero</div>
        <div style={s.title}>Ingresar</div>
        {err && <div style={s.err}>{err}</div>}
        <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={email}
              onChange={e=>setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label style={s.label}>Contraseña</label>
            <input style={s.input} type="password" value={pass}
              onChange={e=>setPass(e.target.value)} required />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>
        <div style={{fontSize:12,color:'#aaa',textAlign:'center'}}>
          Tu sector y permisos se asignan desde administración.
        </div>
      </div>
    </div>
  )
}
