// TiendaClara - interfaz principal (PWA sin dependencias externas).
import * as DB from './db.js';
import * as C from './calc.js';
import { generarDemo } from './demo.js';

const $ = (s, el = document) => el.querySelector(s);
const vista = $('#vista');
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = Number(String(v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
const fechaCorta = iso => new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
const fechaHora = iso => new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

let estado = { periodo: 'hoy', carrito: [], busqueda: '', filtroCat: '' };

// ------------------------------------------------------------------ utilidades de UI
function toast(msg, accion) {
  const t = $('#toast');
  t.innerHTML = `<span>${h(msg)}</span>` + (accion ? `<button id="toast-acc">${h(accion.texto)}</button>` : '');
  t.hidden = false;
  if (accion) $('#toast-acc').onclick = () => { t.hidden = true; accion.fn(); };
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, accion ? 6000 : 2800);
}

function abrirModal(html, alMontar) {
  const m = $('#modal'); $('#modal-card').innerHTML = html; m.hidden = false;
  m.onclick = e => { if (e.target === m) cerrarModal(); };
  const primero = $('#modal-card input, #modal-card select, #modal-card button'); if (primero) primero.focus();
  if (alMontar) alMontar($('#modal-card'));
}
function cerrarModal() { $('#modal').hidden = true; $('#modal-card').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) cerrarModal(); });

function confirmar(titulo, texto, okTexto = 'Sí, continuar', clase = 'rojo') {
  return new Promise(res => {
    abrirModal(`<h2>${h(titulo)}</h2><p>${h(texto)}</p>
      <div class="fila-btn"><button class="btn sec" id="c-no">Cancelar</button><button class="btn ${clase}" id="c-si">${h(okTexto)}</button></div>`, el => {
      $('#c-no', el).onclick = () => { cerrarModal(); res(false); };
      $('#c-si', el).onclick = () => { cerrarModal(); res(true); };
    });
  });
}

function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function redEstado() {
  const p = $('#estado-red');
  if (navigator.onLine) { p.textContent = 'En línea'; p.classList.remove('off'); }
  else { p.textContent = 'Sin internet · funcionando'; p.classList.add('off'); }
}
addEventListener('online', redEstado); addEventListener('offline', redEstado);

async function datos() {
  const [productos, categorias, clientes, ventas, abonos] = await Promise.all(
    ['productos', 'categorias', 'clientes', 'ventas', 'abonos'].map(s => DB.todos(s)));
  productos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  clientes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return { productos, categorias, clientes, ventas, abonos };
}

// ------------------------------------------------------------------ router
const rutas = { vender, inventario, fiado, tablero, mas };
async function router() {
  const tienda = await DB.config('tienda');
  if (!tienda) return bienvenida();
  $('#nombre-tienda').textContent = tienda.nombre;
  const ruta = (location.hash.replace('#/', '') || 'vender').split('/')[0];
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('activo', a.dataset.tab === ruta));
  $('.tabbar').hidden = false;
  await (rutas[ruta] || vender)();
  vista.focus({ preventScroll: true });
}
addEventListener('hashchange', router);

// ------------------------------------------------------------------ bienvenida / registro (RF-01, RF-02)
function bienvenida() {
  $('.tabbar').hidden = true;
  vista.innerHTML = `<div class="bienvenida card">
    <div class="logo"><img src="icons/icon-192.png" width="72" height="72" alt="TiendaClara"></div>
    <h1 style="text-align:center">Bienvenido a TiendaClara</h1>
    <p>Lleve sus ventas, su inventario y el fiado desde el celular, incluso sin internet.</p>
    <form id="f-tienda">
      <label for="t-nombre">Nombre de la tienda</label><input id="t-nombre" required placeholder="Ej.: Tienda Doña Rosa" autocomplete="organization">
      <label for="t-dueno">Nombre del tendero</label><input id="t-dueno" required placeholder="Su nombre">
      <label for="t-cel">Celular</label><input id="t-cel" inputmode="tel" placeholder="3001234567">
      <label for="t-dir">Dirección</label><input id="t-dir" placeholder="Calle, número, barrio">
      <label for="t-loc">Localidad</label><input id="t-loc" value="San Cristóbal">
      <label for="t-pin">PIN de acceso (4 dígitos, opcional)</label><input id="t-pin" inputmode="numeric" maxlength="4" pattern="\\d{4}" placeholder="Opcional">
      <label class="check"><input type="checkbox" id="t-pol" required>
        <span>Acepto la <a href="#" id="ver-pol">política de tratamiento de datos</a>. Mis datos se guardan en este dispositivo y solo yo decido si los exporto (Ley 1581 de 2012).</span></label>
      <button class="btn bloque" style="margin-top:14px">Empezar</button>
    </form>
    <p class="small">¿Quiere probar primero? <a href="#" id="probar-demo">Cargar una tienda de demostración</a>.</p></div>`;
  $('#ver-pol').onclick = e => { e.preventDefault(); politica(); };
  $('#probar-demo').onclick = async e => { e.preventDefault(); await cargarDemo(true); };
  $('#f-tienda').onsubmit = async e => {
    e.preventDefault();
    const pin = $('#t-pin').value.trim();
    if (pin && !/^\d{4}$/.test(pin)) return toast('El PIN debe tener 4 dígitos');
    await DB.config('tienda', { nombre: $('#t-nombre').value.trim(), dueno: $('#t-dueno').value.trim(), celular: $('#t-cel').value.trim(),
      direccion: $('#t-dir').value.trim(), localidad: $('#t-loc').value.trim(), aceptaPolitica: true, creada: new Date().toISOString() });
    if (pin) await DB.config('pin', await hashPin(pin));
    location.hash = '#/inventario'; toast('¡Listo! Ahora agregue sus productos'); router();
  };
}

function politica() {
  abrirModal(`<h2>Política de tratamiento de datos</h2>
    <p class="small">TiendaClara guarda la información de su negocio (productos, ventas, clientes de fiado y abonos) únicamente en la memoria de este dispositivo. No se envía a ningún servidor. Usted puede exportarla, respaldarla o borrarla en cualquier momento desde el menú <b>Más</b>.</p>
    <p class="small">Al registrar clientes de fiado, usted se compromete a pedirles autorización para guardar su nombre y celular con el único fin de llevar la cuenta y enviar recordatorios de cobro, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. Los titulares pueden solicitar que sus datos se corrijan o eliminen.</p>
    <button class="btn bloque" id="cerrar">Entendido</button>`, el => { $('#cerrar', el).onclick = cerrarModal; });
}

