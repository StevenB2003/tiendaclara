// TiendaClara - funciones de cálculo puras (sin acceso a la base de datos).
// Se prueban con `node --test tests/`.

export const DIA_MS = 24 * 60 * 60 * 1000;

/** Formatea un valor en pesos colombianos sin decimales: 12500 -> "$ 12.500" */
export function pesos(valor) {
  const n = Math.round(Number(valor) || 0);
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-$ ' : '$ ') + s;
}

/** Inicio del día local (00:00) de una fecha. */
export function inicioDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Devuelve [desde, hasta) para 'hoy' | 'semana' (últimos 7 días) | 'mes' (últimos 30 días). */
export function rango(periodo, ahora = new Date()) {
  const fin = new Date(inicioDia(ahora).getTime() + DIA_MS);
  const dias = periodo === 'hoy' ? 1 : periodo === 'semana' ? 7 : 30;
  return [new Date(fin.getTime() - dias * DIA_MS), fin];
}

export function enRango(fechaISO, [desde, hasta]) {
  const t = new Date(fechaISO).getTime();
  return t >= desde.getTime() && t < hasta.getTime();
}

/** Total de una lista de ítems {cantidad, precio}. */
export function totalCarrito(items) {
  return items.reduce((s, it) => s + it.cantidad * it.precio, 0);
}

/**
 * Indicadores de ventas de un periodo.
 * ventas: [{id, fecha, total, medioPago, items:[{productoId, nombre, cantidad, precio, costo}]}]
 */
export function indicadoresVentas(ventas, r) {
  const vs = ventas.filter(v => v.estado !== 'anulada' && enRango(v.fecha, r));
  let total = 0, utilidad = 0;
  const porMedio = { efectivo: 0, transferencia: 0, fiado: 0 };
  const porProducto = new Map();
  for (const v of vs) {
    total += v.total;
    porMedio[v.medioPago] = (porMedio[v.medioPago] || 0) + v.total;
    for (const it of v.items) {
      const u = (it.precio - it.costo) * it.cantidad;
      utilidad += u;
      const p = porProducto.get(it.productoId) || { productoId: it.productoId, nombre: it.nombre, unidades: 0, ventas: 0, utilidad: 0 };
      p.unidades += it.cantidad; p.ventas += it.precio * it.cantidad; p.utilidad += u;
      porProducto.set(it.productoId, p);
    }
  }
  const top = [...porProducto.values()].sort((a, b) => b.unidades - a.unidades);
  return {
    numeroVentas: vs.length,
    ventas: total,
    utilidad,
    margen: total > 0 ? (utilidad / total) * 100 : 0,
    ticketPromedio: vs.length ? total / vs.length : 0,
    porMedio,
    top,
  };
}

/** Ventas por día de los últimos n días (para el gráfico). */
export function ventasPorDia(ventas, n = 7, ahora = new Date()) {
  const hoy = inicioDia(ahora).getTime();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const desde = new Date(hoy - i * DIA_MS);
    const hasta = new Date(desde.getTime() + DIA_MS);
    const total = ventas.filter(v => v.estado !== 'anulada' && enRango(v.fecha, [desde, hasta]))
      .reduce((s, v) => s + v.total, 0);
    out.push({ fecha: desde, total });
  }
  return out;
}

/**
 * Saldo de fiado de un cliente y antigüedad de la deuda (método FIFO:
 * los abonos cancelan primero las ventas a fiado más antiguas).
 */
export function estadoCliente(clienteId, ventas, abonos, ahora = new Date()) {
  const fiados = ventas
    .filter(v => v.clienteId === clienteId && v.medioPago === 'fiado' && v.estado !== 'anulada')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  let pagado = abonos.filter(a => a.clienteId === clienteId).reduce((s, a) => s + a.valor, 0);
  const totalFiado = fiados.reduce((s, v) => s + v.total, 0);
  const pendientes = [];
  for (const v of fiados) {
    const cubre = Math.min(pagado, v.total);
    pagado -= cubre;
    const resta = v.total - cubre;
    if (resta > 0) pendientes.push({ fecha: v.fecha, valor: resta });
  }
  const saldo = pendientes.reduce((s, p) => s + p.valor, 0);
  const masAntigua = pendientes.length ? pendientes[0].fecha : null;
  const dias = masAntigua ? Math.floor((inicioDia(ahora) - inicioDia(masAntigua)) / DIA_MS) : 0;
  return { totalFiado, saldo, dias, pendientes, saldoAFavor: Math.max(0, pagado) };
}

