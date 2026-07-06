'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import PanelGestion from '../../../../components/PanelGestion'

const SECTOR_COLOR = {
  finanzas:{bg:'#E6F1FB',color:'#0C447C'}, tecnica:{bg:'#EEEDFE',color:'#3C3489'},
  obra:{bg:'#FAEEDA',color:'#633806'}, comercial:{bg:'#E1F5EE',color:'#085041'},
}

export default function GestionPage() {
  const { id } = useParams()
  const router  = useRouter()
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [data,    setData]    = useState(null)

  const load = useCallback(async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      if (!perf) { router.push('/login'); return }

      const [
        { data:proyecto, error:e1 },
        { data:kpisActuales },
        { data:flujoDatos },
        { data:earnedValueData },
        { data:unidades },
        { data:transRaw },
      ] = await Promise.all([
        supabase.from('proyectos').select('*').eq('id', id).single(),
        supabase.from('v_semaforos_cartera').select('*').eq('proyecto_id', id).maybeSingle(),
        supabase.from('v_flujo_fondos_comparado').select('*').eq('proyecto_id', id).order('mes_numero'),
        supabase.from('v_earned_value').select('*').eq('proyecto_id', id).order('mes_numero'),
        supabase.from('unidades').select('*').eq('proyecto_id', id).order('piso_nro').order('unidad_codigo'),
        supabase.from('transacciones')
          .select('*, unidades(unidad_codigo, proyecto_id), clientes(nombre)')
          .eq('unidades.proyecto_id', id)
          .order('fecha_operacion', { ascending: false })
          .limit(100),
      ])

      if (e1) { setError('Proyecto no encontrado'); setLoading(false); return }

      const transacciones = (transRaw || []).map(t => ({
        ...t,
        unidad_codigo: t.unidades?.unidad_codigo,
        cliente_nombre: t.clientes?.nombre,
      }))

      // Descalce = avance físico - % vendido
      const descalce = kpisActuales
        ? (kpisActuales.pct_avance_fisico || 0) - (kpisActuales.pct_m2_vendidos || 0)
        : null

      setData({ perfil:perf, proyecto, kpisActuales, flujoDatos:flujoDatos||[], earnedValueData:earnedValueData||[], descalce, unidades:unidades||[], transacciones })
      setLoading(false)
    } catch(err) {
      setError(err.message)
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0a0c0e',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{color:'#22c55e',fontSize:13}}>Cargando panel financiero...</div>
    </div>
  )
  if (error) return (
    <div style={{minHeight:'100vh',background:'#0a0c0e',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{color:'#ef4444',fontSize:13}}>Error: {error}</div>
    </div>
  )

  const sc = SECTOR_COLOR[data.perfil?.sector] || SECTOR_COLOR.finanzas

  return (
    <div>
      {/* Navbar dark */}
      <div style={{background:'#0a0c0e',borderBottom:'1px solid #1f2937',padding:'0 36px',height:52,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        fontFamily:'system-ui,sans-serif',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <button onClick={()=>router.push(`/proyecto/${id}`)}
            style={{fontSize:13,color:'#6b7280',background:'none',border:'none',cursor:'pointer'}}>
            ← {data.proyecto?.nombre}
          </button>
          <span style={{color:'#1f2937'}}>|</span>
          <button onClick={()=>router.push(`/proyecto/${id}/certificados`)}
            style={{fontSize:12,color:'#6b7280',background:'#111418',border:'1px solid #1f2937',
              borderRadius:6,padding:'4px 12px',cursor:'pointer'}}>
            📈 Certificados
          </button>
          <button onClick={()=>router.push('/tipo-cambio')}
            style={{fontSize:12,color:'#6b7280',background:'#111418',border:'1px solid #1f2937',
              borderRadius:6,padding:'4px 12px',cursor:'pointer'}}>
            💱 TC
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,
            background:sc.bg,color:sc.color}}>{data.perfil?.sector}</span>
          <span style={{fontSize:13,color:'#6b7280'}}>{data.perfil?.nombre_completo}</span>
        </div>
      </div>

      <PanelGestion
        proyecto={data.proyecto}
        kpisActuales={data.kpisActuales}
        flujoDatos={data.flujoDatos}
        earnedValueData={data.earnedValueData}
        descalce={data.descalce}
        unidades={data.unidades}
        transacciones={data.transacciones}
      />
    </div>
  )
}
