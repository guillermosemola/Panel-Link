'use client'
import { useState } from 'react'

const CAMPOS_CONFIG = {
  m2_totales:         { label:'m² totales construidos', min:500,    max:20000,   step:100,  fmt: v=>`${v.toLocaleString('es-AR')} m²` },
  eficiencia_pct:     { label:'Eficiencia vendible (%)', min:70,    max:85,      step:1,    fmt: v=>`${v}%` },
  plazo_meses:        { label:'Plazo de obra (meses)',   min:12,    max:36,      step:1,    fmt: v=>`${v} meses` },
  costo_directo_m2:   { label:'Costo directo (USD/m²)',  min:400,   max:2000,    step:10,   fmt: v=>`$${v}` },
  indirectos_pct:     { label:'Costos indirectos (%)',   min:15,    max:25,      step:1,    fmt: v=>`${v}%` },
  contingencias_pct:  { label:'Contingencias (%)',       min:0,     max:10,      step:1,    fmt: v=>`${v}%` },
  precio_terreno:     { label:'Valor del terreno (USD)', min:50000, max:3000000, step:10000,fmt: v=>`$${(v/1000).toFixed(0)}K` },
  capital_propio:     { label:'Capital propio (USD)',    min:0,     max:2000000, step:10000,fmt: v=>`$${(v/1000).toFixed(0)}K` },
  precio_mercado_m2:  { label:'Precio mercado (USD/m²)', min:800,   max:5000,    step:50,   fmt: v=>`$${v}` },
  ritmo_venta_m2:     { label:'Ritmo de venta (m²/mes)', min:20,    max:400,     step:10,   fmt: v=>`${v} m²/mes` },
}

const SECTOR_LABELS = {
  finanzas:  { label:'Finanzas',  color:'#0C447C', bg:'#E6F1FB' },
  obra:      { label:'Obra',      color:'#633806', bg:'#FAEEDA' },
  tecnica:   { label:'Técnica',   color:'#3C3489', bg:'#EEEDFE' },
  comercial: { label:'Comercial', color:'#085041', bg:'#E1F5EE' },
}

const GRUPOS = [
  { titulo:'Escala · Técnica',  campos:['m2_totales','eficiencia_pct','plazo_meses'],             sector:'tecnica' },
  { titulo:'Costos · Obra',     campos:['costo_directo_m2','indirectos_pct','contingencias_pct'], sector:'obra' },
  { titulo:'Financiero',        campos:['precio_terreno','capital_propio'],                       sector:'finanzas' },
  { titulo:'Comercial',         campos:['precio_mercado_m2','ritmo_venta_m2'],                    sector:'comercial' },
]

const st = {
  wrap:   { display:'flex', flexDirection:'column', gap:10 },
  card:   { background:'#fff', border:'0.5px solid #e0ddd6', borderRadius:12, padding:'1rem 1.1rem' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  titulo: { fontSize:11, fontWeight:500, letterSpacing:'0.07em', textTransform:'uppercase', color:'#888' },
  pill:   { fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:20 },
  row:    { marginBottom:10 },
  top:    { display:'flex', justifyContent:'space-between', marginBottom:4 },
  lbl:    { fontSize:12, color:'#555' },
  val:    { fontSize:12, fontWeight:500, color:'#1a1a18' },
  locked: { fontSize:12, color:'#ccc', padding:'2px 0' },
  sectionTitle: { fontSize:12, fontWeight:600, color:'#1a1a18', margin:'14px 0 8px',
    display:'flex', alignItems:'center', gap:6 },
  addBtn: { fontSize:12, color:'#185FA5', background:'#E6F1FB', border:'none',
    borderRadius:6, padding:'4px 10px', cursor:'pointer' },
  removeBtn: { fontSize:11, color:'#A32D2D', background:'none', border:'none',
    cursor:'pointer', padding:'2px 6px' },
  socioCard: { background:'#f8f8f6', border:'0.5px solid #e0ddd6', borderRadius:8,
    padding:'10px 12px', marginBottom:8 },
  input: { width:'100%', padding:'6px 8px', fontSize:12, borderRadius:6,
    border:'0.5px solid #ccc', background:'#fff', marginTop:3 },
  inputRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 },
  select: { width:'100%', padding:'6px 8px', fontSize:12, borderRadius:6,
    border:'0.5px solid #ccc', background:'#fff', marginTop:3 },
  fieldLabel: { fontSize:11, color:'#888', marginTop:8, display:'block' },
  cochCard: { background:'#f8f8f6', border:'0.5px solid #e0ddd6', borderRadius:8, padding:'10px 12px' },
}

