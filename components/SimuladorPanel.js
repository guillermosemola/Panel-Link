'use client'

const CAMPOS_CONFIG = {
  m2_totales:         { label:'m² totales construidos', min:500,   max:20000, step:100,  fmt: v=>`${v.toLocaleString('es-AR')} m²` },
  eficiencia_pct:     { label:'Eficiencia vendible (%)', min:70,    max:85,    step:1,    fmt: v=>`${v}%` },
  plazo_meses:        { label:'Plazo de obra (meses)',   min:12,    max:36,    step:1,    fmt: v=>`${v} meses` },
  costo_directo_m2:   { label:'Costo directo (USD/m²)',  min:400,   max:2000,  step:10,   fmt: v=>`$${v}` },
  indirectos_pct:     { label:'Costos indirectos (%)',   min:15,    max:25,    step:1,    fmt: v=>`${v}%` },
  contingencias_pct:  { label:'Contingencias (%)',       min:0,     max:10,    step:1,    fmt: v=>`${v}%` },
  precio_terreno:     { label:'Valor del terreno (USD)', min:50000, max:3000000,step:10000,fmt: v=>`$${(v/1000).toFixed(0)}K` },
  capital_propio:     { label:'Capital propio (USD)',    min:0,     max:2000000,step:10000,fmt: v=>`$${(v/1000).toFixed(0)}K` },
  precio_mercado_m2:  { label:'Precio mercado (USD/m²)', min:800,   max:5000,  step:50,   fmt: v=>`$${v}` },
  ritmo_venta_m2:     { label:'Ritmo de venta (m²/mes)', min:20,    max:400,   step:10,   fmt: v=>`${v} m²/mes` },
}

const SECTOR_LABELS = {
  finanzas:  { label:'Finanzas',  color:'#0C447C', bg:'#E6F1FB' },
  obra:      { label:'Obra',      color:'#633806', bg:'#FAEEDA' },
  tecnica:   { label:'Técnica',   color:'#3C3489', bg:'#EEEDFE' },
  comercial: { label:'Comercial', color:'#085041', bg:'#E1F5EE' },
}

const TODOS_GRUPOS = [
  { titulo:'Escala · Técnica',  campos:['m2_totales','eficiencia_pct','plazo_meses'],         sector:'tecnica' },
  { titulo:'Costos · Obra',     campos:['costo_directo_m2','indirectos_pct','contingencias_pct'], sector:'obra' },
  { titulo:'Financiero',        campos:['precio_terreno','capital_propio'],                   sector:'finanzas' },
  { titulo:'Comercial',         campos:['precio_mercado_m2','ritmo_venta_m2'],                sector:'comercial' },
]

const st = {
  wrap:   { display:'flex', flexDirection:'column', gap:12 },
  card:   { background:'#fff', border:'0.5px solid #e0ddd6', borderRadius:12, padding:'1rem 1.25rem' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  titulo: { fontSize:11, fontWeight:500, letterSpacing:'0.07em',
            textTransform:'uppercase', color:'#888' },
  pill:   { fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:20 },
  row:    { marginBottom:10 },
  top:    { display:'flex', justifyContent:'space-between', marginBottom:4 },
  lbl:    { fontSize:12, color:'#555' },
  val:    { fontSize:12, fontWeight:500, color:'#1a1a18' },
  slider: { width:'100%', accentColor:'#1a1a18' },
  locked: { fontSize:12, color:'#aaa', fontStyle:'italic', padding:'4px 0' },
}

export default function SimuladorPanel({ inputs, onChange, sector, camposEditables }) {
  return (
    <div style={st.wrap}>
      {TODOS_GRUPOS.map(grupo => {
        const sl = SECTOR_LABELS[grupo.sector]
        const esDueno = grupo.sector === sector
        const esFinanzasVeTodo = sector === 'finanzas'

        return (
          <div key={grupo.titulo} style={{
            ...st.card,
            opacity: (!esDueno && !esFinanzasVeTodo) ? 0.55 : 1,
          }}>
            <div style={st.header}>
              <span style={st.titulo}>{grupo.titulo}</span>
              <span style={{ ...st.pill, background: sl.bg, color: sl.color }}>
                {sl.label}
              </span>
            </div>

            {grupo.campos.map(campo => {
              const cfg     = CAMPOS_CONFIG[campo]
              const editable = esDueno || esFinanzasVeTodo
              const val     = inputs[campo] ?? cfg.min

              return (
                <div key={campo} style={st.row}>
                  <div style={st.top}>
                    <span style={st.lbl}>{cfg.label}</span>
                    <span style={st.val}>{cfg.fmt(val)}</span>
                  </div>
                  {editable ? (
                    <input
                      type="range"
                      style={st.slider}
                      min={cfg.min} max={cfg.max} step={cfg.step}
                      value={val}
                      onChange={e => onChange(campo, +e.target.value)}
                    />
                  ) : (
                    <div style={st.locked}>
                      Solo puede modificarlo el sector {sl.label}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
