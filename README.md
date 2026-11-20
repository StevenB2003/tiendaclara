# TiendaClara 🏪

**Aplicación web progresiva (PWA) para la gestión de inventario, ventas y fiado con analítica descriptiva en tiendas de barrio de la localidad de San Cristóbal, Bogotá.**

Proyecto de Grado — Ingeniería de Sistemas, Universidad Nacional Abierta y a Distancia (UNAD), ECBTI.
Autor: **David Steven Buitrago Yate** · Curso 202016907, grupo 202016907_88 · Tutor: César Felipe Henao Villa.
Línea de investigación: Desarrollo de software · ODS 8 (meta 8.3) · Nivel de madurez tecnológica objetivo: **TRL 5**.

## ¿Qué hace?

| Módulo | Funciones |
|---|---|
| 🛒 Vender | Búsqueda o código de barras, productos frecuentes, carrito, pago en efectivo (con cálculo de cambio), Nequi/Daviplata o fiado; deshacer venta |
| 📦 Inventario | Productos y categorías, compras a proveedor, ajustes por conteo físico, alertas de stock mínimo, valor del inventario |
| 📒 Fiado | Clientes con cupo, saldo y antigüedad de la deuda, abonos, recordatorio de cobro por WhatsApp |
| 📊 Tablero | Ventas, ganancia bruta, margen, venta promedio, medios de pago, top de productos, cartera por antigüedad, días de inventario |
| ☰ Más | Cierre de caja, ventas recientes y anulación, reportes CSV para Excel, respaldo y restauración, datos de demostración |

- **Funciona sin internet**: los datos se guardan en el celular (IndexedDB) y la app queda en caché (service worker).
- **Instalable** en la pantalla de inicio del celular, sin tiendas de aplicaciones.
- **Sin costo**: sin servidores ni licencias; HTML, CSS y JavaScript sin dependencias.
- **Privacidad** (Ley 1581 de 2012): la información no sale del dispositivo salvo que el tendero la exporte.

## Uso

Abra la versión publicada en GitHub Pages desde Chrome (Android) o Safari (iPhone) y elija **"Agregar a la pantalla de inicio"**.
Para probar sin registrar datos propios: en la pantalla de bienvenida toque **"Cargar una tienda de demostración"** (60 productos, 25 clientes y 8 semanas de ventas simuladas).

Ejecución local:

```bash
python -m http.server 8080      # luego abra http://localhost:8080
```

## Pruebas

```bash
node --test tests/*.test.js     # 12 casos de prueba de cálculos (CP-01 a CP-12)
```

## Estructura

```
index.html              Interfaz (shell de la PWA)
manifest.webmanifest    Metadatos de instalación
sw.js                   Service worker (caché offline)
css/styles.css          Estilos accesibles (botones ≥ 48 px, alto contraste)
js/app.js               Vistas y lógica de interacción
js/db.js                Capa de datos IndexedDB con transacciones
js/calc.js              Cálculos puros: indicadores, fiado, cierre, CSV, SUS
js/demo.js              Generador de la tienda de demostración (entorno TRL 5)
tests/calc.test.js      Pruebas unitarias
docs/                   Documentación del proyecto (backlog, pruebas)
```

## Metodología

Desarrollado con **Scrum** adaptado a un equipo de una persona (sprints de dos semanas, tablero Kanban en GitHub Projects). Ver `docs/`.

## Licencia

MIT © 2026 David Steven Buitrago Yate
