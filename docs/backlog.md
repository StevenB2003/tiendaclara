# Product backlog y sprints - TiendaClara

| ID | Historia de usuario | Prioridad | Puntos | Sprint | Estado |
|---|---|---|---|---|---|
| HU-01 | Como tendero, quiero crear mi cuenta y registrar mi tienda para empezar a usar la aplicación. | Must | 3 | S1 | Hecho |
| HU-02 | Como tendero, quiero registrar mis productos con su costo y su precio para controlar mi inventario. | Must | 5 | S1 | Hecho |
| HU-03 | Como tendero, quiero registrar la mercancía que compro para que el stock se actualice solo. | Must | 5 | S1 | Hecho |
| HU-04 | Como tendero, quiero registrar una venta en pocos toques para no demorar al cliente. | Must | 8 | S2 | Hecho |
| HU-05 | Como tendero, quiero indicar si la venta fue en efectivo, por transferencia o fiada para cuadrar la caja. | Must | 3 | S2 | Hecho |
| HU-06 | Como tendero, quiero hacer el cierre de caja del día para saber si me falta o me sobra plata. | Should | 5 | S2 | Hecho |
| HU-07 | Como tendero, quiero registrar a mis clientes de fiado con un cupo para no fiar de más. | Must | 3 | S3 | Hecho |
| HU-08 | Como tendero, quiero ver cuánto me debe cada cliente y desde cuándo para cobrar a tiempo. | Must | 5 | S3 | Hecho |
| HU-09 | Como tendero, quiero registrar los abonos de mis clientes para mantener el saldo al día. | Must | 3 | S3 | Hecho |
| HU-10 | Como tendero, quiero enviar un recordatorio de cobro por WhatsApp para cobrar sin incomodidad. | Should | 2 | S3 | Hecho |
| HU-11 | Como tendero, quiero ver cuánto vendo y cuánto gano por día, semana y mes para tomar decisiones. | Must | 8 | S4 | Hecho |
| HU-12 | Como tendero, quiero que la aplicación me avise qué productos se están acabando para surtir a tiempo. | Should | 3 | S4 | Hecho |
| HU-13 | Como tendero, quiero seguir vendiendo aunque se vaya el internet para no perder registros. | Must | 8 | S4 | Hecho |
| HU-14 | Como tendero, quiero descargar mis ventas e inventario para compartirlos con mi contador o proveedor. | Could | 2 | S4 | Hecho |

## Sprints

| Sprint | Historias | Incremento |
|---|---|---|
| Sprint 0 | Configurar repositorio, CI y despliegue; definir arquitectura, modelo de datos y wireframes; preparar datos de prueba. | Entorno operativo y diseño aprobado |
| Sprint 1 | HU-01, HU-02, HU-03 | Autenticación, tienda, productos e inventario |
| Sprint 2 | HU-04, HU-05, HU-06 | Ventas y cierre de caja |
| Sprint 3 | HU-07, HU-08, HU-09, HU-10 | Fiado, abonos y recordatorios |
| Sprint 4 | HU-11, HU-12, HU-13, HU-14 | Tablero, alertas, modo sin conexión y exportación |

## Requerimientos funcionales

| Código | Nombre | Descripción |
|---|---|---|
| RF-01 | Registro e inicio de sesión | El sistema debe permitir al tendero crear una cuenta con correo o celular y contraseña, e iniciar y cerrar sesión. |
| RF-02 | Configuración de la tienda | El sistema debe permitir registrar el nombre, la dirección y la localidad de la tienda, y aceptar la política de tratamiento de datos. |
| RF-03 | Gestión de productos | El sistema debe permitir crear, consultar, editar e inactivar productos con nombre, categoría, código de barras opcional, precio de compra, precio de venta y stock mínimo. |
| RF-04 | Entradas de inventario | El sistema debe registrar compras de mercancía y aumentar el stock de cada producto, guardando su costo unitario. |
| RF-05 | Registro de ventas | El sistema debe registrar ventas de uno o varios productos con medio de pago (efectivo, transferencia o fiado) y descontar el stock. |
| RF-06 | Alertas de stock | El sistema debe mostrar los productos cuyo stock sea menor o igual al stock mínimo. |
| RF-07 | Gestión de clientes de fiado | El sistema debe registrar clientes con nombre, celular, cupo máximo y autorización de tratamiento de datos. |
| RF-08 | Fiado y abonos | El sistema debe registrar ventas a fiado y abonos, y calcular el saldo y la antigüedad de la deuda de cada cliente. |
| RF-09 | Recordatorio de cobro | El sistema debe generar un mensaje de WhatsApp prellenado con el saldo del cliente. |
| RF-10 | Tablero de indicadores | El sistema debe mostrar ventas, utilidad bruta, ticket promedio, productos más vendidos, rotación y cartera por periodo (día, semana, mes). |
| RF-11 | Cierre de caja | El sistema debe consolidar las ventas del día por medio de pago y registrar la diferencia con el efectivo contado. |
| RF-12 | Exportación de reportes | El sistema debe exportar ventas, inventario y cartera en formato CSV. |
| RF-13 | Operación sin conexión | El sistema debe permitir registrar ventas, compras y abonos sin internet y sincronizarlos al recuperar la conexión. |