async function hashPin(pin) {
  if (crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('tiendaclara:' + pin));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return 'plain:' + pin;
}

async function pedirPin() {
  const guardado = await DB.config('pin');
  if (!guardado || sessionStorage.getItem('tc-ok')) return;
  await new Promise(res => {
    abrirModal(`<h2>Ingrese su PIN</h2><input id="pin" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="PIN">
      <button class="btn bloque" id="pin-ok" style="margin-top:12px">Entrar</button><p class="small" id="pin-msg"></p>`, el => {
      const ok = async () => {
        if (await hashPin($('#pin', el).value) === guardado) { sessionStorage.setItem('tc-ok', '1'); cerrarModal(); res(); }
        else $('#pin-msg', el).textContent = 'PIN incorrecto';
      };
      $('#pin-ok', el).onclick = ok; $('#pin', el).onkeydown = e => { if (e.key === 'Enter') ok(); };
    });
    $('#modal').onclick = null;
  });
}

// ------------------------------------------------------------------ VENDER (RF-05, HU-04, HU-05)
async function vender() {
  const { productos, ventas } = await datos();
  const activos = productos.filter(p => p.activo !== false);
  const top = C.indicadoresVentas(ventas, C.rango('mes')).top.slice(0, 8).map(t => activos.find(p => p.id === t.productoId)).filter(Boolean);
  const total = C.totalCarrito(estado.carrito);
  vista.innerHTML = `<h1>Nueva venta</h1>
    <div class="card">
      <input id="buscar" type="search" placeholder="Buscar producto o código de barras" value="${h(estado.busqueda)}" aria-label="Buscar producto" autocomplete="off">
      <div class="chips" id="chips">${(top.length ? top : activos.slice(0, 8)).map(p => `<button class="chip" data-add="${p.id}">${h(p.nombre.replace(/\s*\(.*\)$/, '').split(' ').slice(0, 3).join(' '))}</button>`).join('')}</div>
      <ul class="lista" id="resultados"></ul>
    </div>
    <div class="card">
      <h2 style="margin-top:0">Productos de la venta</h2>
      ${estado.carrito.length ? `<ul class="lista carrito">${estado.carrito.map((it, i) => `
        <li><div><div>${h(it.nombre)}</div><div class="sub">${C.pesos(it.precio)} c/u</div></div>
        <div class="qty"><button data-menos="${i}" aria-label="Quitar uno">−</button><b>${it.cantidad}</b><button data-mas="${i}" aria-label="Agregar uno">+</button></div>
        <div class="der">${C.pesos(it.precio * it.cantidad)}</div></li>`).join('')}</ul>`
        : `<p class="vacio">Toque un producto para agregarlo.</p>`}
      <div class="total"><span>TOTAL</span><span id="total">${C.pesos(total)}</span></div>
      <div class="pagos">
        <button class="btn verde" data-pago="efectivo" ${total ? '' : 'disabled'}>💵<span>Efectivo</span></button>
        <button class="btn" data-pago="transferencia" ${total ? '' : 'disabled'}>📱<span>Nequi / Daviplata</span></button>
        <button class="btn naranja" data-pago="fiado" ${total ? '' : 'disabled'}>📒<span>Fiado</span></button>
      </div>
      ${estado.carrito.length ? '<button class="btn sec bloque" id="vaciar" style="margin-top:8px">Vaciar</button>' : ''}
    </div>`;
  const pintarResultados = () => {
    const q = estado.busqueda.trim().toLowerCase();
    const res = q ? activos.filter(p => p.nombre.toLowerCase().includes(q) || (p.codigoBarras && p.codigoBarras === q)).slice(0, 12) : [];
    $('#resultados').innerHTML = res.map(p => `<li data-add="${p.id}"><div><div>${h(p.nombre)}</div>
      <div class="sub">Stock: <span class="${p.stock <= p.stockMinimo ? 'rojo-t' : ''}">${p.stock}</span></div></div><div class="der">${C.pesos(p.precioVenta)}</div></li>`).join('')
      || (q ? `<li class="gris-t" data-nuevo="1">No existe "${h(q)}". Toque para crearlo</li>` : '');
  };
  pintarResultados();
  const inp = $('#buscar');
  inp.oninput = () => { estado.busqueda = inp.value; pintarResultados(); };
  inp.onkeydown = e => {
    if (e.key === 'Enter') { const p = activos.find(x => x.codigoBarras && x.codigoBarras === inp.value.trim()) || activos.find(x => x.nombre.toLowerCase().includes(inp.value.trim().toLowerCase())); if (p) agregar(p); }
  };
  const agregar = p => {
    const it = estado.carrito.find(x => x.productoId === p.id);
    if (it) it.cantidad++; else estado.carrito.push({ productoId: p.id, nombre: p.nombre, precio: p.precioVenta, cantidad: 1 });
    if (p.stock - (it ? it.cantidad : 1) < 0) toast(`Ojo: ${p.nombre} no tiene stock suficiente`);
    estado.busqueda = ''; vender();
  };
  vista.onclick = async e => {
    const t = e.target.closest('[data-add],[data-mas],[data-menos],[data-pago],#vaciar,[data-nuevo]');
    if (!t) return;
    if (t.dataset.add) agregar(activos.find(p => p.id === t.dataset.add));
    else if (t.dataset.mas) { estado.carrito[+t.dataset.mas].cantidad++; vender(); }
    else if (t.dataset.menos) { const it = estado.carrito[+t.dataset.menos]; it.cantidad--; if (it.cantidad <= 0) estado.carrito.splice(+t.dataset.menos, 1); vender(); }
    else if (t.id === 'vaciar') { estado.carrito = []; vender(); }
    else if (t.dataset.nuevo) editarProducto(null, estado.busqueda);
    else if (t.dataset.pago) cobrar(t.dataset.pago);
  };
}

