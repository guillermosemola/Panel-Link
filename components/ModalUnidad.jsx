'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmt2 = n => n==null?'—':new Intl.NumberFormat('es-AR').format(Math.round(n))

const ESTADOS = [
  { value:'disponible', label:'Disponible' },
  { value:'reservada',  label:'Reservada' },
  { value:'vendida',    label:'Vendida' },
  { value:'canje_proveedor', label:'Canje / Cupo socio' },
]

const TIPO_OP = [
  { value:'reserva', label:'Reserva' },
  { value:'venta_contado', label:'Venta contado' },
  { value:'venta_financiada', label:'Venta financiada' },
  { value:'canje', label:'Canje' },
]

const s = {
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20},
  modal:{background:'#fff',borderRadius:14,padding:'1.75rem',width:480,maxHeight:'90vh',overflowY:'auto',fontFamily:'system-ui,sans-serif'},
  title:{fontSize:17,fontWeight:600,marginBottom:4,color:'#1a1a18'},
  sub:{fontSize:13,color:'#888',marginBottom:20},
  tabs:{display:'flex',gap:4,marginBottom:20,borderBottom:'0.5px solid #e0ddd6'},
  tab:{padding:'8px 16px',fontSize:13,fontWeight:500,cursor:'pointer',background:'none',border:'none',color:'#aaa',borderBottom:'2px solid transparent'},
  tabAct:{color:'#1a1a18',borderBottom:'2px solid #1a1a18'},
  field:{marginBottom:14},
  label:{fontSize:12,color:'#888',marginBottom:5,display:'block'},
  input:{width:'100%',padding:'9px 12px',fontSize:14,borderRadius:8,border:'0.5px solid #ccc',background:'#fafafa',outline:'none'},
  select:{width:'100%',padding:'9px 12px',fontSize:14,borderRadius:8,border:'0.5px solid #ccc',background:'#fafafa',outline:'none',cursor:'pointer'},
  row2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10},
  toggle:{display:'flex',gap:8,marginBottom:14},
  toggleBtn:{flex:1,padding:'9px',fontSize:13,borderRadius:8,border:'0.5px solid #ddd',background:'#fafafa',color:'#666',cursor:'pointer',textAlign:'center'},
  toggleAct:{background:'#1a1a18',color:'#fff',borderColor:'#1a1a18'},
  btnRow:{display:'flex',gap:8,marginTop:20},
  btn:{flex:1,padding:'11px',fontSize:13,fontWeight:600,borderRadius:8,border:'none',background:'#1a1a18',color:'#fff',cursor:'pointer'},
  btnCancel:{flex:1,padding:'11px',fontSize:13,fontWeight:500,borderRadius:8,border:'0.5px solid #ddd',background:'#fff',color:'#888',cursor:'pointer'},
  msg_ok:{fontSize:12,color:'#27500A',background:'#EAF3DE',borderRadius:6,padding:'8px 12px',marginTop:10},
  msg_err:{fontSize:12,color:'#A32D2D',background:'#FCEBEB',borderRadius:6,padding:'8px 12px',marginTop:10},
  infoBox:{background:'#f8f8f6',border:'0.5px solid #e0ddd6',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#666',marginBottom:16},
}

