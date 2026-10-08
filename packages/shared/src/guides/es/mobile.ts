import type { Guide } from "../types";

// App Marina del teléfono (apps/mobile), para personal, gerentes de marina y administradores.
export const mobile: Record<string, Guide> = {
  "m.login": {
    title: "Iniciar sesión",
    summary: "Inicia sesión en la app Marina con tu correo de trabajo. Lo que ves después depende de tu rol.",
    who: "Personal del muelle, gerentes de marina y administradores.",
    sections: [
      {
        heading: "Iniciar sesión",
        steps: ["Escribe tu correo de trabajo y tu contraseña.", "Toca Iniciar sesión."],
        points: [
          "El personal tiene las pestañas Hoy, Reservas, Amarres, Tareas y Yo.",
          "Los gerentes y administradores tienen Resumen, Aprobaciones, Reservas, Equipo y Yo.",
        ],
      },
      {
        heading: "Si olvidaste tu contraseña",
        text: "Toca ¿Olvidaste tu contraseña? Tu gerente de marina restablece las contraseñas del personal desde la aplicación web de Marina.",
      },
      {
        heading: "Conviene saber",
        points: [
          "Activa el desbloqueo con Face ID o huella en Yo › Seguridad para no escribir la contraseña cada vez.",
          "La app funciona sin conexión. Los cambios se guardan en el teléfono y se envían cuando vuelves a tener conexión.",
        ],
      },
    ],
  },

  "m.overview": {
    title: "Resumen",
    summary: "Cómo van tus marinas ahora mismo y qué te necesita.",
    who: "Gerentes de marina y administradores.",
    sections: [
      {
        heading: "Las cifras",
        points: [
          "Ocupación hoy: amarres ocupados sobre el total, y el cambio respecto a hace 30 días.",
          "Ingresos de este mes, comparados con el mes pasado.",
          "Llegadas y salidas de hoy, y cuántas embarcaciones hay ahora.",
          "Personal fichado, sobre el total del equipo.",
        ],
      },
      {
        heading: "Requiere atención",
        text: "Reservas pendientes de aprobación, embarcaciones que siguen registradas después de su última noche, embarcaciones en un amarre fuera de servicio, órdenes de trabajo abiertas y facturas vencidas. Toca una para resolverla.",
      },
      {
        heading: "Más en esta pantalla",
        points: [
          "Ingresos de los últimos 6 meses. Tócalos para verlos por condado, ciudad y marina.",
          "Todas las marinas ordenadas por ocupación. Toca una para abrirla, o Comparar para poner 2 o 3 una al lado de otra.",
          "Acciones rápidas: Amarres, Reparaciones, Escanear, Propietarios, Facturas e Informe del día.",
          "Actividad reciente, con Ver todo para el registro completo.",
        ],
      },
      {
        heading: "Cambiar de marina",
        text: "Toca el nombre de la marina arriba para elegir una marina o Todas las marinas. Todas las pantallas siguen tu elección.",
      },
    ],
  },

  "m.today": {
    title: "Hoy",
    summary: "Tu turno, las embarcaciones que llegan y se van, y las reparaciones urgentes, en una sola pantalla.",
    who: "Personal del muelle.",
    sections: [
      {
        heading: "Tu turno",
        steps: [
          "La tarjeta del turno muestra el turno de hoy, o si estás de permiso, has cambiado el turno o tienes el día libre.",
          "Toca Fichar entrada al empezar. La tarjeta muestra cuánto tiempo llevas fichado.",
          "Toca Fichar salida al terminar. Puedes dejar una nota de relevo para el siguiente turno.",
        ],
        points: ["Las notas del último turno se muestran aquí durante 24 horas. Toca Dejar una nota para añadir una cuando quieras."],
      },
      {
        heading: "Llegadas y salidas",
        points: [
          "Llegan hoy: toca Amarre listo para revisar el amarre, y Registrar entrada cuando llegue la embarcación.",
          "Al registrar la entrada anotas el estado de la embarcación, haces fotos y el propietario firma en la pantalla.",
          "Salen hoy: toca Registrar salida cuando se vaya la embarcación.",
          "Fecha de salida pasada: embarcaciones que siguen aquí después de su última noche. Registra su salida o pide al propietario que amplíe la estancia.",
        ],
      },
      {
        heading: "También aquí",
        points: [
          "Reparaciones urgentes en tu marina. Toca una para abrirla.",
          "Informar de un incidente: daños, lesiones, robos o derrames.",
          "Mis tareas: órdenes de trabajo asignadas a ti.",
        ],
      },
    ],
  },

  "m.approvals": {
    title: "Aprobaciones",
    summary: "Reservas y solicitudes del personal que esperan tu sí o tu no.",
    who: "Gerentes de marina y administradores.",
    sections: [
      {
        heading: "Reservas",
        steps: [
          "Cada reserva muestra la embarcación, la marina y el amarre, las fechas y el precio.",
          "Toca Aprobar para confirmarla y crear la factura, o Rechazar.",
          "Toca Aprobar todas para aprobar todas las reservas a la vez. Las que chocan con otra reserva se omiten. Puedes deshacerlo justo después.",
        ],
        points: ["Aquí aparecen las reservas hechas en la web pública y por teléfono."],
      },
      {
        heading: "Solicitudes del personal",
        steps: ["Aquí aparecen los días libres y cambios de turno enviados desde la app.", "Toca Aprobar o Rechazar. La persona ve tu respuesta en su app y el horario se actualiza."],
      },
    ],
  },

  "m.bookings": {
    title: "Reservas",
    summary: "Encuentra cualquier reserva, registra entradas y salidas, cobra y haz reservas nuevas.",
    who: "Personal del muelle, gerentes y administradores.",
    sections: [
      {
        heading: "Encontrar una reserva",
        points: ["Busca por embarcación, propietario, amarre o código de reserva.", "Cambia entre Hoy, Próximas y En la marina."],
      },
      {
        heading: "Abrir una reserva",
        points: [
          "Mira la embarcación, las fechas, el amarre, el propietario y la factura. Toca Llamar o Correo para contactar con el propietario.",
          "Registra la entrada o la salida de la embarcación.",
          "Ampliar o mover: cambia las fechas o mueve la embarcación a otro amarre libre donde quepa.",
          "Añadir servicio: combustible, bombeo, hielo o lavandería, que se añaden a la factura.",
          "Los gerentes y administradores también pueden aprobar, rechazar o cancelar.",
        ],
      },
      {
        heading: "Cobrar",
        steps: [
          "Abre la reserva y toca Cobrar.",
          "Elige el saldo completo, la mitad, o escribe un importe.",
          "Elige cómo pagaron: tarjeta (pásala antes por el datáfono de la marina), efectivo, cheque o transferencia.",
          "Toca Registrar. La factura muestra lo que queda por pagar, o que está pagada.",
        ],
      },
      {
        heading: "Sin reserva y reservas nuevas",
        steps: [
          "Toca Nueva reserva.",
          "Busca la embarcación por nombre, matrícula o propietario, o añade una embarcación nueva con el nombre del propietario y su teléfono o correo.",
          "Elige si llega hoy o otro día, las noches y las personas.",
          "Elige un amarre libre donde quepa y toca Reservar. Si la embarcación llega ahora, registra su entrada al momento.",
        ],
      },
    ],
  },

  "m.berths": {
    title: "Amarres",
    summary: "Un plano del muelle de tu marina, con colores según el estado.",
    who: "Personal del muelle, gerentes y administradores.",
    sections: [
      {
        heading: "Leer el plano",
        points: [
          "Cada amarre muestra su número y su color: libre, ocupado, reservado o en reparación.",
          "Usa los filtros de arriba para ver solo un estado, como los amarres libres.",
          "La línea de arriba cuenta los amarres libres, ocupados, reservados y en reparación.",
        ],
      },
      { heading: "Abrir un amarre", text: "Toca un amarre para ver la embarcación que hay, la próxima llegada, las reparaciones abiertas y sus tarifas, y para actuar sobre él." },
    ],
  },

  "m.berth": {
    title: "Amarre",
    summary: "Un amarre: la embarcación que hay ahora, lo que viene, las reparaciones abiertas y las acciones.",
    who: "Personal del muelle, gerentes y administradores.",
    sections: [
      {
        heading: "Lo que ves",
        points: [
          "Tamaño, tipo, luz y agua, y si el amarre está en servicio.",
          "Embarcación aquí ahora, con la fecha de salida y el propietario. Tócala para abrir la reserva.",
          "La próxima llegada y las reparaciones abiertas.",
        ],
      },
      {
        heading: "Qué puedes hacer",
        points: [
          "Informar de un problema: di qué pasa, lo urgente que es, añade fotos y elige si dejar el amarre fuera de servicio. Va directo a las órdenes de trabajo.",
          "Fuera de servicio / De nuevo en servicio. Un amarre con una embarcación no puede quedar fuera de servicio hasta que se mueva la embarcación.",
          "Leer contadores: escribe los números de los contadores de luz y agua. El consumo se añade a la factura de la embarcación.",
          "Mover la embarcación que hay a otro amarre.",
        ],
      },
      { heading: "Consejo", text: "Escanea la etiqueta QR del poste de un amarre para abrir su página al instante." },
    ],
  },

  "m.tasks": {
    title: "Tareas",
    summary: "Órdenes de trabajo: las tuyas, las abiertas y las terminadas.",
    who: "Personal del muelle, gerentes y administradores.",
    sections: [
      {
        heading: "Las listas",
        points: [
          "Mías: órdenes asignadas a ti. Abiertas: todo lo pendiente. Hechas: el trabajo terminado.",
          "Cada una muestra el amarre o la instalación, la prioridad, la fecha límite y si tiene fotos. Las vencidas van marcadas.",
          "Los gerentes también ven Sin asignar.",
        ],
      },
      {
        heading: "Trabajar en una tarea",
        steps: [
          "Toca una tarea y toca Empezar trabajo. Queda asignada a ti.",
          "Añade novedades como notas y fotos sobre la marcha, y anota las piezas usadas del almacén.",
          "Toca Marcar como hecha cuando termines.",
        ],
        points: ["Los gerentes pueden cambiar la prioridad, la fecha límite y a quién está asignada."],
      },
      { heading: "Informar de un problema nuevo", text: "Toca Informar, describe el problema, elige lo urgente que es, añade fotos y envía. Va directo a las órdenes de trabajo de la marina." },
    ],
  },

  "m.team": {
    title: "Equipo",
    summary: "Quién trabaja hoy, el horario de la semana, las horas y el chat con tu personal.",
    who: "Gerentes de marina y administradores.",
    sections: [
      {
        heading: "Hoy",
        points: [
          "Notas de relevo del personal de las últimas 24 horas, y las rondas de hoy.",
          "Fichados: quién ha fichado y desde cuándo. Con turno, sin fichar: quién debería haber empezado y no lo ha hecho.",
          "Quién libra, está de permiso o ha cambiado el turno hoy. Toca a una persona para ver sus datos, llamarla, escribirle o enviarle un mensaje.",
        ],
      },
      {
        heading: "Semana",
        steps: [
          "Mira los turnos de cada día y los huecos, como Sin turno de tarde.",
          "Toca Buscar cobertura en un hueco para ver compañeros que libran ese día, y toca Preguntar para enviarles un mensaje.",
          "Abre a una persona y toca Editar horario para cambiar su turno habitual, sus días libres o su estado.",
        ],
        points: ["Los días libres sueltos y los cambios de turno pasan por Aprobaciones."],
      },
      {
        heading: "Horas y chat",
        points: [
          "Horas: el tiempo trabajado por cada persona esta semana.",
          "Chat: conversaciones con el personal. Toca Mensaje a todos para enviar un aviso a todo el personal de las marinas que elijas.",
        ],
      },
    ],
  },

  "m.me": {
    title: "Yo",
    summary: "Tu semana, tus horas, tus solicitudes de días libres y los ajustes de la app.",
    who: "Todos. El personal ve su horario y sus horas; los gerentes y administradores, sus marinas.",
    sections: [
      {
        heading: "Tu semana y tus horas (personal)",
        points: [
          "Mi semana: tu turno de cada día, con días libres aprobados, cambios y coberturas.",
          "Tu tiempo trabajado esta semana y la anterior, y si la hoja de horas está aprobada.",
        ],
      },
      {
        heading: "Días libres y cambios (personal)",
        steps: [
          "Toca Solicitar.",
          "Días libres: elige el primer día y cuántos días, y añade un motivo.",
          "Cambiar un turno: elige el turno y un compañero que libre ese día.",
          "Toca Enviar solicitud. Tu gerente la aprueba y ves la respuesta aquí. Toca Retirar para anular una solicitud pendiente.",
        ],
      },
      {
        heading: "Ajustes",
        points: [
          "Recordatorios de turno: un aviso 30 minutos antes de cada turno.",
          "Apariencia: automática, clara u oscura. Idioma: English, Español o العربية.",
          "Seguridad: desbloquear con Face ID o huella.",
          "Cuenta: edita tu teléfono, cambia tu contraseña, abre la aplicación web (gerentes) o cierra sesión.",
        ],
      },
    ],
  },

  "m.scan": {
    title: "Escanear un amarre",
    summary: "Abre un amarre escaneando la etiqueta QR de su poste.",
    who: "Personal del muelle, gerentes y administradores.",
    sections: [
      {
        heading: "Escanear",
        steps: ["Toca Escanear en la parte superior de la app.", "Permite el uso de la cámara la primera vez.", "Apunta la cámara a la etiqueta QR del poste del amarre. El amarre se abre."],
      },
      {
        heading: "Sin etiqueta o sin cámara",
        steps: ["Escribe el número del amarre, por ejemplo A-04.", "Toca Abrir."],
        points: ["Si varias marinas tienen ese número de amarre, elige antes una marina arriba."],
      },
      { heading: "Consejo", text: "La cámara normal de tu teléfono también puede escanear las etiquetas; abre la app Marina." },
    ],
  },

  "m.patrol": {
    title: "Ronda por el muelle",
    summary: "Recorre todos los pantalanes, revisa la seguridad y registra cada ronda.",
    who: "Personal del muelle.",
    sections: [
      {
        heading: "Hacer una ronda",
        steps: [
          "Toca Empezar ronda.",
          "En cada pantalán, escanea cualquier etiqueta de amarre para marcar ese pantalán como revisado.",
          "Revisa los puntos de seguridad y toca OK, o Problema si algo va mal. Describe el problema y elige Informar como reparación si hay que arreglarlo.",
          "Toca Terminar ronda. Antes de terminar se muestran los pantalanes o puntos que no revisaste.",
        ],
      },
      { heading: "Rondas recientes", text: "Las rondas terminadas aparecen con quién las hizo y cuándo. Los gerentes ven las rondas de hoy en la pestaña Equipo." },
    ],
  },

  "m.report": {
    title: "Informe del día",
    summary: "El resumen de hoy o de ayer, y el plan para mañana, listo para compartir.",
    who: "Gerentes de marina y administradores.",
    sections: [
      {
        heading: "Qué incluye",
        points: [
          "Embarcaciones: llegadas, salidas, reservas nuevas y amarres ocupados.",
          "Dinero: pagos cobrados y servicios vendidos.",
          "Trabajo: órdenes de trabajo terminadas, problemas nuevos comunicados y urgentes aún abiertos.",
          "Personas: personal que fichó y horas trabajadas.",
          "Mañana: llegadas, salidas, personal con turno y reservas pendientes de aprobación.",
        ],
      },
      {
        heading: "Usarlo",
        steps: ["Cambia entre Hoy hasta ahora y Ayer.", "Toca Compartir informe para enviarlo como texto por mensaje o correo."],
        points: ["Elige Todas las marinas arriba para un informe conjunto."],
      },
    ],
  },

  "m.owners": {
    title: "Propietarios",
    summary: "Busca a cualquier propietario que se aloje en tus marinas.",
    who: "Gerentes de marina y administradores.",
    sections: [
      {
        heading: "Encontrar un propietario",
        points: ["Busca por nombre, teléfono, correo, embarcación o matrícula.", "Cada propietario muestra sus embarcaciones y lo que debe."],
      },
      {
        heading: "Abrir un propietario",
        points: [
          "Llámalo o escríbele.",
          "Lo que ha pagado, lo que debe y lo que aún no ha vencido.",
          "Si está ahora en la marina, sus embarcaciones y sus estancias en tus marinas.",
        ],
      },
    ],
  },

  "m.invoices": {
    title: "Facturas",
    summary: "Lo vencido, lo que vence y lo pagado recientemente.",
    who: "Gerentes de marina y administradores.",
    sections: [
      {
        heading: "Las listas",
        points: ["Vencidas, Por vencer y Pagadas (los últimos 30 días).", "La línea de arriba muestra los totales vencidos y por vencer."],
      },
      {
        heading: "Recordatorios y pagos",
        steps: [
          "Toca Recordar en una factura vencida, o Recordar a todos para avisar a todos los propietarios a la vez. Se omiten los que ya recibieron un recordatorio hoy.",
          "Toca Pago para registrar un pago hecho en la oficina.",
        ],
      },
    ],
  },

  "m.inbox": {
    title: "Notificaciones",
    summary: "Todo lo nuevo para ti, en una sola lista.",
    who: "Todos.",
    sections: [
      {
        heading: "Qué aparece",
        points: [
          "Personal: órdenes de trabajo nuevas y vencidas, mensajes de tu gerente, respuestas a tus solicitudes, compañeros que te piden cubrirles, salidas con retraso, llegadas de hoy y tu turno de mañana.",
          "Gerentes: reservas por aprobar, llegadas, facturas vencidas, reparaciones urgentes, solicitudes y mensajes del personal.",
        ],
      },
      { heading: "Usarlas", text: "Toca una notificación para abrirla. Toca Marcar todo como leído cuando lo hayas visto todo." },
    ],
  },

  "m.chat": {
    title: "Mensajes",
    summary: "Chat entre el personal y sus gerentes de marina.",
    who: "Todos.",
    sections: [
      {
        heading: "Personal",
        text: "Tu conversación con los gerentes de tu marina. Pregunta por turnos, embarcaciones o reparaciones; tu mensaje les llega directamente. Aquí también aparecen los avisos para todos.",
      },
      {
        heading: "Gerentes",
        points: ["Elige a quién escribir, o abre a un miembro del equipo en la pestaña Equipo y toca Mensaje.", "Visto indica que lo han leído."],
      },
      { heading: "Enviar", steps: ["Escribe tu mensaje.", "Toca Enviar."] },
    ],
  },

  "m.activity": {
    title: "Actividad",
    summary: "Cada cambio hecho en tus marinas, del más reciente al más antiguo.",
    who: "Gerentes de marina y administradores.",
    sections: [
      {
        heading: "Encontrar un cambio",
        points: [
          "Busca en la actividad y filtra por tipo de cambio o por persona.",
          "Los cambios se agrupan por día: Hoy, Ayer y fechas anteriores.",
          "Se muestran los 150 más recientes. Filtra para ver cambios más antiguos.",
        ],
      },
    ],
  },

  "m.compare": {
    title: "Comparar marinas",
    summary: "Pon 2 o 3 marinas una al lado de otra.",
    who: "Gerentes de marina y administradores con más de una marina.",
    sections: [
      {
        heading: "Comparar",
        steps: ["Elige 2 o 3 marinas arriba.", "Lee cada fila de lado a lado. El verde marca el mejor valor."],
        points: [
          "Filas: ocupación hoy, ingresos de este mes y cambio respecto al mes pasado, ingresos por amarre, amarres y libres hoy, pendientes de aprobación, vencido, órdenes de trabajo abiertas, fuera de servicio, personal y horas de esta semana.",
        ],
      },
    ],
  },

  "m.revenue": {
    title: "Ingresos",
    summary: "Ingresos mes a mes, desglosados por condado, ciudad y marina.",
    who: "Gerentes de marina y administradores.",
    sections: [
      {
        heading: "Cómo leerlos",
        points: [
          "Cambia entre Por condado, Por ciudad y Por marina.",
          "Cada uno muestra su parte del total y el cambio respecto al mes pasado.",
          "Tendencia muestra los últimos meses de todas las marinas.",
        ],
      },
      { heading: "Cómo se cuentan", text: "El precio de cada estancia confirmada o completada se reparte entre sus noches, así que una estancia que abarca dos meses cuenta en los dos." },
    ],
  },

  "m.marina": {
    title: "Marina",
    summary: "Una marina de un vistazo: las cifras de hoy, amarres, ingresos, personas y contactos.",
    who: "Gerentes de marina y administradores.",
    sections: [
      {
        heading: "Lo que ves",
        points: [
          "Ocupación hoy, ingresos de este mes, llegadas y salidas, y reservas pendientes de aprobación.",
          "Amarres: disponibles, ocupados, reservados y fuera de servicio, con las órdenes de trabajo abiertas.",
          "Ingresos de los últimos 6 meses, el personal que trabaja hoy y el fichado, y el gerente.",
        ],
      },
      {
        heading: "Qué puedes hacer",
        points: [
          "Llama o escribe a la marina o a su gerente, y obtén Cómo llegar en tu app de mapas.",
          "Mostrar esta marina en la app: cambia todas las pantallas a esta marina.",
          "Administradores: Cerrar a reservas nuevas (las embarcaciones ya reservadas pueden llegar igualmente) y Reabrir a reservas.",
        ],
      },
    ],
  },
};