async function cobrar(medio) {
  const total = C.totalCarrito(estado.carrito);
  if (medio === 'efectivo') {
    abrirModal(`<h2>Pago en efectivo · ${C.pesos(total)}</h2>
      <label for="paga">¿Con cuánto paga? (opcional)</label><input id="paga" inputmode="numeric" placeholder="${total}">
      <p class="total"><span>Cambio</span><span id="cambio">$ 0</span></p>
      <div class="chips">${[total, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000].filter((v, i, a) => a.indexOf(v) === i).map(v => `<button class="chip" data-v="${v}">${C.pesos(v)}</button>`).join('')}</div>
      <div class="fila-btn"><button class="btn sec" id="cancelar">Cancelar</button><button class="btn verde" id="ok">Registrar venta</button></div>`, el => {
      const upd = () => { const p = num($('#paga', el).value); $('#cambio', el).textContent = C.pesos(p ? Math.max(0, p - total) : 0); };
      $('#paga', el).oninput = upd;
      el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { $('#paga', el).value = b.dataset.v; upd(); });
      $('#cancelar', el).onclick = cerrarModal;
      $('#ok', el).onclick = () => finalizar('efectivo');
    });
  } else if (medio === 'transferencia') {
    finalizar('transferencia');
  } else {
    elegirCliente(total);
  }
}

async function elegirCliente(total) {
  const { clientes, ventas, abonos } = await datos();
  const lista = clientes.map(c => ({ c, e: C.estadoCliente(c.id, ventas, abonos) }));
  abrirModal(`<h2>¿A quién se le fía? · ${C.pesos(total)}</h2>
    <input id="bc" type="search" placeholder="Buscar cliente" aria-label="Buscar cliente">
    <ul class="lista" id="lc"></ul>
    <div class="fila-btn"><button class="btn sec" id="cancelar">Cancelar</button><button class="btn" id="nuevo">+ Nuevo cliente</button></div>`, el => {
    const pintar = () => {
      const q = $('#bc', el).value.toLowerCase();
      $('#lc', el).innerHTML = lista.filter(x => x.c.nombre.toLowerCase().includes(q)).map(({ c, e }) => {
        const ok = C.dentroDelCupo(c, e.saldo, total);
        return `<li data-c="${c.id}" data-ok="${ok}"><div><div>${h(c.nombre)}</div><div class="sub">Debe ${C.pesos(e.saldo)}${c.cupo ? ' · cupo ' + C.pesos(c.cupo) : ''}</div></div>
          ${ok ? '<span class="tag verde">Fiar</span>' : '<span class="tag rojo">Supera cupo</span>'}</li>`;
      }).join('') || '<li class="gris-t">Sin clientes. Cree uno nuevo.</li>';
    };
    pintar(); $('#bc', el).oninput = pintar;
    $('#lc', el).onclick = async ev => {
      const li = ev.target.closest('[data-c]'); if (!li) return;
      if (li.dataset.ok === 'false' && !(await confirmar('Supera el cupo', 'Esta venta deja al cliente por encima de su cupo de fiado. ¿Desea fiar de todas formas?', 'Fiar igual', 'naranja'))) return elegirCliente(total);
      finalizar('fiado', li.dataset.c);
    };
    $('#cancelar', el).onclick = cerrarModal;
    $('#nuevo', el).onclick = () => editarCliente(null, id => finalizar('fiado', id));
  });
}

async function finalizar(medio, clienteId = null) {
  try {
    const v = await DB.registrarVenta({ items: estado.carrito.map(i => ({ productoId: i.productoId, cantidad: i.cantidad, precio: i.precio })), medioPago: medio, clienteId });
    estado.carrito = []; cerrarModal(); await vender();
    toast(`Venta registrada: ${C.pesos(v.total)}`, { texto: 'Deshacer', fn: async () => { await DB.anularVenta(v.id); toast('Venta anulada'); router(); } });
  } catch (err) { toast('No se pudo registrar: ' + err.message); }
}

