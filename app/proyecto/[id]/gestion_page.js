'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import PanelControlGestion from '../../../../components/PanelControlGestion'

const SECTOR_COLOR = {
  finanzas:{bg:'#E6F1FB',color:'#0C447C'}, tecnica:{bg:'#EEEDFE',color:'#3C3489'},
  obra:{bg:'#FAEEDA',color:'#633806'}, comercial:{bg:'#E1F5EE',color:'#085041'},
}

export default function GestionPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data:{ user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data:perf } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
        if (!perf) { router.push('/login'); return }

        // Cargar todo en paralelo — cada query falla graciosamente
        const [
          { data:proyecto, error:e1 },
          { data:cp },
          { data:pc },
          { data:df },
          { data:mtr },
          { data:unidades },
          { data:transRaw },
        ] = await Promise.all([
          supabase.from('proyectos').select('*').eq('id', id).single(),
          supabase.from('v_control_presupuestario').select('*').eq('proyecto_id', id).maybeSingle(),
          supabase.from('v_performance_comercial').select('*').eq('proyecto_id', id).maybeSingle(),
          supabase.from('v_descalce_financiero').select('*').eq('proyecto_id', id).maybeSingle(),
          supabase.from('v_margen_teorico_vs_real').select('*').eq('proyecto_id', id).maybeSingle(),
          supabase.from('unidades').select('*').eq('proyecto_id', id).order('piso_nro').order('unidad_codigo'),
          supabase.from('transacciones')
            .select('*, unidades(unidad_codigo, proyecto_id), clientes(nombre)')
            .eq('unidades.proyecto_id', id)
            .order('fecha_operacion', { ascending: false })
            .limit(200),
        ])

        if (e1) { setError('Proyecto no encontrado'); setLoading(false); return }

        const transacciones = (transRaw || []).map(t => ({
          ...t,
          unidad_codigo: t.unidades?.unidad_codigo,
          cliente_nombre: t.clientes?.nombre,
        }))

        setData({ perfil:perf, proyecto, controlPresupuestario:cp||{}, performanceComercial:pc||{}, descalceFinanciero:df||{}, margenTeoricoVsReal:mtr||{}, unidades:unidades||[], transacciones })
        setLoading(false)
      } catch(err) {
        console.error(err)
        setError(err.message)
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0a0c0e',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{color:'#5eead4',fontSize:13}}>Cargando panel de gestión...</div>
    </div>
  )

  if (error) return (
    <div style={{minHeight:'100vh',background:'#0a0c0e',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{color:'#fb7185',fontSize:13}}>Error: {error}</div>
    </div>
  )

  const sc = SECTOR_COLOR[data.perfil?.sector] || SECTOR_COLOR.finanzas

  return (
    <div>
      {/* Navbar dark */}
      <div style={{background:'#0a0c0e',borderBottom:'1px solid #23282f',padding:'0 36px',height:52,display:'flex',alignItems:'center',justifyContent:'space-between',fontFamily:'system-ui,sans-serif',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <button onClick={()=>router.push('/dashboard')}
            style={{fontSize:13,color:'#8b95a1',background:'none',border:'none',cursor:'pointer'}}>
            ← Dashboard
          </button>
          <span style={{color:'#23282f'}}>|</span>
          <button onClick={()=>router.push(`/proyecto/${id}`)}
            style={{fontSize:12,color:'#565e69',background:'none',border:'none',cursor:'pointer'}}>
            🔧 Simulador
          </button>
          <button onClick={()=>router.push(`/proyecto/${id}/certificados`)}
            style={{fontSize:12,color:'#565e69',background:'#161a1f',border:'1px solid #23282f',borderRadius:6,padding:'4px 12px',cursor:'pointer'}}>
            📋 Certificados
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,background:sc.bg,color:sc.color}}>
            {data.perfil?.sector}
          </span>
          <span style={{fontSize:13,color:'#8b95a1'}}>{data.perfil?.nombre_completo}</span>
        </div>
      </div>

      <PanelControlGestion
        proyecto={data.proyecto}
        controlPresupuestario={data.controlPresupuestario}
        performanceComercial={data.performanceComercial}
        descalceFinanciero={data.descalceFinanciero}
        margenTeoricoVsReal={data.margenTeoricoVsReal}
        unidades={data.unidades}
        transacciones={data.transacciones}
      />
    </div>
  )
}
