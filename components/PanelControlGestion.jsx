'use client'
import { useState } from 'react'

const fmtUSD = n => n==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)
const fmtM   = n => {if(n==null)return'—';const a=Math.abs(n),s=n<0?'-':'';if(a>=1e6)return`${s}$${(a/1e6).toFixed(2)}M`;if(a>=1e3)return`${s}$${Math.round(a/1e3)}K`;return`${s}$${Math.round(a)}`}
const fmtPct = n => n==null?'—':`${n>0?'+':''}${Number(n).toFixed(1)}%`
const fmt2   = n => n==null?'—':new Intl.NumberFormat('es-AR').format(Math.round(n))

const BADGE = {
  disponible:     {bg:'rgba(94,234,212,.12)',border:'rgba(94,234,212,.3)',color:'#5eead4',label:'Disponible'},
  reservada:      {bg:'rgba(250,204,21,.12)',border:'rgba(250,204,21,.3)',color:'#facc15',label:'Reservada'},
  vendida:        {bg:'rgba(167,139,250,.12)',border:'rgba(167,139,250,.3)',color:'#a78bfa',label:'Vendida'},
  canje_proveedor:{bg:'rgba(251,146,60,.12)',border:'rgba(251,146,60,.3)',color:'#fb923c',label:'Canje/Cupo'},
}
const TIPO = {departamento:'Depto',cochera:'Cochera',local:'Local',baulera:'Baulera'}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;500;600&display=swap');
.pcg{--bg:#0a0c0e;--s1:#111418;--s2:#161a1f;--bd:#23282f;--tx:#e8ecef;--dim:#8b95a1;--fnt:#565e69;--teal:#5eead4;--amb:#facc15;--red:#fb7185;--blu:#60a5fa;font-family:'Geist',system-ui,sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;padding:28px 36px 60px}
.pcg-ey{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--teal);margin-bottom:6px;font-family:'Geist Mono',monospace}
.pcg-h1{font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0 0 4px}
.pcg-meta{font-size:13px;color:var(--dim);margin-bottom:24px;display:flex;gap:10px}
.pcg-sep{color:var(--fnt)}
.pcg-bento{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
@media(max-width:1100px){.pcg-bento{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px){.pcg-bento{grid-template-columns:1fr}}
.pcg-card{background:var(--s1);border:1px solid var(--bd);border-radius:12px;padding:18px;transition:border-color .2s,box-shadow .3s}
.pcg-card.green{border-color:rgba(94,234,212,.18);box-shadow:0 0 28px -12px rgba(94,234,212,.3)}
.pcg-card.amber{border-color:rgba(250,204,21,.18);box-shadow:0 0 28px -12px rgba(250,204,21,.3)}
.pcg-card.red  {border-color:rgba(251,113,133,.2); box-shadow:0 0 28px -12px rgba(251,113,133,.35)}
.pcg-card.blue {border-color:rgba(96,165,250,.18); box-shadow:0 0 28px -12px rgba(96,165,250,.25)}
.pcg-ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.pcg-cl{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)}
.pcg-dot{width:7px;height:7px;border-radius:50%;position:relative}
.pcg-dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;animation:pulse 2.4s ease-out infinite}
.pcg-dot.green{background:var(--teal)}.pcg-dot.green::after{background:var(--teal)}
.pcg-dot.amber{background:var(--amb)}.pcg-dot.amber::after{background:var(--amb)}
.pcg-dot.red  {background:var(--red)}.pcg-dot.red::after{background:var(--red)}
.pcg-dot.blue {background:var(--blu)}.pcg-dot.blue::after{background:var(--blu)}
@keyframes pulse{0%{opacity:.5;transform:scale(.6)}70%{opacity:0;transform:scale(1.8)}100%{opacity:0}}
.pcg-main{font-family:'Geist Mono',monospace;font-size:24px;font-weight:600;letter-spacing:-.02em;line-height:1;margin-bottom:4px}
.pcg-sub{font-size:12px;color:var(--dim);margin-bottom:12px}
.pcg-bar{background:var(--s2);border-radius:6px;height:6px;overflow:hidden}
.pcg-bar-fill{height:100%;border-radius:6px;transition:width .5s}
.pcg-bar-fill.green{background:var(--teal)}.pcg-bar-fill.amber{background:var(--amb)}.pcg-bar-fill.red{background:var(--red)}.pcg-bar-fill.blue{background:var(--blu)}
.pcg-delta{font-family:'Geist Mono',monospace;font-size:12px;font-weight:500;margin-top:10px}
.pcg-delta.green{color:var(--teal)}.pcg-delta.amber{color:var(--amb)}.pcg-delta.red{color:var(--red)}
.pcg-desc-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.pcg-desc-tag{font-size:11px;color:var(--dim);width:90px;flex-shrink:0}
.pcg-desc-val{font-family:'Geist Mono',monospace;font-size:13px;font-weight:600;width:40px;text-align:right}
.pcg-tabs{display:flex;gap:0;border-bottom:1px solid var(--bd);margin-bottom:20px}
.pcg-tab{background:none;border:none;color:var(--dim);font-size:13px;font-weight:500;padding:10px 0;margin-right:24px;cursor:pointer;position:relative;display:flex;align-items:center;gap:8px;font-family:inherit;transition:color .15s}
.pcg-tab:hover{color:var(--tx)}.pcg-tab.act{color:var(--tx)}
.pcg-tab.act::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--teal);border-radius:2px 2px 0 0}
.pcg-cnt{font-family:'Geist Mono',monospace;font-size:11px;background:var(--s2);color:var(--fnt);padding:1px 7px;border-radius:10px}
.pcg-tab.act .pcg-cnt{color:var(--teal);background:rgba(94,234,212,.08)}
.pcg-filters{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px}
.pcg-fg{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pcg-fl{font-size:11px;color:var(--fnt);text-transform:uppercase;letter-spacing:.08em}
.pcg-chip{background:var(--s1);border:1px solid var(--bd);color:var(--dim);font-size:12px;padding:5px 12px;border-radius:20px;cursor:pointer;font-family:inherit;transition:all .15s}
.pcg-chip:hover{border-color:var(--fnt);color:var(--tx)}.pcg-chip.act{background:rgba(94,234,212,.08);border-color:rgba(94,234,212,.35);color:var(--teal)}
.pcg-tbl-wrap{background:var(--s1);border:1px solid var(--bd);border-radius:12px;overflow:auto}
table.pcg-tbl{width:100%;border-collapse:collapse;font-size:13px}
.pcg-tbl thead th{text-align:left;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--fnt);padding:12px 14px;border-bottom:1px solid var(--bd);background:var(--s2);white-space:nowrap}
.pcg-tbl thead th.r{text-align:right}
.pcg-tbl tbody td{padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.03);color:var(--tx);vertical-align:middle}
.pcg-tbl tbody tr:last-child td{border-bottom:none}
.pcg-tbl tbody tr:hover{background:rgba(255,255,255,.015)}
.pcg-tbl td.r{text-align:right}.pcg-tbl td.mono{font-family:'Geist Mono',monospace}
.pcg-badge{display:inline-block;font-size:11px;font-weight:500;padding:3px 10px;border-radius:20px;border:1px solid;font-family:'Geist Mono',monospace}
.pcg-ud{display:flex;flex-direction:column;gap:1px}
.pcg-ud strong{font-size:13px}.pcg-ud span{font-size:11px;color:var(--fnt)}
.pcg-asig{font-size:11px;color:var(--dim);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pcg-empty{text-align:center;color:var(--fnt);padding:40px!important;font-size:13px}
.pcg-na{color:var(--fnt);font-size:12px}
.pcg-sinev{background:rgba(96,165,250,.07);border:1px solid rgba(96,165,250,.2);border-radius:10px;padding:14px 18px;font-size:13px;color:var(--dim);margin-bottom:24px}
`

export default function PanelControlGestion({ proyecto, controlPresupuestario, performanceComercial, descalceFinanciero, margenTeoricoVsReal, unidades=[], transacciones=[] }) {
  const [tab, setTab] = useState('inventario')
  const [filtroTipo, setFT] = useState('todos')
  const [filtroEstado, setFE] = useState('todos')

  const cp  = controlPresupuestario  || {}
  const pc  = performanceComercial   || {}
  const df  = descalceFinanciero     || {}
  const mtr = margenTeoricoVsReal    || {}

  const hasEV = !!proyecto?.ev_costo_total_usd

  // Colores semáforo
  const cpColor  = !hasEV ? 'blue' : (cp.desvio_pct??0)<=5 ? 'green' : (cp.desvio_pct??0)<=15 ? 'amber' : 'red'
  const pcColor  = !hasEV ? 'blue' : (pc.pct_vs_ev??0)>=95 ? 'green' : (pc.pct_vs_ev??0)>=80 ? 'amber' : 'red'
  const mtrColor = !hasEV ? 'blue' : ((mtr.margen_real_pct??0)-(mtr.margen_teorico_pct??0))>=-2 ? 'green' : ((mtr.margen_real_pct??0)-(mtr.margen_teorico_pct??0))>=-8 ? 'amber' : 'red'
  const dfColor  = df.estado_descalce==='ok' ? 'green' : df.estado_descalce==='alerta' ? 'amber' : 'red'

  const uFiltradas = unidades.filter(u => {
    if (filtroTipo!=='todos' && u.tipologia!==filtroTipo) return false
    if (filtroEstado!=='todos' && u.estado!==filtroEstado) return false
    return true
  })

  // Resumen contadores
  const countDisp = unidades.filter(u=>u.estado==='disponible').length
  const countVend = unidades.filter(u=>u.estado==='vendida').length
  const countCanje= unidades.filter(u=>u.estado==='canje_proveedor').length
  const countRes  = unidades.filter(u=>u.estado==='reservada').length

  return (
    <div className="pcg">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="pcg-ey">Control de gestión · Proyecto</div>
      <h1 className="pcg-h1">{proyecto?.nombre}</h1>
      <div className="pcg-meta">
        {proyecto?.estado && <span>{proyecto.estado.replace('_',' ')}</span>}
        {proyecto?.m2_totales && <><span className="pcg-sep">·</span><span>{fmt2(proyecto.m2_totales)} m²</span></>}
        {proyecto?.fecha_ev && <><span className="pcg-sep">·</span><span>EV: {new Date(proyecto.fecha_ev).toLocaleDateString('es-AR',{month:'short',year:'numeric'})}</span></>}
        {!hasEV && <><span className="pcg-sep">·</span><span style={{color:'#60a5fa'}}>Sin EV cargado</span></>}
      </div>

      {!hasEV && (
        <div className="pcg-sinev">
          ℹ️ Este proyecto no tiene Evaluación de Viabilidad (EV) cargada todavía. Los indicadores de control presupuestario y performance comercial estarán disponibles una vez que se genere el EV desde el Simulador.
        </div>
      )}

      {/* Resumen rápido */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:20}}>
        {[
          {label:'Disponibles',val:countDisp,color:'#5eead4'},
          {label:'Vendidas',val:countVend,color:'#a78bfa'},
          {label:'Cupos/Canje',val:countCanje,color:'#fb923c'},
          {label:'Reservadas',val:countRes,color:'#facc15'},
        ].map(k=>(
          <div key={k.label} style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:8,padding:'10px 14px'}}>
            <div style={{fontSize:10,color:'var(--fnt)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>{k.label}</div>
            <div style={{fontFamily:'Geist Mono,monospace',fontSize:20,fontWeight:600,color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Bento grid */}
      <div className="pcg-bento">
        {/* 1. Control Presupuestario */}
        <div className={`pcg-card ${cpColor}`}>
          <div className="pcg-ch"><span className="pcg-cl">Control Presupuestario</span><span className={`pcg-dot ${cpColor}`}/></div>
          <div className="pcg-main">{hasEV ? fmtM(cp.costo_actual_usd) : '—'}</div>
          <div className="pcg-sub">{hasEV ? `de ${fmtM(cp.ev_costo_total_usd)} presupuestado` : 'Sin EV base cargado'}</div>
          {hasEV && <>
            <div className="pcg-bar"><div className={`pcg-bar-fill ${cpColor}`} style={{width:`${Math.min(100,((cp.costo_actual_usd||0)/(cp.ev_costo_total_usd||1))*100)}%`}}/></div>
            <div className={`pcg-delta ${cpColor}`}>{fmtPct(cp.desvio_pct)} vs EV</div>
          </>}
        </div>

        {/* 2. Performance Comercial */}
        <div className={`pcg-card ${pcColor}`}>
          <div className="pcg-ch"><span className="pcg-cl">Performance Comercial</span><span className={`pcg-dot ${pcColor}`}/></div>
          <div className="pcg-main">{hasEV ? fmtM(pc.valor_proyectado_total_usd) : fmtM(pc.valor_lista_disponibles_usd)}</div>
          <div className="pcg-sub">{hasEV ? `de ${fmtM(pc.ev_ingreso_total_usd)} EV` : 'Stock disponible valuado'}</div>
          {hasEV && <>
            <div className="pcg-bar"><div className={`pcg-bar-fill ${pcColor}`} style={{width:`${Math.min(100,pc.pct_vs_ev||0)}%`}}/></div>
            <div className={`pcg-delta ${pcColor}`}>{pc.pct_vs_ev!=null?`${Number(pc.pct_vs_ev).toFixed(1)}% del EV defendido`:'—'}</div>
          </>}
        </div>

        {/* 3. Margen Teórico vs Real */}
        <div className={`pcg-card ${mtrColor}`}>
          <div className="pcg-ch"><span className="pcg-cl">Margen Teórico vs Real</span><span className={`pcg-dot ${mtrColor}`}/></div>
          <div className="pcg-main">{mtr.margen_real_pct!=null?`${Number(mtr.margen_real_pct).toFixed(1)}%`:'—'}</div>
          <div className="pcg-sub">Teórico EV: {mtr.margen_teorico_pct!=null?`${Number(mtr.margen_teorico_pct).toFixed(1)}%`:'—'}</div>
          {hasEV && <>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:6}}>
              {[['Real',(mtr.margen_real_pct||0),mtrColor],['EV',(mtr.margen_teorico_pct||0),'blue']].map(([l,v,c])=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:'var(--dim)'}}>
                  <span style={{width:28,fontFamily:'Geist Mono,monospace'}}>{l}</span>
                  <div className="pcg-bar" style={{flex:1}}><div className={`pcg-bar-fill ${c}`} style={{width:`${Math.max(0,Math.min(100,v))}%`}}/></div>
                </div>
              ))}
            </div>
            <div className={`pcg-delta ${mtrColor}`}>{fmtPct((mtr.margen_real_pct||0)-(mtr.margen_teorico_pct||0))} pts vs objetivo</div>
          </>}
        </div>

        {/* 4. Descalce Financiero */}
        <div className={`pcg-card ${dfColor}`}>
          <div className="pcg-ch"><span className="pcg-cl">Descalce Financiero</span><span className={`pcg-dot ${dfColor}`}/></div>
          <div style={{margin:'8px 0 14px'}}>
            {[
              ['Avance físico', df.avance_fisico_pct||0, 'blue'],
              ['m² vendidos',   df.pct_vendido||0,       dfColor],
            ].map(([l,v,c])=>(
              <div key={l} className="pcg-desc-row">
                <span className="pcg-desc-tag">{l}</span>
                <div className="pcg-bar" style={{flex:1}}><div className={`pcg-bar-fill ${c}`} style={{width:`${Math.min(100,v)}%`}}/></div>
                <span className="pcg-desc-val">{Number(v).toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <div className={`pcg-delta ${dfColor}`}>
            {df.estado_descalce==='critico' && '⚠ CRÍTICO — '}
            {df.estado_descalce==='alerta' && '◐ ALERTA — '}
            {df.estado_descalce==='ok' && '✓ En línea — '}
            gap {Math.abs(df.gap_pct||0).toFixed(1)} pts
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="pcg-tabs">
        <button className={`pcg-tab ${tab==='inventario'?'act':''}`} onClick={()=>setTab('inventario')}>
          Inventario <span className="pcg-cnt">{unidades.length}</span>
        </button>
        <button className={`pcg-tab ${tab==='operaciones'?'act':''}`} onClick={()=>setTab('operaciones')}>
          Operaciones <span className="pcg-cnt">{transacciones.length}</span>
        </button>
      </div>

      {/* Inventario */}
      {tab==='inventario' && (
        <>
          <div className="pcg-filters">
            <div className="pcg-fg">
              <span className="pcg-fl">Tipo</span>
              {['todos','departamento','cochera','local','baulera'].map(t=>(
                <button key={t} className={`pcg-chip ${filtroTipo===t?'act':''}`} onClick={()=>setFT(t)}>
                  {t==='todos'?'Todos':TIPO[t]}
                </button>
              ))}
            </div>
            <div className="pcg-fg">
              <span className="pcg-fl">Estado</span>
              {['todos','disponible','reservada','vendida','canje_proveedor'].map(e=>(
                <button key={e} className={`pcg-chip ${filtroEstado===e?'act':''}`} onClick={()=>setFE(e)}>
                  {e==='todos'?'Todos':(BADGE[e]?.label||e)}
                </button>
              ))}
            </div>
          </div>
          <div className="pcg-tbl-wrap">
            <table className="pcg-tbl">
              <thead><tr>
                <th>Unidad</th><th>Tipo</th><th className="r">m²</th>
                <th className="r">Precio contado/m²</th><th className="r">Total USD</th>
                <th>Estado</th><th>Asignado a</th>
              </tr></thead>
              <tbody>
                {uFiltradas.length===0 && <tr><td colSpan={7} className="pcg-empty">No hay unidades con estos filtros.</td></tr>}
                {uFiltradas.map(u=>{
                  const b = BADGE[u.estado]||BADGE.disponible
                  const precioM2 = u.precio_lista_ars_m2 ? u.precio_lista_ars_m2/1405 : (u.precio_lista_usd_m2||0)
                  const total = precioM2 * u.m2_propios
                  return (
                    <tr key={u.id}>
                      <td><div className="pcg-ud"><strong>{u.unidad_codigo}</strong><span>Piso {u.piso_nro}</span></div></td>
                      <td>{TIPO[u.tipologia]||u.tipologia}</td>
                      <td className="r mono">{fmt2(u.m2_propios)}</td>
                      <td className="r mono">{precioM2>0?`$${fmt2(precioM2)}`:<span className="pcg-na">—</span>}</td>
                      <td className="r mono">{total>0?fmtM(total):<span className="pcg-na">—</span>}</td>
                      <td><span className="pcg-badge" style={{background:b.bg,borderColor:b.border,color:b.color}}>{b.label}</span></td>
                      <td><div className="pcg-asig">{u.asignado_a||u.comprador_nombre||<span className="pcg-na">—</span>}</div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Operaciones */}
      {tab==='operaciones' && (
        <div className="pcg-tbl-wrap">
          <table className="pcg-tbl">
            <thead><tr>
              <th>Fecha</th><th>Unidad</th><th>Cliente</th><th>Tipo</th>
              <th className="r">Cierre USD</th><th className="r">Descuento</th><th className="r">Margen</th><th>TC</th>
            </tr></thead>
            <tbody>
              {transacciones.length===0 && <tr><td colSpan={8} className="pcg-empty">Sin operaciones registradas.</td></tr>}
              {transacciones.map(t=>(
                <tr key={t.id}>
                  <td className="mono">{new Date(t.fecha_operacion).toLocaleDateString('es-AR')}</td>
                  <td><strong>{t.unidad_codigo}</strong></td>
                  <td>{t.cliente_nombre}</td>
                  <td style={{fontSize:11,color:'var(--dim)'}}>{({reserva:'Reserva',venta_contado:'Contado',venta_financiada:'Financiada',canje:'Canje'})[t.tipo_operacion]}</td>
                  <td className="r mono">{fmtUSD(t.precio_cierre_usd)}</td>
                  <td className="r mono" style={{color:t.descuento_otorgado_usd>0?'#fb923c':'var(--fnt)'}}>{t.descuento_otorgado_usd>0?`-${fmtUSD(t.descuento_otorgado_usd)}`:'—'}</td>
                  <td className="r mono" style={{color:t.margen_operacion_usd>=0?'#5eead4':'#fb7185'}}>{fmtUSD(t.margen_operacion_usd)}</td>
                  <td className="mono" style={{fontSize:11,color:'var(--dim)'}}>{t.moneda_pago==='ARS'?`$${fmt2(t.tipo_cambio_operacion)}`:'USD'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