// ------------------------------------------------------------------ INVENTARIO (RF-03, RF-04, RF-06)
async function inventario() {
  const { productos, categorias } = await datos();
  const bajos = C.bajoStock(productos);
  const q = estado.busqueda.toLowerCase();
  const lista = productos.filter(p => p.activo !== false && (!estado.filtroCat || p.categoriaId === estado.filtroCat) && (!q || p.nombre.toLowerCase().includes(q)));
  const valor = productos.reduce((s, p) => s + Math.max(0, p.stock) * p.precioCompra, 0);
  vista.innerHTML = `<h1>Inventario</h1>
    <div class="kpis"><div class="kpi"><div class="t">Productos</div><div class="v">${productos.filter(p => p.activo !== false).length}</div></div>
      <div class="kpi ${bajos.length ? 'rojo' : 'verde'}"><div class="t">Por surtir</div><div class="v">${bajos.length}</div></div>
      <div class="kpi verde"><div class="t">Valor del inventario (costo)</div><div class="v">${C.pesos(valor)}</div></div></div>
    <div class="fila-btn"><button class="btn" id="compra">+ Registrar compra</button><button class="btn gris" id="nuevo">+ Nuevo producto</button></div>
    ${bajos.length ? `<div class="card" style="margin-top:12px"><h2 style="margin-top:0">⚠ Productos por surtir</h2><ul class="lista">${bajos.slice(0, 8).map(p => `<li data-p="${p.id}"><span>${h(p.nombre)}</span><span class="der rojo-t">${p.stock} / mín. ${p.stockMinimo}</span></li>`).join('')}</ul></div>` : ''}
    <div class="card" style="margin-top:12px">
      <input id="buscar" type="search" placeholder="Buscar producto" value="${h(estado.busqueda)}" aria-label="Buscar producto">
      <label for="cat">Categoría</label><select id="cat"><option value="">Todas</option>${categorias.map(c => `<option value="${c.id}" ${estado.filtroCat === c.id ? 'selected' : ''}>${h(c.nombre)}</option>`).join('')}</select>
      <ul class="lista" style="margin-top:8px">${lista.map(p => `<li data-p="${p.id}"><div><div>${h(p.nombre)}</div>
        <div class="sub">Costo ${C.pesos(p.precioCompra)} · Venta ${C.pesos(p.precioVenta)}</div></div>
        <div class="der ${p.stock <= p.stockMinimo ? 'rojo-t' : ''}">${p.stock} und</div></li>`).join('') || '<li class="vacio">No hay productos. Agregue el primero.</li>'}</ul>
    </div>`;
  $('#buscar').oninput = e => { estado.busqueda = e.target.value; clearTimeout(inventario._t); inventario._t = setTimeout(() => { inventario().then(() => { const b = $('#buscar'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }); }, 250); };
  $('#cat').onchange = e => { estado.filtroCat = e.target.value; inventario(); };
  $('#nuevo').onclick = () => editarProducto(null);
  $('#compra').onclick = () => registrarCompraUI();
  vista.onclick = e => { const li = e.target.closest('[data-p]'); if (li) editarProducto(li.dataset.p); };
}

async function editarProducto(id, nombreSugerido = '') {
  const { productos, categorias } = await datos();
  const p = id ? productos.find(x => x.id === id) : { nombre: nombreSugerido, categoriaId: categorias[0]?.id || '', codigoBarras: '', precioCompra: '', precioVenta: '', stock: 0, stockMinimo: 5, activo: true };
  abrirModal(`<h2>${id ? 'Editar producto' : 'Nuevo producto'}</h2>
    <form id="fp">
      <label for="p-n">Nombre</label><input id="p-n" required value="${h(p.nombre)}">
      <label for="p-c">Categoría</label><select id="p-c">${categorias.map(c => `<option value="${c.id}" ${c.id === p.categoriaId ? 'selected' : ''}>${h(c.nombre)}</option>`).join('')}<option value="__nueva">+ Nueva categoría…</option></select>
      <input id="p-cn" placeholder="Nombre de la nueva categoría" hidden style="margin-top:6px">
      <label for="p-cod">Código de barras (opcional)</label><input id="p-cod" inputmode="numeric" value="${h(p.codigoBarras)}">
      <div class="fila-btn" style="margin-top:0"><div><label for="p-pc">Precio de compra</label><input id="p-pc" inputmode="numeric" required value="${p.precioCompra}"></div>
        <div><label for="p-pv">Precio de venta</label><input id="p-pv" inputmode="numeric" required value="${p.precioVenta}"></div></div>
      <p class="small" id="margen"></p>
      <div class="fila-btn" style="margin-top:0"><div><label for="p-st">${id ? 'Stock (conteo físico)' : 'Stock inicial'}</label><input id="p-st" inputmode="numeric" value="${p.stock}"></div>
        <div><label for="p-min">Stock mínimo</label><input id="p-min" inputmode="numeric" value="${p.stockMinimo}"></div></div>
      <div class="fila-btn"><button type="button" class="btn sec" id="cancelar">Cancelar</button><button class="btn">Guardar</button></div>
      ${id ? '<button type="button" class="btn sec bloque" id="inactivar" style="margin-top:8px">Dejar de vender este producto</button>' : ''}
    </form>`, el => {
    const mg = () => { const pc = num($('#p-pc', el).value), pv = num($('#p-pv', el).value); $('#margen', el).textContent = pv ? `Ganancia por unidad: ${C.pesos(pv - pc)} (${(((pv - pc) / pv) * 100).toFixed(0)} %)` : ''; };
    $('#p-pc', el).oninput = mg; $('#p-pv', el).oninput = mg; mg();
    $('#p-c', el).onchange = e => { $('#p-cn', el).hidden = e.target.value !== '__nueva'; };
    $('#cancelar', el).onclick = cerrarModal;
    if (id) $('#inactivar', el).onclick = async () => { p.activo = false; await DB.guardar('productos', p); cerrarModal(); toast('Producto inactivado'); inventario(); };
    $('#fp', el).onsubmit = async e => {
      e.preventDefault();
      let catId = $('#p-c', el).value;
      if (catId === '__nueva') { const nombre = $('#p-cn', el).value.trim(); if (!nombre) return toast('Escriba el nombre de la categoría'); catId = (await DB.guardar('categorias', { nombre })).id; }
      const nuevoStock = num($('#p-st', el).value);
      Object.assign(p, { nombre: $('#p-n', el).value.trim(), categoriaId: catId, codigoBarras: $('#p-cod', el).value.trim(),
        precioCompra: num($('#p-pc', el).value), precioVenta: num($('#p-pv', el).value), stockMinimo: num($('#p-min', el).value) });
      if (p.precioVenta < p.precioCompra && !(await confirmar('Precio menor al costo', 'El precio de venta es menor que el de compra. ¿Guardar de todas formas?', 'Guardar', 'naranja'))) return editarProducto(id);
      if (id) { const stockAnterior = Number(p.stock); await DB.guardar('productos', p); if (nuevoStock !== stockAnterior) await DB.ajustarStock(id, nuevoStock, 'conteo físico'); }
      else { p.stock = nuevoStock; const nuevo = await DB.guardar('productos', p); if (nuevoStock) await DB.guardar('movimientos', { tipo: 'entrada', productoId: nuevo.id, cantidad: nuevoStock, costo: p.precioCompra, fecha: new Date().toISOString(), referencia: 'stock inicial' }); }
      cerrarModal(); toast('Producto guardado'); router();
    };
  });
}

async function registrarCompraUI() {
  const { productos } = await datos();
  const activos = productos.filter(p => p.activo !== false);
  const lineas = [];
  const pintar = el => {
    $('#lineas', el).innerHTML = lineas.map((l, i) => `<li><div><div>${h(l.nombre)}</div><div class="sub">${l.cantidad} und × ${C.pesos(l.costo)}</div></div><button class="btn sec" data-quitar="${i}" aria-label="Quitar">✕</button></li>`).join('') || '<li class="gris-t">Agregue los productos que compró.</li>';
    $('#tot', el).textContent = C.pesos(lineas.reduce((s, l) => s + l.cantidad * l.costo, 0));
  };
  abrirModal(`<h2>Registrar compra de mercancía</h2>
    <label for="prov">Proveedor (opcional)</label><input id="prov" placeholder="Ej.: distribuidor, Corabastos">
    <label for="cp">Producto</label><select id="cp">${activos.map(p => `<option value="${p.id}">${h(p.nombre)}</option>`).join('')}</select>
    <div class="fila-btn" style="margin-top:0"><div><label for="cc">Cantidad</label><input id="cc" inputmode="numeric" value="1"></div>
      <div><label for="ck">Costo unitario</label><input id="ck" inputmode="numeric"></div></div>
    <button class="btn sec bloque" id="agregar" style="margin-top:8px">Agregar a la compra</button>
    <ul class="lista" id="lineas"></ul><p class="total"><span>Total compra</span><span id="tot">$ 0</span></p>
    <div class="fila-btn"><button class="btn sec" id="cancelar">Cancelar</button><button class="btn" id="ok">Guardar compra</button></div>`, el => {
    const sel = $('#cp', el);
    const setCosto = () => { const p = activos.find(x => x.id === sel.value); $('#ck', el).value = p ? p.precioCompra : ''; };
    sel.onchange = setCosto; setCosto(); pintar(el);
    $('#agregar', el).onclick = () => {
      const p = activos.find(x => x.id === sel.value); const cantidad = num($('#cc', el).value);
      if (!p || cantidad <= 0) return toast('Revise el producto y la cantidad');
      lineas.push({ productoId: p.id, nombre: p.nombre, cantidad, costo: num($('#ck', el).value) }); pintar(el);
    };
    $('#lineas', el).onclick = e => { const b = e.target.closest('[data-quitar]'); if (b) { lineas.splice(+b.dataset.quitar, 1); pintar(el); } };
    $('#cancelar', el).onclick = cerrarModal;
    $('#ok', el).onclick = async () => {
      if (!lineas.length) return toast('Agregue al menos un producto');
      await DB.registrarCompra({ items: lineas, proveedor: $('#prov', el).value.trim() });
      cerrarModal(); toast('Compra registrada. Stock actualizado'); inventario();
    };
  });
}

// ------------------------------------------------------------------ FIADO (RF-07, RF-08, RF-09)
async function fiado() {
  const { clientes, ventas, abonos } = await datos();
  const lista = clientes.map(c => ({ c, e: C.estadoCliente(c.id, ventas, abonos) })).sort((a, b) => b.e.saldo - a.e.saldo);
  const cart = C.carteraPorAntiguedad(clientes, ventas, abonos);
  vista.innerHTML = `<h1>Fiado</h1>
    <div class="kpis"><div class="kpi naranja"><div class="t">Total por cobrar</div><div class="v">${C.pesos(cart.total)}</div></div>
      <div class="kpi"><div class="t">Clientes que deben</div><div class="v">${lista.filter(x => x.e.saldo > 0).length}</div></div>
      <div class="kpi rojo"><div class="t">Más de 30 días</div><div class="v">${C.pesos(cart.tramos['>30'])}</div></div></div>
    <button class="btn bloque" id="nuevo" style="margin-top:12px">+ Nuevo cliente</button>
    <div class="card" style="margin-top:12px"><ul class="lista">${lista.map(({ c, e }) => `<li data-c="${c.id}"><div><div>${h(c.nombre)}</div>
      <div class="sub">${e.saldo > 0 ? `Debe hace ${e.dias} día${e.dias === 1 ? '' : 's'}` : 'Al día'}${c.cupo ? ' · cupo ' + C.pesos(c.cupo) : ''}</div></div>
      <div class="der ${e.dias > 30 ? 'rojo-t' : ''}">${C.pesos(e.saldo)}</div></li>`).join('') || '<li class="vacio">Aún no hay clientes de fiado.</li>'}</ul></div>`;
  $('#nuevo').onclick = () => editarCliente(null);
  vista.onclick = e => { const li = e.target.closest('[data-c]'); if (li) detalleCliente(li.dataset.c); };
}

async function editarCliente(id, alGuardar) {
  const c = id ? await DB.obtener('clientes', id) : { nombre: '', celular: '', cupo: 0, autorizaDatos: false };
  abrirModal(`<h2>${id ? 'Editar cliente' : 'Nuevo cliente de fiado'}</h2>
    <form id="fc"><label for="c-n">Nombre</label><input id="c-n" required value="${h(c.nombre)}">
      <label for="c-cel">Celular (para recordatorios)</label><input id="c-cel" inputmode="tel" value="${h(c.celular)}" placeholder="3001234567">
      <label for="c-cupo">Cupo máximo de fiado (0 = sin límite)</label><input id="c-cupo" inputmode="numeric" value="${c.cupo}">
      <label class="check"><input type="checkbox" id="c-aut" ${c.autorizaDatos ? 'checked' : ''} required><span>El cliente autorizó guardar su nombre y celular para llevar la cuenta del fiado (Ley 1581 de 2012).</span></label>
      <div class="fila-btn"><button type="button" class="btn sec" id="cancelar">Cancelar</button><button class="btn">Guardar</button></div></form>`, el => {
    $('#cancelar', el).onclick = cerrarModal;
    $('#fc', el).onsubmit = async e => {
      e.preventDefault();
      Object.assign(c, { nombre: $('#c-n', el).value.trim(), celular: $('#c-cel', el).value.trim(), cupo: num($('#c-cupo', el).value), autorizaDatos: $('#c-aut', el).checked });
      if (!c.creado) c.creado = new Date().toISOString();
      const g = await DB.guardar('clientes', c); cerrarModal(); toast('Cliente guardado');
      if (alGuardar) alGuardar(g.id); else router();
    };
  });
}

async function detalleCliente(id) {
  const { clientes, ventas, abonos } = await datos();
  const tienda = await DB.config('tienda');
  const c = clientes.find(x => x.id === id);
  const e = C.estadoCliente(id, ventas, abonos);
  const mov = [
    ...ventas.filter(v => v.clienteId === id && v.medioPago === 'fiado' && v.estado !== 'anulada').map(v => ({ f: v.fecha, t: 'Fiado', d: v.items.map(i => `${i.cantidad} ${i.nombre}`).join(', '), v: v.total })),
    ...abonos.filter(a => a.clienteId === id).map(a => ({ f: a.fecha, t: 'Abono', d: a.medioPago, v: -a.valor })),
  ].sort((a, b) => new Date(b.f) - new Date(a.f));
  const tel = C.telefonoWhatsApp(c.celular);
  const wa = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(C.mensajeCobro(tienda.nombre, c, e.saldo))}` : null;
  abrirModal(`<h2>${h(c.nombre)}</h2>
    <div class="kpis"><div class="kpi naranja"><div class="t">Saldo</div><div class="v">${C.pesos(e.saldo)}</div></div>
      <div class="kpi"><div class="t">Antigüedad</div><div class="v">${e.dias} días</div></div></div>
    <p class="small">${c.cupo ? 'Cupo: ' + C.pesos(c.cupo) + ' · ' : ''}Celular: ${h(c.celular || 'no registrado')}</p>
    <div class="fila-btn"><button class="btn verde" id="abonar" ${e.saldo > 0 ? '' : 'disabled'}>Registrar abono</button>
      ${wa ? `<a class="btn wa" href="${wa}" target="_blank" rel="noopener">Recordar por WhatsApp</a>` : '<button class="btn wa" disabled title="Registre un celular válido">WhatsApp</button>'}</div>
    <h2>Movimientos</h2>
    <table class="simple"><tbody>${mov.slice(0, 40).map(m => `<tr><td>${fechaCorta(m.f)}</td><td>${m.t}<div class="small">${h(m.d)}</div></td><td class="der ${m.v < 0 ? 'verde-t' : ''}">${C.pesos(m.v)}</td></tr>`).join('') || '<tr><td>Sin movimientos</td></tr>'}</tbody></table>
    <div class="fila-btn"><button class="btn sec" id="editar">Editar</button><button class="btn sec" id="cerrar">Cerrar</button></div>`, el => {
    $('#cerrar', el).onclick = cerrarModal;
    $('#editar', el).onclick = () => editarCliente(id);
    $('#abonar', el).onclick = () => abonar(c, e.saldo);
  });
}

function abonar(c, saldo) {
  abrirModal(`<h2>Abono de ${h(c.nombre)}</h2><p>Saldo actual: <b>${C.pesos(saldo)}</b></p>
    <label for="av">Valor del abono</label><input id="av" inputmode="numeric" value="${saldo}">
    <label for="am">Medio de pago</label><select id="am"><option value="efectivo">Efectivo</option><option value="transferencia">Nequi / Daviplata / transferencia</option></select>
    <div class="fila-btn"><button class="btn sec" id="cancelar">Cancelar</button><button class="btn verde" id="ok">Guardar abono</button></div>`, el => {
    $('#cancelar', el).onclick = cerrarModal;
    $('#ok', el).onclick = async () => {
      const valor = num($('#av', el).value);
      if (valor <= 0) return toast('Escriba un valor válido');
      if (valor > saldo && !(await confirmar('Abono mayor al saldo', 'El valor supera lo que debe el cliente. Quedará saldo a favor. ¿Continuar?', 'Continuar', 'naranja'))) return abonar(c, saldo);
      await DB.guardar('abonos', { clienteId: c.id, valor, medioPago: $('#am', el).value, fecha: new Date().toISOString() });
      cerrarModal(); toast('Abono registrado'); fiado();
    };
  });
}

// ------------------------------------------------------------------ TABLERO (RF-10, HU-11)
async function tablero() {
  const { productos, clientes, ventas, abonos } = await datos();
  const r = C.rango(estado.periodo);
  const ind = C.indicadoresVentas(ventas, r);
  const serie = C.ventasPorDia(ventas, 7);
  const cart = C.carteraPorAntiguedad(clientes, ventas, abonos);
  const bajos = C.bajoStock(productos);
  const mes = C.indicadoresVentas(ventas, C.rango('mes'));
  const max = Math.max(1, ...serie.map(s => s.total));
  const W = 320, H = 150, bw = W / 7;
  const svg = `<svg viewBox="0 0 ${W} ${H + 34}" role="img" aria-label="Ventas de los últimos 7 días">
    ${serie.map((s, i) => { const bh = (s.total / max) * H; return `<rect x="${i * bw + 6}" y="${H - bh + 14}" width="${bw - 12}" height="${bh}" rx="4" fill="${i === 6 ? '#2F5597' : '#8EA9DB'}"><title>${C.pesos(s.total)}</title></rect>
      <text x="${i * bw + bw / 2}" y="${H + 30}" font-size="10" text-anchor="middle" fill="#595959">${s.fecha.toLocaleDateString('es-CO', { weekday: 'short' })}</text>
      <text x="${i * bw + bw / 2}" y="${H - bh + 10}" font-size="8.5" text-anchor="middle" fill="#1F1F1F">${s.total ? Math.round(s.total / 1000) + 'k' : ''}</text>`; }).join('')}</svg>`;
  const medios = [['efectivo', 'Efectivo', '#3E8E2F'], ['transferencia', 'Nequi / transferencia', '#2F5597'], ['fiado', 'Fiado', '#C55A11']];
  const nombrePeriodo = { hoy: 'hoy', semana: 'últimos 7 días', mes: 'últimos 30 días' }[estado.periodo];
  vista.innerHTML = `<h1>Tablero de mi tienda</h1>
    <div class="periodos">${['hoy', 'semana', 'mes'].map(p => `<button data-per="${p}" class="${estado.periodo === p ? 'on' : ''}">${{ hoy: 'Hoy', semana: '7 días', mes: '30 días' }[p]}</button>`).join('')}</div>
    <div class="kpis">
      <div class="kpi"><div class="t">Ventas (${nombrePeriodo})</div><div class="v">${C.pesos(ind.ventas)}</div></div>
      <div class="kpi verde"><div class="t">Ganancia bruta</div><div class="v">${C.pesos(ind.utilidad)}</div></div>
      <div class="kpi verde"><div class="t">Margen</div><div class="v">${ind.margen.toFixed(1)} %</div></div>
      <div class="kpi"><div class="t">Número de ventas</div><div class="v">${ind.numeroVentas}</div></div>
      <div class="kpi"><div class="t">Venta promedio</div><div class="v">${C.pesos(ind.ticketPromedio)}</div></div>
      <div class="kpi naranja"><div class="t">Fiado por cobrar</div><div class="v">${C.pesos(cart.total)}</div></div>
    </div>
    <div class="card grafico" style="margin-top:12px"><h2 style="margin-top:0">Ventas de los últimos 7 días</h2>${svg}</div>
    <div class="card"><h2 style="margin-top:0">¿Cómo me pagan? (${nombrePeriodo})</h2>
      ${medios.map(([k, n, col]) => { const v = ind.porMedio[k] || 0; const pct = ind.ventas ? (v / ind.ventas) * 100 : 0;
        return `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between"><span>${n}</span><b>${C.pesos(v)} · ${pct.toFixed(0)} %</b></div><div class="barra"><span style="width:${pct}%;background:${col}"></span></div></div>`; }).join('')}</div>
    <div class="card"><h2 style="margin-top:0">Lo que más se vende (${nombrePeriodo})</h2>
      <table class="simple"><thead><tr><th>Producto</th><th class="der">Und.</th><th class="der">Ganancia</th></tr></thead><tbody>
      ${ind.top.slice(0, 10).map(t => `<tr><td>${h(t.nombre)}</td><td class="der">${t.unidades}</td><td class="der">${C.pesos(t.utilidad)}</td></tr>`).join('') || '<tr><td colspan="3" class="gris-t">Sin ventas en el periodo</td></tr>'}</tbody></table></div>
    <div class="card"><h2 style="margin-top:0">Fiado por antigüedad</h2>
      ${[['0-15', '0 a 15 días', '#3E8E2F'], ['16-30', '16 a 30 días', '#BF9000'], ['>30', 'Más de 30 días', '#C00000']].map(([k, n, col]) => { const pct = cart.total ? (cart.tramos[k] / cart.total) * 100 : 0;
        return `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between"><span>${n}</span><b>${C.pesos(cart.tramos[k])}</b></div><div class="barra"><span style="width:${pct}%;background:${col}"></span></div></div>`; }).join('')}</div>
    <div class="card"><h2 style="margin-top:0">Por surtir y rotación (30 días)</h2>
      <table class="simple"><thead><tr><th>Producto</th><th class="der">Stock</th><th class="der">Días de inventario</th></tr></thead><tbody>
      ${bajos.slice(0, 8).map(p => { const u = (mes.top.find(t => t.productoId === p.id) || { unidades: 0 }).unidades; const r2 = C.rotacion(p, u);
        return `<tr><td>${h(p.nombre)}</td><td class="der rojo-t">${p.stock}</td><td class="der">${isFinite(r2.diasInventario) ? r2.diasInventario.toFixed(1) : '—'}</td></tr>`; }).join('') || '<tr><td colspan="3" class="verde-t">Todo el inventario está sobre el mínimo</td></tr>'}</tbody></table></div>`;
  vista.onclick = e => { const b = e.target.closest('[data-per]'); if (b) { estado.periodo = b.dataset.per; tablero(); } };
}

// ------------------------------------------------------------------ MÁS: cierre, reportes, respaldo
async function mas() {
  const tienda = await DB.config('tienda');
  const nVentas = (await DB.todos('ventas')).length;
  vista.innerHTML = `<h1>Más opciones</h1>
    <div class="card"><h2 style="margin-top:0">Caja</h2><div class="fila-btn" style="margin-top:0"><button class="btn" id="cierre">Cierre de caja de hoy</button><button class="btn sec" id="hist">Ventas recientes</button></div></div>
    <div class="card"><h2 style="margin-top:0">Reportes (Excel / CSV)</h2><div class="fila-btn" style="margin-top:0">
      <button class="btn sec" data-csv="ventas">Ventas</button><button class="btn sec" data-csv="inventario">Inventario</button><button class="btn sec" data-csv="cartera">Fiado</button></div></div>
    <div class="card"><h2 style="margin-top:0">Respaldo de la información</h2><p class="small">Guarde una copia de sus datos y restáurela en otro celular.</p>
      <div class="fila-btn" style="margin-top:0"><button class="btn sec" id="exp">Descargar respaldo</button><label class="btn sec" style="margin:0">Restaurar respaldo<input type="file" id="imp" accept="application/json" hidden></label></div></div>
    <div class="card"><h2 style="margin-top:0">Mi tienda</h2><p>${h(tienda.nombre)} · ${h(tienda.dueno)}<br><span class="small">${h(tienda.direccion)} ${h(tienda.localidad)} · ${nVentas} ventas registradas</span></p>
      <div class="fila-btn" style="margin-top:0"><button class="btn sec" id="pol">Política de datos</button><button class="btn sec" id="instalar" hidden>Instalar en el celular</button></div></div>
    <div class="card"><h2 style="margin-top:0">Demostración y pruebas</h2><p class="small">Carga una tienda con 60 productos, 25 clientes y 8 semanas de ventas simuladas (entorno de validación TRL 5).</p>
      <div class="fila-btn" style="margin-top:0"><button class="btn gris" id="demo">Cargar datos de demostración</button><button class="btn rojo" id="borrar">Borrar todos los datos</button></div></div>
    <p class="small" style="text-align:center">TiendaClara v1.0 · Proyecto de grado UNAD · Funciona sin internet</p>`;
  $('#cierre').onclick = cierreCaja;
  $('#hist').onclick = ventasRecientes;
  $('#exp').onclick = async () => { descargar(`respaldo-tiendaclara-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await DB.exportarTodo()), 'application/json'); toast('Respaldo descargado'); };
  $('#imp').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!(await confirmar('Restaurar respaldo', 'Se reemplazarán todos los datos actuales por los del archivo.', 'Restaurar'))) return;
    try { await DB.importarTodo(JSON.parse(await f.text())); toast('Respaldo restaurado'); router(); } catch (err) { toast(err.message); }
  };
  $('#pol').onclick = politica;
  vista.onclick = e => { const b = e.target.closest('[data-csv]'); if (b) exportarCSV(b.dataset.csv); };
  $('#demo').onclick = async () => { if (await confirmar('Cargar demostración', 'Se borrarán los datos actuales y se cargará una tienda de ejemplo.', 'Cargar')) cargarDemo(false); };
  $('#borrar').onclick = async () => { if (await confirmar('Borrar todo', 'Se eliminará toda la información de la tienda en este dispositivo. Esta acción no se puede deshacer.', 'Borrar todo')) { await DB.borrarTodo(); sessionStorage.clear(); location.hash = ''; router(); } };
  if (window._instalar) { $('#instalar').hidden = false; $('#instalar').onclick = () => window._instalar.prompt(); }
}

