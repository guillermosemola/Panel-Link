'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmt2 = n => n==null?'':new Intl.NumberFormat('es-AR').format(Math.round(n))

const OVERLAY = {
  position:'fixed',inset:0,background:'rgba(0,0,0,.55)',backdropFilter:'blur(3px)',
  zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',
}
const MODAL = {
  background:'#fff',borderRadius:14,width:'100%',maxWidth:560,maxHeight:'90vh',
  overflow:'auto',fontFamily:'system-ui,sans-serif',boxShadow:'0 24px 60px rgba(0,0,0,.2)',
}
const s = {
  header: {padding:'1.25rem 1.5rem',borderBottom:'0.5px solid #f0ede8',display:'flex',
    justifyContent:'space-between',alignItems:'center'},
  body:   {padding:'1.5rem'},
  footer: {padding:'1rem 1.5rem',borderTop:'0.5px solid #f0ede8',display:'flex',gap:10,justifyContent:'flex-end'},
  label:  {fontSize:12,color:'#888',display:'block',marginBottom:5,fontWeight:500},
  input:  {width:'100%',padding:'9px 12px',fontSize:14,borderRadius:8,border:'0.5px solid #ccc',
    background:'#fafafa',outline:'none',boxSizing:'border-box',fontFamily:'monospace',
    transition:'border-color .15s'},
  select: {width:'100%',padding:'9px 12px',fontSize:14,borderRadius:8,border:'0.5px solid #ccc',
    background:'#fafafa',outline:'none',boxSizing:'border-box',fontFamily:'inherit'},
  field:  {marginBottom:14},
  row2:   {display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14},
  btn:    {padding:'10px 22px',fontSize:13,fontWeight:600,borderRadius:8,border:'none',
    background:'#1a1a18',color:'#fff',cursor:'pointer'},
  btnSec: {padding:'10px 18px',fontSize:13,borderRadius:8,cursor:'pointer',
    border:'0.5px solid #ddd',background:'#fff',color:'#666'},
  msg_ok: {fontSize:12,color:'#27500A',background:'#EAF3DE',borderRadius:7,padding:'9px 13px',marginBottom:12},
  msg_er: {fontSize:12,color:'#A32D2D',background:'#FCEBEB',borderRadius:7,padding:'9px 13px',marginBottom:12},
  tab:    {padding:'8px 16px',fontSize:13,border:'none',background:'none',cursor:'pointer',
    fontFamily:'inherit',borderBottom:'2px solid transparent',transition:'all .15s'},
}

const TIPOLOGIAS = [
  {val:'departamento', label:'Departamento'},
  {val:'cochera',      label:'Cochera'},
  {val:'local',        label:'Local'},
  {val:'baulera',      label:'Baulera'},
]
const ESTADOS = [
  {val:'disponible',      label:'Disponible',  color:'#22c55e'},
  {val:'reservada',       label:'Reservada',   color:'#f59e0b'},
  {val:'vendida',         label:'Vendida',     color:'#a78bfa'},
  {val:'canje_proveedor', label:'Canje',       color:'#fb923c'},
]

