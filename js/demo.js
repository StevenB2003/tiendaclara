// TiendaClara - generador de una tienda de demostración (entorno relevante simulado, TRL 5).
// Crea productos típicos del canal tradicional, clientes de fiado y 8 semanas de transacciones.
import { uid, DIA_MS, inicioDia } from './calc.js';

// [nombre, categoría, costo, precio, stockMinimo, popularidad 1-10]
const CATALOGO = [
  ['Cerveza Águila lata 330 ml', 'Bebidas', 2600, 3500, 24, 10], ['Cerveza Póker lata 330 ml', 'Bebidas', 2600, 3500, 24, 9],
  ['Gaseosa Coca-Cola 1,5 L', 'Bebidas', 4300, 5500, 6, 8], ['Gaseosa Postobón 1,5 L', 'Bebidas', 3300, 4300, 6, 7],
  ['Gaseosa personal 400 ml', 'Bebidas', 1700, 2500, 12, 9], ['Agua Cristal 600 ml', 'Bebidas', 1100, 1800, 12, 6],
  ['Jugo Hit caja 200 ml', 'Bebidas', 1100, 1700, 12, 6], ['Pony Malta 330 ml', 'Bebidas', 1800, 2600, 12, 7],
  ['Leche entera bolsa 1 L', 'Lácteos', 3600, 4500, 10, 10], ['Leche deslactosada 1 L', 'Lácteos', 4100, 5100, 6, 6],
  ['Huevo AA (unidad)', 'Lácteos', 520, 700, 30, 10], ['Queso campesino 250 g', 'Lácteos', 5400, 7000, 4, 6],
  ['Yogur Alpina 200 g', 'Lácteos', 2100, 2900, 6, 5], ['Mantequilla 125 g', 'Lácteos', 3300, 4300, 3, 4],
  ['Pan tajado 450 g', 'Panadería', 5300, 6800, 4, 8], ['Pan de 500 (unidad)', 'Panadería', 330, 500, 20, 10],
  ['Arepas paquete x5', 'Panadería', 2900, 3800, 4, 6], ['Galletas Saltinas taco', 'Panadería', 1600, 2200, 6, 6],
  ['Arroz Diana 500 g', 'Granos', 2100, 2800, 10, 9], ['Arroz Roa 1 kg', 'Granos', 4300, 5400, 6, 7],
  ['Lenteja 500 g', 'Granos', 3100, 4000, 5, 5], ['Fríjol bola roja 500 g', 'Granos', 5300, 6800, 4, 4],
  ['Azúcar Manuelita 500 g', 'Granos', 2100, 2800, 8, 7], ['Sal Refisal 500 g', 'Granos', 1100, 1600, 5, 4],
  ['Panela 500 g', 'Granos', 2300, 3000, 6, 7], ['Café Sello Rojo 125 g', 'Granos', 5600, 7200, 4, 6],
  ['Chocolate Corona 250 g', 'Granos', 5800, 7500, 3, 4], ['Pasta Doria 250 g', 'Granos', 1700, 2300, 6, 6],
  ['Aceite Premier 1 L', 'Abarrotes', 8600, 11000, 4, 7], ['Atún Van Camps lata', 'Abarrotes', 4900, 6300, 4, 5],
  ['Salsa de tomate 200 g', 'Abarrotes', 2300, 3100, 3, 4], ['Maggi caldo x8', 'Abarrotes', 2100, 2800, 4, 5],
  ['Harina PAN 1 kg', 'Abarrotes', 4300, 5500, 4, 6], ['Avena Quaker 200 g', 'Abarrotes', 2400, 3200, 3, 4],
  ['Papas Margarita 30 g', 'Pasabocas', 1500, 2200, 12, 9], ['Doritos 40 g', 'Pasabocas', 1900, 2700, 10, 7],
  ['Chocoramo', 'Pasabocas', 1700, 2400, 12, 9], ['Detodito 45 g', 'Pasabocas', 2300, 3200, 6, 6],
  ['Bon Bon Bum (unidad)', 'Dulces', 260, 400, 24, 8], ['Chicle Trident x6', 'Dulces', 1200, 1800, 6, 5],
  ['Barra Jet', 'Dulces', 1100, 1600, 12, 7], ['Galletas Festival', 'Dulces', 1000, 1500, 10, 7],
  ['Jabón Rey barra', 'Aseo', 2600, 3400, 4, 6], ['Detergente Fab 500 g', 'Aseo', 4600, 5900, 3, 5],
  ['Papel higiénico x4', 'Aseo', 6100, 7800, 4, 6], ['Crema dental Colgate 75 ml', 'Aseo', 4100, 5300, 3, 5],
  ['Shampoo sobre', 'Aseo', 500, 800, 20, 6], ['Blanqueador 1 L', 'Aseo', 2600, 3500, 3, 4],
  ['Toalla higiénica x10', 'Aseo', 4300, 5600, 3, 4], ['Desodorante sobre', 'Aseo', 600, 1000, 10, 4],
  ['Cigarrillo Mustang (unidad)', 'Otros', 650, 1000, 20, 7], ['Encendedor', 'Otros', 900, 1500, 5, 3],
  ['Pilas AA x2', 'Otros', 3200, 4500, 2, 2], ['Bolsa de hielo', 'Otros', 1200, 2000, 4, 3],
  ['Tomate (libra)', 'Fruver', 1600, 2400, 4, 6], ['Cebolla cabezona (libra)', 'Fruver', 1500, 2200, 4, 6],
  ['Papa pastusa (libra)', 'Fruver', 1000, 1600, 8, 7], ['Plátano verde (unidad)', 'Fruver', 700, 1100, 8, 6],
  ['Banano (unidad)', 'Fruver', 250, 400, 10, 5], ['Limón (unidad)', 'Fruver', 180, 300, 10, 4],
];