async function cierreCaja() {
  const { ventas, abonos } = await datos();
  const hoy = new Date().toISOString().slice(0, 10);
  const previo = (await DB.todos('cierres')).find(c => c.fecha === hoy);
  const base = previo ? previo.base : 0;
  abrirModal(`<h2>Cierre de caja · ${new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
    <label for="cb">Base de caja (dinero con el que abrió)</label><input id="cb" inputmode="numeric" value="${base}">
    <table class="simple" id="tc"></table>
    <label for="ce">Efectivo contado en la caja</label><input id="ce" inputmode="numeric" value="${previo ? previo.efectivoContado : ''}" placeholder="Cuente y escriba el valor">
    <p class="total"><span>Diferencia</span><span id="dif">—</span></p>
    <div class="fila-btn"><button class="btn sec" id="cancelar">Cerrar</button><button class="btn" id="ok">Guardar cierre</button></div>`, el => {
    const calc = () => {
      const ec = $('#ce', el).value === '' ? null : num($('#ce', el).value);
      const r = C.cierreDelDia(ventas, abonos, new Date(), ec, num($('#cb', el).value));
      $('#tc', el).innerHTML = `<tr><td>Ventas en efectivo</td><td class="der">${C.pesos(r.ventasEfectivo)}</td></tr>
        <tr><td>Abonos en efectivo</td><td class="der">${C.pesos(r.abonosEfectivo)}</td></tr>
        <tr><td>Ventas Nequi / transferencia</td><td class="der">${C.pesos(r.ventasDigital)}</td></tr>
        <tr><td>Ventas fiadas</td><td class="der">${C.pesos(r.ventasFiado)}</td></tr>
        <tr><td><b>Total vendido hoy</b></td><td class="der"><b>${C.pesos(r.totalVentas)}</b></td></tr>
        <tr><td><b>Efectivo que debe haber</b></td><td class="der"><b>${C.pesos(r.efectivoEsperado)}</b></td></tr>`;
      $('#dif', el).textContent = r.diferencia === null ? '—' : (r.diferencia === 0 ? 'Cuadra ✔' : (r.diferencia > 0 ? 'Sobran ' : 'Faltan ') + C.pesos(Math.abs(r.diferencia)));
      $('#dif', el).className = r.diferencia === null ? '' : r.diferencia === 0 ? 'verde-t' : 'rojo-t';
      return r;
    };
    calc(); $('#ce', el).oninput = calc; $('#cb', el).oninput = calc;
    $('#cancelar', el).onclick = cerrarModal;
    $('#ok', el).onclick = async () => {
      const r = calc(); if (r.diferencia === null) return toast('Escriba el efectivo contado');
      await DB.guardar('cierres', { id: previo?.id, fecha: hoy, base: num($('#cb', el).value), efectivoContado: num($('#ce', el).value), ...r });
      cerrarModal(); toast('Cierre de caja guardado');
    };
  });
}

