// lib/simuladorEV.js
// Motor financiero basado en los Excel reales de Link Inversiones

export const PRESETS = {
  isaura:    { m2:4289, pct_coch:0,  ud_prom:55, plazo:26, construccion:438, terreno:120, canje:true,  comercial:3.5, iva:8.9, iibb:2.24, admin:13, honorarios:14, pfondeo:817,  pct_contado:70, cuotas:24, p1:900,  p2:1100, p3:1300, pct_fondeo:75,   cuotas_obra:12, cupos:4 },
  green:     { m2:4905, pct_coch:5,  ud_prom:57, plazo:25, construccion:441, terreno:101, canje:true,  comercial:3.5, iva:8.9, iibb:2.24, admin:14, honorarios:15, pfondeo:800,  pct_contado:70, cuotas:24, p1:910,  p2:1100, p3:1300, pct_fondeo:77,   cuotas_obra:12, cupos:4 },
  blue:      { m2:4426, pct_coch:2,  ud_prom:53, plazo:32, construccion:424, terreno:189, canje:true,  comercial:3.7, iva:8.9, iibb:2.24, admin:14, honorarios:15, pfondeo:890,  pct_contado:70, cuotas:24, p1:1000, p2:1100, p3:1300, pct_fondeo:68,   cuotas_obra:14, cupos:4 },
  red:       { m2:4935, pct_coch:3,  ud_prom:57, plazo:24, construccion:368, terreno:94,  canje:true,  comercial:3.1, iva:7.9, iibb:2.24, admin:12, honorarios:15, pfondeo:740,  pct_contado:70, cuotas:24, p1:800,  p2:900,  p3:1000, pct_fondeo:77,   cuotas_obra:12, cupos:4 },
  boulevard: { m2:5022, pct_coch:26, ud_prom:75, plazo:30, construccion:448, terreno:179, canje:false, comercial:3.5, iva:8.9, iibb:2.24, admin:14, honorarios:15, pfondeo:1038, pct_contado:60, cuotas:24, p1:1100, p2:1300, p3:1500, pct_fondeo:37.5, cuotas_obra:15, cupos:5 },
}

export const DEFAULTS = PRESETS.boulevard

// TIR Newton-Raphson
function calcTIR(cfs, guess = 0.03) {
  let r = guess
  for (let i = 0; i < 100; i++) {
    let f = 0, df = 0
    cfs.forEach((c, t) => { f += c / Math.pow(1+r,t); df -= t*c / Math.pow(1+r,t+1) })
    if (Math.abs(df) < 1e-10) break
    const r2 = r - f/df
    if (Math.abs(r2-r) < 1e-8) { r = r2; break }
    r = r2
  }
  return (r > -1 && r < 2) ? r : null
}

// Curva S gaussiana
function curvaS(meses) {
  const mu = meses * 0.55, sigma = meses * 0.20
  const raw = Array.from({length:meses}, (_,i) =>
    Math.exp(-Math.pow(i+1-mu,2) / (2*sigma*sigma))
  )
  const sum = raw.reduce((a,b)=>a+b,0)
  return raw.map(v => v/sum)
}

export function simularEV(p) {
  const {
    m2, pct_coch, ud_prom, plazo,
    construccion, terreno, canje,
    comercial, iva, iibb, admin, honorarios,
    pfondeo, pct_contado, cuotas,
    p1, p2, p3,
    pct_fondeo, cuotas_obra, cupos,
  } = p

  // ── Metros ──────────────────────────────────────────────
  const m2_coch  = m2 * (pct_coch / 100)
  const m2_dep   = m2 - m2_coch
  const n_uds    = Math.round(m2_dep / ud_prom)
  const m2_fondeo = m2 * (pct_fondeo / 100)

  // ── Costos por m² construido ─────────────────────────────
  const c_const = construccion
  const c_terr_cash = canje ? 0 : terreno
  const c_terr_impl = terreno                        // valor implícito del canje
  const c_com   = pfondeo * (comercial / 100)
  const c_iva   = construccion * (iva / 100)
  const c_iibb  = pfondeo * (iibb / 100)
  const c_adm   = admin
  const c_hon   = pfondeo * (honorarios / 100)

  const c_total_cash = c_const + c_terr_cash + c_com + c_iva + c_iibb + c_adm + c_hon
  const c_total_impl = c_const + c_terr_impl + c_com + c_iva + c_iibb + c_adm + c_hon

  const costo_total_cash = c_total_cash * m2
  const costo_total_impl = c_total_impl * m2

  // ── Rubros detallados ────────────────────────────────────
  const rubros = [
    { nombre: 'Construcción',      valor: c_const,     total: c_const * m2 },
    { nombre: 'Terreno + Infra',   valor: c_terr_impl, total: c_terr_impl * m2 },
    { nombre: 'Comercialización',  valor: c_com,       total: c_com * m2 },
    { nombre: 'IVA construcción',  valor: c_iva,       total: c_iva * m2 },
    { nombre: 'IIBB + TEM',        valor: c_iibb,      total: c_iibb * m2 },
    { nombre: 'Administración',    valor: c_adm,       total: c_adm * m2 },
    { nombre: 'Honorarios Link',   valor: c_hon,       total: c_hon * m2 },
  ]

  // ── Modelo inversor ──────────────────────────────────────
  const metros_x_cupo      = m2_fondeo / cupos
  const valor_cupo          = metros_x_cupo * pfondeo
  const desembolso_mensual  = valor_cupo / cuotas_obra
  const costo_inversor_m2   = pfondeo   // paga precio de fondeo

  // TIR inversor (escenario esperado p2)
  const cashflows_inv = Array(plazo).fill(-desembolso_mensual)
  cashflows_inv[plazo - 1] += metros_x_cupo * p2
  const tir_m = calcTIR([-valor_cupo, ...cashflows_inv])
  const tir_a = tir_m != null ? Math.pow(1 + tir_m, 12) - 1 : null

  // ── Escenarios ───────────────────────────────────────────
  const escenarios = [p1, p2, p3].map(precio => {
    const ingr_total = precio * m2
    const beneficio  = ingr_total - costo_total_impl
    const roi        = beneficio / costo_total_impl
    const margen     = (precio - c_total_impl) / precio
    return { precio, ingr_total, beneficio, roi, margen }
  })

  // ── Precio de equilibrio ──────────────────────────────────
  const precio_equilibrio = c_total_impl

  // ── Flujo de fondos (curva S) ─────────────────────────────
  const dist = curvaS(plazo)
  const ingresos_mes   = dist.map(d => d * p2 * m2)
  const costos_mes     = dist.map(d => d * costo_total_cash)
  let acum = 0
  const flujo_acum = ingresos_mes.map((ing, i) => {
    acum += ing - costos_mes[i]
    return acum
  })
  const caja_minima    = Math.min(...flujo_acum)
  const mes_caja_min   = flujo_acum.indexOf(caja_minima) + 1

  return {
    // Metros
    m2_dep, m2_coch, m2_fondeo, n_uds,
    // Costos
    c_total_cash, c_total_impl,
    costo_total_cash, costo_total_impl,
    rubros,
    // Modelo inversor
    metros_x_cupo, valor_cupo, desembolso_mensual,
    costo_inversor_m2, tir_m, tir_a,
    // Escenarios
    escenarios, precio_equilibrio,
    // Flujo
    ingresos_mes, costos_mes, flujo_acum,
    caja_minima, mes_caja_min,
    // Validaciones
    viable: c_total_impl < pfondeo,
    margen_fondeo: (pfondeo - c_total_impl) / pfondeo,
  }
}