const NOMBRES = ['Doña Marta', 'Don Luis', 'Sra. Patricia', 'Jorge (apto 201)', 'Carmen Rojas', 'Wilson', 'Doña Rosa',
  'Andrés Gómez', 'Sandra (la del lado)', 'Don Efraín', 'Yolanda', 'Camilo', 'Señora Gladys', 'Fabio Torres', 'Luz Dary',
  'Nelson', 'Diana Pérez', 'Don Hernando', 'Blanca', 'Jhon Fredy', 'Olga Lucía', 'Ricardo', 'Martha Cecilia', 'Óscar', 'Ana María'];

function rnd(seed) { // generador pseudoaleatorio reproducible
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function generarDemo({ semanas = 8, ahora = new Date(), semilla = 2026 } = {}) {
  const r = rnd(semilla);
  const categorias = [...new Set(CATALOGO.map(c => c[1]))].map(n => ({ id: uid(), nombre: n }));
  const catId = n => categorias.find(c => c.nombre === n).id;
  const productos = CATALOGO.map(([nombre, cat, costo, precio, min, pop]) => ({
    id: uid(), nombre, categoriaId: catId(cat), codigoBarras: '', precioCompra: costo, precioVenta: precio,
    stock: min * 4 + Math.floor(r() * min * 2), stockMinimo: min, activo: true, popularidad: pop,
  }));
  const clientes = NOMBRES.map((nombre, i) => ({
    id: uid(), nombre, celular: '3' + String(100000000 + Math.floor(r() * 899999999)).slice(0, 9),
    cupo: [50000, 80000, 100000, 150000][i % 4], autorizaDatos: true, creado: new Date(ahora - semanas * 7 * DIA_MS).toISOString(),
  }));
  const pesoTotal = productos.reduce((s, p) => s + p.popularidad, 0);
  const elegir = () => { let x = r() * pesoTotal; for (const p of productos) { x -= p.popularidad; if (x <= 0) return p; } return productos[0]; };

  const ventas = [], movimientos = [], abonos = [];
  const deuda = new Map(clientes.map(c => [c.id, 0]));
  const hoy0 = inicioDia(ahora).getTime();
  const dias = semanas * 7;
  for (let d = dias - 1; d >= 0; d--) {
    const dia = hoy0 - d * DIA_MS;
    const fds = [0, 6].includes(new Date(dia).getDay());
    // compra semanal (lunes) para reabastecer
    if (new Date(dia).getDay() === 1) {
      for (const p of productos) {
        if (p.stock < p.stockMinimo * 3) {
          const cant = p.stockMinimo * 4;
          p.stock += cant;
          movimientos.push({ id: uid(), tipo: 'entrada', productoId: p.id, cantidad: cant, costo: p.precioCompra, fecha: new Date(dia + 8 * 3600e3).toISOString(), referencia: 'compra a distribuidor' });
        }
      }
    }
    const nVentas = (fds ? 38 : 26) + Math.floor(r() * 12);
    for (let k = 0; k < nVentas; k++) {
      const hora = 6.5 + r() * 15; // 6:30 a. m. a 9:30 p. m.
      if (d === 0 && dia + hora * 3600e3 > ahora.getTime()) continue;
      const fecha = new Date(dia + hora * 3600e3).toISOString();
      const nItems = 1 + Math.floor(r() * r() * 4);
      const items = [];
      for (let j = 0; j < nItems; j++) {
        const p = elegir();
        if (items.some(i => i.productoId === p.id)) continue;
        const cant = p.precioVenta < 1000 ? 1 + Math.floor(r() * 6) : 1 + Math.floor(r() * r() * 3);
        if (p.stock < cant) continue;
        p.stock -= cant;
        items.push({ productoId: p.id, nombre: p.nombre, cantidad: cant, precio: p.precioVenta, costo: p.precioCompra });
        movimientos.push({ id: uid(), tipo: 'salida', productoId: p.id, cantidad: cant, costo: p.precioCompra, fecha, referencia: 'venta' });
      }
      if (!items.length) continue;
      const total = items.reduce((s, i) => s + i.cantidad * i.precio, 0);
      const x = r();
      let medioPago = x < 0.68 ? 'efectivo' : x < 0.86 ? 'transferencia' : 'fiado';
      let clienteId = null;
      if (medioPago === 'fiado') {
        const c = clientes[Math.floor(r() * clientes.length)];
        if (deuda.get(c.id) + total > c.cupo) medioPago = 'efectivo';
        else { clienteId = c.id; deuda.set(c.id, deuda.get(c.id) + total); }
      }
      ventas.push({ id: uid(), fecha, items, total, medioPago, clienteId, estado: 'registrada' });
    }
    // abonos: algunos clientes pagan los viernes y sábados
    if ([5, 6].includes(new Date(dia).getDay())) {
      for (const c of clientes) {
        const deb = deuda.get(c.id);
        if (deb > 0 && r() < 0.35) {
          const valor = Math.min(deb, Math.round((deb * (0.5 + r() * 0.5)) / 1000) * 1000 || deb);
          deuda.set(c.id, deb - valor);
          abonos.push({ id: uid(), clienteId: c.id, valor, medioPago: r() < 0.7 ? 'efectivo' : 'transferencia', fecha: new Date(dia + 18 * 3600e3).toISOString() });
        }
      }
    }
  }
  productos.forEach(p => { delete p.popularidad; });
  // forzar algunos productos bajo el mínimo para mostrar alertas
  productos.filter((_, i) => i % 13 === 4).forEach(p => { p.stock = Math.max(0, p.stockMinimo - 1); });
  return { categorias, productos, clientes, ventas, abonos, movimientos };
}