export default function ModalUnidad({ unidad, onClose, onSaved, empresaId }) {
  const [tab, setTab] = useState('asignacion')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [clientes, setClientes] = useState([])

  // Tab Asignación
  const [estado, setEstado] = useState(unidad.estado)
  const [asignadoA, setAsignadoA] = useState(unidad.asignado_a || '')
  const [compradorNombre, setCompradorNombre] = useState(unidad.comprador_nombre || '')

  // Tab Venta
  const [clienteId, setClienteId] = useState('')
  const [clienteNuevoNombre, setClienteNuevoNombre] = useState('')
  const [usarClienteNuevo, setUsarClienteNuevo] = useState(true)
  const [tipoOperacion, setTipoOperacion] = useState('venta_contado')
  const [monedaPago, setMonedaPago] = useState('USD')
  const [precioUSD, setPrecioUSD] = useState('')
  const [precioARS, setPrecioARS] = useState('')
  const [tcOperacion, setTcOperacion] = useState('')
  const [fechaOperacion, setFechaOperacion] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    async function loadClientes() {
      const { data } = await supabase.from('clientes').select('*').eq('empresa_id', empresaId).order('nombre')
      setClientes(data || [])
    }
    loadClientes()
  }, [empresaId])

  async function guardarAsignacion(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('unidades').update({
      estado,
      asignado_a: asignadoA || null,
      comprador_nombre: compradorNombre || null,
      updated_at: new Date().toISOString(),
    }).eq('id', unidad.id)
    setSaving(false)
    if (error) { setMsg({ok:false,text:error.message}); return }
    setMsg({ok:true,text:'✅ Asignación actualizada.'})
    setTimeout(() => { onSaved(); onClose() }, 800)
  }

  async function registrarVenta(e) {
    e.preventDefault()
    setMsg(null)

    if (usarClienteNuevo && !clienteNuevoNombre.trim()) {
      setMsg({ok:false,text:'Ingresá el nombre del cliente.'}); return
    }
    if (!usarClienteNuevo && !clienteId) {
      setMsg({ok:false,text:'Seleccioná un cliente.'}); return
    }
    if (monedaPago === 'USD' && (!precioUSD || +precioUSD <= 0)) {
      setMsg({ok:false,text:'Ingresá el precio de cierre en USD.'}); return
    }
    if (monedaPago === 'ARS' && (!precioARS || +precioARS <= 0)) {
      setMsg({ok:false,text:'Ingresá el precio de cierre en ARS.'}); return
    }
    if (monedaPago === 'ARS' && (!tcOperacion || +tcOperacion <= 0)) {
      setMsg({ok:false,text:'Ingresá el TC de la operación (se congelará a esta fecha).'}); return
    }

    setSaving(true)
    const { data:{ user } } = await supabase.auth.getUser()

    let finalClienteId = clienteId
    if (usarClienteNuevo) {
      const { data:nuevoCliente, error: errCliente } = await supabase.from('clientes').insert({
        empresa_id: empresaId,
        nombre: clienteNuevoNombre.trim(),
      }).select().single()
      if (errCliente) { setSaving(false); setMsg({ok:false,text:errCliente.message}); return }
      finalClienteId = nuevoCliente.id
    }

    const payload = {
      unidad_id: unidad.id,
      cliente_id: finalClienteId,
      registrado_por: user.id,
      tipo_operacion: tipoOperacion,
      moneda_pago: monedaPago,
      fecha_operacion: fechaOperacion,
      estado_contrato: tipoOperacion === 'reserva' ? 'reserva' : 'boleto',
    }
    if (monedaPago === 'USD') {
      payload.precio_cierre_usd = +precioUSD
    } else {
      payload.precio_cierre_ars = +precioARS
      payload.tipo_cambio_operacion = +tcOperacion
      payload.precio_cierre_usd = Math.round((+precioARS / +tcOperacion) * 100) / 100
    }
    payload.descuento_otorgado_usd = 0

    const { error } = await supabase.from('transacciones').insert(payload)
    setSaving(false)
    if (error) { setMsg({ok:false,text:error.message}); return }
    setMsg({ok:true,text:'✅ Operación registrada. La unidad se actualizó automáticamente.'})
    setTimeout(() => { onSaved(); onClose() }, 1000)
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.title}>{unidad.unidad_codigo} — Piso {unidad.piso_nro}</div>
        <div style={s.sub}>{unidad.tipologia} · {fmt2(unidad.m2_propios)} m²</div>

        <div style={s.tabs}>
          <button style={{...s.tab, ...(tab==='asignacion'?s.tabAct:{})}} onClick={()=>setTab('asignacion')}>
            Asignación
          </button>
          <button style={{...s.tab, ...(tab==='venta'?s.tabAct:{})}} onClick={()=>setTab('venta')}>
            Registrar venta
          </button>
        </div>

        {tab === 'asignacion' && (
          <form onSubmit={guardarAsignacion}>
            <div style={s.field}>
              <label style={s.label}>Estado</label>
              <select style={s.select} value={estado} onChange={e=>setEstado(e.target.value)}>
                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Asignado a (cupo / sector)</label>
              <input style={s.input} value={asignadoA} onChange={e=>setAsignadoA(e.target.value)}
                placeholder="Ej: CUPO 3 - CALLERI, HONORARIOS, etc."/>
            </div>
            <div style={s.field}>
              <label style={s.label}>Nombre del comprador / beneficiario</label>
              <input style={s.input} value={compradorNombre} onChange={e=>setCompradorNombre(e.target.value)}
                placeholder="Nombre libre"/>
            </div>
            {msg && <div style={msg.ok?s.msg_ok:s.msg_err}>{msg.text}</div>}
            <div style={s.btnRow}>
              <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
              <button type="submit" style={s.btn} disabled={saving}>{saving?'Guardando...':'Guardar cambios'}</button>
            </div>
          </form>
        )}

        {tab === 'venta' && (
          <form onSubmit={registrarVenta}>
            <div style={s.infoBox}>
              Al registrar la venta, la unidad pasa automáticamente a "vendida" (o "reservada"/"canje" según el tipo de operación).
            </div>

            <div style={s.toggle}>
              <button type="button" style={{...s.toggleBtn, ...(usarClienteNuevo?s.toggleAct:{})}} onClick={()=>setUsarClienteNuevo(true)}>
                Cliente nuevo
              </button>
              <button type="button" style={{...s.toggleBtn, ...(!usarClienteNuevo?s.toggleAct:{})}} onClick={()=>setUsarClienteNuevo(false)}>
                Cliente existente
              </button>
            </div>

            {usarClienteNuevo ? (
              <div style={s.field}>
                <label style={s.label}>Nombre del cliente *</label>
                <input style={s.input} value={clienteNuevoNombre} onChange={e=>setClienteNuevoNombre(e.target.value)}
                  placeholder="Nombre completo" required/>
              </div>
            ) : (
              <div style={s.field}>
                <label style={s.label}>Cliente *</label>
                <select style={s.select} value={clienteId} onChange={e=>setClienteId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}

            <div style={s.row2}>
              <div style={s.field}>
                <label style={s.label}>Tipo de operación</label>
                <select style={s.select} value={tipoOperacion} onChange={e=>setTipoOperacion(e.target.value)}>
                  {TIPO_OP.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Fecha de operación</label>
                <input style={s.input} type="date" value={fechaOperacion} onChange={e=>setFechaOperacion(e.target.value)}/>
              </div>
            </div>

            <div style={s.toggle}>
              <button type="button" style={{...s.toggleBtn, ...(monedaPago==='USD'?s.toggleAct:{})}} onClick={()=>setMonedaPago('USD')}>
                Pago en USD
              </button>
              <button type="button" style={{...s.toggleBtn, ...(monedaPago==='ARS'?s.toggleAct:{})}} onClick={()=>setMonedaPago('ARS')}>
                Pago en ARS
              </button>
            </div>

            {monedaPago === 'USD' ? (
              <div style={s.field}>
                <label style={s.label}>Precio de cierre (USD) *</label>
                <input style={s.input} type="number" value={precioUSD} onChange={e=>setPrecioUSD(e.target.value)}
                  placeholder="Ej: 85000" required/>
              </div>
            ) : (
              <div style={s.row2}>
                <div style={s.field}>
                  <label style={s.label}>Precio de cierre (ARS) *</label>
                  <input style={s.input} type="number" value={precioARS} onChange={e=>setPrecioARS(e.target.value)}
                    placeholder="Ej: 119000000" required/>
                </div>
                <div style={s.field}>
                  <label style={s.label}>TC de la operación *</label>
                  <input style={s.input} type="number" value={tcOperacion} onChange={e=>setTcOperacion(e.target.value)}
                    placeholder="Ej: 1405" required/>
                </div>
              </div>
            )}
            <div style={{fontSize:11,color:'#aaa',marginTop:-6,marginBottom:14}}>
              El tipo de cambio se congela permanentemente a la fecha de esta operación.
            </div>

            {msg && <div style={msg.ok?s.msg_ok:s.msg_err}>{msg.text}</div>}
            <div style={s.btnRow}>
              <button type="button" style={s.btnCancel} onClick={onClose}>Cancelar</button>
              <button type="submit" style={s.btn} disabled={saving}>{saving?'Registrando...':'Registrar venta'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
