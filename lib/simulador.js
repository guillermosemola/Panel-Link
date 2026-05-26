export function sCurveWeights(n) {
  const mu = 0.55 * n, sig = 0.20 * n
  const w = Array.from({ length: n }, (_, i) =>
    Math.exp(-0.5 * Math.pow((i + 0.5 - mu) / sig, 2))
  )
  const sum = w.reduce((a, b) => a + b, 0)
  return w.map(v => v / sum)
}

export function preventaDiscount(av) {
  if (av <= 0) return 0.15
  if (av <= 0.40) return 0.10
  if (av <= 0.80) return 0.05
  return 0
}

export function simular(p) {
  const { m2_totales, eficiencia_pct, plazo_meses,
    costo_directo_m2, indirectos_pct, contingencias_pct,
    precio_terreno, capital_propio, precio_mercado_m2, ritmo_venta_m2 } = p
  const ef = eficiencia_pct/100, indir = indirectos_pct/100
  const cont = contingencias_pct/100, N = plazo_meses
  const m2Vend = m2_totales * ef
  const costoObra = m2_totales * costo_directo_m2
  const costoInd = costoObra * indir
  const costoTotal = (precio_terreno + costoObra + costoInd) * (1 + cont)
  const precioEq = costoTotal / m2Vend
  const weights = sCurveWeights(N)
  const acumW = weights.reduce((acc, w, i) => { acc.push((acc[i-1]||0)+w); return acc }, [])
  const egresos = weights.map((w, i) =>
    (costoObra*(1+cont))*w + costoInd/N + (i===0 ? precio_terreno : 0)
  )
  const ingresos = new Array(N+6).fill(0)
  let m2Acum = 0
  for (let i = 0; i < N; i++) {
    const disp = Math.min(ritmo_venta_m2, m2Vend - m2Acum)
    if (disp <= 0) break
    m2Acum += disp
    const av = i===0 ? 0 : acumW[i-1]
    const precio = precio_mercado_m2 * (1 - preventaDiscount(av))
    const total = disp * precio
    const cuotas = Math.max(N-i, 1)
    ingresos[i] += total * 0.30
    for (let j = i; j < i+cuotas && j < N+6; j++) ingresos[j] += (total*0.70)/cuotas
  }
  let cajaAcum = capital_propio, cajaMin = Infinity, mesCajaMin = 0
  const flujoNeto = [], ingAcum = [], egAcum = []
  let iS = capital_propio, eS = 0
  for (let i = 0; i < N; i++) {
    iS += ingresos[i]; eS += egresos[i]
    cajaAcum += ingresos[i] - egresos[i]
    flujoNeto.push(ingresos[i] - egresos[i])
    ingAcum.push(iS); egAcum.push(eS)
    if (cajaAcum < cajaMin) { cajaMin = cajaAcum; mesCajaMin = i+1 }
  }
  const ingresosReales = ingAcum[N-1] - capital_propio
  const utilidad = ingresosReales - costoTotal
  return {
    m2Vend, costoTotal, precioEq, utilidad, roi: (utilidad/costoTotal)*100,
    cajaMin, mesCajaMin, costoObra, costoInd, ingresosReales,
    labels: Array.from({length:N},(_,i)=>`M${i+1}`),
    flujoNeto, ingAcum, egAcum,
    saldoAcum: ingAcum.map((v,i)=>v-egAcum[i]),
  }
}