export default function ModalUnidad({ unidad, onClose, onSaved, empresaId }) {
  const [tab,     setTab]     = useState('datos')
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState(null)

  // Tab datos
  const [tipologia,   setTipologia]   = useState(unidad?.tipologia || 'departamento')
  const [estado,      setEstado]       = useState(unidad?.estado || 'disponible')
  const [piso,        setPiso]         = useState(unidad?.piso_nro || '')
  const [m2,          setM2]           = useState(unidad?.m2_propios || '')
  const [precioUSD,   setPrecioUSD]    = useState(unidad?.precio_lista_usd_m2 || '')
  const [asignadoA,   setAsignadoA]    = useState(unidad?.asignado_a || '')
  const [notas,       setNotas]        = useState(unidad?.notas || '')

  // Tab venta
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteDoc,    setClienteDoc]    = useState('')
  const [tipoOp,        setTipoOp]        = useState('venta_contado')
  const [moneda,        setMoneda]        = useState('USD')
  const [precioTotal,   setPrecioTotal]   = useState('')
  const [tcOp,          setTcOp]          = useState('')
  const [fechaOp,       setFechaOp]       = useState(new Date().toISOString().split('T')[0])
  const [clientes,      setClientes]      = useState([])
  const [clienteId,     setClienteId]     = useState('')
  const [nuevoCliente,  setNuevoCliente]  = useState(true)

  useEffect(() => {
    // Cargar TC actual para sugerir en ventas ARS
    async function loadTC() {
      const { data } = await supabase.from('tipos_cambio')
        .select('valor').eq('tipo','valuacion')
        .order('fecha',{ascending:false}).limit(1).maybeSingle()
      if (data) setTcOp(data.valor)
    }
    async function loadClientes() {
      const { data } = await supabase.from('clientes').select('id,nombre,documento')
        .order('nombre').limit(50)
      setClientes(data || [])
    }
    loadTC(); loadClientes()
  }, [])

  async function guardarDatos() {
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('unidades').update({
      tipologia:           tipologia,
      estado:              estado,
      piso_nro:            piso || null,
      m2_propios:          m2 ? +m2 : null,
      precio_lista_usd_m2: precioUSD ? +precioUSD : null,
      asignado_a:          asignadoA.trim() || null,
      notas:               notas.trim() || null,
    }).eq('id', unidad.id)

    setSaving(false)
    if (error) { setMsg({ok:false,text:error.message}); return }
    setMsg({ok:true,text:'✅ Unidad actualizada correctamente.'})
    setTimeout(() => { onSaved && onSaved(); onClose() }, 1000)
  }

  async function registrarVenta() {
    if (!precioTotal || +precioTotal <= 0) {
      setMsg({ok:false,text:'Ingresá el precio total de la operación.'}); return
    }
    setSaving(true); setMsg(null)

    let finalClienteId = clienteId

    // Crear cliente nuevo si es necesario
    if (nuevoCliente && clienteNombre.trim()) {
      const { data:newCliente, error:errC } = await supabase.from('clientes').insert({
        empresa_id: empresaId,
        nombre:     clienteNombre.trim(),
        documento:  clienteDoc.trim() || null,
      }).select().single()
      if (errC) { setSaving(false); setMsg({ok:false,text:errC.message}); return }
      finalClienteId = newCliente.id
    }

    // Calcular precio en USD
    const precioUSDop = moneda === 'USD'
      ? +precioTotal
      : tcOp ? +precioTotal / +tcOp : null

    // Registrar transacción
    const { error:errT } = await supabase.from('transacciones').insert({
      unidad_id:            unidad.id,
      cliente_id:           finalClienteId || null,
      tipo_operacion:       tipoOp,
      fecha_operacion:      fechaOp,
      moneda_pago:          moneda,
      precio_total_pagado:  +precioTotal,
      tipo_cambio_operacion: moneda === 'ARS' ? +tcOp : null,
      precio_cierre_usd:    precioUSDop,
    })
    if (errT) { setSaving(false); setMsg({ok:false,text:errT.message}); return }

    // Actualizar estado de la unidad
    const nuevoEstado = tipoOp === 'reserva' ? 'reservada' : 'vendida'
    await supabase.from('unidades').update({
      estado:            nuevoEstado,
      comprador_nombre:  clienteNombre.trim() || null,
      fecha_venta:       fechaOp,
    }).eq('id', unidad.id)

    setSaving(false)
    setMsg({ok:true,text:`✅ ${tipoOp==='reserva'?'Reserva':'Venta'} registrada correctamente. TC congelado.`})
    setTimeout(() => { onSaved && onSaved(); onClose() }, 1200)
  }

  const precioSugerido = m2 && precioUSD ? (+m2 * +precioUSD) : null

  return (
    <div style={OVERLAY} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={MODAL}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={{fontSize:16,fontWeight:600,color:'#1a1a18'}}>
              Unidad {unidad?.unidad_codigo}
            </div>
            <div style={{fontSize:12,color:'#aaa',marginTop:2}}>
              {unidad?.piso_nro} · {({departamento:'Departamento',cochera:'Cochera',local:'Local',baulera:'Baulera'})[unidad?.tipologia]||unidad?.tipologia}
              {unidad?.m2_propios ? ` · ${unidad.m2_propios} m²` : ''}
            </div>
          </div>
          <button onClick={onClose}
            style={{fontSize:20,color:'#aaa',background:'none',border:'none',cursor:'pointer',lineHeight:1}}>×</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'0.5px solid #f0ede8',padding:'0 1.5rem'}}>
          {[['datos','📋 Datos y asignación'],['venta','💼 Registrar operación']].map(([key,label])=>(
            <button key={key} style={{...s.tab,
              color:tab===key?'#1a1a18':'#aaa',
              borderBottomColor:tab===key?'#1a1a18':'transparent',
              fontWeight:tab===key?600:400}}
              onClick={()=>{setTab(key);setMsg(null)}}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Datos */}
        {tab === 'datos' && (
          <div style={s.body}>
            <div style={s.row2}>
              <div>
                <label style={s.label}>Tipología</label>
                <select style={s.select} value={tipologia} onChange={e=>setTipologia(e.target.value)}>
                  {TIPOLOGIAS.map(t=><option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Estado</label>
                <select style={s.select} value={estado} onChange={e=>setEstado(e.target.value)}>
                  {ESTADOS.map(e=><option key={e.val} value={e.val}>{e.label}</option>)}
                </select>
              </div>
            </div>

            <div style={s.row2}>
              <div>
                <label style={s.label}>Piso / Ubicación</label>
                <input style={s.input} value={piso} onChange={e=>setPiso(e.target.value)}
                  placeholder="Ej: Piso 3, PB"/>
              </div>
              <div>
                <label style={s.label}>m² propios</label>
                <input style={s.input} type="number" value={m2} onChange={e=>setM2(e.target.value)}
                  placeholder="Ej: 65.50" step="0.01"/>
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Precio de lista (USD/m²)</label>
              <input style={s.input} type="number" value={precioUSD} onChange={e=>setPrecioUSD(e.target.value)}
                placeholder="Ej: 1200"/>
              {precioSugerido && (
                <div style={{fontSize:12,color:'#0C447C',marginTop:4,fontFamily:'monospace'}}>
                  → Precio total: ${new Intl.NumberFormat('es-AR').format(Math.round(precioSugerido))}
                </div>
              )}
            </div>

            <div style={s.field}>
              <label style={s.label}>Asignado a / Beneficiario</label>
              <input style={s.input} value={asignadoA} onChange={e=>setAsignadoA(e.target.value)}
                placeholder="Nombre del socio, inversor o beneficiario"/>
            </div>

            <div style={s.field}>
              <label style={s.label}>Notas</label>
              <textarea value={notas} onChange={e=>setNotas(e.target.value)}
                placeholder="Observaciones sobre esta unidad..."
                style={{...s.input,minHeight:56,resize:'vertical',fontFamily:'inherit'}}/>
            </div>

            {msg && <div style={msg.ok?s.msg_ok:s.msg_er}>{msg.text}</div>}
          </div>
        )}

        {/* Tab: Venta */}
        {tab === 'venta' && (
          <div style={s.body}>
            {/* Tipo de operación */}
            <div style={s.field}>
              <label style={s.label}>Tipo de operación</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {[
                  ['venta_contado','💵 Contado'],
                  ['venta_financiada','📅 Financiada'],
                  ['reserva','📌 Reserva'],
                  ['canje','🔄 Canje'],
                ].map(([val,label])=>(
                  <button key={val} type="button" onClick={()=>setTipoOp(val)}
                    style={{padding:'8px 4px',borderRadius:7,fontSize:11,cursor:'pointer',textAlign:'center',
                      border:tipoOp===val?'1.5px solid #1a1a18':'0.5px solid #ddd',
                      background:tipoOp===val?'#1a1a18':'#fff',
                      color:tipoOp===val?'#fff':'#555',fontWeight:tipoOp===val?600:400}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div style={s.field}>
              <label style={s.label}>Cliente</label>
              <div style={{display:'flex',gap:8,marginBottom:8}}>
                <button type="button" onClick={()=>setNuevoCliente(true)}
                  style={{...s.btnSec,fontSize:12,padding:'6px 12px',
                    background:nuevoCliente?'#1a1a18':'#fff',color:nuevoCliente?'#fff':'#555',
                    border:nuevoCliente?'0.5px solid #1a1a18':'0.5px solid #ddd'}}>
                  + Nuevo cliente
                </button>
                <button type="button" onClick={()=>setNuevoCliente(false)}
                  style={{...s.btnSec,fontSize:12,padding:'6px 12px',
                    background:!nuevoCliente?'#1a1a18':'#fff',color:!nuevoCliente?'#fff':'#555',
                    border:!nuevoCliente?'0.5px solid #1a1a18':'0.5px solid #ddd'}}>
                  Cliente existente
                </button>
              </div>
              {nuevoCliente ? (
                <div style={s.row2}>
                  <div>
                    <label style={s.label}>Nombre completo</label>
                    <input style={s.input} value={clienteNombre} onChange={e=>setClienteNombre(e.target.value)}
                      placeholder="Nombre del comprador"/>
                  </div>
                  <div>
                    <label style={s.label}>DNI / CUIT</label>
                    <input style={s.input} value={clienteDoc} onChange={e=>setClienteDoc(e.target.value)}
                      placeholder="Ej: 20-12345678-9"/>
                  </div>
                </div>
              ) : (
                <select style={s.select} value={clienteId} onChange={e=>setClienteId(e.target.value)}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre} {c.documento?`(${c.documento})`:''}</option>)}
                </select>
              )}
            </div>

            {/* Precio */}
            <div style={s.row2}>
              <div>
                <label style={s.label}>Moneda</label>
                <div style={{display:'flex',gap:8}}>
                  {['USD','ARS'].map(m=>(
                    <button key={m} type="button" onClick={()=>setMoneda(m)}
                      style={{flex:1,padding:'9px',borderRadius:7,fontSize:13,cursor:'pointer',
                        border:moneda===m?'1.5px solid #1a1a18':'0.5px solid #ddd',
                        background:moneda===m?'#1a1a18':'#fff',
                        color:moneda===m?'#fff':'#555',fontWeight:moneda===m?600:400}}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={s.label}>Precio total ({moneda})</label>
                <input style={s.input} type="number" value={precioTotal}
                  onChange={e=>setPrecioTotal(e.target.value)}
                  placeholder={moneda==='USD'?'Ej: 85000':'Ej: 120000000'}/>
              </div>
            </div>

            {moneda === 'ARS' && (
              <div style={s.field}>
                <label style={s.label}>Tipo de cambio de la operación (ARS/USD) — se congela</label>
                <input style={s.input} type="number" value={tcOp}
                  onChange={e=>setTcOp(e.target.value)}
                  placeholder="Ej: 1450"/>
                {precioTotal && tcOp && (
                  <div style={{fontSize:12,color:'#0C447C',marginTop:4,fontFamily:'monospace'}}>
                    → Equivale a USD ${fmt2(Math.round(+precioTotal / +tcOp))}
                  </div>
                )}
              </div>
            )}

            <div style={s.field}>
              <label style={s.label}>Fecha de la operación</label>
              <input style={s.input} type="date" value={fechaOp} onChange={e=>setFechaOp(e.target.value)}/>
            </div>

            {unidad?.precio_lista_usd_m2 && unidad?.m2_propios && (
              <div style={{background:'#f8f8f6',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:12}}>
                💡 Precio de lista: USD ${fmt2(Math.round(+unidad.m2_propios * +unidad.precio_lista_usd_m2))}
                {' '}(${unidad.precio_lista_usd_m2}/m² × {unidad.m2_propios} m²)
              </div>
            )}

            {msg && <div style={msg.ok?s.msg_ok:s.msg_er}>{msg.text}</div>}
          </div>
        )}

        {/* Footer */}
        <div style={s.footer}>
          <button style={s.btnSec} onClick={onClose}>Cancelar</button>
          <button style={s.btn} disabled={saving}
            onClick={tab==='datos'?guardarDatos:registrarVenta}>
            {saving ? 'Guardando...' : tab==='datos' ? '✓ Guardar cambios' : '✓ Confirmar operación'}
          </button>
        </div>
      </div>
    </div>
  )
}