async function ventasRecientes() {
  const { ventas, clientes } = await datos();
  const vs = ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 40);
  abrirModal(`<h2>Ventas recientes</h2><table class="simple"><tbody>${vs.map(v => `<tr><td>${fechaHora(v.fecha)}<div class="small">${h(v.items.map(i => i.cantidad + ' ' + i.nombre).join(', '))}</div>
      <span class="tag ${v.medioPago === 'fiado' ? 'naranja' : v.medioPago === 'efectivo' ? 'verde' : ''}">${v.medioPago}${v.clienteId ? ' · ' + h(clientes.find(c => c.id === v.clienteId)?.nombre || '') : ''}</span>${v.estado === 'anulada' ? ' <span class="tag rojo">anulada</span>' : ''}</td>
      <td class="der">${C.pesos(v.total)}${v.estado !== 'anulada' ? `<br><button class="btn sec" data-anular="${v.id}" style="min-height:36px;padding:4px 10px;margin-top:4px">Anular</button>` : ''}</td></tr>`).join('') || '<tr><td>Sin ventas</td></tr>'}</tbody></table>
    <button class="btn bloque" id="cerrar" style="margin-top:10px">Cerrar</button>`, el => {
    $('#cerrar', el).onclick = cerrarModal;
    el.onclick = async e => { const b = e.target.closest('[data-anular]'); if (b && await confirmar('Anular venta', 'La venta se anulará y las unidades volverán al inventario.', 'Anular')) { await DB.anularVenta(b.dataset.anular); toast('Venta anulada'); ventasRecientes(); } };
  });
}

