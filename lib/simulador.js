// ─────────────────────────────────────────────────────────────
// Motor de cálculo financiero · v2
// Agrega: socios con capital mixto + cocheras con precio propio
// ─────────────────────────────────────────────────────────────

export function sCurveWeights(n) {
  const mu = 0.55 * n, sig = 0.20 * n
  const w = Array.from({ length: n }, (_, i) =>
    Math.exp(-0.5 * Math.pow((i + 0.5 - mu) / sig, 2))
  )
  const sum = w.reduce((a, b) => a + b, 0)
  return w.map(v => v / sum)
}

export function preventaDiscount(av) {
  if (av <= 0)    return 0.15
  if (av <= 0.40) return 0.10
  if (av <= 0.80) return 0.05
  return 0
}

export function simular(p) {
  const {
    m2_totales, eficiencia_pct, plazo_meses,
    costo_directo_m2, indirectos_pct, contingencias_pct,
    precio_terreno, capital_propio,
    precio_mercado_m2, ritmo_venta_m2,
    // ── SOCIOS ──────────────────────────────────────────────
    // socios: array de { nombre, unidades_asignadas, anticipo_usd, cuotas_usd, mes_inicio_cuotas, cant_cuotas }
    socios = [],
    // ── COCHERAS ────────────────────────────────────────────
    // modo_cochera: 'fijo' | 'm2' | 'combinado'
    // fijo:      precio_cochera_usd (por unidad), cant_cocheras
    // m2:        precio_m2_cochera, m2_cochera, cant_cocheras
    // combinado: precio_cochera_usd incluido en precio depto (sin flujo separado)
    modo_cochera = 'fijo',
    precio_cochera_usd = 0,
    m2_cochera = 0,
    precio_m2_cochera = 0,
    cant_cocheras = 0,
    ritmo_venta_cocheras = 0,  // cocheras vendidas por mes
  } = p

  const ef    = eficiencia_pct / 100
  const indir = indirectos_pct / 100
  const cont  = contingencias_pct / 100
  const N     = plazo_meses

  // ── M² vendibles netos (descontando unidades de socios) ───
  const m2SociosTotales = socios.reduce((acc, s) => acc + (s.unidades_m2 || 0), 0)
  const m2Vend          = m2_totales * ef - m2SociosTotales
  const m2VendBruto     = m2_totales * ef  // para mostrar en UI

  // ── Costos ───────────────────────────────────────────────
  const costoObra  = m2_totales * costo_directo_m2
  const costoInd   = costoObra * indir
  const costoTotal = (precio_terreno + costoObra + costoInd) * (1 + cont)
  const precioEq   = costoTotal / (m2Vend + m2SociosTotales) // equilibrio sobre total

  // ── Curva S ───────────────────────────────────────────────
  const weights = sCurveWeights(N)
  const acumW   = weights.reduce((acc, w, i) => {
    acc.push((acc[i - 1] || 0) + w); return acc
  }, [])

  const egresos = weights.map((w, i) =>
    (costoObra * (1 + cont)) * w + costoInd / N + (i === 0 ? precio_terreno : 0)
  )

  // ── Ingresos por ventas de departamentos ─────────────────
  const ingresos = new Array(N + 6).fill(0)
  let m2Acum = 0
  for (let i = 0; i < N; i++) {
    const disp = Math.min(ritmo_venta_m2, m2Vend - m2Acum)
    if (disp <= 0) break
    m2Acum += disp
    const av     = i === 0 ? 0 : acumW[i - 1]
    const precio = precio_mercado_m2 * (1 - preventaDiscount(av))
    const total  = disp * precio
    const cuotas = Math.max(N - i, 1)
    ingresos[i] += total * 0.30
    for (let j = i; j < i + cuotas && j < N + 6; j++)
      ingresos[j] += (total * 0.70) / cuotas
  }

  // ── Ingresos por cocheras ─────────────────────────────────
  // precio unitario de cochera según modalidad
  let precioCochera = 0
  if (modo_cochera === 'fijo')       precioCochera = precio_cochera_usd
  if (modo_cochera === 'm2')         precioCochera = m2_cochera * precio_m2_cochera
  if (modo_cochera === 'combinado')  precioCochera = 0 // ya incluido en depto

  let cocherasVendidas = 0
  const ritmoC = ritmo_venta_cocheras > 0 ? ritmo_venta_cocheras : Math.ceil(cant_cocheras / N)
  if (precioCochera > 0 && cant_cocheras > 0) {
    for (let i = 0; i < N; i++) {
      const disp = Math.min(ritmoC, cant_cocheras - cocherasVendidas)
      if (disp <= 0) break
      cocherasVendidas += disp
      const av     = i === 0 ? 0 : acumW[i - 1]
      const desc   = preventaDiscount(av)
      const precio = precioCochera * (1 - desc)
      const total  = disp * precio
      const cuotas = Math.max(N - i, 1)
      ingresos[i] += total * 0.30
      for (let j = i; j < i + cuotas && j < N + 6; j++)
        ingresos[j] += (total * 0.70) / cuotas
    }
  }

  // ── Ingresos por aportes de socios ────────────────────────
  // Cada socio: anticipo en mes 0 + cuotas mensuales desde mes_inicio
  const ingresosSocios = new Array(N + 6).fill(0)
  socios.forEach(s => {
    const mesInicio = s.mes_inicio_cuotas || 0
    ingresosSocios[mesInicio] += s.anticipo_usd || 0
    const cantC = s.cant_cuotas || 1
    for (let j = mesInicio; j < mesInicio + cantC && j < N + 6; j++)
      ingresosSocios[j] += (s.cuotas_usd || 0) / cantC
  })

  // ── Flujo acumulado ───────────────────────────────────────
  let cajaAcum = capital_propio
  let cajaMin  = Infinity
  let mesCajaMin = 0
  const flujoNeto = [], ingAcum = [], egAcum = [], sociosAcum = []
  let iS = capital_propio, eS = 0, sS = 0

  for (let i = 0; i < N; i++) {
    const ing   = ingresos[i]
    const eg    = egresos[i]
    const socio = ingresosSocios[i]
    iS += ing + socio; eS += eg; sS += socio
    cajaAcum += ing + socio - eg
    flujoNeto.push(ing + socio - eg)
    ingAcum.push(iS)
    egAcum.push(eS)
    sociosAcum.push(sS)
    if (cajaAcum < cajaMin) { cajaMin = cajaAcum; mesCajaMin = i + 1 }
  }

  const ingresosReales   = ingAcum[N - 1] - capital_propio
  const aporteSocios     = socios.reduce((a, s) => a + (s.anticipo_usd || 0) + (s.cuotas_usd || 0), 0)
  const valorUnidSocios  = m2SociosTotales * precio_mercado_m2
  // Costo apalancado = valor de mercado de unidades cedidas / aporte recibido
  const costoApalancado  = aporteSocios > 0 ? valorUnidSocios / aporteSocios : 0

  const ingresoCocheras  = cocherasVendidas * precioCochera
  const utilidad         = ingresosReales - costoTotal
  const roi              = (utilidad / costoTotal) * 100

  return {
    // KPIs principales
    m2Vend, m2VendBruto, m2SociosTotales,
    costoTotal, precioEq, utilidad, roi,
    cajaMin, mesCajaMin,
    costoObra, costoInd, ingresosReales,
    // Socios
    aporteSocios, valorUnidSocios, costoApalancado,
    // Cocheras
    cocherasVendidas, ingresoCocheras, precioCochera,
    // Series para gráficos
    labels: Array.from({ length: N }, (_, i) => `M${i + 1}`),
    flujoNeto, ingAcum, egAcum,
    saldoAcum: ingAcum.map((v, i) => v - egAcum[i]),
  }
}
