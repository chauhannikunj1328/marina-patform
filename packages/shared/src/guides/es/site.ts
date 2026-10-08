import type { Guide } from "../types";

// Web pública y área de propietarios (apps/website), para visitantes y propietarios de embarcaciones.
export const site: Record<string, Guide> = {
  "s.home": {
    title: "Inicio",
    summary: "Encuentra un amarre libre para tus fechas y tu embarcación, mira nuestras marinas en el mapa y descubre cómo se reserva.",
    who: "Todos: visitantes que buscan amarre y propietarios con cuenta.",
    sections: [
      {
        heading: "Buscar un amarre",
        steps: [
          "Elige una marina, o deja Cualquier marina para buscar en todas.",
          "Elige las fechas de llegada y salida.",
          "Escribe la eslora de tu embarcación en pies.",
          "Selecciona Buscar para ver todos los amarres libres toda la estancia donde cabe tu embarcación, con su precio.",
        ],
      },
      {
        heading: "También en esta página",
        points: [
          "Libres esta noche y tarifas: las marinas con más amarres libres esta noche y la tarifa por noche más baja.",
          "Para propietarios: pestañas con lo que puedes hacer en la web (buscar y reservar, tu cuenta, pagar en línea, firmar contratos), con una imagen de cada una.",
          "Tu cuenta y la app Marina Berths: crea una cuenta o inicia sesión, y los botones de las tiendas de la app.",
          "Quédate una noche, una temporada o todo el año: tarifas por noche y lo que cuestan los contratos de temporada y anuales.",
          "Nuestras marinas: una tarjeta por marina con su ciudad, amarres, eslora máxima, servicios y la tarifa por noche más baja. Selecciona una tarjeta para abrir la marina.",
          "El mapa: selecciona el marcador de una marina para abrirla. Los marcadores con número agrupan varias marinas cercanas; selecciona uno para acercar.",
          "Cómo funciona: buscar, reservar, llegar. Tu solicitud llega directamente a la oficina del muelle.",
          "Lo que dicen los propietarios: opiniones con estrellas. Usa las flechas para ver más.",
          "Preguntas frecuentes: selecciona una pregunta para leer la respuesta.",
        ],
      },
      {
        heading: "Por la web",
        points: [
          "El botón de idioma cambia entre English, Español y العربية. El árabe se lee de derecha a izquierda.",
          "El botón de luna y sol cambia entre modo oscuro y claro. Hasta que elijas, sigue el ajuste de tu dispositivo.",
          "Reservar amarre, Iniciar sesión o Mi cuenta están siempre arriba. En el teléfono, abre el botón de menú.",
        ],
      },
    ],
  },

  "s.marinas": {
    title: "Marinas",
    summary: "Todas nuestras marinas, por estado, con un mapa.",
    who: "Todos.",
    sections: [
      {
        heading: "Explorar",
        steps: [
          "Selecciona un estado arriba para ver solo sus marinas, o Todos los estados.",
          "Cada tarjeta muestra la ciudad, el número de amarres, la eslora máxima, los servicios y la tarifa por noche más baja.",
          "Selecciona una tarjeta, o un marcador del mapa, para abrir esa marina.",
        ],
      },
      { heading: "Consejo", text: "Los marcadores con número agrupan varias marinas cercanas. Selecciona uno para acercar hasta que se separen." },
    ],
  },

  "s.marina": {
    title: "Página de la marina",
    summary: "Todo sobre una marina: tamaños y tarifas de los amarres, servicios, dónde está y cómo contactar con la oficina del muelle.",
    who: "Todos.",
    sections: [
      {
        heading: "Ver disponibilidad",
        steps: ["Elige las fechas de llegada y salida y la eslora de tu embarcación.", "Selecciona Buscar para ver los amarres libres en esta marina, con precios."],
      },
      {
        heading: "Amarres y tarifas",
        points: [
          "Cada tamaño de amarre con cuántos hay, la tarifa por noche más baja y la tarifa mensual más baja.",
          "Las estancias de 28 noches o más se cobran a la tarifa mensual, prorrateada por noche.",
          "La toma de corriente y el agua dulce aparecen cuando los amarres de la marina los tienen.",
        ],
      },
      {
        heading: "Contacto y ubicación",
        points: [
          "Oficina del muelle: dirección, teléfono y correo. Selecciona el teléfono o el correo para llamar o escribir.",
          "Cómo llegar abre Google Maps con la ruta hasta la marina.",
          "¿Te quedas una temporada o más?: las tarifas mensuales de aquí y un enlace a los precios de contrato.",
          "Lo que dicen los propietarios: opiniones sobre esta marina con sus estrellas.",
        ],
      },
    ],
  },

  "s.pricing": {
    title: "Tarifas",
    summary: "Lo que cuesta una estancia en cada marina, cómo se calcula el precio, los descuentos por contrato, los extras del muelle y cómo pagar.",
    who: "Todos.",
    sections: [
      {
        heading: "Tarifas por marina",
        text: "La tarifa por noche y mensual más baja de cada marina y la eslora máxima que admite. Los amarres más grandes cuestan más; siempre ves el precio exacto antes de reservar.",
      },
      {
        heading: "Calcula una estancia",
        steps: ["Elige una marina, escribe la eslora de tu embarcación y el número de noches.", "El cálculo muestra el amarre más económico donde cabe tu embarcación, a partir de mañana.", "Para ver qué hay libre en tus fechas, usa Buscar amarre al final de la página."],
      },
      {
        heading: "Cómo se calcula el precio",
        points: [
          "Estancias más cortas: la tarifa por noche del amarre por cada noche.",
          "28 noches o más: la tarifa mensual, prorrateada (un mes cuenta como 30 noches).",
          "También aparecen aquí las reglas de fin de semana, temporada o estancia larga que usen las marinas.",
        ],
      },
      {
        heading: "Contratos, extras y pagos",
        points: [
          "Contratos de amarre: mensuales, de temporada (6 meses, 5% menos) o anuales (12 meses, 10% menos). Te avisamos antes de que termine un contrato.",
          "Extras en el muelle: toma de corriente y agua dulce por contador, combustible, bombeo, hielo y lavandería, que se añaden a tu factura cuando los usas.",
          "Pago: la marina confirma tu reserva y te envía la factura. Paga en línea desde tu cuenta o en la oficina del muelle.",
        ],
      },
    ],
  },

  "s.contact": {
    title: "Contacto",
    summary: "Contacta con la oficina central o con cualquier oficina del muelle, o envíanos un mensaje.",
    who: "Todos.",
    sections: [
      {
        heading: "Enviar un mensaje",
        steps: [
          "Escribe tu nombre y correo. Si has iniciado sesión, ya están rellenos.",
          "Elige la marina a la que se refiere (si es el caso) y el asunto: una reserva, un contrato de larga estancia, una factura o un pago, u otra cosa.",
          "Escribe tu mensaje (al menos 10 caracteres) y selecciona Enviar mensaje.",
          "Respondemos por correo en un día laborable.",
        ],
      },
      {
        heading: "Llamar o escribir directamente",
        points: ["El teléfono, el correo y el horario de la oficina central están a la derecha.", "Oficinas del muelle muestra todas las marinas con su teléfono. Selecciona el nombre de una marina para abrir su página."],
      },
      { heading: "Vista previa", text: "Por ahora, los mensajes se guardan en este navegador hasta que la web se conecte con la oficina." },
    ],
  },

  "s.book": {
    title: "Reservar amarre",
    summary: "Mira todos los amarres libres toda tu estancia donde cabe tu embarcación, con el precio exacto, y elige uno para reservar.",
    who: "Todos. Inicias sesión o creas una cuenta al elegir un amarre.",
    sections: [
      {
        heading: "Buscar",
        steps: [
          "Elige una marina o Cualquier marina, las fechas de llegada y salida y la eslora de tu embarcación en pies.",
          "Selecciona Buscar. Las marinas con la estancia más barata aparecen primero.",
          "Cada marina muestra sus amarres libres: número y tipo, eslora máxima, luz y agua, y el precio total.",
          "Selecciona Mostrar más amarres para ver todos los amarres libres de una marina.",
        ],
      },
      {
        heading: "Reservar",
        steps: ["Selecciona Reservar junto al amarre que quieres.", "Si no has iniciado sesión, inicia sesión o crea una cuenta. Vuelves directamente.", "Confirma la reserva en la página siguiente."],
      },
      {
        heading: "Cuando no hay nada libre",
        points: [
          "Prueba otras fechas u otra marina, o llama a una oficina del muelle: a veces pueden reorganizar reservas.",
          "Selecciona Apuntarse a la lista de espera (o Apúntate a su lista de espera debajo de los resultados) para que te avisen si se libera un amarre. Elige la marina, añade tus datos y tu embarcación, y envía. La oficina del muelle ofrece los amarres que se liberan por orden, y no se cobra nada hasta que reserves.",
        ],
      },
      {
        heading: "Reglas de búsqueda",
        points: ["La llegada no puede ser en el pasado y la salida debe ser al menos una noche después.", "Para estancias de más de 6 meses, pregúntanos por un contrato."],
      },
    ],
  },

  "s.checkout": {
    title: "Confirma tu reserva",
    summary: "Elige tu embarcación, añade los detalles de la estancia y envía la solicitud de reserva.",
    who: "Propietarios que han iniciado sesión.",
    sections: [
      {
        heading: "Enviar la solicitud",
        steps: [
          "Tu embarcación: elige una de tus embarcaciones que quepa en el amarre, o Añade tu embarcación / Otra embarcación y escribe su nombre, tipo, eslora y matrícula (opcional).",
          "Detalles de la estancia: indica cuántas personas irán a bordo (de 1 a 12).",
          "Marca la casilla para aceptar las normas del amarre: registrarte en la oficina del muelle al llegar, dejar el amarre libre al salir y pagar la factura antes de su vencimiento.",
          "Selecciona Enviar solicitud de reserva.",
        ],
      },
      {
        heading: "Qué pasa después",
        points: [
          "No se cobra nada ahora. El amarre queda reservado para ti mientras la marina lo confirma, normalmente en un día laborable.",
          "Una vez confirmada, la marina te envía la factura. La encontrarás en Facturas, dentro de tu cuenta.",
          "El resumen de la derecha muestra la marina, el amarre, las fechas, las noches y el total. La luz, el agua y el combustible que uses se añaden a la factura.",
        ],
      },
      { heading: "Si acaban de reservar el amarre", text: "Si alguien reserva el mismo amarre antes, se te pedirá volver a los resultados y elegir otro." },
    ],
  },

  "s.signin": {
    title: "Inicio de sesión y cuentas",
    summary: "Inicia sesión en tu cuenta de propietario, crea una o restablece tu contraseña.",
    who: "Propietarios de embarcaciones.",
    sections: [
      {
        heading: "Iniciar sesión",
        steps: ["Escribe tu correo y tu contraseña y selecciona Iniciar sesión.", "Vuelves a la página donde estabas, por ejemplo la reserva que estabas haciendo, o a Mi cuenta."],
        points: ["Usa el botón del ojo para ver la contraseña mientras escribes."],
      },
      {
        heading: "Crear una cuenta",
        steps: ["Selecciona Crear una cuenta.", "Escribe tu nombre completo, correo, teléfono (opcional) y una contraseña de al menos 8 caracteres.", "Selecciona Crear cuenta. Quedas con la sesión iniciada al momento."],
      },
      {
        heading: "Si olvidaste tu contraseña",
        steps: ["Selecciona ¿Olvidaste tu contraseña? en la página de inicio de sesión.", "Escribe el correo con el que te registraste y selecciona Enviar enlace.", "Sigue el enlace del correo antes de 30 minutos."],
      },
      { heading: "Vista previa", text: "Por ahora, las cuentas solo se guardan en este navegador, y los correos para restablecer se envían cuando la web se conecte con la oficina." },
    ],
  },

  "s.account": {
    title: "Mi cuenta",
    summary: "Tus estancias, lo que debes y lo que necesita tu atención, de un vistazo.",
    who: "Propietarios que han iniciado sesión.",
    sections: [
      {
        heading: "Lo que ves",
        points: [
          "Próxima estancia (o Estancia actual): la marina, las fechas, el amarre y el estado. Si no tienes nada reservado, selecciona Reservar amarre.",
          "Por pagar: el total de tus facturas abiertas. Selecciona Pagar ahora para pagar.",
          "Contratos pendientes de tu firma, con Leer y firmar.",
          "En lista de espera: tus solicitudes abiertas. Cuando se ofrece un amarre, la oficina del muelle te llama.",
          "Reservas recientes y cuántas embarcaciones hay en tu cuenta.",
        ],
      },
      {
        heading: "Por tu cuenta",
        points: [
          "Usa el menú para abrir Reservas, Facturas, Contratos, Mis embarcaciones y Perfil.",
          "Selecciona Cerrar sesión al terminar, sobre todo en un ordenador compartido.",
        ],
      },
    ],
  },

  "s.bookings": {
    title: "Mis reservas",
    summary: "Todas tus estancias: próximas, pasadas y canceladas.",
    who: "Propietarios que han iniciado sesión.",
    sections: [
      {
        heading: "Lo que ves",
        points: [
          "Las pestañas Próximas, Pasadas y Canceladas, cada una con su número.",
          "Cada reserva muestra la marina, las fechas y noches, el código, el amarre, la embarcación, el estado y el precio.",
          "Estado: Pendiente de confirmación, Confirmada, Registrada, Completada o Cancelada.",
          "Las estancias pasadas tienen Valorar tu estancia: elige de 1 a 5 estrellas y escribe unas palabras. Tu opinión aparece en la página de la marina con tu nombre, la inicial de tu apellido y tu embarcación.",
        ],
      },
      {
        heading: "Cancelar una solicitud",
        steps: ["Una reserva que la marina aún no ha confirmado muestra Cancelar solicitud.", "Selecciónalo y confirma. El amarre queda libre para otros; no se ha cobrado nada."],
        points: ["Para cambiar o cancelar una reserva confirmada, contacta con la oficina del muelle de la marina."],
      },
      { heading: "Volver a reservar", text: "Selecciona Reservar amarre arriba para hacer una reserva nueva." },
    ],
  },

  "s.invoices": {
    title: "Facturas",
    summary: "Todas las facturas de tus estancias, lo que aún debes y los recibos de lo que has pagado.",
    who: "Propietarios que han iniciado sesión.",
    sections: [
      {
        heading: "Lo que ves",
        points: [
          "Arriba, el total que aún debes entre tus facturas abiertas.",
          "Cada factura muestra su número, la marina, las fechas de emisión y vencimiento, el importe y su estado: Vence, Pago parcial, Vencida, Pagada o Anulada.",
          "Selecciona una factura para abrirla, pagarla o imprimirla.",
        ],
      },
      { heading: "Cuándo aparecen las facturas", text: "La marina envía una factura cuando confirma una reserva. Los contratos se facturan por adelantado por todo el plazo." },
    ],
  },

  "s.invoice": {
    title: "Factura y recibo",
    summary: "Una factura completa, con los pagos hechos hasta ahora. Págala en línea o imprímela.",
    who: "Propietarios que han iniciado sesión.",
    sections: [
      {
        heading: "Qué incluye",
        points: [
          "A quién se factura y la estancia: embarcación, amarre, fechas y código de reserva.",
          "El cargo del amarre, los extras como combustible o luz y agua por contador, y el total.",
          "Cada pago hecho y el saldo pendiente.",
          "Cuando está totalmente pagada, se convierte en recibo.",
        ],
      },
      {
        heading: "Pagar en línea",
        steps: [
          "Selecciona Pagar y el importe pendiente.",
          "Deja el saldo completo, o escribe un importe menor para pagar una parte.",
          "Selecciona Pagar. La factura muestra Pago parcial, o Pagada cuando no queda nada.",
        ],
        points: ["Vista previa: aún no se cobra ninguna tarjeta. Los pagos con tarjeta se activan cuando la web se conecte con el proveedor de pagos."],
      },
      { heading: "Imprimir", text: "Selecciona Imprimir factura (o Imprimir recibo cuando esté pagada) para imprimirla o guardarla en PDF." },
    ],
  },

  "s.contracts": {
    title: "Contratos",
    summary: "Tus acuerdos de amarre a largo plazo, y cómo firmarlos en línea.",
    who: "Propietarios con un contrato mensual, de temporada o anual que han iniciado sesión.",
    sections: [
      {
        heading: "Lo que ves",
        points: [
          "Cada contrato: marina, código, plazo y fechas, amarre, embarcación y cuota mensual.",
          "Estado: Se renueva solo, Plazo fijo o Terminado.",
          "Si está firmado, y cuándo.",
        ],
      },
      {
        heading: "Leer y firmar",
        steps: [
          "Selecciona Leer y firmar en un contrato pendiente de tu firma.",
          "Lee el amarre, la embarcación, las fechas, la cuota mensual, la renovación y las condiciones.",
          "Escribe tu nombre completo tal como aparece en tu cuenta.",
          "Marca la casilla para confirmar que aceptas y selecciona Firmar contrato.",
        ],
        points: ["La marina ve al momento que lo has firmado."],
      },
    ],
  },

  "s.boats": {
    title: "Mis embarcaciones",
    summary: "Las embarcaciones de tu cuenta, que sirven para mostrarte los amarres donde caben.",
    who: "Propietarios que han iniciado sesión.",
    sections: [
      {
        heading: "Añadir una embarcación",
        steps: ["Selecciona Añadir embarcación.", "Escribe su nombre, tipo, eslora en pies y matrícula (opcional).", "Selecciona Añadir embarcación."],
      },
      {
        heading: "Editar una embarcación",
        steps: ["Selecciona Editar en la embarcación.", "Cambia lo que necesites y selecciona Guardar cambios."],
        points: ["Si la embarcación pasa a ser más larga que un amarre que has reservado, se te pedirá contactar con la marina para cambiar de amarre primero."],
      },
    ],
  },

  "s.profile": {
    title: "Perfil",
    summary: "Tus datos de contacto y tu contraseña.",
    who: "Propietarios que han iniciado sesión.",
    sections: [
      {
        heading: "Tus datos",
        steps: ["Cambia tu nombre completo o tu teléfono.", "Selecciona Guardar cambios."],
        points: ["Para cambiar tu correo, contacta con nosotros."],
      },
      {
        heading: "Cambiar la contraseña",
        steps: ["Escribe tu contraseña actual.", "Escribe dos veces una contraseña nueva (al menos 8 caracteres).", "Selecciona Cambiar contraseña."],
        points: ["La contraseña de la cuenta de demostración no se puede cambiar. Crea tu propia cuenta para elegir una."],
      },
    ],
  },
};