async function exportarCSV(tipo) {
  const { productos, categorias, clientes, ventas, abonos } = await datos();
  const hoy = new Date().toISOString().slice(0, 10);
  let csv;
  if (tipo === 'ventas') {
    const filas = ventas.flatMap(v => v.items.map(i => ({ ...i, fecha: v.fecha, medio: v.medioPago, estado: v.estado, cliente: clientes.find(c => c.id === v.clienteId)?.nombre || '', venta: v.id })));
    csv = C.aCSV(filas, [{ titulo: 'Fecha', valor: f => new Date(f.fecha).toLocaleString('es-CO') }, { titulo: 'Venta', valor: 'venta' }, { titulo: 'Producto', valor: 'nombre' },
      { titulo: 'Cantidad', valor: 'cantidad' }, { titulo: 'Precio', valor: 'precio' }, { titulo: 'Costo', valor: 'costo' }, { titulo: 'Subtotal', valor: f => f.cantidad * f.precio },
      { titulo: 'Ganancia', valor: f => (f.precio - f.costo) * f.cantidad }, { titulo: 'Medio de pago', valor: 'medio' }, { titulo: 'Cliente', valor: 'cliente' }, { titulo: 'Estado', valor: 'estado' }]);
  } else if (tipo === 'inventario') {
    csv = C.aCSV(productos, [{ titulo: 'Producto', valor: 'nombre' }, { titulo: 'Categoría', valor: p => categorias.find(c => c.id === p.categoriaId)?.nombre || '' },
      { titulo: 'Código', valor: 'codigoBarras' }, { titulo: 'Costo', valor: 'precioCompra' }, { titulo: 'Precio', valor: 'precioVenta' }, { titulo: 'Stock', valor: 'stock' },
      { titulo: 'Stock mínimo', valor: 'stockMinimo' }, { titulo: 'Valor inventario', valor: p => Math.max(0, p.stock) * p.precioCompra }, { titulo: 'Activo', valor: p => p.activo === false ? 'No' : 'Sí' }]);
  } else {
    const filas = clientes.map(c => ({ c, e: C.estadoCliente(c.id, ventas, abonos) }));
    csv = C.aCSV(filas, [{ titulo: 'Cliente', valor: f => f.c.nombre }, { titulo: 'Celular', valor: f => f.c.celular }, { titulo: 'Cupo', valor: f => f.c.cupo },
      { titulo: 'Total fiado', valor: f => f.e.totalFiado }, { titulo: 'Saldo', valor: f => f.e.saldo }, { titulo: 'Días de la deuda más antigua', valor: f => f.e.dias }]);
  }
  descargar(`tiendaclara-${tipo}-${hoy}.csv`, csv, 'text/csv;charset=utf-8');
  toast('Reporte descargado');
}

async function cargarDemo(desdeBienvenida) {
  toast('Generando tienda de demostración…');
  const d = generarDemo();
  await DB.importarTodo({ app: 'TiendaClara', ...d, config: [
    { clave: 'tienda', valor: { nombre: 'Tienda La Esquina (demo)', dueno: 'Tendero de prueba', celular: '3001234567', direccion: 'Barrio de prueba', localidad: 'San Cristóbal', aceptaPolitica: true, creada: new Date().toISOString(), demo: true } },
  ], cierres: [] });
  sessionStorage.setItem('tc-ok', '1');
  location.hash = '#/tablero'; await router();
  toast(`Demo cargada: ${d.productos.length} productos, ${d.ventas.length} ventas`);
  if (desdeBienvenida) $('.tabbar').hidden = false;
}

// ------------------------------------------------------------------ arranque
addEventListener('beforeinstallprompt', e => { e.preventDefault(); window._instalar = e; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
(async () => {
  redEstado();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if (await DB.config('tienda')) await pedirPin();
  router();
})();

// Exponer para pruebas automatizadas
window.TiendaClara = { DB, C };