/** Cartera total agrupada por antigüedad de cada saldo pendiente. */
export function carteraPorAntiguedad(clientes, ventas, abonos, ahora = new Date()) {
  const tramos = { '0-15': 0, '16-30': 0, '>30': 0 };
  let total = 0;
  for (const c of clientes) {
    const e = estadoCliente(c.id, ventas, abonos, ahora);
    for (const p of e.pendientes) {
      const d = Math.floor((inicioDia(ahora) - inicioDia(p.fecha)) / DIA_MS);
      const k = d <= 15 ? '0-15' : d <= 30 ? '16-30' : '>30';
      tramos[k] += p.valor; total += p.valor;
    }
  }
  return { total, tramos };
}

/** ¿Puede el cliente tomar fiado por este valor sin superar su cupo? (cupo 0 = sin límite) */
export function dentroDelCupo(cliente, saldoActual, valor) {
  if (!cliente.cupo || cliente.cupo <= 0) return true;
  return saldoActual + valor <= cliente.cupo;
}

/** Productos con stock en o por debajo del mínimo. */
export function bajoStock(productos) {
  return productos.filter(p => p.activo !== false && p.stockMinimo > 0 && p.stock <= p.stockMinimo)
    .sort((a, b) => (a.stock - a.stockMinimo) - (b.stock - b.stockMinimo));
}

/** Rotación (unidades vendidas / stock promedio aproximado) y días de inventario para un producto. */
export function rotacion(producto, unidadesVendidas30d) {
  const stockPromedio = (producto.stock + (producto.stock + unidadesVendidas30d)) / 2;
  const rot = stockPromedio > 0 ? unidadesVendidas30d / stockPromedio : 0;
  const ventaDiaria = unidadesVendidas30d / 30;
  const diasInventario = ventaDiaria > 0 ? producto.stock / ventaDiaria : Infinity;
  return { rotacion: rot, diasInventario };
}

/** Consolidado del cierre de caja de un día. */
export function cierreDelDia(ventas, abonos, fecha = new Date(), efectivoContado = null, base = 0) {
  const r = [inicioDia(fecha), new Date(inicioDia(fecha).getTime() + DIA_MS)];
  const vs = ventas.filter(v => v.estado !== 'anulada' && enRango(v.fecha, r));
  const ab = abonos.filter(a => enRango(a.fecha, r));
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const ventasEfectivo = sum(vs.filter(v => v.medioPago === 'efectivo'), v => v.total);
  const ventasDigital = sum(vs.filter(v => v.medioPago === 'transferencia'), v => v.total);
  const ventasFiado = sum(vs.filter(v => v.medioPago === 'fiado'), v => v.total);
  const abonosEfectivo = sum(ab.filter(a => a.medioPago === 'efectivo'), a => a.valor);
  const abonosDigital = sum(ab.filter(a => a.medioPago !== 'efectivo'), a => a.valor);
  const efectivoEsperado = base + ventasEfectivo + abonosEfectivo;
  return {
    ventasEfectivo, ventasDigital, ventasFiado, abonosEfectivo, abonosDigital,
    totalVentas: ventasEfectivo + ventasDigital + ventasFiado,
    efectivoEsperado,
    diferencia: efectivoContado === null ? null : efectivoContado - efectivoEsperado,
  };
}

/** Normaliza un número de celular colombiano para wa.me (57 + 10 dígitos). */
export function telefonoWhatsApp(celular) {
  const d = String(celular || '').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('3')) return '57' + d;
  if (d.length === 12 && d.startsWith('57')) return d;
  return null;
}

export function mensajeCobro(tienda, cliente, saldo) {
  return `Hola ${cliente.nombre}, le saluda ${tienda}. Le recordamos amablemente que tiene un saldo pendiente de ${pesos(saldo)}. ¡Gracias por su confianza!`;
}

/** Convierte filas (arreglo de objetos) a CSV con ; como separador (Excel en español). */
export function aCSV(filas, columnas) {
  const esc = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = columnas.map(c => esc(c.titulo)).join(';');
  const body = filas.map(f => columnas.map(c => esc(typeof c.valor === 'function' ? c.valor(f) : f[c.valor])).join(';'));
  return '﻿' + [head, ...body].join('\r\n');
}

/** Puntaje SUS de 10 respuestas (1 a 5). */
export function puntajeSUS(respuestas) {
  if (respuestas.length !== 10) throw new Error('SUS requiere 10 respuestas');
  const s = respuestas.reduce((acc, r, i) => acc + (i % 2 === 0 ? r - 1 : 5 - r), 0);
  return s * 2.5;
}

/** Identificador único (funciona sin conexión). */
export function uid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
