import type { Guide } from "../types";

// Aplicación web de administración (apps/web), para administradores y gerentes de marina.
export const web: Record<string, Guide> = {
  "w.login": {
    title: "Iniciar sesión",
    summary: "Inicia sesión en la aplicación web de Marina para gestionar tus marinas, amarres, reservas, personal y facturación.",
    who: "Administradores de la empresa y gerentes de marina. El personal del muelle usa la app Marina del teléfono.",
    sections: [
      {
        heading: "Iniciar sesión",
        steps: [
          "Escribe tu correo de trabajo y tu contraseña.",
          "Marca Recordarme en tu propio ordenador para no tener que volver a entrar. Déjalo sin marcar en un ordenador compartido.",
          "Selecciona Iniciar sesión. Irás a la página que querías abrir, o al Resumen.",
        ],
        points: ["Usa el botón del ojo para mostrar u ocultar la contraseña mientras escribes.", "Si ves «Ese correo y esa contraseña no coinciden», revisa si hay errores de escritura y vuelve a intentarlo."],
      },
      {
        heading: "Si olvidaste tu contraseña",
        steps: ["Selecciona ¿Olvidaste tu contraseña? debajo de la contraseña.", "Escribe tu correo de trabajo y selecciona Enviar enlace.", "Abre el correo y sigue el enlace antes de 30 minutos para elegir una contraseña nueva."],
      },
      {
        heading: "Crear una cuenta",
        text: "Selecciona Crear una cuenta para probar el panel completo con datos de ejemplo. Escribe tu nombre, tu correo de trabajo, la empresa (opcional) y una contraseña de al menos 8 caracteres. Tu cuenta y los cambios que hagas se guardan en este navegador.",
      },
      {
        heading: "Conviene saber",
        points: [
          "Al personal que entra aquí se le pide usar la app del teléfono, pensada para el trabajo en el muelle.",
          "Lo que ves depende de tu rol. Los administradores ven todas las marinas; los gerentes, solo las suyas.",
          "Cambia el idioma con el botón de idioma de la parte superior después de iniciar sesión.",
        ],
      },
    ],
  },

  "w.overview": {
    title: "Resumen global",
    summary: "Una página con el estado de todas las marinas que gestionas: lo llenas que están, el dinero reservado este mes y lo que necesita tu atención hoy.",
    who: "Administradores (todas las marinas) y gerentes (sus marinas).",
    sections: [
      {
        heading: "Las cifras de arriba",
        points: [
          "Marinas: cuántas marinas puedes ver.",
          "Amarres ocupados hoy: amarres con una embarcación confirmada o registrada hoy, sobre el total. La línea pequeña indica los libres, reservados y en reparación.",
          "Ingresos reservados este mes: el precio de cada estancia confirmada, registrada o completada, contando solo las noches de este mes.",
          "Tasa de ocupación: amarres ocupados hoy dividido entre todos los amarres, comparada con hace 30 días.",
          "Pasa el ratón o toca la ⓘ junto a una cifra para ver exactamente cómo se calcula.",
        ],
      },
      {
        heading: "Gráficos y clasificaciones",
        points: [
          "Ingresos muestra los últimos meses; el mes actual incluye estancias confirmadas para más adelante en el mes.",
          "Ocupación muestra las noches de amarre reservadas en esos mismos meses.",
          "Amarres hoy es un anillo con los amarres ocupados, reservados, libres y en reparación. Selecciona Ver todo para abrir Amarres.",
          "Las marinas se ordenan por ingresos reservados este mes. Selecciona una marina para abrir su página.",
        ],
      },
      {
        heading: "Hoy y lo que necesita atención",
        points: [
          "Hoy muestra llegadas, salidas, reservas pendientes de aprobación y órdenes de trabajo abiertas. Cada una abre la lista filtrada correspondiente.",
          "Lo que necesita atención reúne lo que hay que resolver, como reservas por aprobar, facturas vencidas y reparaciones urgentes.",
          "Actividad reciente muestra los últimos cambios. Selecciona Registro de auditoría para ver el historial completo.",
        ],
      },
      {
        heading: "Qué puedes hacer aquí",
        steps: [
          "Selecciona Nueva reserva para reservar un amarre (teclado: N).",
          "Selecciona Añadir marina para crear una marina (administradores).",
          "Selecciona Exportar CSV o Descargar informe mensual para obtener una hoja con ingresos, ocupación y amarres de cada marina.",
          "Selecciona Ver informes para abrir Informes.",
        ],
      },
      {
        heading: "Consejos",
        points: [
          "Usa el buscador (pulsa /) para encontrar marinas, reservas, propietarios y personal, y la campana para las notificaciones, en la parte superior de cada página.",
          "Pulsa ? para ver todos los atajos de teclado, como G y después B para ir a Reservas.",
          "Después de la mayoría de las acciones aparece un mensaje con Deshacer, por si cambias de opinión.",
        ],
      },
    ],
  },

  "w.county": {
    title: "Panel del condado",
    summary: "Las mismas cifras que el Resumen global, para un condado y sus ciudades y marinas.",
    who: "Administradores, y gerentes con marinas en más de un lugar.",
    sections: [
      {
        heading: "Elige un condado",
        steps: ["Usa Elegir condado en la parte superior para cambiar de condado.", "Las cifras, gráficos y listas de abajo se actualizan solo para ese condado."],
      },
      {
        heading: "Lo que ves",
        points: [
          "Amarres ocupados hoy, ingresos reservados este mes y tasa de ocupación del condado.",
          "Las ciudades del condado con sus cifras. Selecciona una ciudad para abrir su panel.",
          "Las marinas del condado ordenadas por ingresos de este mes. Selecciona una para abrir su página.",
          "Gráficos de ingresos y ocupación de los últimos meses.",
        ],
      },
      {
        heading: "Conviene saber",
        points: ["Si ves «Aún no tienes acceso a ningún condado», pide a un administrador que te asigne marinas.", "Los gerentes con una sola marina no ven esta página; su Resumen ya muestra esa marina."],
      },
    ],
  },

  "w.city": {
    title: "Panel de la ciudad",
    summary: "Las cifras de una ciudad: sus marinas, lo llenas que están y el dinero reservado este mes.",
    who: "Administradores y gerentes con marinas en esa ciudad.",
    sections: [
      {
        heading: "Elige una ciudad",
        steps: ["Usa Elegir ciudad en la parte superior para cambiar de ciudad.", "Todo lo de abajo muestra solo esa ciudad."],
      },
      {
        heading: "Lo que ves",
        points: [
          "Amarres ocupados hoy, ingresos reservados este mes y tasa de ocupación.",
          "Las marinas de la ciudad ordenadas por ingresos. Selecciona una marina para abrir su página.",
          "Ingresos y ocupación de los últimos meses, y las llegadas, salidas y aprobaciones de hoy.",
        ],
      },
      { heading: "Consejo", text: "Desde el mapa de Ubicaciones, selecciona el marcador de una marina y después Abrir panel de la ciudad para llegar directamente aquí." },
    ],
  },

  "w.marinas": {
    title: "Marinas",
    summary: "Todas las marinas que gestionas, en lista o en un mapa, con la ocupación de hoy y los ingresos de este mes.",
    who: "Los administradores añaden y eliminan marinas; los gerentes pueden ver y editar las suyas.",
    sections: [
      {
        heading: "Encontrar una marina",
        points: [
          "Busca por marina o ciudad, o filtra por ciudad.",
          "Cambia entre Lista y Mapa. En el mapa, las marinas cercanas se agrupan en un marcador con número; selecciónalo para acercar.",
          "Selecciona un marcador para ver la ocupación y los ingresos, y después el nombre de la marina para abrirla.",
          "Ordena la lista por nombre, ubicación, ocupación o ingresos seleccionando el título de una columna.",
        ],
      },
      {
        heading: "Añadir una marina (administradores)",
        steps: [
          "Selecciona Añadir marina.",
          "Escribe el nombre, la ciudad, el estado, la dirección, el teléfono y el correo de la oficina.",
          "Indica la ubicación: haz clic en el mapa donde está la marina o escribe la latitud y la longitud. Si lo dejas vacío, se usa el centro de la ciudad.",
          "Elige los servicios y selecciona Añadir marina.",
        ],
      },
      {
        heading: "Editar o cerrar una marina",
        points: [
          "Selecciona el lápiz para editar los datos, los servicios o la posición en el mapa.",
          "Los administradores pueden eliminar una marina sin amarres. Una marina con amarres pasa a Inactiva, para conservar su historial.",
          "Una marina inactiva no acepta reservas nuevas; las embarcaciones ya reservadas pueden llegar igualmente.",
        ],
      },
    ],
  },

  "w.marina": {
    title: "Página de la marina",
    summary: "Todo sobre una marina: las cifras de hoy, amarres, reservas, personal, datos de contacto y ubicación.",
    who: "Administradores y los gerentes de la marina.",
    sections: [
      {
        heading: "Lo que ves",
        points: [
          "Amarres ocupados, tasa de ocupación, ingresos de este mes y reservas pendientes de aprobación. Cada tarjeta abre la lista correspondiente.",
          "Datos: dirección, teléfono, correo, servicios y estado, con un mapa y Cómo llegar (abre Google Maps).",
          "Ingresos de los últimos meses, reservas actuales y próximas, y el personal que trabaja aquí con sus turnos.",
          "Estado de los amarres: selecciona cualquier amarre para ver quién está y qué hay reservado después.",
        ],
      },
      {
        heading: "Qué puedes hacer",
        steps: ["Selecciona Editar para cambiar los datos o la posición de la marina.", "Selecciona Nueva reserva para reservar un amarre en esta marina.", "Selecciona una reserva para abrirla."],
      },
    ],
  },

  "w.berths": {
    title: "Amarres",
    summary: "Todos los amarres con su tamaño, tipo, precios y estado de hoy, además de un plano del muelle, lecturas de contadores y etiquetas QR para imprimir.",
    who: "Administradores y gerentes. El personal con Solo lectura puede mirar pero no cambiar nada.",
    sections: [
      {
        heading: "Las tres vistas",
        points: [
          "Lista: cada amarre con tamaño y tipo, estado, precios y la embarcación actual o la siguiente. Busca por amarre, embarcación o marina y filtra por marina o estado.",
          "Plano del muelle: los amarres dibujados por pantalán, con colores según el estado. Selecciona un amarre para abrirlo.",
          "Contadores: lecturas de luz y agua de los amarres que tienen contador.",
        ],
      },
      {
        heading: "Añadir o editar un amarre",
        steps: [
          "Selecciona Añadir amarre (o el lápiz de un amarre).",
          "Elige la marina y escribe el número del amarre como letra del pantalán y número, por ejemplo A-12.",
          "Escribe la eslora máxima que admite, el tipo (flotante, fijo o fondeo), la tarifa diaria y la mensual (para estancias de 28 noches o más).",
          "Marca toma de corriente y agua dulce si el amarre las tiene, y guarda.",
        ],
      },
      {
        heading: "Dejar un amarre fuera de servicio",
        points: [
          "Selecciona la llave inglesa para marcar un amarre en mantenimiento; selecciónala otra vez para volver a ponerlo en servicio.",
          "Un amarre ocupado no puede quedar fuera de servicio: primero mueve la embarcación.",
          "Un amarre con historial de reservas no se puede eliminar. Déjalo fuera de servicio.",
        ],
      },
      {
        heading: "Lecturas de contadores",
        steps: [
          "Abre Contadores y selecciona Registrar lectura en un amarre.",
          "Escribe el número que marca el contador de luz y/o de agua.",
          "Guarda. El consumo desde la última lectura se añade a la factura de la embarcación del amarre, con las tarifas de Ajustes › Precios. Si no hay embarcación, la lectura solo fija el punto de partida.",
        ],
      },
      {
        heading: "Etiquetas QR",
        text: "Selecciona Etiquetas QR, elige una marina e imprime. Coloca una etiqueta en el poste de cada amarre. El personal la escanea con la app Marina del teléfono para abrir ese amarre al instante.",
      },
    ],
  },

  "w.bookings": {
    title: "Reservas",
    summary: "Todas las reservas: crea reservas, aprueba solicitudes, registra entradas y salidas, consulta el calendario, resuelve conflictos y gestiona la lista de espera.",
    who: "Administradores y gerentes. Las reservas hechas en la web pública llegan aquí como solicitudes.",
    sections: [
      {
        heading: "Hacer una reserva",
        steps: [
          "Selecciona Nueva reserva (o pulsa N en cualquier página).",
          "Propietario: busca un propietario existente, o elige Nuevo propietario y escribe su nombre, correo y embarcación.",
          "Estancia: elige las fechas de llegada y salida y el número de personas.",
          "Amarre: solo se ofrecen amarres libres toda la estancia y con tamaño suficiente para la embarcación, con su precio.",
          "Elige el estado: Confirmada (enviar factura), o Pendiente de aprobación para decidir más tarde. Después selecciona Confirmar reserva (o Guardar como pendiente).",
        ],
      },
      {
        heading: "Las pestañas",
        points: [
          "Todas las reservas: busca por reserva, embarcación, propietario o amarre; filtra por marina, estado y fecha.",
          "Hoy: llegadas y salidas de hoy, con Registrar entrada y Registrar salida.",
          "Calendario: las llegadas, salidas y embarcaciones en la marina de cada día. Usa las flechas para cambiar de mes.",
          "Conflictos: reservas dobles y reservas en amarres fuera de servicio, con Mover reserva o Resolver.",
          "Lista de espera: personas que esperan un amarre en una marina llena.",
        ],
      },
      {
        heading: "Trabajar con una reserva",
        steps: [
          "Selecciona una reserva para ver sus datos: propietario, embarcación, amarre, fechas, precio y factura.",
          "Aprueba una reserva pendiente: queda confirmada y se crea la factura.",
          "Registra la entrada cuando llega la embarcación y la salida cuando se va.",
          "Cambiar fechas o amarre: elige otras fechas o un amarre libre. Una factura sin pagar se actualiza al nuevo precio; una pagada queda igual, así que ajusta la diferencia en Facturación.",
          "Enviar datos al propietario manda los datos de la reserva por correo. Cancelar reserva libera el amarre y anula cualquier factura sin pagar.",
        ],
      },
      {
        heading: "Aprobar varias a la vez",
        text: "Cuando hay reservas esperando, una barra muestra cuántas. Selecciona Aprobar todas, revisa el número y confirma. Cada una se confirma y se factura, y puedes deshacerlo justo después.",
      },
      {
        heading: "Lista de espera",
        points: [
          "Selecciona Añadir a la lista de espera para anotar a alguien que quiere un amarre en una marina llena, con la eslora y las fechas.",
          "Cuando se libera un amarre donde cabe, aparece junto a la persona. Selecciona Ofrecer para anotar que se lo ofreciste, o Reservar para reservarlo directamente.",
          "Las solicitudes hechas en la web pública también aparecen aquí.",
        ],
      },
      {
        heading: "Consejos",
        points: ["Exportar CSV descarga las reservas de la vista actual.", "Los precios se calculan con las reglas de Ajustes › Precios vigentes al reservar."],
      },
    ],
  },

  "w.contracts": {
    title: "Contratos",
    summary: "Acuerdos de amarre a largo plazo (mensuales, de temporada o anuales): quién tiene cada amarre, hasta cuándo y cuáles van a renovarse.",
    who: "Administradores y gerentes.",
    sections: [
      {
        heading: "Crear un contrato",
        steps: [
          "Selecciona Nuevo contrato.",
          "Elige el propietario y la embarcación, la marina y el plazo: mensual, de temporada (6 meses, 5% menos) o anual (12 meses, 10% menos).",
          "Elige la fecha de inicio. Solo se ofrecen amarres libres todo el plazo donde cabe la embarcación.",
          "Revisa la cuota mensual sugerida, elige si se renueva automáticamente y selecciona Crear contrato.",
          "El amarre queda reservado todo el plazo y el plazo completo se factura por adelantado.",
        ],
      },
      {
        heading: "Renovaciones",
        points: [
          "Los contratos se marcan una semana antes del final (mensuales), un mes antes (de temporada) o dos meses antes (anuales).",
          "Selecciona Renovar para ampliarlo por el mismo plazo; se factura al momento. Si el amarre está reservado durante el siguiente plazo, mueve antes esa reserva.",
          "Selecciona No renovar para dejarlo terminar; el amarre vuelve a estar a la venta después del último día. Avisa al propietario.",
        ],
      },
      {
        heading: "Lo que muestra la lista",
        points: [
          "Estado: Se renueva solo, Plazo fijo, Se renueva en / Termina en (cuando toca renovar), Renovado o Terminado.",
          "Si el propietario lo ha firmado: los propietarios firman en línea desde su cuenta en la web pública.",
          "Las cifras de arriba: contratos activos, ingresos por contratos al mes, contratos por renovar y amarres que vuelven a estar a la venta.",
        ],
      },
    ],
  },

  "w.locations": {
    title: "Ubicaciones",
    summary: "Los condados y ciudades a los que pertenecen tus marinas, con sus cifras y un mapa de todas las marinas.",
    who: "Solo administradores.",
    sections: [
      {
        heading: "Las pestañas",
        points: [
          "Condados: cada condado con su estado, ciudades, marinas, amarres, ocupación e ingresos de este mes.",
          "Ciudades: cada ciudad con su condado y sus cifras.",
          "Mapa: todas las marinas en un mapa. Selecciona un marcador para ver las cifras de esa ciudad y Abrir panel de la ciudad.",
        ],
      },
      {
        heading: "Añadir o cambiar una ubicación",
        steps: [
          "Selecciona Añadir ubicación y elige Ciudad o Condado.",
          "Para un condado, escribe su nombre y estado. Para una ciudad, su nombre, condado y la latitud y longitud de su centro.",
          "Guarda. Usa el lápiz para editar y la papelera para eliminar.",
        ],
      },
      { heading: "Conviene saber", text: "Un condado con ciudades, o una ciudad con marinas, no se puede eliminar. Mueve o elimina antes lo que contiene." },
    ],
  },

  "w.staff": {
    title: "Personal",
    summary: "Tu equipo: quién trabaja dónde, el horario semanal, la cobertura de turnos, las solicitudes de días libres, las horas y la nómina, y los mensajes con el personal.",
    who: "Administradores y gerentes.",
    sections: [
      {
        heading: "Directorio",
        points: [
          "Busca por nombre, correo o puesto y filtra por marina. Cada persona muestra su puesto, marina, turno y si trabaja hoy.",
          "Selecciona Añadir miembro para añadir a alguien: nombre, puesto, correo, teléfono, marina, departamento, turno (mañana, día, tarde o noche), estado y días libres habituales.",
          "Usa el lápiz para editar y Quitar para sacar a alguien de la lista; sus órdenes de trabajo abiertas quedan sin asignar.",
        ],
      },
      {
        heading: "Horario semanal y cobertura",
        points: [
          "Horario semanal muestra el turno de cada persona cada día, con días libres aprobados, cambios y coberturas. Cambia de semana con Anterior y Siguiente.",
          "Cobertura de turnos muestra, por marina y día, si cada turno tiene a alguien y qué turnos no tienen a nadie.",
        ],
      },
      {
        heading: "Solicitudes",
        steps: ["El personal pide días libres y cambios de turno desde la app del teléfono.", "Abre Solicitudes y selecciona Aprobar o Rechazar.", "Las solicitudes aprobadas actualizan el horario, y la persona ve la respuesta en su app."],
      },
      {
        heading: "Horas y nómina",
        points: [
          "Horas muestra los fichajes de cada persona por día, los totales semanales y la paga, con horas extra a partir de 40 horas a una vez y media.",
          "Aprueba una hoja de horas cuando termine la semana, o Aprobar todas. Un cambio posterior a la aprobación queda marcado.",
          "Descarga CSV de nómina o Excel para tu gestor de nóminas.",
        ],
      },
      {
        heading: "Mensajes",
        text: "Lee y responde las conversaciones del personal, o envía un aviso a todos. El personal ve tus mensajes en su app, y puedes ver cuándo los han leído.",
      },
    ],
  },

  "w.maintenance": {
    title: "Mantenimiento",
    summary: "Órdenes de trabajo para amarres, pantalanes e instalaciones, trabajos que se repiten, y las piezas y suministros en almacén.",
    who: "Administradores y gerentes. El personal trabaja en las tareas desde la app del teléfono.",
    sections: [
      {
        heading: "Órdenes de trabajo",
        steps: [
          "Selecciona Nueva orden de trabajo. Describe el trabajo y elige la marina y el amarre (o toda la marina), a quién se asigna, la fecha límite y la prioridad.",
          "Marca Dejar este amarre fuera de servicio si no debe usarse hasta que esté arreglado.",
          "Abre una orden para Empezar trabajo, añadir notas, anotar las piezas usadas y Marcar como hecha. Reábrela si hace falta.",
        ],
        points: ["Filtra por estado y prioridad. Las cifras de arriba muestran las órdenes abiertas, de prioridad alta y vencidas, y los amarres fuera de servicio."],
      },
      {
        heading: "Trabajos recurrentes",
        points: [
          "Para el trabajo rutinario, como limpiar la estación de bombeo cada semana o revisar los pilotes cada mes.",
          "Selecciona Nuevo trabajo recurrente: qué hay que hacer, marina, amarre o instalación, cada cuánto (semanal, mensual o cada 3 meses), próxima fecha, prioridad y quién lo hace.",
          "Cada orden de trabajo se crea una semana antes de la fecha. Pausa un trabajo para que no se creen órdenes nuevas y reanúdalo después.",
        ],
      },
      {
        heading: "Piezas y suministros",
        points: [
          "Cada pieza con sus existencias, unidad y coste. Las que están en su nivel de pedido o por debajo se marcan Bajo o Agotado.",
          "Selecciona Reponer y escribe cuántas han llegado. Selecciona Añadir artículo para una pieza nueva.",
          "Cuando se usan piezas en una orden de trabajo, se descuentan del almacén automáticamente.",
        ],
      },
    ],
  },

  "w.incidents": {
    title: "Incidentes",
    summary: "Daños, lesiones, robos y derrames comunicados por el personal desde el teléfono, y cómo se gestionó cada uno.",
    who: "Administradores y gerentes.",
    sections: [
      {
        heading: "Lo que ves",
        points: [
          "Cada incidente con su tipo, marina y amarre, cuándo ocurrió, quién lo comunicó, las personas implicadas y las fotos.",
          "Los incidentes graves van marcados. Las cifras de arriba muestran los nuevos, en investigación y graves sin cerrar, y el total de este mes.",
          "Busca y filtra por marina y por Sin cerrar, Cerrados o Todos.",
        ],
      },
      {
        heading: "Gestionar un incidente",
        steps: [
          "Abre el incidente y selecciona Empezar a investigar.",
          "Añade notas de seguimiento sobre la marcha, por ejemplo el número de parte del seguro.",
          "Selecciona Cerrar incidente y anota el resultado, por ejemplo «Tablas cambiadas, el seguro del propietario pagó».",
          "Reábrelo si surge algo nuevo.",
        ],
      },
    ],
  },

  "w.people": {
    title: "Propietarios y usuarios",
    summary: "Tus clientes y sus embarcaciones, y las personas que pueden iniciar sesión en Marina.",
    who: "Los administradores ven a todos los propietarios y gestionan los usuarios. Los gerentes ven a los propietarios que reservaron en sus marinas.",
    sections: [
      {
        heading: "Propietarios",
        points: [
          "Busca por nombre, correo o nombre de la embarcación. Cada propietario muestra sus datos de contacto, desde cuándo es cliente y si tiene una embarcación en la marina ahora.",
          "Selecciona Ver para consultar sus embarcaciones, reservas, valor total y saldo pendiente.",
          "Selecciona Añadir propietario de embarcación: nombre, correo, teléfono y su primera embarcación (nombre, tipo, eslora, matrícula).",
          "Desde un propietario puedes añadir una embarcación, editar sus datos o hacer una nueva reserva.",
        ],
      },
      {
        heading: "Usuarios del sistema (administradores)",
        steps: [
          "Selecciona Invitar usuario. Escribe su nombre y correo de trabajo, elige el rol (administrador, gerente o personal) y las marinas a las que accede.",
          "Recibe un correo para crear su contraseña. Vuelve a enviar la invitación si hace falta.",
          "Usa el lápiz para cambiar el rol o las marinas, y Desactivar para impedir que alguien entre. Puedes reactivarlo cuando quieras.",
        ],
        points: ["Consulta Control de acceso para ver qué puede hacer cada rol."],
      },
    ],
  },

  "w.billing": {
    title: "Facturación",
    summary: "Las facturas de cada estancia: lo pendiente o vencido, los pagos, los recordatorios y la impresión.",
    who: "Administradores y gerentes.",
    sections: [
      {
        heading: "Cómo se crean las facturas",
        points: [
          "La factura se crea al confirmar una reserva y vence a los días indicados en Ajustes.",
          "El combustible, el bombeo, el hielo, la lavandería y la luz y el agua por contador que añade el personal aparecen como líneas extra.",
          "Los propietarios también pueden pagar en línea desde su cuenta en la web pública.",
        ],
      },
      {
        heading: "Encontrar facturas",
        text: "Busca por factura, reserva o propietario, y filtra por marina y estado. Las cifras de arriba muestran lo pendiente, lo vencido, lo cobrado este mes y los ingresos reservados este mes.",
      },
      {
        heading: "Registrar un pago",
        steps: [
          "Abre la factura y selecciona Registrar pago.",
          "Escribe el importe (si es menor que el saldo, se registra un pago parcial), la fecha y el método: tarjeta, transferencia, efectivo o cheque.",
          "Guarda. La factura queda pagada cuando los pagos suman el total.",
        ],
      },
      {
        heading: "Recordatorios, impresión y anulación",
        points: [
          "Enviar recordatorio manda un correo al propietario y guarda la fecha en la factura. Si hay facturas vencidas, una barra te deja enviar todos los recordatorios a la vez.",
          "Imprimir abre la factura con tu logotipo, color y pie de Ajustes › Marca.",
          "Anular cancela una factura que no se debe pagar. La reserva no se cancela.",
          "Exportar CSV descarga las facturas de la vista actual.",
        ],
      },
    ],
  },

  "w.reports": {
    title: "Informes",
    summary: "Informes listos para revisar y descargar, una exportación completa de los datos e informes enviados por correo de forma programada.",
    who: "Administradores y gerentes (para sus marinas).",
    sections: [
      {
        heading: "Descargar un informe",
        steps: [
          "Elige un informe: Rendimiento de las marinas, Reservas por estado, Facturas sin pagar, Mejores propietarios, o Combustible, servicios y suministros.",
          "Elige el mes. El mes actual se marca «hasta hoy».",
          "Revisa la vista previa y selecciona CSV, Excel o Descargar PDF.",
        ],
      },
      {
        heading: "Exportar todos los datos",
        text: "Selecciona Exportar todos los datos (Excel) para obtener un libro con todas las marinas, amarres, reservas, propietarios, facturas y más, cada uno en su hoja.",
      },
      {
        heading: "Envíos programados",
        steps: ["Selecciona Programar un informe.", "Elige el informe, la frecuencia (diaria, semanal o mensual) y quién lo recibe (correos separados por comas).", "Guarda. Elimina una programación con la papelera."],
        points: ["Las programaciones ya se guardan; los correos empezarán a enviarse cuando Marina esté conectada a su servidor."],
      },
    ],
  },

  "w.analytics": {
    title: "Análisis",
    summary: "Tendencias de los últimos 12 meses: ingresos y ocupación por marina, cuánto dura una estancia, con cuánta antelación se reserva y los tipos de embarcación.",
    who: "Administradores y gerentes.",
    sections: [
      {
        heading: "Lo que ves",
        points: [
          "Estancia media, antelación media de la reserva (cuánto antes de llegar se reserva), tasa de cancelación y eslora media.",
          "Ingresos por marina y ocupación por marina durante 12 meses.",
          "Duración de la estancia: cuántas reservas duran unas noches, una semana, un mes o más.",
          "Tipos de embarcación: reservas por tipo de embarcación.",
        ],
      },
      { heading: "Filtrar", text: "Usa el filtro de marina para ver una marina o todas juntas." },
    ],
  },

  "w.access": {
    title: "Control de acceso",
    summary: "Qué puede ver y hacer cada rol, y un registro completo de todos los cambios del sistema.",
    who: "Solo administradores.",
    sections: [
      {
        heading: "Roles",
        points: [
          "Administrador: dirige toda la empresa, con acceso completo a todas las marinas, la facturación, los usuarios y los ajustes. No se puede cambiar.",
          "Gerente de marina: lleva una o varias marinas en el día a día.",
          "Personal: el trabajo diario en sus marinas, desde la app del teléfono.",
        ],
      },
      {
        heading: "Permisos",
        steps: [
          "Para cada área (paneles, marinas, amarres, reservas, personal, mantenimiento, propietarios, facturación, informes), elige qué tienen los gerentes y el personal: Marinas asignadas, Solo lectura o Sin acceso.",
          "Los cambios se aplican al momento. Sin acceso oculta la página; Solo lectura oculta las acciones de crear y editar.",
          "Selecciona Restablecer valores para volver a la configuración estándar.",
        ],
      },
      {
        heading: "Registro de auditoría",
        text: "Cada cambio, del más reciente al más antiguo: quién lo hizo y cuándo. Busca por persona o acción. Cuando una entrada cambió valores, selecciona «cambios: antes y después» para ver el valor anterior y el nuevo de cada campo.",
      },
    ],
  },

  "w.settings": {
    title: "Ajustes",
    summary: "Tu perfil, las notificaciones, los valores de la empresa, las reglas de precios, la marca y los datos de demostración.",
    who: "Todos tienen perfil y notificaciones. Los valores de la empresa, los precios y la marca son para administradores.",
    sections: [
      {
        heading: "Perfil y notificaciones",
        points: [
          "Cambia tu nombre. Pide a un administrador que cambie tu correo de acceso.",
          "Elige qué aparece en la campana y en los correos: reservas por aprobar, facturas vencidas, órdenes de trabajo de prioridad alta y un resumen diario por correo a las 7:00 (con vista previa).",
        ],
      },
      {
        heading: "Valores de la empresa (administradores)",
        points: [
          "Nombre de la empresa (en las facturas), moneda, zona horaria de la oficina central (los fichajes y demás horas de cada marina se muestran en su hora local), días hasta que vence una factura y a partir de cuántas noches se aplica la tarifa mensual.",
        ],
      },
      {
        heading: "Precios (administradores)",
        steps: [
          "Define un recargo de fin de semana para las noches de viernes y sábado y un descuento por estancia larga a partir de un número de noches.",
          "Añade temporadas con fechas (MM-DD) y un cambio de tarifa, por ejemplo Verano 06-15 a 09-15, +20%.",
          "Define las tarifas de luz y agua para las lecturas de contadores.",
          "Revisa la vista previa y selecciona Guardar precios. Las reservas nuevas usan las reglas nuevas; las existentes mantienen su precio.",
        ],
      },
      {
        heading: "Marca (administradores)",
        text: "Sube tu logotipo (PNG, JPG, SVG o WebP, de menos de 300 KB), elige el color de la marca y escribe un pie de factura, como los datos bancarios. La vista previa muestra cómo quedarán las facturas, los informes en PDF y los correos.",
      },
      {
        heading: "Datos de demostración",
        text: "Tus cambios se guardan en este navegador hasta medianoche; después se crean datos de ejemplo nuevos. Selecciona Restablecer datos de demostración para empezar de cero ahora.",
      },
    ],
  },
};
