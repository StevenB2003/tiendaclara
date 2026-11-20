// Pruebas unitarias de las funciones de cálculo de TiendaClara.  Ejecutar: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/calc.js';
import { generarDemo } from '../js/demo.js';

const ahora = new Date('2026-11-20T15:00:00');
const hace = d => new Date(ahora.getTime() - d * C.DIA_MS).toISOString();

const ventas = [
  { id: 'v1', fecha: hace(0), total: 10000, medioPago: 'efectivo', estado: 'registrada', items: [{ productoId: 'p1', nombre: 'Leche', cantidad: 2, precio: 4500, costo: 3600 }, { productoId: 'p2', nombre: 'Pan', cantidad: 2, precio: 500, costo: 330 }] },
  { id: 'v2', fecha: hace(0), total: 7000, medioPago: 'transferencia', estado: 'registrada', items: [{ productoId: 'p3', nombre: 'Arroz', cantidad: 2, precio: 3500, costo: 2800 }] },
  { id: 'v3', fecha: hace(40), total: 20000, medioPago: 'fiado', clienteId: 'c1', estado: 'registrada', items: [{ productoId: 'p1', nombre: 'Leche', cantidad: 4, precio: 5000, costo: 3600 }] },
  { id: 'v4', fecha: hace(5), total: 8000, medioPago: 'fiado', clienteId: 'c1', estado: 'registrada', items: [{ productoId: 'p2', nombre: 'Pan', cantidad: 16, precio: 500, costo: 330 }] },
  { id: 'v5', fecha: hace(0), total: 99999, medioPago: 'efectivo', estado: 'anulada', items: [{ productoId: 'p1', nombre: 'Leche', cantidad: 1, precio: 99999, costo: 1 }] },
];
const abonos = [{ id: 'a1', clienteId: 'c1', valor: 15000, medioPago: 'efectivo', fecha: hace(0) }];

test('CP-01 formato de pesos colombianos', () => {
  assert.equal(C.pesos(12500), '$ 12.500');
  assert.equal(C.pesos(1234567), '$ 1.234.567');
  assert.equal(C.pesos(-3000), '-$ 3.000');
});

test('CP-02 indicadores del día excluyen ventas anuladas', () => {
  const ind = C.indicadoresVentas(ventas, C.rango('hoy', ahora));
  assert.equal(ind.numeroVentas, 2);
  assert.equal(ind.ventas, 17000);
  assert.equal(ind.utilidad, (900 * 2) + (170 * 2) + (700 * 2)); // 3540
  assert.equal(ind.porMedio.efectivo, 10000);
  assert.equal(ind.porMedio.transferencia, 7000);
  assert.equal(Math.round(ind.ticketPromedio), 8500);
});

test('CP-03 saldo de fiado con abonos aplicados a la deuda más antigua (FIFO)', () => {
  const e = C.estadoCliente('c1', ventas, abonos, ahora);
  assert.equal(e.totalFiado, 28000);
  assert.equal(e.saldo, 13000);
  assert.equal(e.dias, 40); // queda pendiente $5.000 de la venta de hace 40 días
});

test('CP-04 cartera por antigüedad', () => {
  const c = C.carteraPorAntiguedad([{ id: 'c1' }], ventas, abonos, ahora);
  assert.equal(c.total, 13000);
  assert.equal(c.tramos['>30'], 5000);
  assert.equal(c.tramos['0-15'], 8000);
});

test('CP-05 control de cupo de fiado', () => {
  assert.equal(C.dentroDelCupo({ cupo: 50000 }, 40000, 10000), true);
  assert.equal(C.dentroDelCupo({ cupo: 50000 }, 40000, 10001), false);
  assert.equal(C.dentroDelCupo({ cupo: 0 }, 900000, 10000), true);
});

test('CP-06 alertas de stock mínimo', () => {
  const ps = [{ id: 1, stock: 2, stockMinimo: 5 }, { id: 2, stock: 10, stockMinimo: 5 }, { id: 3, stock: 5, stockMinimo: 5 }, { id: 4, stock: 0, stockMinimo: 3, activo: false }];
  assert.deepEqual(C.bajoStock(ps).map(p => p.id), [1, 3]);
});

test('CP-07 cierre de caja y diferencia', () => {
  const r = C.cierreDelDia(ventas, abonos, ahora, 30000, 5000);
  assert.equal(r.ventasEfectivo, 10000);
  assert.equal(r.abonosEfectivo, 15000);
  assert.equal(r.efectivoEsperado, 30000);
  assert.equal(r.diferencia, 0);
  assert.equal(r.totalVentas, 17000);
});

test('CP-08 número de WhatsApp colombiano', () => {
  assert.equal(C.telefonoWhatsApp('310 208 6577'), '573102086577');
  assert.equal(C.telefonoWhatsApp('+57 3102086577'), '573102086577');
  assert.equal(C.telefonoWhatsApp('12345'), null);
});

test('CP-09 exportación CSV con separador ; y escape de comillas', () => {
  const csv = C.aCSV([{ a: 'x;y', b: 'dijo "hola"' }], [{ titulo: 'A', valor: 'a' }, { titulo: 'B', valor: 'b' }]);
  assert.ok(csv.startsWith('﻿A;B'));
  assert.ok(csv.includes('"x;y";"dijo ""hola"""'));
});

test('CP-10 puntaje SUS', () => {
  assert.equal(C.puntajeSUS([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
  assert.equal(C.puntajeSUS([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
  assert.equal(C.puntajeSUS([4, 2, 4, 2, 4, 2, 4, 2, 4, 2]), 75);
});

test('CP-11 ventas por día para el gráfico de 7 días', () => {
  const s = C.ventasPorDia(ventas, 7, ahora);
  assert.equal(s.length, 7);
  assert.equal(s[6].total, 17000);
  assert.equal(s[1].total, 8000); // hace 5 días
});

test('CP-12 datos de demostración consistentes (entorno simulado TRL 5)', () => {
  const d = generarDemo({ ahora });
  assert.equal(d.productos.length, 60);
  assert.equal(d.clientes.length, 25);
  assert.ok(d.ventas.length > 1500, 'al menos 1.500 ventas en 8 semanas');
  for (const v of d.ventas) assert.equal(v.total, v.items.reduce((s, i) => s + i.cantidad * i.precio, 0));
  for (const c of d.clientes) assert.ok(C.estadoCliente(c.id, d.ventas, d.abonos, ahora).saldo <= c.cupo, 'ningún cliente supera su cupo');
  assert.ok(C.bajoStock(d.productos).length > 0, 'hay productos para alertar');
});