const fmtK = n => n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`

export default function SimuladorPanel({ inputs, onChange, sector, camposEditables }) {
  const [socioNombre, setSocioNombre] = useState('')
  const esFinanzas = sector === 'finanzas'
  const esDueno = (g) => g.sector === sector || esFinanzas

  function addSocio() {
    const nuevo = {
      id: Date.now(),
      nombre: socioNombre || `Socio ${(inputs.socios||[]).length + 1}`,
      unidades_m2: 80,
      anticipo_usd: 50000,
      cuotas_usd: 50000,
      mes_inicio_cuotas: 0,
      cant_cuotas: 12,
    }
    onChange('socios', [...(inputs.socios || []), nuevo])
    setSocioNombre('')
  }

  function updateSocio(id, key, val) {
    onChange('socios', (inputs.socios || []).map(s =>
      s.id === id ? { ...s, [key]: +val || val } : s
    ))
  }

  function removeSocio(id) {
    onChange('socios', (inputs.socios || []).filter(s => s.id !== id))
  }

  return (
    <div style={st.wrap}>
      {/* ── Sliders por sector ── */}
      {GRUPOS.map(g => {
        const sl = SECTOR_LABELS[g.sector]
        const editable = esDueno(g)
        return (
          <div key={g.titulo} style={{ ...st.card, opacity: editable ? 1 : 0.5 }}>
            <div style={st.header}>
              <span style={st.titulo}>{g.titulo}</span>
              <span style={{ ...st.pill, background: sl.bg, color: sl.color }}>{sl.label}</span>
            </div>
            {g.campos.map(campo => {
              const cfg = CAMPOS_CONFIG[campo]
              const val = inputs[campo] ?? cfg.min
              return (
                <div key={campo} style={st.row}>
                  <div style={st.top}>
                    <span style={st.lbl}>{cfg.label}</span>
                    <span style={st.val}>{cfg.fmt(val)}</span>
                  </div>
                  {editable
                    ? <input type="range" style={{ width:'100%', accentColor:'#1a1a18' }}
                        min={cfg.min} max={cfg.max} step={cfg.step} value={val}
                        onChange={e => onChange(campo, +e.target.value)} />
                    : <div style={st.locked}>Solo {sl.label}</div>
                  }
                </div>
              )
            })}
          </div>
        )
      })}

      {/* ── COCHERAS ── solo finanzas o comercial */}
      {(esFinanzas || sector === 'comercial') && (
        <div style={st.card}>
          <div style={st.header}>
            <span style={st.titulo}>Cocheras</span>
            <span style={{ ...st.pill, background:'#E1F5EE', color:'#085041' }}>Comercial</span>
          </div>
          <div style={st.cochCard}>
            <span style={st.fieldLabel}>Modalidad de precio</span>
            <select style={st.select} value={inputs.modo_cochera || 'fijo'}
              onChange={e => onChange('modo_cochera', e.target.value)}>
              <option value="fijo">Precio fijo por unidad</option>
              <option value="m2">Precio por m²</option>
              <option value="combinado">Incluido en depto (sin precio separado)</option>
            </select>

            <div style={st.inputRow}>
              <div>
                <span style={st.fieldLabel}>Cantidad de cocheras</span>
                <input type="number" style={st.input} min={0} max={500}
                  value={inputs.cant_cocheras || 0}
                  onChange={e => onChange('cant_cocheras', +e.target.value)} />
              </div>
              <div>
                <span style={st.fieldLabel}>Ritmo venta (coch/mes)</span>
                <input type="number" style={st.input} min={0} max={50}
                  value={inputs.ritmo_venta_cocheras || 0}
                  onChange={e => onChange('ritmo_venta_cocheras', +e.target.value)} />
              </div>
            </div>

            {inputs.modo_cochera !== 'combinado' && (
              <div style={st.inputRow}>
                {inputs.modo_cochera === 'fijo' || !inputs.modo_cochera ? (
                  <div>
                    <span style={st.fieldLabel}>Precio por cochera (USD)</span>
                    <input type="number" style={st.input} min={0}
                      value={inputs.precio_cochera_usd || 0}
                      onChange={e => onChange('precio_cochera_usd', +e.target.value)} />
                  </div>
                ) : (
                  <>
                    <div>
                      <span style={st.fieldLabel}>m² por cochera</span>
                      <input type="number" style={st.input} min={0}
                        value={inputs.m2_cochera || 0}
                        onChange={e => onChange('m2_cochera', +e.target.value)} />
                    </div>
                    <div>
                      <span style={st.fieldLabel}>Precio USD/m² cochera</span>
                      <input type="number" style={st.input} min={0}
                        value={inputs.precio_m2_cochera || 0}
                        onChange={e => onChange('precio_m2_cochera', +e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SOCIOS ── solo finanzas */}
      {esFinanzas && (
        <div style={st.card}>
          <div style={st.header}>
            <span style={st.titulo}>Socios aportantes</span>
            <span style={{ ...st.pill, background:'#E6F1FB', color:'#0C447C' }}>Finanzas</span>
          </div>

          {(inputs.socios || []).map(s => (
            <div key={s.id} style={st.socioCard}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:500 }}>{s.nombre}</span>
                <button style={st.removeBtn} onClick={() => removeSocio(s.id)}>✕ quitar</button>
              </div>
              <div style={st.inputRow}>
                <div>
                  <span style={st.fieldLabel}>m² de unidades asignadas</span>
                  <input type="number" style={st.input} min={0}
                    value={s.unidades_m2}
                    onChange={e => updateSocio(s.id, 'unidades_m2', e.target.value)} />
                </div>
                <div>
                  <span style={st.fieldLabel}>Anticipo (USD)</span>
                  <input type="number" style={st.input} min={0}
                    value={s.anticipo_usd}
                    onChange={e => updateSocio(s.id, 'anticipo_usd', e.target.value)} />
                </div>
                <div>
                  <span style={st.fieldLabel}>Total cuotas (USD)</span>
                  <input type="number" style={st.input} min={0}
                    value={s.cuotas_usd}
                    onChange={e => updateSocio(s.id, 'cuotas_usd', e.target.value)} />
                </div>
                <div>
                  <span style={st.fieldLabel}>Cant. cuotas (meses)</span>
                  <input type="number" style={st.input} min={1} max={36}
                    value={s.cant_cuotas}
                    onChange={e => updateSocio(s.id, 'cant_cuotas', e.target.value)} />
                </div>
                <div>
                  <span style={st.fieldLabel}>Mes inicio cuotas</span>
                  <input type="number" style={st.input} min={0} max={36}
                    value={s.mes_inicio_cuotas}
                    onChange={e => updateSocio(s.id, 'mes_inicio_cuotas', e.target.value)} />
                </div>
                <div style={{ display:'flex', alignItems:'flex-end' }}>
                  <span style={{ fontSize:11, color:'#888', paddingBottom:4 }}>
                    Aporte total: {fmtK((+s.anticipo_usd||0) + (+s.cuotas_usd||0))}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <input type="text" style={{ ...st.input, marginTop:0, flex:1 }}
              placeholder="Nombre del socio"
              value={socioNombre}
              onChange={e => setSocioNombre(e.target.value)} />
            <button style={st.addBtn} onClick={addSocio}>+ Agregar socio</button>
          </div>
        </div>
      )}
    </div>
  )
}
