// TiendaClara - capa de datos sobre IndexedDB (funciona sin conexión).
import { uid } from './calc.js';

const NOMBRE_BD = 'tiendaclara';
const VERSION = 1;
export const STORES = ['config', 'categorias', 'productos', 'movimientos', 'clientes', 'ventas', 'abonos', 'cierres'];

let _db = null;

export function abrir() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOMBRE_BD, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) {
          const os = db.createObjectStore(s, { keyPath: s === 'config' ? 'clave' : 'id' });
          if (['ventas', 'abonos', 'movimientos'].includes(s)) os.createIndex('fecha', 'fecha');
        }
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function prom(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

export async function todos(store) {
  const db = await abrir();
  return prom(db.transaction(store).objectStore(store).getAll());
}

export async function obtener(store, id) {
  const db = await abrir();
  return prom(db.transaction(store).objectStore(store).get(id));
}

export async function guardar(store, obj) {
  const db = await abrir();
  if (store !== 'config' && !obj.id) obj.id = uid();
  await prom(db.transaction(store, 'readwrite').objectStore(store).put(obj));
  return obj;
}

export async function eliminar(store, id) {
  const db = await abrir();
  return prom(db.transaction(store, 'readwrite').objectStore(store).delete(id));
}

export async function config(clave, valor) {
  if (valor === undefined) {
    const r = await obtener('config', clave);
    return r ? r.valor : undefined;
  }
  return guardar('config', { clave, valor });
}

/** Ejecuta varias escrituras en una sola transacción (todo o nada). */
export async function transaccion(stores, fn) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, 'readwrite');
    const api = {
      put: (s, o) => { if (s !== 'config' && !o.id) o.id = uid(); tx.objectStore(s).put(o); return o; },
      get: (s, id) => prom(tx.objectStore(s).get(id)),
    };
    let resultado;
    Promise.resolve(fn(api)).then(r => { resultado = r; }).catch(e => { tx.abort(); reject(e); });
    tx.oncomplete = () => resolve(resultado);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción cancelada'));
  });
}

/**
 * Registra una venta: guarda la venta, descuenta el stock y crea los movimientos de salida.
 * items: [{productoId, cantidad, precio}]
 */
export async function registrarVenta({ items, medioPago, clienteId = null, fecha = new Date().toISOString() }) {
  return transaccion(['ventas', 'productos', 'movimientos'], async (t) => {
    const detalle = [];
    for (const it of items) {
      const p = await t.get('productos', it.productoId);
      if (!p) throw new Error('Producto no encontrado');
      p.stock = Number(p.stock) - it.cantidad;
      t.put('productos', p);
      detalle.push({ productoId: p.id, nombre: p.nombre, cantidad: it.cantidad, precio: it.precio ?? p.precioVenta, costo: p.precioCompra });
      t.put('movimientos', { tipo: 'salida', productoId: p.id, cantidad: it.cantidad, costo: p.precioCompra, fecha, referencia: 'venta' });
    }
    const total = detalle.reduce((s, d) => s + d.cantidad * d.precio, 0);
    return t.put('ventas', { fecha, items: detalle, total, medioPago, clienteId, estado: 'registrada' });
  });
}

/** Anula una venta y devuelve las unidades al inventario. */
export async function anularVenta(id) {
  return transaccion(['ventas', 'productos', 'movimientos'], async (t) => {
    const v = await t.get('ventas', id);
    if (!v || v.estado === 'anulada') return v;
    for (const it of v.items) {
      const p = await t.get('productos', it.productoId);
      if (p) { p.stock = Number(p.stock) + it.cantidad; t.put('productos', p); }
      t.put('movimientos', { tipo: 'entrada', productoId: it.productoId, cantidad: it.cantidad, costo: it.costo, fecha: new Date().toISOString(), referencia: 'anulación de venta' });
    }
    v.estado = 'anulada';
    return t.put('ventas', v);
  });
}

/** Registra una compra a proveedor: aumenta stock y actualiza el costo de compra. */
export async function registrarCompra({ items, proveedor = '', fecha = new Date().toISOString() }) {
  return transaccion(['productos', 'movimientos'], async (t) => {
    for (const it of items) {
      const p = await t.get('productos', it.productoId);
      if (!p) throw new Error('Producto no encontrado');
      p.stock = Number(p.stock) + it.cantidad;
      if (it.costo > 0) p.precioCompra = it.costo;
      t.put('productos', p);
      t.put('movimientos', { tipo: 'entrada', productoId: p.id, cantidad: it.cantidad, costo: it.costo || p.precioCompra, fecha, referencia: proveedor ? 'compra a ' + proveedor : 'compra' });
    }
    return true;
  });
}

/** Ajuste manual de inventario (conteo físico, mermas). */
export async function ajustarStock(productoId, nuevoStock, motivo = 'ajuste') {
  return transaccion(['productos', 'movimientos'], async (t) => {
    const p = await t.get('productos', productoId);
    const dif = nuevoStock - Number(p.stock);
    p.stock = nuevoStock;
    t.put('productos', p);
    t.put('movimientos', { tipo: 'ajuste', productoId, cantidad: dif, costo: p.precioCompra, fecha: new Date().toISOString(), referencia: motivo });
  });
}

/** Exporta toda la base a un objeto JSON (respaldo). */
export async function exportarTodo() {
  const out = { app: 'TiendaClara', version: 1, exportado: new Date().toISOString() };
  for (const s of STORES) out[s] = await todos(s);
  return out;
}

/** Restaura un respaldo JSON (reemplaza los datos actuales). */
export async function importarTodo(data) {
  if (!data || data.app !== 'TiendaClara') throw new Error('El archivo no es un respaldo de TiendaClara');
  const db = await abrir();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES, 'readwrite');
    for (const s of STORES) {
      const os = tx.objectStore(s);
      os.clear();
      for (const o of data[s] || []) os.put(o);
    }
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}

export async function borrarTodo() {
  const db = await abrir();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES, 'readwrite');
    for (const s of STORES) tx.objectStore(s).clear();
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
