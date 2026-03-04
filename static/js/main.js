// Inicializa variables REQUERIDAS si no existen
const datosNecesarios = {
    "tiempoEstudioTotal": "0",
    "tiempoDescansoTotal": "0",
    "rachaActual": "0",
    "ultimaRacha": "0",
    "ultimaActividad": new Date().toISOString(),
    "totalPomodorosCompletados": "0"
};

Object.entries(datosNecesarios).forEach(([key, value]) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, value);
});

function getCurrentWeekNumber(date = new Date()) {
    // Copiamos la fecha para no modificar la original
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Establecer al jueves más cercano: el jueves de la semana actual determina el año de la semana
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    // Inicio del año
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calcular número de semana
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Limpiar datos si es una nueva semana
(function limpiarSemanaSiEsNecesario() {
  const semanaActual = getCurrentWeekNumber();
  const semanaGuardada = parseInt(localStorage.getItem('semanaGuardada') || '0', 10);

  if (semanaActual !== semanaGuardada) {
    // 1. Sumar los datos de la semana anterior al mes (si aplica)
    let weeklyData = JSON.parse(localStorage.getItem('weeklyData') || '[0,0,0,0,0,0,0]');
    let monthlyData = JSON.parse(localStorage.getItem('monthlyData') || '[0,0,0,0,0]');
    const semanaMes = (semanaActual - 2) % 5; // semana anterior
    const totalSemana = weeklyData.reduce((a, b) => a + b, 0);
    if (semanaMes >= 0) {
      monthlyData[semanaMes] = parseFloat(totalSemana.toFixed(2));
      localStorage.setItem('monthlyData', JSON.stringify(monthlyData));
    }

    // 2. Limpiar solo los datos semanales para nueva semana
    localStorage.setItem('weeklyData', JSON.stringify([0,0,0,0,0,0,0]));
    // NO limpiar diasProductivos aquí
    localStorage.setItem('semanaGuardada', semanaActual);
  }
})();



// MODAL PARA INICIAR SESIÓN O REGISTRO DE USUARIO - VERSIÓN MEJORADA
let isLoggedIn = localStorage.getItem('ChankandoLoggedIn') === 'true'; 
let username = localStorage.getItem('ChankandoUsername') || 'Usuario';

// Si no hay usuario logueado, mostrar el modal de login
if (!isLoggedIn) {
  setTimeout(() => toggleLoginModal(), 300);
}

// Funciones de autenticación mejoradas
function toggleLoginModal() {
  const loginModal = document.getElementById('loginModal');
  loginModal.classList.toggle('hidden');
  
  // Asegurarse de que el modal de registro esté cerrado
  const registerModal = document.getElementById('registerModal');
  if (!registerModal.classList.contains('hidden')) {
    registerModal.classList.add('hidden');
  }
  
  // Controlar el scroll del body
  document.body.classList.toggle('overflow-hidden', !loginModal.classList.contains('hidden'));
}

function toggleRegisterModal() {
  const registerModal = document.getElementById('registerModal');
  registerModal.classList.toggle('hidden');
  
  // Asegurarse de que el modal de login esté cerrado
  const loginModal = document.getElementById('loginModal');
  if (!loginModal.classList.contains('hidden')) {
    loginModal.classList.add('hidden');
  }
  
  // Controlar el scroll del body
  document.body.classList.toggle('overflow-hidden', !registerModal.classList.contains('hidden'));
}

async function loginUser() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    return Swal.fire({ icon: 'warning', text: 'Ingresa email y contraseña' });
  }

  try {
    const response = await fetch("https://chankando-1.onrender.com/login.php", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    // Primero verificar el tipo de contenido
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Respuesta inesperada: ${text.substring(0, 100)}`);
    }
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Error HTTP: ${response.status}`);
    }
    
    if (result.success) {
      const userId = result.user.id;

      let userRole;
      if (result.user.rol.toLowerCase() === "teacher") {
        userRole = "profesor";
      } else if (result.user.rol.toLowerCase() === "student") {
        userRole = "estudiante";
      } else {
        userRole = "estudiante"; 
      }
      
      localStorage.setItem('ChankandoLoggedIn', 'true');
      localStorage.setItem("ChankandoUserID", userId);
      localStorage.setItem("userId", userId);
      localStorage.setItem('ChankandoUsername', result.user.nombre);
      localStorage.setItem('ChankandoUserRole', userRole);
      localStorage.setItem('username', result.user.nombre);
      localStorage.setItem('userEmail', result.user.email);
      localStorage.setItem('userRole', userRole);
      cargarEstadisticas();

      const loginModal = document.getElementById('loginModal');
      loginModal.classList.add('animate__fadeOut');
      setTimeout(() => {
        loginModal.classList.add('hidden');
        loginModal.classList.remove('animate__fadeOut');
        location.reload();
      }, 500);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: result.error || 'Credenciales incorrectas'
      });
    }
  } catch (err) {
    console.error('Error en login:', err);
    Swal.fire({ 
      icon: 'error', 
      title: 'Error', 
      text: err.message || 'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.' 
    });
  }
}

async function registerUser() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  const role = document.querySelector('input[name="reg-role"]:checked').value;

  // Validación de campos vacíos
  if (!name || !email || !password || !confirmPassword) {
    return Swal.fire({ icon: 'warning', text: 'Completa todos los campos' });
  }

  // VALIDACIÓN DE DOMINIO EN FRONTEND
  const allowedDomains = ["@gmail.com", "@hotmail.com"];
  const isAllowedDomain = allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
  
  if (!isAllowedDomain) {
    return Swal.fire({ 
      icon: 'info', 
      title: 'Correo no válido',
      text: 'Por favor, usa una cuenta @gmail.com o @hotmail.com' 
    });
  }

  if (password !== confirmPassword) {
    return Swal.fire({ icon: 'error', text: 'Las contraseñas no coinciden' });
  }

  const formData = new FormData();
  formData.append("nombre", name);
  formData.append("email", email);
  formData.append("password", password);
  formData.append("rol", role);

  try {
    const response = await fetch("https://chankando-1.onrender.com/registro.php", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    
    if (result.success) {
      // Sweet Alert de éxito mejorado
      await Swal.fire({ 
        icon: 'success', 
        title: '¡Bienvenido!', 
        text: 'Tu cuenta ha sido creada con éxito.',
        timer: 2000,
        showConfirmButton: false
      });

      // Lógica de guardado de rol (Tu código original mejorado)
      const userRole = role.toLowerCase() === "teacher" ? "profesor" : "estudiante";

      // Guardar datos en localStorage
      localStorage.setItem("ChankandoLoggedIn", "true");
      localStorage.setItem("ChankandoUsername", name);
      localStorage.setItem("ChankandoUserRole", userRole);
      localStorage.setItem("username", name);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userRole", userRole);

      location.reload();
    } else {
      // Aquí SweetAlert mostrará el error de "Correo ya registrado" enviado por el PHP
      Swal.fire({ icon: 'error', title: 'Registro fallido', text: result.error });
    }
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No pudimos conectar con el servidor.' });
  }
}

function logout() {
  localStorage.removeItem('ChankandoLoggedIn');
  localStorage.removeItem('ChankandoUsername');
  localStorage.removeItem('ChankandoUserRole');
  location.reload();
}

// Event Listeners mejorados
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('loginModal')) {
      toggleLoginModal();
    }
  });
  
  document.getElementById('registerModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('registerModal')) {
      toggleRegisterModal();
    }
  });
  
  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const loginModal = document.getElementById('loginModal');
      const registerModal = document.getElementById('registerModal');
      
      if (!loginModal.classList.contains('hidden')) {
        toggleLoginModal();
      } else if (!registerModal.classList.contains('hidden')) {
        toggleRegisterModal();
      }
    }
  });
  
  // Manejar radios personalizados
  document.querySelectorAll('input[type="radio"]').forEach(radio => {

    radio.addEventListener('change', function () {
      const customRadio = this.nextElementSibling?.querySelector('div');

      if (!customRadio) return; // ⬅️ evita el error

      if (this.checked) {
        customRadio.classList.add('scale-100');
        customRadio.classList.remove('scale-0');
      }
    });

    // Inicializar radios
    if (radio.checked) {
      const customRadio = radio.nextElementSibling?.querySelector('div');

      if (!customRadio) return;

      customRadio.classList.add('scale-100');
      customRadio.classList.remove('scale-0');
    }
  });
});


//Lógica para vista de profesor
function gestionarInterfazMarketplace() {
    const userRole = localStorage.getItem('ChankandoUserRole'); // "profesor" o "estudiante"
    const filtros = document.getElementById('grupo-filtros-estudiante');
    const btnProfe = document.getElementById('grupo-boton-profesor');

    if (filtros && btnProfe) {
        if (userRole === "profesor") {
            // Ocultamos filtros y mostramos botón de profesor
            filtros.setAttribute('style', 'display: none !important');
            btnProfe.setAttribute('style', 'display: flex !important');
        } else {
            // Mostramos filtros y ocultamos botón de profesor
            filtros.setAttribute('style', 'display: flex !important');
            btnProfe.setAttribute('style', 'display: none !important');
        }
    }
}

// Ejecutamos al cargar
document.addEventListener('DOMContentLoaded', gestionarInterfazMarketplace);
// Re-ejecutamos por si acaso hay cargas lentas
window.onload = gestionarInterfazMarketplace;


/////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// SECCIÓN CALENDARIO ///////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////

function initCalendar() {
  const calendarEl = document.getElementById('calendar-container');
  if (calendarEl) {
    calendar.render();
  }
}

//calendario
let calendarEvents = [];

document.addEventListener('DOMContentLoaded', async function () {
  const calendarEl = document.getElementById('calendar-container');
  if (!calendarEl) return;

  const userId = localStorage.getItem("ChankandoUserID");

  calendarEvents = [];

  if (userId) {
    try {
      const response = await fetch(`https://chankando-1.onrender.com/obtener_eventos.php?usuario_id=${userId}`);
      calendarEvents = await response.json();

      localStorage.setItem("userEvents", JSON.stringify(calendarEvents));
    } catch (error) {
      console.error("Error al cargar eventos:", error);
    }
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'es',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,listWeek'
    },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      list: 'Lista'
    },
    events: calendarEvents
  });

  calendar.render();

  const addEventBtn = document.getElementById('add-event-btn');
  const eventModal = document.getElementById('event-modal');
  const closeEventModalBtn = document.getElementById('close-event-modal');
  const eventForm = document.getElementById('event-form');
  const deleteEventBtn = document.getElementById('delete-event-btn');
  const colorButtons = document.querySelectorAll('#event-color-picker button');

  let selectedColor = '#a8dadc';
  let editingEvent = null;

  function highlightColorBtn(color) {
    colorButtons.forEach(btn => {
      if (btn.dataset.color === color) {
        btn.classList.add('ring-4', 'ring-green-600');
      } else {
        btn.classList.remove('ring-4', 'ring-green-600');
      }
    });
  }

  highlightColorBtn(selectedColor);

  colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      highlightColorBtn(selectedColor);
    });
  });

  addEventBtn.addEventListener('click', () => {
    editingEvent = null;
    eventForm.reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('event-date').value = today;
    document.getElementById('event-time').value = '12:00';
    selectedColor = '#a8dadc';
    highlightColorBtn(selectedColor);
    deleteEventBtn.style.display = 'none';
    eventModal.classList.remove('hidden');
  });

  closeEventModalBtn.addEventListener('click', () => {
    eventModal.classList.add('hidden');
    editingEvent = null;
  });

  eventForm.addEventListener('submit', async e => {
    e.preventDefault();

    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const title = document.getElementById('event-title').value.trim();

    if (!date || !time || !title) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    const startDateTime = date + 'T' + time;

    if (editingEvent) {
      editingEvent.setProp('title', title);
      editingEvent.setStart(startDateTime);
      editingEvent.setProp('color', selectedColor);
    } else {
      try {
        const res = await fetch("https://chankando-1.onrender.com/guardar_evento.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuario_id: userId,
            titulo: title,
            inicio: startDateTime,
            color: selectedColor
          })
        });
        const result = await res.json();
        if (result.success) {
          const newEvent = {
            id: result.id,
            title: title,
            start: startDateTime,
            color: selectedColor
          };
          calendar.addEvent(newEvent);
          
          calendarEvents.push(newEvent);
          localStorage.setItem("userEvents", JSON.stringify(calendarEvents));
          
          if (window.verificarLogros) {
            window.verificarLogros('evento');
            window.verificarLogros('evento-semana');
            window.verificarLogros('evento-color');
            window.verificarLogros('evento-largo');

            if (title.toLowerCase().includes('examen')) {
              window.verificarLogros('evento-examen');
            }
          }
          
        } else {
          Swal.fire({ icon: 'error', text: result.error || 'Error al guardar evento' });
        }
      } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', text: 'Error de conexión al guardar' });
      }
    }

    eventModal.classList.add('hidden');
    editingEvent = null;
  });

  // Función para verificar si un evento es pasado
  function esEventoPasado(fechaEvento) {
    const hoy = new Date();
    const fecha = new Date(fechaEvento);
    
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    
    return fecha < hoy;
  }

  deleteEventBtn.addEventListener('click', async () => {
    if (editingEvent) {
      try {
        const fechaEvento = editingEvent.start;
        const esPasado = esEventoPasado(fechaEvento);

        const res = await fetch("https://chankando-1.onrender.com/eliminar_evento.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evento_id: editingEvent.id })
        });
        const result = await res.json();
        if (result.success) {
          calendarEvents = calendarEvents.filter(event => event.id !== editingEvent.id);
          localStorage.setItem("userEvents", JSON.stringify(calendarEvents));

          editingEvent.remove();
          eventModal.classList.add('hidden');

          if (esPasado) {
            localStorage.setItem('eventoPasadoEliminado', 'true');
          }


          editingEvent = null;

          if (window.verificarLogros) {
            window.verificarLogros('evento');
            window.verificarLogros('evento-semana');
            window.verificarLogros('evento-color');
            window.verificarLogros('evento-examen');
            window.verificarLogros('evento-largo');
            window.verificarLogros('evento-eliminado');
          }
        } else {
          Swal.fire({ icon: 'error', text: result.error || 'Error al eliminar evento' });
        }
      } catch (err) {
        console.error("Error al eliminar evento:", err);
        }
    }
  });

  calendar.on('eventClick', function(info) {
    calendar.setOption('eventDidMount', function(info) {
      info.el.style.cursor = 'pointer';
    });

    editingEvent = info.event;

    document.getElementById('event-date').value = editingEvent.startStr.slice(0,10);
    document.getElementById('event-time').value = editingEvent.startStr.slice(11,16);
    document.getElementById('event-title').value = editingEvent.title;
    selectedColor = editingEvent.backgroundColor || editingEvent.extendedProps.color || '#a8dadc';
    highlightColorBtn(selectedColor);

    deleteEventBtn.style.display = 'inline-block';
    eventModal.classList.remove('hidden');
  });
});

/* HORARIO SEMANAL */
document.addEventListener('DOMContentLoaded', async () => {
  const weeklyScheduleContainer = document.getElementById('weekly-schedule');
  const addClassBtn = document.getElementById('add-class-btn');
  const classModal = document.getElementById('class-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const classForm = document.getElementById('class-form');
  const deleteClassBtn = document.getElementById('delete-class-btn');
  const colorPickerButtons = document.querySelectorAll('#color-picker button');
  const subjectsList = document.getElementById('subjects-list');

  let classes = [];
  let editingClassIndex = null;
  let selectedColor = '#a8dadc';

  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) {
    try {
      const res = await fetch(`https://chankando-1.onrender.com/obtener_clases.php?usuario_id=${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        classes = data;
        localStorage.setItem("userClasses", JSON.stringify(classes));
      }
    } catch (err) {
      console.error("Error al cargar clases:", err);
    }
  }

  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const hours = [...Array(18).keys()].map(h => h + 6);

  // Cargar clases guardadas del servidor
  try {
    const res = await fetch(`https://chankando-1.onrender.com/obtener_clases.php?usuario_id=${userId}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      classes = data;
      localStorage.setItem("userClasses", JSON.stringify(classes));
    
      // VERIFICAR LOGROS INMEDIATAMENTE DESPUÉS DE CARGAR
      setTimeout(() => {
        if (window.verificarLogros) {
          window.verificarLogros('horario-bloques');
        }
      }, 1000);
    }
  } catch (err) {
    console.error("Error al cargar clases:", err);
  }

  // INICIALIZAR SEGUIMIENTO DE CONSISTENCIA
  inicializarSeguimientoConsistencia();
  
  // VERIFICAR CONSISTENCIA INMEDIATAMENTE
  setTimeout(() => {
    verificarConsistenciaAutomatica();
  }, 2000);

  function renderSchedule() {
    if (!weeklyScheduleContainer) return;

    let html = '<table><thead><tr><th>Hora</th>';
    days.forEach(day => {
      html += `<th>${day}</th>`;
    });
    html += '</tr></thead><tbody>';

    hours.forEach(h => {
      const displayHour = h < 12 ? `${h} AM` : (h === 12 ? '12 PM' : `${h - 12} PM`);
      html += `<tr><th>${displayHour}</th>`;
      days.forEach(day => {
        html += `<td class="schedule-cell" data-day="${day}" data-hour="${h}"></td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    weeklyScheduleContainer.innerHTML = html;

    classes.forEach((cl, idx) => {
      const startHour24 = to24Hour(parseInt(cl.startHour), cl.startAMPM);
      const endHour24 = to24Hour(parseInt(cl.endHour), cl.endAMPM);
      const day = cl.day;
      const cells = [...weeklyScheduleContainer.querySelectorAll(`td[data-day="${day}"]`)];
      for (let h = startHour24; h < endHour24; h++) {
        let cell = cells.find(c => parseInt(c.dataset.hour) === h);
        if (!cell) continue;
        if (h === startHour24) {
          const block = document.createElement('div');
          block.className = 'schedule-block';
          block.style.backgroundColor = cl.color;
          block.style.height = (endHour24 - startHour24) * 50 - 2 + 'px';
          block.textContent = cl.name;
          block.title = `${cl.name} (${cl.startHour} ${cl.startAMPM} - ${cl.endHour} ${cl.endAMPM})`;
          block.dataset.idx = idx;
          block.style.cursor = 'pointer';
          block.addEventListener('click', () => openEditModal(idx));
          cell.appendChild(block);
        } else {
          let otherCell = cells.find(c => parseInt(c.dataset.hour) === h);
          if (otherCell) otherCell.style.visibility = 'hidden';
        }
      }
    });
  }

  function to24Hour(hour, ampm) {
    hour = parseInt(hour);
    if (ampm === 'AM') return hour === 12 ? 0 : hour;
    return hour === 12 ? 12 : hour + 12;
  }

  function updateSubjectsList() {
    if (!subjectsList) return;
    const names = [...new Set(classes.map(cl => cl.name))];
    subjectsList.innerHTML = names.length === 0
      ? '<li class="text-gray-400 italic">No hay asignaturas agregadas.</li>'
      : names.map(name => `<li>${name}</li>`).join('');
  }

  function openEditModal(idx = null) {
    editingClassIndex = idx;
    const isEdit = idx !== null;
    const cl = isEdit ? classes[idx] : null;

    document.getElementById('class-name').value = isEdit ? cl.name : '';
    document.getElementById('start-hour').value = isEdit ? cl.startHour : '8';
    document.getElementById('start-ampm').value = isEdit ? cl.startAMPM : 'AM';
    document.getElementById('end-hour').value = isEdit ? cl.endHour : '9';
    document.getElementById('end-ampm').value = isEdit ? cl.endAMPM : 'AM';
    document.getElementById('class-day').value = isEdit ? cl.day : 'Lunes';
    selectedColor = isEdit ? cl.color : '#a8dadc';
    highlightColorButton(selectedColor);
    deleteClassBtn.style.display = isEdit ? 'inline-block' : 'none';
    classModal.style.display = 'flex';
  }

  function closeModal() {
    classModal.style.display = 'none';
    editingClassIndex = null;
  }

  function highlightColorButton(color) {
    colorPickerButtons.forEach(btn => {
      btn.classList.toggle('ring-4', btn.dataset.color === color);
      btn.classList.toggle('ring-blue-500', btn.dataset.color === color);
    });
  }

  if (addClassBtn) addClassBtn.addEventListener('click', () => openEditModal());
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

  if (classForm) {
    classForm.addEventListener('submit', async e => {
      e.preventDefault();

      const name = document.getElementById('class-name').value.trim();
      const startHour = document.getElementById('start-hour').value;
      const startAMPM = document.getElementById('start-ampm').value;
      const endHour = document.getElementById('end-hour').value;
      const endAMPM = document.getElementById('end-ampm').value;
      const day = document.getElementById('class-day').value;

      if (!name) return alert('Por favor, ingresa el nombre de la clase.');

      const start24 = to24Hour(startHour, startAMPM);
      const end24 = to24Hour(endHour, endAMPM);
      if (start24 >= end24) {
        return alert('La hora de fin debe ser mayor que la de inicio.');
      }
      if ((start24 >= 1 && start24 <= 5) || (end24 >= 1 && end24 <= 5)) {
        return Swal.fire({
          icon: 'error',
          title: 'Horario inválido',
          text: 'No se permite horario entre la 1 AM y las 5 AM',
          confirmButtonColor: '#ef4444'
        });
      }

      registrarModificacionHorario();

      const nuevaClase = { name, startHour, startAMPM, endHour, endAMPM, day, color: selectedColor };

      const estadoAntes = classes.length > 0 ? 'con-clases' : 'vacio';

      if (editingClassIndex !== null) {
        classes[editingClassIndex] = nuevaClase;
      } else {
        classes.push(nuevaClase);
      }

      try {
        await fetch("https://chankando-1.onrender.com/guardar_clase.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario_id: userId, clases: classes })
        });

        localStorage.setItem("userClasses", JSON.stringify(classes));

        const estadoDespues = classes.length > 0 ? 'con-clases' : 'vacio';
        const yaInicializado = localStorage.getItem('horarioAnteriorEstado') !== null;
        
        if (yaInicializado && estadoAntes === 'vacio' && estadoDespues === 'con-clases') {
          registrarModificacionHorario();
        }

        // VERIFICAR LOGROS
        if (window.verificarLogros) {
          window.verificarLogros('horario-bloques');
          window.verificarLogros('horario');
          window.verificarLogros('horario-dias');
          window.verificarLogros('horario-nocturno');
          window.verificarLogros('horario-express');
          window.verificarLogros('horario-fin-semana');
          window.verificarLogros('horario-materias');
          window.verificarLogros('horario-actualizado');
          window.verificarLogros('horario-consistente');
          window.verificarLogros('horario-balance');
          window.verificarLogros('horario-completo');
        }

      } catch (err) {
        console.error("Error al guardar clase:", err);
      }

      renderSchedule();
      updateSubjectsList();
      closeModal();
    });
  }

  if (deleteClassBtn) {
    deleteClassBtn.addEventListener('click', async () => {
      if (editingClassIndex !== null) {
        const estadoAntes = classes.length > 0 ? 'con-clases' : 'vacio';
        classes.splice(editingClassIndex, 1);
        try {
          await fetch("https://chankando-1.onrender.com/guardar_clase.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario_id: userId, clases: classes })
          });

          localStorage.setItem("userClasses", JSON.stringify(classes));

          registrarModificacionHorario();

          // VERIFICAR SI SE ELIMINÓ TODAS LAS CLASES (MODIFICACIÓN)
          const estadoDespues = classes.length === 0 ? 'vacio' : 'con-clases';
          
          if (estadoAntes === 'con-clases' && estadoDespues === 'vacio') {
            registrarModificacionHorario();
          }

          // VERIFICAR LOGROS
          if (window.verificarLogros) {
            window.verificarLogros('horario-bloques');
            window.verificarLogros('horario');
            window.verificarLogros('horario-dias');
            window.verificarLogros('horario-nocturno');
            window.verificarLogros('horario-express');
            window.verificarLogros('horario-fin-semana');
            window.verificarLogros('horario-materias');
            window.verificarLogros('horario-actualizado');
            window.verificarLogros('horario-consistente');
            window.verificarLogros('horario-balance');
            window.verificarLogros('horario-completo');
          }

        } catch (err) {
          console.error("Error al eliminar clase:", err);
        }
        renderSchedule();
        updateSubjectsList();
        closeModal();
      }
    });
  }

  colorPickerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      highlightColorButton(selectedColor);
    });
  });

  renderSchedule();
  updateSubjectsList();
  inicializarEstadoHorario();
});


// Función para obtener el número de semana del año
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { semana: weekNo, año: d.getFullYear() };
}

// Función para verificar eventos en la semana actual
function verificarEventosEstaSemana() {
  const eventosGuardados = JSON.parse(localStorage.getItem("userEvents") || "[]");
  const semanaActual = getWeekNumber(new Date());
  
  // Contar eventos de esta semana
  const eventosEstaSemana = eventosGuardados.filter(evento => {
    if (!evento.start) return false;
      
    const fechaEvento = new Date(evento.start);
    const semanaEvento = getWeekNumber(fechaEvento);
        
    return semanaEvento.semana === semanaActual.semana && 
           semanaEvento.año === semanaActual.año;
  });
    
  return eventosEstaSemana.length;
}

// Función para obtener el progreso del logro de semana
function obtenerProgresoEventoSemana() {
  const progreso = verificarEventosEstaSemana();
  return progreso;
}


// Color predeterminado
const COLOR_PREDETERMINADO = '#a8dadc';

// Función para verificar si hay eventos con colores diferentes al predeterminado
function verificarEventoConColorDiferente() {
  const eventosGuardados = JSON.parse(localStorage.getItem("userEvents") || "[]");
    
  // Buscar al menos un evento que no use el color predeterminado
  const eventoConColorDiferente = eventosGuardados.find(evento => {
    const colorEvento = evento.color || evento.backgroundColor;
    return colorEvento && colorEvento.toLowerCase() !== COLOR_PREDETERMINADO.toLowerCase();
  });
    
  const tieneColorDiferente = !!eventoConColorDiferente;

  return tieneColorDiferente ? 1 : 0;
}

// Función para verificar si un color es diferente al predeterminado
function esColorDiferente(color) {
  return color && color.toLowerCase() !== COLOR_PREDETERMINADO.toLowerCase();
}


// Función para contar bloques de horario semanal
function contarBloquesHorario() {
  const clasesGuardadas = JSON.parse(localStorage.getItem("userClasses") || "[]");
  return clasesGuardadas.length;
}

// Función para obtener el progreso de bloques de horario
function obtenerProgresoBloquesHorario() {
  const totalBloques = contarBloquesHorario();
  return totalBloques;
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    if (window.verificarTodosLosLogros) {
      window.verificarTodosLosLogros();
    }
    
    // Verificación específica para horario
    const bloques = contarBloquesHorario();
    
    if (bloques >= 3 && window.verificarLogros) {
      window.verificarLogros('horario-bloques');
    }
  }, 2000);
});


// Función para verificar eventos de examen
function verificarEventoExamen() {
  const eventosGuardados = JSON.parse(localStorage.getItem("userEvents") || "[]");
  
  const eventosExamen = eventosGuardados.filter(evento => {
    const titulo = evento.title || evento.titulo || '';
    return titulo.toLowerCase().includes('examen');
  });
  
  return eventosExamen.length;
}


// Función para verificar eventos de larga duración (3+ días con mismo título)
function verificarEventoLargo() {
  const eventosGuardados = JSON.parse(localStorage.getItem("userEvents") || "[]");
  
  // Agrupar eventos por título
  const eventosPorTitulo = {};
  
  eventosGuardados.forEach(evento => {
    const titulo = (evento.title || evento.titulo || '').trim();
    if (!titulo) return;
    
    if (!eventosPorTitulo[titulo]) {
      eventosPorTitulo[titulo] = [];
    }
    
    const fechaEvento = new Date(evento.start || evento.inicio);
    eventosPorTitulo[titulo].push(fechaEvento);
  });
  
  // Verificar si algún título tiene 3+ eventos en días consecutivos
  let tieneEventoLargo = 0;
  
  Object.keys(eventosPorTitulo).forEach(titulo => {
    const fechas = eventosPorTitulo[titulo]
      .map(fecha => new Date(fecha.setHours(0, 0, 0, 0))) // Normalizar fechas
      .sort((a, b) => a - b); // Ordenar cronológicamente
    
    
    // Buscar secuencias de 3+ días consecutivos
    for (let i = 0; i <= fechas.length - 3; i++) {
      const fecha1 = fechas[i];
      const fecha2 = new Date(fecha1);
      fecha2.setDate(fecha2.getDate() + 1);
      
      const fecha3 = new Date(fecha1);
      fecha3.setDate(fecha3.getDate() + 2);
      
      // Verificar si existen los 3 días consecutivos
      const tieneDia2 = fechas.some(f => 
        f.getTime() === fecha2.getTime()
      );
      
      const tieneDia3 = fechas.some(f => 
        f.getTime() === fecha3.getTime()
      );
      
      if (tieneDia2 && tieneDia3) {
        tieneEventoLargo = 1;
        break;
      }
    }
  });
  
  return tieneEventoLargo;
}


// Función para verificar si se eliminó algún evento pasado
function verificarEventoPasadoEliminado() {
  const eventoPasadoEliminado = localStorage.getItem('eventoPasadoEliminado') === 'true';
  return eventoPasadoEliminado ? 1 : 0;
}


// Función para verificar si el horario está establecido
function verificarHorarioEstablecido() {
  const clasesGuardadas = JSON.parse(localStorage.getItem("userClasses") || "[]");
  const diasRequeridos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  // Verificar qué días tienen al menos una clase
  const diasConClases = {};
  diasRequeridos.forEach(dia => {
    diasConClases[dia] = clasesGuardadas.some(clase => clase.day === dia);
  });
  
  // Contar cuántos días tienen clases
  const diasCompletados = Object.values(diasConClases).filter(tieneClase => tieneClase).length;
  
  return diasCompletados;
}


// Función para verificar clases en días diferentes
function verificarClasesEnDiasDiferentes() {
  const clasesGuardadas = JSON.parse(localStorage.getItem("userClasses") || "[]");
  const diasConClases = [...new Set(clasesGuardadas.map(clase => clase.day))];
  
  return diasConClases.length;
}


function to24Hour(hour, ampm) {
  hour = parseInt(hour);
  
  let resultado;
  if (ampm === 'AM') {
    resultado = hour === 12 ? 0 : hour;
  } else {
    resultado = hour === 12 ? 12 : hour + 12;
  }
  
  return resultado;
}

function verificarClaseNocturna() {
  const clasesGuardadas = JSON.parse(localStorage.getItem("userClasses") || "[]");
  
  const tieneClaseNocturna = clasesGuardadas.some(clase => {
    const horaInicio = to24Hour(parseInt(clase.startHour), clase.startAMPM);
    const horaFin = to24Hour(parseInt(clase.endHour), clase.endAMPM);
    
    // Verificar si la clase ocurre durante la noche (6PM-11PM)
    const esNocturna = 
      (horaInicio >= 18 && horaInicio <= 23) ||  // Comienza en la noche
      (horaFin > 18 && horaFin <= 23) ||         // Termina en la noche
      (horaInicio < 18 && horaFin > 18);         // Cruza hacia la noche
    
    return esNocturna;
  });
  
  return tieneClaseNocturna ? 1 : 0;
}


function verificarClaseExpress() {
  const clasesGuardadas = JSON.parse(localStorage.getItem("userClasses") || "[]");
  
  const tieneClaseExpress = clasesGuardadas.some(clase => {
    const start24 = to24Hour(parseInt(clase.startHour), clase.startAMPM);
    const end24 = to24Hour(parseInt(clase.endHour), clase.endAMPM);
    const duracion = end24 - start24;
    return duracion === 1; // Exactamente 1 hora
  });
  
  return tieneClaseExpress ? 1 : 0;
}


// Función para contar materias diferentes
function verificarMateriasDiferentes() {
  const clasesGuardadas = JSON.parse(localStorage.getItem("userClasses") || "[]");
  
  // Obtener nombres únicos de materias (case insensitive)
  const materiasUnicas = [...new Set(clasesGuardadas.map(clase => 
    clase.name.trim().toLowerCase()
  ))];
  
  return materiasUnicas.length;
}


// Función para verificar modificaciones del horario (eliminar todas las clases)
function verificarHorarioActualizado() {
  const modificaciones = parseInt(localStorage.getItem('horarioModificaciones') || '0');
  return modificaciones;
}

// Función para registrar una modificación
function registrarModificacionHorario() {
  const clasesActuales = JSON.parse(localStorage.getItem("userClasses") || "[]");
  const modificacionesAnteriores = parseInt(localStorage.getItem('horarioModificaciones') || '0');
  
  // Solo registrar modificación si el horario estaba vacío previamente
  // y ahora tiene clases, o viceversa
  const horarioEstabaVacio = localStorage.getItem('horarioAnteriorEstado') === 'vacio';
  const horarioEstaVacio = clasesActuales.length === 0;
  
  console.log(`📊 Estado horario - Antes: ${horarioEstabaVacio ? 'vacío' : 'con clases'}, Ahora: ${horarioEstaVacio ? 'vacío' : 'con clases'}`);
  
  // Si el horario pasa de tener clases a estar vacío, contar como modificación
  if (!horarioEstabaVacio && horarioEstaVacio) {
    const nuevasModificaciones = modificacionesAnteriores + 1;
    localStorage.setItem('horarioModificaciones', nuevasModificaciones.toString());
    console.log(`✅ ¡Modificación registrada! Total: ${nuevasModificaciones}/3`);
    
    // Mostrar notificación de progreso
    if (nuevasModificaciones <= 3) {
      Swal.fire({
        icon: 'info',
        title: 'Horario Actualizado',
        text: `Has modificado tu horario ${nuevasModificaciones} de 3 veces`,
        timer: 2000,
        showConfirmButton: false
      });
    }
  }
  
  // Guardar estado actual para la próxima verificación
  localStorage.setItem('horarioAnteriorEstado', horarioEstaVacio ? 'vacio' : 'con-clases');
}

// Función para inicializar el estado del horario (ejecutar al cargar la página)
function inicializarEstadoHorario() {
  const clasesActuales = JSON.parse(localStorage.getItem("userClasses") || "[]");
  const estadoActual = clasesActuales.length === 0 ? 'vacio' : 'con-clases';
  
  // Si es la primera vez, inicializar el estado anterior
  if (!localStorage.getItem('horarioAnteriorEstado')) {
    localStorage.setItem('horarioAnteriorEstado', estadoActual);
    console.log('🔄 Estado inicial del horario guardado:', estadoActual);
  }
  
  // Inicializar contador si no existe
  if (!localStorage.getItem('horarioModificaciones')) {
    localStorage.setItem('horarioModificaciones', '0');
  }
}


// Función para verificar consistencia del horario
function verificarConsistenciaHorario() {
  const ultimaModificacion = localStorage.getItem('horarioUltimaModificacion');
  const semanasConsistentes = parseInt(localStorage.getItem('horarioSemanasConsistentes') || '0');
  
  if (!ultimaModificacion) {
    return 0;
  }
  
  const fechaUltimaMod = new Date(ultimaModificacion);
  const fechaActual = new Date();
  const diferenciaSemanas = calcularDiferenciaSemanas(fechaUltimaMod, fechaActual);
  
  // Retornar el máximo entre las semanas consistentes actuales y el histórico
  return Math.min(Math.max(diferenciaSemanas, semanasConsistentes), 2);
}

// Función para calcular diferencia en semanas
function calcularDiferenciaSemanas(fechaInicio, fechaFin) {
  const diffTiempo = fechaFin - fechaInicio;
  const diffSemanas = Math.floor(diffTiempo / (1000 * 60 * 60 * 24 * 7));
  return diffSemanas;
}

// Función para registrar modificación del horario
function registrarModificacionHorario() {
  const fechaActual = new Date().toISOString();
  localStorage.setItem('horarioUltimaModificacion', fechaActual);
  
  // Obtener semanas consistentes actuales
  const ultimaModificacionAnterior = localStorage.getItem('horarioUltimaModificacion');
  let semanasConsistentes = 0;
  
  if (ultimaModificacionAnterior) {
    const fechaAnterior = new Date(ultimaModificacionAnterior);
    const fechaActualObj = new Date();
    semanasConsistentes = calcularDiferenciaSemanas(fechaAnterior, fechaActualObj);
  }
  
  // Guardar el máximo histórico de semanas consistentes
  const maxSemanasHistorico = parseInt(localStorage.getItem('horarioSemanasConsistentes') || '0');
  if (semanasConsistentes > maxSemanasHistorico) {
    localStorage.setItem('horarioSemanasConsistentes', semanasConsistentes.toString());
  }
}

// Función para inicializar el seguimiento de consistencia
function inicializarSeguimientoConsistencia() {
  if (!localStorage.getItem('horarioUltimaModificacion')) {
    // Si es la primera vez, registrar la fecha actual
    const clases = JSON.parse(localStorage.getItem("userClasses") || "[]");
    if (clases.length > 0) {
      // Si ya hay clases, registrar la fecha actual como última modificación
      registrarModificacionHorario();
    }
  }
}

// Función para verificar consistencia periódicamente
function verificarConsistenciaAutomatica() {
  const progreso = verificarConsistenciaHorario();
  
  if (progreso >= 2 && window.verificarLogros) {
    window.verificarLogros('horario-consistente');
  }
  
  return progreso;
}

// Verificar consistencia cada 24 horas
function iniciarVerificacionPeriodica() {
  // Verificar una vez al día
  setInterval(() => {
    verificarConsistenciaAutomatica();
  }, 24 * 60 * 60 * 1000); // 24 horas
  
  // También verificar cuando el usuario vuelve a la página
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      verificarConsistenciaAutomatica();
    }
  });
}

// Iniciar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(iniciarVerificacionPeriodica, 5000);
});


// Función para calcular balance entre estudio y descanso
function verificarBalanceEstudioDescanso() {
  const clasesGuardadas = JSON.parse(localStorage.getItem("userClasses") || "[]");
  
  const HORAS_TOTALES_SEMANA = 126; // 18 horas × 7 días
  const HORAS_EQUILIBRIO = 63; // Mitad de 126
  
  // Calcular horas de estudio por día
  const horasEstudioPorDia = {
    'Lunes': 0,
    'Martes': 0,
    'Miércoles': 0,
    'Jueves': 0,
    'Viernes': 0,
    'Sábado': 0,
    'Domingo': 0
  };
  
  // Sumar horas de estudio por día
  clasesGuardadas.forEach(clase => {
    const horasClase = calcularHorasClase(clase);
    if (horasEstudioPorDia[clase.day] !== undefined) {
      horasEstudioPorDia[clase.day] += horasClase;
    }
  });
  
  // Calcular totales
  let totalHorasEstudio = 0;
  let totalHorasDescanso = 0;
  
  Object.keys(horasEstudioPorDia).forEach(dia => {
    const horasEstudioDia = horasEstudioPorDia[dia];
    const horasDescansoDia = 18 - horasEstudioDia; // 18 horas disponibles por día
    
    totalHorasEstudio += horasEstudioDia;
    totalHorasDescanso += horasDescansoDia;
  });
  
  // Verificar si hay equilibrio perfecto (±1 hora de tolerancia)
  const diferencia = Math.abs(totalHorasEstudio - totalHorasDescanso);
  const tieneBalancePerfecto = diferencia <= 1; // Tolerancia de ±1 hora
  
  return tieneBalancePerfecto ? 1 : 0;
}


// Función auxiliar para calcular horas de una clase (mejorada)
function calcularHorasClase(clase) {
  const start24 = to24Hour(parseInt(clase.startHour), clase.startAMPM);
  const end24 = to24Hour(parseInt(clase.endHour), clase.endAMPM);
  
  // Calcular diferencia en horas
  let horas = end24 - start24;
  
  // Si la clase cruza medianoche (raro pero posible)
  if (horas < 0) {
    horas += 24;
  }
  
  // Asegurar que esté dentro del rango válido (6AM-12PM)
  const horaInicioValida = start24 >= 6 && start24 <= 23;
  const horaFinValida = end24 >= 7 && end24 <= 24;

  return horas;
}


function verificarClaseFinSemana() {
  const clasesGuardadas = JSON.parse(localStorage.getItem("userClasses") || "[]");
  
  const tieneClaseFinSemana = clasesGuardadas.some(clase => {
    return clase.day === 'Sábado' || clase.day === 'Domingo';
  });
  
  return tieneClaseFinSemana ? 1 : 0;
}


// Función para verificar horario maestro (3+ clases cada día)
function verificarHorarioMaestro() {
  const clasesGuardadas = JSON.parse(localStorage.getItem("userClasses") || "[]");
  
  // Todos los días de la semana
  const todosLosDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  // Contar clases por día
  const clasesPorDia = {};
  todosLosDias.forEach(dia => {
    clasesPorDia[dia] = clasesGuardadas.filter(clase => clase.day === dia);
  });
  
  // Verificar qué días tienen al menos 3 clases
  const diasCompletos = {};
  let diasCumplidos = 0;
  
  todosLosDias.forEach(dia => {
    const cantidadClases = clasesPorDia[dia].length;
    const cumpleRequisito = cantidadClases >= 3;
    
    diasCompletos[dia] = cumpleRequisito;
    if (cumpleRequisito) {
      diasCumplidos++;
    }
  });

  return diasCumplidos;
}


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// SECCIÓN POMODORO //////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let timerInterval;
let isPaused = true;
let totalTime = 25 * 60;
let remainingTime = totalTime;
let isBreak = false;
let startTime;

function updateTimerDisplay() {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  document.getElementById('timer-display').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
  isPaused = false;
  document.getElementById('start-timer').classList.add('hidden');
  document.getElementById('pause-timer').classList.remove('hidden');

  startTime = Date.now() - ((totalTime - remainingTime) * 1000);

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    remainingTime = totalTime - elapsed;

    if (remainingTime <= 0) {
      remainingTime = 0;
      updateTimerDisplay();
      clearInterval(timerInterval);
      console.log('¡El temporizador llegó a 0!');
      timerCompleted();
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const min = String(Math.floor(remainingTime / 60)).padStart(2, '0');
  const sec = String(remainingTime % 60).padStart(2, '0');
  const display = document.getElementById('timer-display');
  if (display) display.textContent = `${min}:${sec}`;
}

function pauseTimer() {
  if (!isPaused && !isBreak && remainingTime < parseInt(document.getElementById('pomodoro-time').value, 10) * 60) {
    saveInterruptedSession();
  }
  isPaused = true;
  clearInterval(timerInterval);
  document.getElementById('pause-timer').classList.add('hidden');
  document.getElementById('start-timer').classList.remove('hidden');
}

function resetTimer() {
  if (!isPaused && !isBreak && remainingTime < parseInt(document.getElementById('pomodoro-time').value, 10) * 60) {
    saveInterruptedSession();
  }
  clearInterval(timerInterval);
  isPaused = true;
  isBreak = false;
  document.getElementById('pause-timer').classList.add('hidden');
  document.getElementById('start-timer').classList.remove('hidden');
  document.getElementById('timer-label').textContent = 'Tiempo de estudio';
  remainingTime = parseInt(document.getElementById('pomodoro-time').value, 10) * 60;
  updateTimerDisplay();
}

function saveInterruptedSession() {
  const now = new Date();
  const session = {
    date: now.toISOString(),
    time: formatTime(now),
    duration: `${Math.floor((parseInt(document.getElementById('pomodoro-time').value, 10) * 60 - remainingTime) / 60)} min`,
    status: 'Interrumpido'
  };
  const sessions = getPomodoroSessions();
  sessions.push(session);
  savePomodoroSessions(sessions);
  renderPomodoroHistory();
  renderPomodoroFullHistory();
  reconstruirEstadisticasDeHoy();
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return {
    semana: 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7),
    year: d.getFullYear()
  };
}

async function timerCompleted() {
  const autoStartBreaks = document.getElementById('auto-start-breaks').checked;
  const now = new Date();
  const hoy = now.toISOString().split('T')[0]; 

  if (!isBreak) {
    const duration = parseInt(document.getElementById('pomodoro-time').value, 10);
    const session = {
      date: now.toISOString(),
      time: formatTime(now),
      duration: `${duration} min`,
      status: 'Completado'
    };

    const sessions = getPomodoroSessions();
    sessions.push(session);
    savePomodoroSessions(sessions);
    renderPomodoroHistory();
    renderPomodoroFullHistory();
    updateTodayStats(duration);

    if (session.status === 'Completado') {
      console.log('Sesión completada');
      sumarSesionCompletada();
      sumarMinutosTiempoTotal(duration);

      const profileModal = document.getElementById("profile-modal");
      if (profileModal && !profileModal.classList.contains('hidden')) {
        cargarDatosPerfil();
      }
      
      // Actualizar estadísticas de Pomodoro
      const pomodorosHoy = parseInt(localStorage.getItem('pomodorosHoy') || '0') + 1;
      localStorage.setItem('pomodorosHoy', pomodorosHoy.toString());  

      const data = obtenerStatsUsuario();
      if (data) {
        localStorage.setItem('totalPomodorosCompletados', data.stats.totales.sesiones.toString());
      }

      setTimeout(async () => {
        await otorgarLogroSemanaPerfecta();
      }, 500);

      window.marcarDiaDeRacha?.();

      if (window.marcarDiaDeRacha) {
        await window.marcarDiaDeRacha();
      }
      
      if (duration >= 60) {
        const pomodorosLargos = parseInt(localStorage.getItem('pomodorosLargos') || '0') + 1;
        localStorage.setItem('pomodorosLargos', pomodorosLargos.toString());
        window.verificarLogros("pomodoro-largo");
      }

      const horaActual = new Date().getHours();
      if (horaActual < 8) {
        const pomodorosTemprano = parseInt(localStorage.getItem('pomodorosTemprano') || '0') + 1;
        localStorage.setItem('pomodorosTemprano', pomodorosTemprano.toString());
        window.verificarLogros("pomodoro-temprano");
      }

      const now = new Date();
      const diaSemana = now.getDay(); 
      
      if (diaSemana === 0 || diaSemana === 6) {
        const semanaYear = getWeekNumber(now);
        const key = `finSemana_${semanaYear.semana}_${semanaYear.year}`;
        
        const registroGuardado = JSON.parse(localStorage.getItem(key) || "{}");
        const registro = {
          sabado: registroGuardado.sabado || false,
          domingo: registroGuardado.domingo || false
        };
        
        if (diaSemana === 6) registro.sabado = true;
        if (diaSemana === 0) registro.domingo = true;
        
        localStorage.setItem(key, JSON.stringify(registro));
        window.verificarLogros("fin-semana");
      }

      // Actualizar Pomodoros seguidos
      const ultimoPomodoro = localStorage.getItem('ultimoPomodoroFecha');
      if (ultimoPomodoro === hoy) {
        const seguidos = parseInt(localStorage.getItem('pomodorosSeguidos') || '0') + 1;
        localStorage.setItem('pomodorosSeguidos', seguidos.toString());
      } else {
        localStorage.setItem('pomodorosSeguidos', '1');
      }
      localStorage.setItem('ultimoPomodoroFecha', hoy);
      
      // Actualizar total de Pomodoros
      const totalPomodoros = parseInt(localStorage.getItem('totalPomodorosCompletados') || '0') + 1;
      localStorage.setItem('totalPomodorosCompletados', totalPomodoros.toString());
      
      // Verificar cierre semanal
      verificarYLimpiarSemana();

      window.verificarLogros("pomodoro");
      window.verificarLogros("pomodoro-dia");
      window.verificarLogros("pomodoro-total");
      window.verificarLogros("pomodoro-seguidas");
      window.verificarLogros("pomodoro-largo");
      window.verificarLogros("pomodoro-temprano");

      window.verificarLogros('tiempo-dia');
      window.verificarLogros('tiempo-total');
      window.verificarLogros('tiempo-largo');
      window.verificarLogros('tiempo-tarde');
      window.verificarLogros('tiempo-consistente');
      window.verificarLogros('tiempo-fin-semana');
      window.verificarLogros('tiempo-descanso');
    }

    const minutosEstudio = parseInt(document.getElementById('pomodoro-time').value, 10);
    console.log('Registrando tiempo de estudio:', minutosEstudio);
      
    if (window.agregarEstudio) {
      await window.agregarEstudio(minutosEstudio);
    } else {
      console.error('Función agregarEstudio no disponible');
      throw new Error('No se pudo registrar el tiempo de estudio');
    }

    // Lógica para Ritmo Perfecto (al completar sesión)
    const ultimoTipo = localStorage.getItem('pomodoroRitmoUltimoTipo');
    const ritmoFecha = localStorage.getItem('pomodoroRitmoFecha');
    
    if (ultimoTipo === 'break' && ritmoFecha === hoy) {
      // Si el último fue descanso y es el mismo día, preparar para contar
      localStorage.setItem('pomodoroRitmoSesionPendiente', 'true');
    } else if (ritmoFecha !== hoy) {
      // Nuevo día, reiniciar contador
      localStorage.setItem('pomodoroRitmo', '0');
      localStorage.setItem('pomodoroRitmoSesionPendiente', 'true');
    }

    localStorage.setItem('pomodoroRitmoUltimoTipo', 'session');
    localStorage.setItem('pomodoroRitmoSesionValida', 'true');

    isBreak = true;
    document.getElementById('timer-label').textContent = 'Tiempo de descanso';
    remainingTime = parseInt(document.getElementById('break-time').value, 10) * 60;
  } else {
    isBreak = false;
    document.getElementById('timer-label').textContent = 'Tiempo de estudio';
    remainingTime = parseInt(document.getElementById('pomodoro-time').value, 10) * 60;
    
    const sesionPendiente = localStorage.getItem('pomodoroRitmoSesionPendiente') === 'true';
    const ritmoFecha = localStorage.getItem('pomodoroRitmoFecha');
    let ritmoActual = parseInt(localStorage.getItem('pomodoroRitmo') || '0');

    if (sesionPendiente && ritmoFecha === hoy) {
      ritmoActual += 1;
      localStorage.setItem('pomodoroRitmo', ritmoActual.toString());
      
      if (ritmoActual >= 5) {
        window.verificarLogros("pomodoro-ritmo");
      }
    } else if (ritmoFecha !== hoy) {
      ritmoActual = 0;
      localStorage.setItem('pomodoroRitmo', '0');
    }
    
    localStorage.setItem('pomodoroRitmoSesionPendiente', 'false');
    localStorage.setItem('pomodoroRitmoUltimoTipo', 'break');
    localStorage.setItem('pomodoroRitmoFecha', hoy);

    isBreak = false;
    document.getElementById('timer-label').textContent = 'Tiempo de estudio';
    remainingTime = parseInt(document.getElementById('pomodoro-time').value, 10) * 60;
  }

  updateTimerDisplay();

  if (autoStartBreaks) {
    startTimer(); 
  } else {
    isPaused = true;
    document.getElementById('pause-timer').classList.add('hidden');
    document.getElementById('start-timer').classList.remove('hidden');
  }
}

// Event listeners para el Pomodoro
const startTimerBtn = document.getElementById('start-timer');
if (startTimerBtn) {
    startTimerBtn.addEventListener('click', startTimer);
}
const pauseTimerBtn = document.getElementById('pause-timer');
if (pauseTimerBtn) {
    pauseTimerBtn.addEventListener('click', pauseTimer);
}
const resetTimerBtn = document.getElementById('reset-timer');
if (resetTimerBtn) {
    resetTimerBtn.addEventListener('click', resetTimer);
}

const pomodoroPlusBtn = document.getElementById('pomodoro-plus');
if (pomodoroPlusBtn) {
  pomodoroPlusBtn.addEventListener('click', function() {
    const input = document.getElementById('pomodoro-time');
    let value = parseInt(input.value, 10);
    if (value < 120) {
      input.value = value + 1;
      if (!isBreak) {
        remainingTime = parseInt(input.value, 10) * 60;
        updateTimerDisplay();
      }
    }
  });
}

const pomodoroMinusBtn = document.getElementById('pomodoro-minus');
if (pomodoroMinusBtn) {
  pomodoroMinusBtn.addEventListener('click', function() {
    const input = document.getElementById('pomodoro-time');
    let value = parseInt(input.value, 10);
    if (value > 1) { // mínimo 25
      input.value = value - 1;
      if (!isBreak) {
        remainingTime = parseInt(input.value, 10) * 60;
        updateTimerDisplay();
      }
    }
  });
}

const pomodoroTimeInput = document.getElementById('pomodoro-time');
if (pomodoroTimeInput) {
  pomodoroTimeInput.addEventListener('input', function() {
    let value = parseInt(this.value, 10);

    if (isNaN(value) || value < 25) {
      value = 25;
    } else if (value > 120) {
      value = 120;
    }
    this.value = value;

    if (!isBreak) {
      remainingTime = value * 60;
      updateTimerDisplay();
    }
  });
}

const breakTimeInput = document.getElementById('break-time');
if (breakTimeInput) {
  breakTimeInput.addEventListener('input', function() {
    let value = parseInt(this.value, 10);

    if (isNaN(value) || value < 5) {
      value = 5;
    } else if (value > 15) {
      value = 15;
    }
    this.value = value;

    if (isBreak) {
      remainingTime = value * 60;
      updateTimerDisplay();
    }
  });
}

const breakPlusBtn = document.getElementById('break-plus');
if (breakPlusBtn) {
  breakPlusBtn.addEventListener('click', function() {
    const input = document.getElementById('break-time');
    let value = parseInt(input.value, 10);
    if (value < 15) { // máximo 15
      input.value = value + 1;
      if (isBreak && isPaused) {
        remainingTime = parseInt(input.value, 10) * 60;
        updateTimerDisplay();
      }
    }
  });
}

const breakMinusBtn = document.getElementById('break-minus');
if (breakMinusBtn) {
  breakMinusBtn.addEventListener('click', function() {
    const input = document.getElementById('break-time');
    let value = parseInt(input.value, 10);
    if (value > 1) { // mínimo 5
      input.value = value - 1;
      if (isBreak && isPaused) {
        remainingTime = parseInt(input.value, 10) * 60;
        updateTimerDisplay();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const showBtn = document.getElementById('show-full-history');
  const modal = document.getElementById('full-history-modal');
  const closeBtn = document.getElementById('close-full-history');

  if (showBtn && modal && closeBtn) {
    showBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  }
  const pomodoroSection = document.getElementById('pomodoro-section');
  if (!pomodoroSection) return;

  const observer = new MutationObserver(() => {
    if (!pomodoroSection.classList.contains('hidden')) {
      renderPomodoroHistory();
      renderPomodoroFullHistory();
      renderTodayStats();

      const btnSemanal = document.getElementById('btnSemanal');
      if (btnSemanal) btnSemanal.click();
    }
  });

  observer.observe(pomodoroSection, {
    attributes: true,
    attributeFilter: ['class']
  });

  console.log('✅ Forzando renderizado inicial de sesiones...');
  renderPomodoroHistory();
  renderPomodoroFullHistory();
  renderTodayStats();
});

const pomodoroInfoBtn = document.getElementById('pomodoro-info-btn');
if (pomodoroInfoBtn) {
  pomodoroInfoBtn.addEventListener('click', function() {
    document.getElementById('pomodoro-info-modal').classList.remove('hidden');
  });
}

const closePomodoroInfoBtn = document.getElementById('close-pomodoro-info');
if (closePomodoroInfoBtn) {
  closePomodoroInfoBtn.addEventListener('click', function() {
    document.getElementById('pomodoro-info-modal').classList.add('hidden');
  });
}

const pomodoroInfoModal = document.getElementById('pomodoro-info-modal');
if (pomodoroInfoModal) {
  pomodoroInfoModal.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.add('hidden');
    }
  });
}

// Utilidades para formatear fecha y hora
function formatShortDate(isoString) {
  if (!isoString) return '--/--/----';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoString)) return isoString;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '--/--/----';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(date) {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Cargar sesiones desde localStorage
function getPomodoroSessions() {
  return JSON.parse(localStorage.getItem('pomodoroSessions') || '[]');
}

// Guardar sesiones en localStorage
function savePomodoroSessions(sessions) {
  localStorage.setItem('pomodoroSessions', JSON.stringify(sessions));
}

function renderPomodoroHistory() {
  const sessions = getPomodoroSessions();
  const lastFive = sessions.slice(-5).reverse();
  const tbody = document.getElementById('pomodoro-session-history');
  tbody.innerHTML = '';
  lastFive.forEach(session => {
    // Si la fecha es ISO, la convertimos
    const formattedDate = formatShortDate(session.date);
    tbody.innerHTML += `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formattedDate}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${session.time}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${session.duration}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${session.status === 'Completado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${session.status}</span>
        </td>
      </tr>
    `;
  });
}

// Renderizar historial completo
function renderPomodoroFullHistory() {
  const sessions = getPomodoroSessions().slice().reverse();
  const tbody = document.getElementById('pomodoro-full-history');
  tbody.innerHTML = '';
  sessions.forEach(session => {
    const formattedDate = formatShortDate(session.date);
    tbody.innerHTML += `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${formattedDate}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${session.time}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${session.duration}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${session.status.toLowerCase().trim() === 'completado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${session.status}</span>
        </td>
      </tr>
    `;
  });
}

// Estadísticas de hoy
function getTodayKey() {
  return formatShortDate(new Date());
}

function getAllDailyStats() {
  return JSON.parse(localStorage.getItem('pomodoroDailyStats') || '{}');
}

function saveAllDailyStats(stats) {
  localStorage.setItem('pomodoroDailyStats', JSON.stringify(stats));
}

function getTodayStats() {
  const stats = getAllDailyStats();
  const today = getTodayKey();
  if (!stats[today]) {
    stats[today] = { sessions: 0, totalMinutes: 0, averageMinutes: 0 };
    saveAllDailyStats(stats);
  }
  return stats[today];
}

function updateTodayStats(durationMinutes) {
  const stats = getAllDailyStats();
  const today = getTodayKey();
  if (!stats[today]) {
    stats[today] = { sessions: 0, totalMinutes: 0, averageMinutes: 0 };
  }
  stats[today].sessions += 1;
  stats[today].totalMinutes += durationMinutes;
  stats[today].averageMinutes = Math.round(stats[today].totalMinutes / stats[today].sessions);
  saveAllDailyStats(stats);
  renderTodayStats();
  sincronizarEstadisticasPomodoro();
}

function reconstruirEstadisticasDeHoy() {
  const sessions = getPomodoroSessions();
  const today = getTodayKey();
  const completadasHoy = sessions.filter(s => {
    const fecha = isNaN(Date.parse(s.date)) ? s.date : formatShortDate(new Date(s.date));
    return fecha === today && s.status.toLowerCase().trim() === 'completado';
  });

  const totalMinutos = completadasHoy.reduce((sum, s) => sum + parseInt(s.duration), 0);

  const stats = {
    sessions: completadasHoy.length,
    totalMinutes: totalMinutos,
    averageMinutes: completadasHoy.length > 0
      ? Math.round(totalMinutos / completadasHoy.length)
      : 0
  };

  const allStats = getAllDailyStats();
  allStats[today] = stats;

  const diaNombre = new Date().toLocaleDateString('es-ES', { weekday: 'long' });

  saveAllDailyStats(allStats);
  renderTodayStats();
  sincronizarEstadisticasPomodoro();
  cargarEstadisticas();
}

function renderTodayStats() {
  const stats = getTodayStats();
  document.getElementById('today-sessions').textContent = stats.sessions;
  document.getElementById('today-total').textContent = stats.totalMinutes > 0
    ? `${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`
    : '0';
  document.getElementById('today-average').textContent = stats.averageMinutes > 0
    ? `${stats.averageMinutes}m`
    : '0';
}

async function sincronizarEstadisticasPomodoro() {
  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) return;

  const stats = getTodayStats();
  const fechaHoy = new Date().toISOString().split('T')[0];

  try {
    const res = await fetch("https://chankando-1.onrender.com/guardar_estadisticas_pomodoro.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario_id: parseInt(userId),
        fecha: fechaHoy,
        sesiones: stats.sessions,
        minutos_totales: stats.totalMinutes,
        minutos_promedio: stats.averageMinutes
      })
    });

    const result = await res.json();
    if (!result.success) {
      console.error("Error al sincronizar estadísticas:", result.error);
    }
  } catch (err) {
    console.error("Fallo de red al sincronizar estadísticas:", err);
  }
}

async function cargarEstadisticas() {
  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) return;

  const hoy = new Date().toISOString().split("T")[0];

  try {
    const res = await fetch(`https://chankando-1.onrender.com/obtener_estadisticas_pomodoro.php?usuario_id=${userId}&fecha=${hoy}`);
    const data = await res.json();

    if (data.success && data.data) {
      const stats = {
        sessions: data.data.sesiones,
        totalMinutes: data.data.minutos_totales,
        averageMinutes: data.data.minutos_promedio
      };

      const key = formatShortDate(new Date());
      const allStats = getAllDailyStats();
      allStats[key] = stats;
      saveAllDailyStats(allStats);

      renderTodayStats();
    } else {
      console.log("No hay estadísticas para hoy en BD:", data.error);
    }
  } catch (err) {
    console.error("Error al cargar estadísticas desde BD:", err);
  }
}


// Función para obtener horas totales de estudio 
function obtenerHorasTotalesEstudio() {
  const data = obtenerStatsUsuario();
  if (!data) return 0;
  
  const horasTotales = data.stats.totales.tiempo / 60; 
  return horasTotales;
}

// Función para obtener horas de estudio de hoy
function obtenerHorasEstudioHoy() {
  const stats = getTodayStats();
  const horasHoy = stats.totalMinutes / 60; // Convertir minutos a horas
  return horasHoy;
}

// Logro 61: Maratón de estudio (5+ horas en un día)
function verificarMaratonEstudio() {
  const horasHoy = obtenerHorasEstudioHoy();
  const progreso = Math.min(horasHoy, 5);
  return progreso;
}

// Logros 62-65: Horas totales acumuladas
function verificarHorasTotalesEstudio() {
  const horasTotales = obtenerHorasTotalesEstudio();
  return horasTotales;
}

// Logro 66: Sesión Larga (60+ minutos)
function verificarSesionLarga() {
  const sesiones = getPomodoroSessions();
  const tieneSesionLarga = sesiones.some(session => {
    if (session.status !== 'Completado') return false;
    
    // Extraer los minutos de la duración (puede ser "25 min", "60 min", etc.)
    const duracionMatch = session.duration.match(/(\d+)/);
    if (!duracionMatch) return false;
    
    const duracionMinutos = parseInt(duracionMatch[1]);
    return duracionMinutos >= 60;
  });
  
  return tieneSesionLarga ? 1 : 0;
}

// Logro 67: Noctámbulo (estudiar después de las 10 PM)
function verificarEstudioTarde() {
  const sesiones = getPomodoroSessions();
  const tieneSesionTardia = sesiones.some(session => {
    if (!session.date) return false;
    const fecha = new Date(session.date);
    const hora = fecha.getHours();
    return hora >= 22 && session.status === 'Completado'; // 10 PM = 22
  });
  
  return tieneSesionTardia ? 1 : 0;
}

// Logro 68: Ritmo constante (3+ horas por 3 días)
function verificarRitmoConstante() {
  const stats = getAllDailyStats();
  let diasConsecutivos = 0;
  let maxDiasConsecutivos = 0;
  
  // Ordenar fechas cronológicamente
  const fechas = Object.keys(stats).sort((a, b) => new Date(a) - new Date(b));
  
  fechas.forEach(fecha => {
    const horasDia = stats[fecha].totalMinutes / 60;
    if (horasDia >= 3) {
      diasConsecutivos++;
      maxDiasConsecutivos = Math.max(maxDiasConsecutivos, diasConsecutivos);
    } else {
      diasConsecutivos = 0;
    }
  });
  
  const progreso = Math.min(maxDiasConsecutivos, 3);
  return progreso;
}

// Logro 69: Fin de semana (5+ horas en fin de semana)
function verificarEstudioFinSemana() {
  const sesiones = getPomodoroSessions();
  let horasFinSemana = 0;
  
  sesiones.forEach(session => {
    if (session.status !== 'Completado') return;
    
    const fecha = new Date(session.date);
    const diaSemana = fecha.getDay(); // 0 = Domingo, 6 = Sábado
    const esFinSemana = diaSemana === 0 || diaSemana === 6;
    
    if (esFinSemana) {
      const duracion = parseInt(session.duration) || 25; // minutos
      horasFinSemana += duracion / 60;
    }
  });
  
  const progreso = Math.min(horasFinSemana, 5);
  return progreso;
}

// Logro 70: Día libre (menos de 1 hora en un día)
function verificarDiaLibre() {
  const stats = getAllDailyStats();
  let diasConDescanso = 0;
  
  Object.values(stats).forEach(dia => {
    const horasDia = dia.totalMinutes / 60;
    if (horasDia < 1 && horasDia > 0) {
      diasConDescanso++;
    }
  });
  
  return Math.min(diasConDescanso, 1); // Solo necesita 1 día
}


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// SECCIÓN APUNTES ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let notes = [];
let currentNoteId = null;
const userId = localStorage.getItem("ChankandoUserID");
const defaultTags = ["Matemáticas", "Física", "Química", "Programación", "Literatura", "Exámenes", "Proyectos"];

let customTags = [];
let allTags = [...defaultTags];

function formatCreationDate(isoString) {
  const date = new Date(isoString);
  
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function fetchNotes() {
  if (!userId) return;
  try {
    const res = await fetch(`https://chankando-1.onrender.com/obtener_notas.php?usuario_id=${userId}`);
    const data = await res.json();
    notes = data.map(note => {
      return {
        ...note,
        fixedCreationDate: note.fixedCreationDate 
      };
    });
    
    localStorage.setItem("userNotes", JSON.stringify(notes));
    
    renderNotesList();
    
    setTimeout(() => {
      if (window.verificarLogros && notes.length > 0) {
        window.verificarLogros('nota');
      }
    }, 100);
  } catch (err) {
    console.error("Error al cargar notas:", err);
  }
}

async function saveNoteToServer(note) {
  try {
    // Verificar que userId está disponible
    if (!userId) {
      throw new Error("Usuario no identificado");
    }

    // Preparar datos para enviar
    const noteToSend = {
      ...note,
      usuario_id: parseInt(userId)
    };

    // Eliminar id si es nueva nota
    if (!note.id) {
      delete noteToSend.id;
    }

    const response = await fetch("https://chankando-1.onrender.com/guardar_nota.php", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(noteToSend)
    });

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Respuesta inesperada: ${text.substring(0, 100)}`);
    }

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Error HTTP: ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error("Error al guardar nota:", err);
    Swal.fire({
      icon: 'error',
      title: 'Error al guardar',
      text: err.message.includes('JSON') ? 'Error en el servidor' : err.message
    });
    throw err;
  }
}

async function deleteNoteFromServer(noteId) {
  try {
    await fetch("https://chankando-1.onrender.com/eliminar_nota.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota_id: noteId })
    });
  } catch (err) {
    console.error("Error al eliminar nota:", err);
  }
}

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '');
}

// Función para renderizar la lista de notas
function renderNotesList(filtro = "", mostrarTodas = false) {
  const notesList = document.getElementById('notes-list');
  const modalList = document.getElementById('contenedor-todos-notes');

  // Aplica filtro si existe
  const texto = normalizar(filtro);
  const notasFiltradas = notes.filter(note => {
    const tituloNormalizado = normalizar(note.title);
    return texto.split('').every(letra => tituloNormalizado.includes(letra));
  });

  const notasAMostrar = mostrarTodas ? notasFiltradas : notasFiltradas.slice(0, 3);

  // Contenedor principal
  const contenedor = mostrarTodas ? modalList : notesList;
  if (!contenedor) return;

  contenedor.innerHTML = '';

  if (notasAMostrar.length === 0) {
    contenedor.innerHTML = `
      <li class="text-center py-4 text-gray-500">
        No se encontraron apuntes.
      </li>
    `;
    
    // IMPORTANTE: Ocultar el botón cuando no hay notas
    if (!mostrarTodas) {
      const btnVerTodos = document.getElementById('btn-ver-todos-notes');
      if (btnVerTodos) {
        btnVerTodos.classList.add('hidden');
      }
    }
    return;
  }

  notasAMostrar.forEach(note => {
    const noteElement = document.createElement('li');
    noteElement.innerHTML = `
      <a href="#" class="note-item ${currentNoteId === note.id.toString() ? 'selected' : ''}" data-id="${note.id}">
        <h4 class="note-title">${note.title}</h4>
        <div class="note-meta">
          <span class="note-tag">${note.tag}</span>
          <span class="note-time">${note.fixedCreationDate}</span>
        </div>
      </a>
    `;
    
    noteElement.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault();
      loadNote(note.id.toString());
    });
    
    contenedor.appendChild(noteElement);
  });

  if (!mostrarTodas) {
    const btnVerTodos = document.getElementById('btn-ver-todos-notes');
    if (btnVerTodos) {
      if (notasFiltradas.length > 3) {
        btnVerTodos.classList.remove('hidden');
      } else {
        btnVerTodos.classList.add('hidden');
      }
    }
  }
}

// Función para cargar una nota en el editor
function loadNote(noteId) {
  noteId = noteId.toString();
  const note = notes.find(n => n.id.toString() === noteId);
  
  if (!note) {
    console.error("Nota no encontrada con ID:", noteId);
    return;
  }
  
  currentNoteId = noteId;
  document.getElementById('note-title').value = note.title;
  document.getElementById('markdown-editor').value = note.content;
  document.getElementById('note-tag').value = note.tag;
  
  document.getElementById('note-date').textContent = `Creado: ${note.fixedCreationDate || 'Fecha inválida'}`;
  
  actualizarContadorPalabras();

  // Configurar auto-guardado 
  setupAutoSave(noteId);
  renderNotesList();
}

// Función para configurar el guardado automático
let lastAutoSave = {
  titleInput: null,
  editor: null,
  tagSelect: null,
};

const saveChanges = async () => {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;
  
  const updatedNote = {
    ...note,
    title: titleInput.value,
    content: editor.value,
    tag: tagSelect.value
  };
  
  const savedNote = await saveNoteToServer(updatedNote);
  Object.assign(note, updatedNote); // Actualizar la nota local
  renderNotesList();
};

function setupAutoSave(noteId) {
  const titleInput = document.getElementById('note-title');
  const editor = document.getElementById('markdown-editor');
  const tagSelect = document.getElementById('note-tag');
  
  if (!titleInput || !editor || !tagSelect) return;

  // Limpiar listeners anteriores
  titleInput.removeEventListener('input', lastAutoSave.saveChanges);
  editor.removeEventListener('input', lastAutoSave.saveChanges);
  tagSelect.removeEventListener('change', lastAutoSave.saveChanges);

  // Función optimizada para guardar cambios
  const saveChanges = debounce(async () => {
    const noteIndex = notes.findIndex(n => n.id.toString() === noteId.toString());
    if (noteIndex === -1) return;
    
    const updatedNote = {
      ...notes[noteIndex],
      title: titleInput.value,
      content: editor.value,
      tag: tagSelect.value
    };
    
    try {
      const savedNote = await saveNoteToServer(updatedNote);
      notes[noteIndex] = updatedNote;
      localStorage.setItem("userNotes", JSON.stringify(notes));
      renderNotesList();
      
      // VERIFICAR LOGROS
      if (window.verificarLogros) {
        window.verificarLogros('nota-larga');
        window.verificarLogros('nota-ediciones');
      }
    } catch (err) {
      console.error("Error al guardar cambios:", err);
    }
  }, 500); // Debounce de 500ms

  // Función para actualizar contador en tiempo real
  const actualizarContador = () => {
    actualizarContadorPalabras();
  };

  // Agregar nuevos listeners
  titleInput.addEventListener('input', saveChanges);
  editor.addEventListener('input', saveChanges);
  tagSelect.addEventListener('change', saveChanges);
  editor.addEventListener('input', actualizarContador);

  // Guardar referencias
  lastAutoSave = {
    titleInput,
    editor,
    tagSelect,
    saveChanges,
    actualizarContador
  };
}

function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

async function createNewNote() {
  try {
    if (!userId) throw new Error("Usuario no identificado");

    const newNote = {
      title: "Nuevo apunte",
      content: "",
      tag: "Matemáticas",
      usuario_id: parseInt(userId)
    };

    const response = await saveNoteToServer(newNote);
    
    if (response && response.success) {
      const createdNote = {
        ...newNote,
        id: response.id.toString(),
        fixedCreationDate: response.fixedCreationDate
      };
      
      notes.unshift(createdNote);
      localStorage.setItem("userNotes", JSON.stringify(notes));

      renderNotesList();

      incrementarApuntesRapidos();

      const rachaActual = actualizarRachaNotas();
      console.log(`Racha actual de notas: ${rachaActual} días`);

      if (window.verificarLogros) {
        window.verificarLogros('nota');
        window.verificarLogros('nota-materias');
        window.verificarLogros('nota-dias');
        window.verificarLogros('nota-semana');
        window.verificarLogros('nota-rapidas');
      }

      setTimeout(() => document.getElementById('note-title').focus(), 100);
    }
  } catch (err) {
    console.error("Error al crear nota:", err);
    Swal.fire('Error', 'Error al crear nota', 'error');
  }
}

// Función para eliminar la nota actual
async function deleteCurrentNote() {
  if (!currentNoteId) return;

  Swal.fire({
    title: '¿Eliminar apunte?',
    text: 'Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este apunte?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await deleteNoteFromServer(currentNoteId);
        notes = notes.filter(note => note.id.toString() !== currentNoteId.toString());
        localStorage.setItem("userNotes", JSON.stringify(notes));
        
        // Limpiar editor
        document.getElementById('note-title').value = '';
        document.getElementById('markdown-editor').value = '';
        document.getElementById('note-tag').value = 'Matemáticas';
        document.getElementById('note-date').textContent = 'Creado: --/--/----';
        
        // Actualizar vista
        currentNoteId = null;
        renderNotesList();
        
        if (window.verificarLogros) {
          window.verificarLogros('nota');
          window.verificarLogros('nota-materias');
          window.verificarLogros('nota-dias');
          window.verificarLogros('nota-semana');
        }

        Swal.fire(
          '¡Eliminado!',
          'El apunte ha sido eliminado correctamente.',
          'success'
        );
      } catch (err) {
        console.error("Error al eliminar nota:", err);
        Swal.fire(
          'Error',
          'No se pudo eliminar el apunte.',
          'error'
        );
      }
    }
  });
}

// Función auxiliar para formatear fechas
function formatRelativeDate(isoString, fullDate = false) {
  const date = new Date(isoString);
  const now = new Date();
  
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }

  if (fullDate) {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  const diffInSeconds = Math.floor((now - date) / 1000);
  
  // Lógica mejorada para mostrar tiempos más precisos
  if (diffInSeconds < 10) return 'Ahora mismo';
  if (diffInSeconds < 60) return 'Hace unos segundos';
  
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes === 1) return 'Hace 1 minuto';
  if (minutes < 60) return `Hace ${minutes} minutos`;
  
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'Hace 1 hora';
  if (hours < 24) return `Hace ${hours} horas`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  
  const months = Math.floor(days / 30);
  if (months === 1) return 'Hace 1 mes';
  if (months < 12) return `Hace ${months} meses`;
  
  const years = Math.floor(months / 12);
  if (years === 1) return 'Hace 1 año';
  return `Hace ${years} años`;
}

document.addEventListener('DOMContentLoaded', function() {
  fetchNotes();
  fetchTags();

  actualizarContadorPalabras();
  const editor = document.getElementById('markdown-editor');
  if (editor) {
    editor.addEventListener('input', actualizarContadorPalabras);
  }

  const searchInput = document.querySelector('input[placeholder="Buscar apuntes..."]');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const valor = e.target.value.trim();
      renderNotesList(valor);
    });
  }

  // Configurar botones con verificación
  const notesList = document.getElementById('notes-list');
  if (!notesList) return;

  const newNoteBtn = document.getElementById('new-note-btn');
  if (newNoteBtn) {
    newNoteBtn.addEventListener('click', createNewNote);
  }

  const deleteNoteBtn = document.getElementById('delete-note');
  if (deleteNoteBtn) {
    deleteNoteBtn.addEventListener('click', deleteCurrentNote);
  }

  notesList.addEventListener('click', function(e) {
    const noteLink = e.target.closest('a[data-id]');
    if (noteLink) {
      loadNote(noteLink.getAttribute('data-id'));
    }
  });

  // Botón "Ver todos" y modal
  const btnVerTodosNotes = document.getElementById('btn-ver-todos-notes');
  const modalTodosNotes = document.getElementById('modal-ver-todos-notes');
  const cerrarModalTodos = document.getElementById('cerrar-todos-notes');

  if (btnVerTodosNotes && modalTodosNotes && cerrarModalTodos) {
    btnVerTodosNotes.addEventListener('click', () => {
      modalTodosNotes.classList.remove('hidden');
      renderNotesList("", true); // Mostrar todos los apuntes en el modal
    });

    cerrarModalTodos.addEventListener('click', () => {
      modalTodosNotes.classList.add('hidden');
    });
  }

  // Delegación de eventos para las notas
  document.getElementById('notes-list').addEventListener('click', function(e) {
    e.preventDefault();
    
    const noteLink = e.target.closest('a[data-id]');
    if (noteLink) {
      const noteId = noteLink.getAttribute('data-id');
      if (noteId) {
        loadNote(noteId);
      }
    }
  });

  // ETIQUETAS PERSONALIZADAS
  async function fetchTags() {
    if (!userId) return;
    try {
      const res = await fetch(`https://chankando-1.onrender.com/obtener_etiquetas.php?usuario_id=${userId}`);
      const data = await res.json();
      
      customTags = data.filter(tag => !defaultTags.includes(tag));
      
      // Actualizar la variable global ya declarada
      allTags = [...defaultTags, ...customTags];
      
      updateTagSelectAndChips();
    } catch (e) {
      console.error("Error al obtener etiquetas:", e);
    }
  }

  function updateTagSelectAndChips() {
    const tagSelect = document.getElementById('note-tag');
    const tagChips = document.getElementById('tag-chips');
    
    if (tagSelect) {
      tagSelect.innerHTML = '';
      
      // Usar allTags en lugar de [...defaultTags, ...customTags]
      allTags.forEach(tag => {
        const tagName = typeof tag === "object" ? tag.tag : tag;
        const option = document.createElement('option');
        option.value = tagName;
        option.textContent = tagName;
        tagSelect.appendChild(option);
      });
    }
    
    if (tagChips) {
      tagChips.innerHTML = '';
      
      const tagColors = [
        { tag: "Matemáticas", color: "bg-blue-100 text-primary" },
        { tag: "Física", color: "bg-green-100 text-green-700" },
        { tag: "Química", color: "bg-purple-100 text-purple-700" },
        { tag: "Programación", color: "bg-yellow-100 text-yellow-700" },
        { tag: "Literatura", color: "bg-red-100 text-red-700" },
        { tag: "Exámenes", color: "bg-gray-100 text-gray-700" },
        { tag: "Proyectos", color: "bg-indigo-100 text-indigo-700" }
      ];
      
      // Mostrar todas las etiquetas disponibles
      allTags.forEach(tag => {
        const tagName = typeof tag === "object" ? tag.tag : tag;
        const defaultColor = tagColors.find(t => t.tag === tagName)?.color || "bg-pink-100 text-pink-700";
        
        const span = document.createElement('span');
        span.className = `px-3 py-1 rounded-full text-sm mr-1 mb-1 ${defaultColor}`;
        span.textContent = tagName;
        tagChips.appendChild(span);
      });
    }
  }

  // Botón para agregar etiqueta
  const addTagBtn = document.getElementById('add-tag-btn');
  if (addTagBtn) {
    addTagBtn.addEventListener('click', () => {
      document.getElementById('tag-modal-title').textContent = 'Etiqueta nueva';
      document.getElementById('tag-input').value = '';
      document.getElementById('tag-modal').classList.remove('hidden');
      document.getElementById('tag-save-btn').onclick = function() {
        const newTag = document.getElementById('tag-input').value.trim();
        if (newTag && !allTags.includes(newTag)) { // Cambiar la condición
          fetch("https://chankando-1.onrender.com/guardar_etiqueta.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              usuario_id: userId,
              nombre: newTag
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              // Actualizar customTags y allTags
              customTags.push(newTag);
              allTags = [...defaultTags, ...customTags];
              updateTagSelectAndChips();
            } else {
              console.error("Error en respuesta:", data.error);
            }
          })
          .catch(err => {
            console.error("Error de red o CORS:", err);
          });
        }
        document.getElementById('tag-modal').classList.add('hidden');
      };
    });
  }

  async function eliminarEtiqueta(tag) {
    const userId = localStorage.getItem("ChankandoUserID");
    if (!userId) {
      console.error("Usuario no identificado");
      return;
    }

    try {
      const res = await fetch("https://chankando-1.onrender.com/eliminar_etiqueta.php", {
          method: "POST",
          headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
          },
          body: JSON.stringify({
              usuario_id: parseInt(userId),
              etiqueta: tag
          }),
          credentials: "include" // Importante para CORS con credenciales
      });

      // Verificar si la respuesta es JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Respuesta inesperada: ${text.substring(0, 100)}`);
      }

      const data = await res.json();
          
      if (!res.ok || !data.success) {
          throw new Error(data.error || `Error HTTP: ${res.status}`);
      }

      // Actualizar las listas de etiquetas
      customTags = customTags.filter(t => t !== tag);
      allTags = [...defaultTags, ...customTags];
      updateTagSelectAndChips();
          
      return data;
    } catch (err) {
      console.error("Error al eliminar etiqueta:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error al eliminar etiqueta',
        text: err.message.includes('JSON') ? 'Error en el servidor' : err.message
      });
      throw err;
    }
  }

  // Botón para eliminar etiquetas
  const deleteTagBtn = document.getElementById('delete-tag-btn');
  if (deleteTagBtn) {
    deleteTagBtn.addEventListener('click', () => {
      document.getElementById('tag-modal-title').textContent = 'Eliminar etiqueta';

      let selectHtml = `<select id="tag-select-delete" class="w-full border rounded px-3 py-2 mb-4">`;
      allTags.forEach(tag => {
        selectHtml += `<option value="${tag}">${tag}</option>`;
      });
      selectHtml += `</select>`;

      const input = document.getElementById('tag-input');
      input.outerHTML = selectHtml;

      document.getElementById('tag-modal').classList.remove('hidden');
      document.getElementById('tag-save-btn').onclick = async function() {
        const select = document.getElementById('tag-select-delete');
        const tagToDelete = select.value;

        try {
            await eliminarEtiqueta(tagToDelete);
                  
            // Restaurar el input después de eliminar
            const selectElem = document.getElementById('tag-select-delete');
            const newInput = document.createElement('input');
            newInput.type = 'text';
            newInput.id = 'tag-input';
            newInput.className = 'w-full border rounded px-3 py-2 mb-4';
            newInput.placeholder = 'Nombre de la etiqueta';
            selectElem.parentNode.replaceChild(newInput, selectElem);

            document.getElementById('tag-modal').classList.add('hidden');
                  
            Swal.fire(
              '¡Eliminada!',
              'La etiqueta ha sido eliminada correctamente.',
              'success'
            );
        } catch (err) {
          console.error("Error al eliminar etiqueta:", err);
        }
      };
    });
  }

  // Botón cancelar del modal
  const tagCancelBtn = document.getElementById('tag-cancel-btn');
  if (tagCancelBtn) {
    tagCancelBtn.addEventListener('click', () => {
      document.getElementById('tag-modal').classList.add('hidden');
      if (!document.getElementById('tag-input')) {
        const selectElem = document.getElementById('tag-select-delete');
        if (selectElem) {
          const newInput = document.createElement('input');
          newInput.type = 'text';
          newInput.id = 'tag-input';
          newInput.className = 'w-full border rounded px-3 py-2 mb-4';
          newInput.placeholder = 'Nombre de la etiqueta';
          selectElem.parentNode.replaceChild(newInput, selectElem);
        }
      }
    });
  }

  // Inicializa etiquetas al cargar
  updateTagSelectAndChips();
});

// Función para obtener la fecha actual en formato YYYY-MM-DD
function getToday() {
  return new Date().toISOString().split('T')[0];
}

// Función para verificar y actualizar la racha de creación de apuntes
function actualizarRachaNotas() {
  const hoy = getToday();
  const rachaData = JSON.parse(localStorage.getItem("rachaNotas") || '{"ultimaFecha": "", "diasConsecutivos": 0}');
    
  if (rachaData.ultimaFecha === hoy) {
    return rachaData.diasConsecutivos;
  }
    
  // Verificar si es día consecutivo (ayer)
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const ayerStr = ayer.toISOString().split('T')[0];
    
  if (rachaData.ultimaFecha === ayerStr) {
    // Día consecutivo - incrementar racha
    rachaData.diasConsecutivos += 1;
  } else if (rachaData.ultimaFecha !== hoy) {
    // No es día consecutivo - reiniciar racha a 1
    rachaData.diasConsecutivos = 1;
  }
    
  rachaData.ultimaFecha = hoy;
  localStorage.setItem("rachaNotas", JSON.stringify(rachaData));
    
  return rachaData.diasConsecutivos;
}

// Función para obtener la racha actual sin modificarla
function obtenerRachaNotas() {
  const rachaData = JSON.parse(localStorage.getItem("rachaNotas") || '{"ultimaFecha": "", "diasConsecutivos": 0}');
  const hoy = getToday();
    
  // Si la última fecha no es hoy, la racha efectiva es 0
  if (rachaData.ultimaFecha !== hoy) {
    return 0;
  }
    
  return rachaData.diasConsecutivos;
}


// Función para contar palabras en un texto
function contarPalabras(texto) {
  if (!texto || texto.trim() === '') return 0;
  const palabras = texto.trim().split(/\s+/);
  return palabras.filter(palabra => palabra.length > 0).length;
}

// Función para actualizar el contador de palabras en tiempo real
function actualizarContadorPalabras() {
  const editor = document.getElementById('markdown-editor');
  const wordCountElement = document.getElementById('word-count');
    
  if (!editor || !wordCountElement) return;
    
  const contenido = editor.value;
  const numPalabras = contarPalabras(contenido);
    
  wordCountElement.textContent = numPalabras;
    
  if (numPalabras >= 500) {
    wordCountElement.className = 'text-green-600 font-bold';
  } else {
    wordCountElement.className = '';
  }
}

// Función para verificar si hay alguna nota con más de 500 palabras
function verificarNotaLarga() {
  const notasGuardadas = JSON.parse(localStorage.getItem("userNotes") || "[]");
  const notasLargas = notasGuardadas.filter(nota => {
    const numPalabras = contarPalabras(nota.content);
    return numPalabras >= 500;
  });
  return notasLargas.length;
}


// Variables para el logro de apuntes rápidos
let temporizadorApuntesRapidos = null;
let contadorApuntesRapidos = 0;
const TIEMPO_LIMITE = 60 * 60 * 1000; // 1 hora en milisegundos

// Función para iniciar/reiniciar el temporizador de apuntes rápidos
function iniciarTemporizadorApuntesRapidos() {
    // Limpiar temporizador anterior si existe
    if (temporizadorApuntesRapidos) {
        clearTimeout(temporizadorApuntesRapidos);
    }
    
    // Reiniciar contador y empezar nuevo temporizador
    contadorApuntesRapidos = 1;
    console.log(`⚡ Temporizador iniciado. Apunte rápido 1/3`);
    
    // Configurar temporizador de 1 hora
    temporizadorApuntesRapidos = setTimeout(() => {
        console.log(`⏰ Temporizador expirado. Contador reiniciado.`);
        contadorApuntesRapidos = 0;
        temporizadorApuntesRapidos = null;
    }, TIEMPO_LIMITE);
}

// Función para incrementar el contador de apuntes rápidos
function incrementarApuntesRapidos() {
    if (!temporizadorApuntesRapidos) {
        // Primer apunte - iniciar temporizador
        iniciarTemporizadorApuntesRapidos();
        return 1;
    } else {
        // Apunte adicional dentro de la hora
        contadorApuntesRapidos++;
        console.log(`⚡ Apunte rápido ${contadorApuntesRapidos}/3`);
        
        // Verificar si se alcanzó el logro
        if (contadorApuntesRapidos >= 3) {
            console.log(`🎉 ¡3 apuntes en menos de 1 hora! Logro alcanzado.`);
            if (window.verificarLogros) {
                window.verificarLogros('nota-rapidas');
            }
            // Reiniciar después de alcanzar el logro
            clearTimeout(temporizadorApuntesRapidos);
            temporizadorApuntesRapidos = null;
            contadorApuntesRapidos = 0;
        }
        
        return contadorApuntesRapidos;
    }
}

// Función para verificar el progreso del logro
function verificarApuntesRapidos() {
    // Para este logro, devolvemos 1 si se cumplió, 0 si no
    // Como es un logro de "una vez", usamos localStorage para recordar
    const logroAlcanzado = localStorage.getItem("logroApuntesRapidos") === "true";
    
    if (logroAlcanzado) {
        return 1;
    }
    
    // Si hay un temporizador activo y tenemos 3+ apuntes, el logro está activo
    if (temporizadorApuntesRapidos && contadorApuntesRapidos >= 3) {
        localStorage.setItem("logroApuntesRapidos", "true");
        return 1;
    }
    
    return 0;
}


///////////////////////////////////////////////////////////////////////////////
/////////////////////////////// SECCIÓN PROGRESO //////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// Variables globales para el progreso
let weeklyData = JSON.parse(localStorage.getItem('weeklyData')) || [0, 0, 0, 0, 0, 0, 0];
let monthlyData = JSON.parse(localStorage.getItem('monthlyData')) || [0, 0, 0, 0, 0];
let studyTimeChart = null;
let vistaActual = 'semanal';

// Variable global para tracking
let ultimaSemanaVerificada = localStorage.getItem('ultimaSemanaVerificada') || null;

async function verificarYLimpiarSemana() {
  const hoy = new Date();
  const semanaActual = getCurrentWeekNumber(hoy);
  const anioActual = hoy.getFullYear();
  const claveSemanaActual = `${anioActual}-W${semanaActual}`;
  
  // Si la semana cambió, limpiar datos
  if (ultimaSemanaVerificada !== claveSemanaActual) {
    console.log(`🔄 Nueva semana detectada: ${claveSemanaActual}`);
    console.log(`Semana anterior era: ${ultimaSemanaVerificada}`);
    
    try {
      // Solo cerrar semana si había una semana previa registrada
      if (ultimaSemanaVerificada !== null) {
        await cerrarSemana();
      }
      
      // Limpiar datos locales
      weeklyData = [0, 0, 0, 0, 0, 0, 0];
      localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
      
      // Actualizar tracking
      ultimaSemanaVerificada = claveSemanaActual;
      localStorage.setItem('ultimaSemanaVerificada', claveSemanaActual);
      
      // Actualizar gráfica si existe
      if (studyTimeChart && vistaActual === 'semanal') {
        studyTimeChart.data.datasets[0].data = weeklyData;
        studyTimeChart.update();
      }
      
      console.log('✅ Limpieza semanal completada');
      return true;
    } catch (error) {
      console.error('❌ Error en limpieza semanal:', error);
      return false;
    }
  }
  
  return false;
}

async function cerrarSemana() {
  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) {
    console.error('No se encontró el ID de usuario');
    return;
  }

  try {
    const hoy = new Date();
    
    const fechaSemanaAnterior = new Date(hoy);
    fechaSemanaAnterior.setDate(hoy.getDate() - 7);
    const semanaAnterior = getCurrentWeekNumber(fechaSemanaAnterior);
    const anioAnterior = fechaSemanaAnterior.getFullYear();

    const response = await fetch(`https://chankando-1.onrender.com/grafica_semanal.php?usuario_id=${userId}&semana=${semanaAnterior}&anio=${anioAnterior}`);
    const result = await response.json();

    if (result.success && result.data) {
      const totalSemana = (
        (result.data.lunes || 0) + 
        (result.data.martes || 0) + 
        (result.data.miercoles || 0) + 
        (result.data.jueves || 0) + 
        (result.data.viernes || 0) + 
        (result.data.sabado || 0) + 
        (result.data.domingo || 0)
      ) / 60;

      const semanaDelMes = Math.min(Math.ceil(fechaSemanaAnterior.getDate() / 7), 5);
      await fetch('https://chankando-1.onrender.com/grafica_mensual.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: parseInt(userId),
          semana: semanaDelMes,
          minutos: Math.round(totalSemana * 60),
          mes: fechaSemanaAnterior.getMonth() + 1,
          anio: fechaSemanaAnterior.getFullYear()
        })
      });

      console.log(`📊 Semana ${semanaAnterior} cerrada con ${totalSemana.toFixed(2)} horas`);
    }

    const semanaActual = getCurrentWeekNumber(hoy);
    await fetch('https://chankando-1.onrender.com/grafica_semanal.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: parseInt(userId),
        semana: semanaActual,
        anio: hoy.getFullYear()
      })
    });

    return true;
  } catch (error) {
    console.error('Error en cerrarSemana:', error);
    throw error;
  }
}

// Último Mes Registrado
let ultimoMesRegistrado = localStorage.getItem('ultimoMesRegistrado') || null;

async function verificarYLimpiarMes() {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();
  const claveMes = `${anioActual}-${mesActual.toString().padStart(2, '0')}`;

  // Si es un nuevo mes y no hemos limpiado aún
  if (claveMes !== ultimoMesRegistrado) {
    console.log('🔄 Iniciando nuevo mes, limpiando datos mensuales');
    
    monthlyData = [0, 0, 0, 0, 0];
    localStorage.setItem('monthlyData', JSON.stringify(monthlyData));
    
    await limpiarMesBackend();
    
    if (studyTimeChart && vistaActual === 'mensual') {
      studyTimeChart.data.datasets[0].data = monthlyData;
      studyTimeChart.update();
    }
    
    ultimoMesRegistrado = claveMes;
    localStorage.setItem('ultimoMesRegistrado', claveMes);
  }
}

async function limpiarMesBackend() {
  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) return;

  try {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();

    const response = await fetch('https://chankando-1.onrender.com/grafica_mensual.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'limpiar_mes',
        usuario_id: parseInt(userId),
        mes: mes,
        anio: anio
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al limpiar mes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al limpiar mes en backend:', error);
    throw error;
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  const studyTimeCanvas = document.getElementById('studyTimeChart');
  if (studyTimeCanvas) {
    const ctx = studyTimeCanvas.getContext('2d');
    studyTimeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [{
          label: 'Horas',
          data: weeklyData,
          backgroundColor: '#FFC000',
          borderColor: '#000000ff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.y + ' horas';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 7,
            ticks: {
              callback: function(value) {
                return value + 'h';
              }
            }
          }
        }
      }
    });

    // Verificar limpieza al cargar
    await verificarYLimpiarSemana();
    await verificarYLimpiarMes(); 
    
    // Cargar datos iniciales
    await actualizarGraficaSemanal();
    await actualizarGraficaMensual();

    monthlyData = JSON.parse(localStorage.getItem('monthlyData')) || [0, 0, 0, 0, 0];
    
    // Renderizar vistas
    renderSesionesCompletadas();
    renderTiempoTotal();

    const btnSemanal = document.getElementById('btnSemanal');
    const btnMensual = document.getElementById('btnMensual');
    const studyTimeTitle = document.getElementById('studyTimeTitle');

    if (btnSemanal && btnMensual && studyTimeTitle) {
      btnSemanal.addEventListener('click', function() {
        vistaActual = 'semanal';
        studyTimeTitle.textContent = '📊 Tiempo de estudio semanal';
        btnSemanal.classList.remove('comicmensual-button');
        btnSemanal.classList.add('comicsemanal-button');
        btnMensual.classList.remove('comicsemanal-button');
        btnMensual.classList.add('comicmensual-button');
        
        studyTimeChart.data.labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        studyTimeChart.data.datasets[0].data = weeklyData;
        studyTimeChart.options.scales.y.max = 7;
        studyTimeChart.update();
      });

      btnMensual.addEventListener('click', async function() {
        vistaActual = 'mensual';
        studyTimeTitle.textContent = '📊 Tiempo de estudio mensual';
        btnMensual.classList.remove('comicmensual-button');
        btnMensual.classList.add('comicsemanal-button');
        btnSemanal.classList.remove('comicsemanal-button');
        btnSemanal.classList.add('comicmensual-button');
        
        await actualizarGraficaMensual();
        
        studyTimeChart.data.labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'];
        studyTimeChart.data.datasets[0].data = monthlyData;
        studyTimeChart.options.scales.y.max = 40;
        studyTimeChart.update();
      });
    }
  }

  verificarYLimpiarSemana();
  setInterval(verificarYLimpiarSemana, 300000);

  setTimeout(async () => {
    await otorgarLogroSemanaPerfecta();
  }, 2000);
});

async function actualizarVistaActual() {
  if (vistaActual === 'semanal') {
    await actualizarGraficaSemanal();
    studyTimeChart.data.labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    studyTimeChart.data.datasets[0].data = weeklyData;
    studyTimeChart.options.scales.y.max = 7;
  } else {
    await actualizarGraficaMensual();
    studyTimeChart.data.labels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'];
    studyTimeChart.data.datasets[0].data = monthlyData;
    studyTimeChart.options.scales.y.max = 40;
  } 
  studyTimeChart.update();
}

window.agregarEstudio = async function(minutos) {
  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId || isNaN(minutos)) {
    console.error('ID de usuario no válido o minutos no numéricos');
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Datos de sesión no válidos'
    });
    return;
  }

  try {
    minutos = parseInt(minutos);
    if (minutos <= 0) throw new Error('El tiempo de estudio debe ser mayor a 0');

    const hoy = new Date();
    const diaActual = hoy.getDay();
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dia = dias[diaActual];
    const semana = getCurrentWeekNumber();
    const anio = hoy.getFullYear();
    const semanaDelMes = getCurrentWeekOfMonth();
    const mes = hoy.getMonth() + 1;

    // 1. Guardar en gráfica semanal
    const responseSemanal = await fetch('https://chankando-1.onrender.com/grafica_semanal.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: parseInt(userId),
        dia: dia,
        minutos: minutos,
        semana: semana,
        anio: anio
      })
    });

    if (!responseSemanal.ok) {
      const errorData = await responseSemanal.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al guardar estudio semanal');
    }

    // 2. Guardar en gráfica mensual
    const responseMensual = await fetch('https://chankando-1.onrender.com/grafica_mensual.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: parseInt(userId),
        semana: semanaDelMes,
        minutos: minutos,
        mes: mes,
        anio: anio
      })
    });

    if (!responseMensual.ok) {
      const errorData = await responseMensual.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al guardar estudio mensual');
    }

    // 3. Actualizar ambas gráficas
    await actualizarGraficaSemanal();
    await actualizarGraficaMensual();

    // 4. Verificar si es nuevo mes
    await verificarYLimpiarMes();

  } catch (error) {
    console.error('Error al guardar estudio:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo registrar el tiempo de estudio',
      footer: error.message
    });
  }

  // Después de guardar el estudio, verificar si merece el logro
  setTimeout(async () => {
    await otorgarLogroSemanaPerfecta();
  }, 1000);
};

async function actualizarGraficaSemanal() {
  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) return;

  try {
    const semana = getCurrentWeekNumber();
    const anio = new Date().getFullYear();
    
    const response = await fetch(`https://chankando-1.onrender.com/grafica_semanal.php?usuario_id=${userId}&semana=${semana}&anio=${anio}`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && studyTimeChart) {
      const datos = [
        (result.data.lunes || 0) / 60,
        (result.data.martes || 0) / 60,
        (result.data.miercoles || 0) / 60,
        (result.data.jueves || 0) / 60,
        (result.data.viernes || 0) / 60,
        (result.data.sabado || 0) / 60,
        (result.data.domingo || 0) / 60
      ];
      
      studyTimeChart.data.datasets[0].data = datos;
      studyTimeChart.update();
      
      // Actualizar también weeklyData para consistencia
      weeklyData = datos;
      localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
    }
  } catch (error) {
    console.error('Error al actualizar gráfica:', error);
    // Mostrar notificación al usuario
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo actualizar la gráfica semanal',
      footer: error.message
    });
  }
}

function getCurrentWeekOfMonth() {
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const offset = firstDay > 0 ? firstDay - 1 : 6;
  return Math.ceil((date.getDate() + offset) / 7);
}

// Función para actualizar la gráfica mensual
async function actualizarGraficaMensual() {
  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) return;

  try {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1; // Mes actual (1-12)
    const anio = hoy.getFullYear();
    
    console.log(`Consultando datos para mes: ${mes}, año: ${anio}`); // Debug
    
    const response = await fetch(`https://chankando-1.onrender.com/grafica_mensual.php?usuario_id=${userId}&mes=${mes}&anio=${anio}`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Datos mensuales recibidos:', result.data);
      
      // Procesar datos recibidos
      const datos = [
        parseFloat(((result.data.semana1 || 0) / 60).toFixed(2)),
        parseFloat(((result.data.semana2 || 0) / 60).toFixed(2)),
        parseFloat(((result.data.semana3 || 0) / 60).toFixed(2)),
        parseFloat(((result.data.semana4 || 0) / 60).toFixed(2)),
        parseFloat(((result.data.semana5 || 0) / 60).toFixed(2))
      ];
      
      // Actualizar datos locales
      monthlyData = datos;
      localStorage.setItem('monthlyData', JSON.stringify(monthlyData));
      
      // Actualizar gráfica si está en vista mensual
      if (studyTimeChart && vistaActual === 'mensual') {
        studyTimeChart.data.datasets[0].data = monthlyData;
        studyTimeChart.update();
      }
      
      return datos;
    }
  } catch (error) {
    console.error('Error al actualizar gráfica mensual:', error);
    // Mostrar notificación al usuario
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo actualizar la gráfica mensual',
      footer: error.message
    });
    return null;
  }
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;
}


const statsModel = {
  // DATOS ACUMULATIVOS
  totales: {
    sesiones: 0,
    tiempo: 0, 
    tareas: 0
  },
  // DATOS MENSUALES
  mensual: {
    sesiones: 0,
    tiempo: 0,
    tareas: 0,
    mes: 0,
    anio: 0     
  }
};

function obtenerStatsUsuario() {
  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) return null;

  const key = `userStats_${userId}`;
  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth() + 1;
  const anioActual = fechaActual.getFullYear();

  let stats = JSON.parse(localStorage.getItem(key)) || {
    totales: { sesiones: 0, tiempo: 0, tareas: 0 },
    mensual: { sesiones: 0, tiempo: 0, tareas: 0, mes: mesActual, anio: anioActual }
  };

  // Verificar si es un nuevo mes
  if (stats.mensual.mes !== mesActual || stats.mensual.anio !== anioActual) {
    const historico = JSON.parse(localStorage.getItem('statsHistorico') || '[]');
    historico.push({
      mes: stats.mensual.mes,
      anio: stats.mensual.anio,
      sesiones: stats.mensual.sesiones,
      tiempo: stats.mensual.tiempo,
      tareas: stats.mensual.tareas
    });
    localStorage.setItem('statsHistorico', JSON.stringify(historico));

    stats.mensual = {
      sesiones: 0,
      tiempo: 0,
      tareas: 0,
      mes: mesActual,
      anio: anioActual
    };
    
    // Guardar los stats actualizados
    localStorage.setItem(key, JSON.stringify(stats));
  }

  return { stats, userId, key };
}

// FUNCIÓN UNIFICADA PARA GUARDAR STATS
function guardarStatsUsuario(stats, key) {
  localStorage.setItem(key, JSON.stringify(stats));
  actualizarPerfilUsuario();
}


function renderSesionesCompletadas() {
  const data = obtenerStatsUsuario();
  if (!data) return;

  const { stats } = data;
  const sesionesPrevias = JSON.parse(localStorage.getItem('statsHistorico') || '[]');
  
  const contador = document.getElementById('contador-sesiones');
  const porcentaje = document.getElementById('porcentaje-sesiones');
  const mesLabel = document.getElementById('mes-sesiones-label');
  
  if (contador) contador.textContent = stats.mensual.sesiones;
  if (mesLabel) mesLabel.textContent = 'Este mes';
  
  // Calcular porcentaje vs mes anterior
  if (sesionesPrevias.length > 0) {
    const anterior = sesionesPrevias[sesionesPrevias.length-1].sesiones || 0;
    if (anterior > 0) {
      const diff = stats.mensual.sesiones - anterior;
      const percent = ((diff / anterior) * 100).toFixed(1);
      if (porcentaje) {
        porcentaje.innerHTML = `${diff >= 0 ? '▲' : '▼'} <span class="${diff >= 0 ? 'text-green-600' : 'text-red-600'}">${Math.abs(percent)}%</span> vs. mes anterior`;
      }
    } else {
      if (porcentaje) porcentaje.textContent = '';
    }
  } else {
    if (porcentaje) porcentaje.textContent = '';
  }
  
  // Actualizar perfil con datos TOTALES (acumulativos)
  const profileSesiones = document.getElementById('profile-sesiones');
  if (profileSesiones) profileSesiones.textContent = stats.totales.sesiones;
}

function renderTiempoTotal() {
  const data = obtenerStatsUsuario();
  if (!data) return;

  const { stats } = data;
  const tiempoHistorico = JSON.parse(localStorage.getItem('statsHistorico') || '[]');
  
  const contador = document.getElementById('contador-tiempo-total');
  const porcentaje = document.getElementById('porcentaje-tiempo');
  const mesLabel = document.getElementById('mes-tiempo-label');
  
  const horasMensual = (stats.mensual.tiempo / 60).toFixed(1);
  if (contador) contador.textContent = horasMensual;
  if (mesLabel) mesLabel.textContent = 'Este mes';
  
  // Calcular porcentaje vs mes anterior
  if (tiempoHistorico.length > 0) {
    const anterior = tiempoHistorico[tiempoHistorico.length-1].tiempo || 0;
    if (anterior > 0) {
      const diff = stats.mensual.tiempo - anterior;
      const percent = ((diff / anterior) * 100).toFixed(1);
      if (porcentaje) {
        porcentaje.innerHTML = `${diff >= 0 ? '▲' : '▼'} <span class="${diff >= 0 ? 'text-green-600' : 'text-red-600'}">${Math.abs(percent)}%</span> vs. mes anterior`;
      }
    } else {
      if (porcentaje) porcentaje.textContent = '';
    }
  } else {
    if (porcentaje) porcentaje.textContent = '';
  }
  
  // Actualizar perfil con datos TOTALES (acumulativos)
  const horasTotales = (stats.totales.tiempo / 60).toFixed(1);
  const profileHoras = document.getElementById('profile-horas');
  if (profileHoras) profileHoras.textContent = horasTotales;
}

function sumarSesionCompletada() {
  const data = obtenerStatsUsuario();
  if (!data) {
    Swal.fire({ icon: 'info', title: 'Inicia sesión', text: 'Debes iniciar sesión para contar sesiones' });
    return 0;
  }

  const { stats, key } = data;
  
  // Incrementar AMBOS contadores
  stats.totales.sesiones += 1;    // Total acumulativo
  stats.mensual.sesiones += 1;    // Mensual (se reinicia)
  
  // Guardar y actualizar UI
  guardarStatsUsuario(stats, key);
  renderSesionesCompletadas();
  
  return stats.mensual.sesiones;
}

function sumarMinutosTiempoTotal(minutos) {
  const data = obtenerStatsUsuario();
  if (!data) {
    Swal.fire({ icon: 'info', title: 'Inicia sesión', text: 'Debes iniciar sesión para sumar tiempo de estudio' });
    return 0;
  }

  const { stats, key } = data;
  
  // Incrementar AMBOS contadores
  stats.totales.tiempo += minutos;    // Total acumulativo
  stats.mensual.tiempo += minutos;    // Mensual (se reinicia)
  
  // Guardar y actualizar UI
  guardarStatsUsuario(stats, key);
  renderTiempoTotal();
  
  return stats.mensual.tiempo;
}


(function checkMesCambio() {
  const mesActual = getCurrentMonthKey();
  const mesGuardado = localStorage.getItem('mesGuardadoSesiones');
  if (mesGuardado && mesGuardado !== mesActual) {
    const sesionesPrevias = JSON.parse(localStorage.getItem('sesionesCompletadasHistorico') || '[]');
    const totalAnterior = parseInt(localStorage.getItem('sesionesCompletadas_' + mesGuardado) || '0', 10);
    sesionesPrevias.push({ mes: mesGuardado, total: totalAnterior });
    localStorage.setItem('sesionesCompletadasHistorico', JSON.stringify(sesionesPrevias));
    localStorage.setItem('sesionesCompletadas_' + mesActual, '0');
  }
  localStorage.setItem('mesGuardadoSesiones', mesActual);
})();

const hoursChartCanvas = document.getElementById('hoursChart');
if (hoursChartCanvas) {
  const hoursChart = new Chart(hoursChartCanvas, {
    type: 'bar',
    data: {
      labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
      datasets: [{
        label: 'Horas',
        data: [10, 12, 9, 11],
        backgroundColor: '#FFC000'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

const tasksChartCanvas = document.getElementById('tasksChart');
if (tasksChartCanvas) {
  const tasksChart = new Chart(tasksChartCanvas, {
    type: 'bar',
    data: {
      labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
      datasets: [{
        label: 'Tareas',
        data: [3, 5, 4, 3],
        backgroundColor: '#FFC000'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// FUNCIÓN DEL CONTENEDOR "TAREAS PRÓXIMAS"
document.addEventListener('DOMContentLoaded', function () {
  const btnAgregar = document.getElementById('btn-agregar-tarea');
  const modal = document.getElementById('modalTarea');
  const btnCancelar = document.getElementById('cancelarTarea');
  const btnGuardar = document.getElementById('guardarTarea');
  const listaTareas = document.getElementById('lista-tareas');
  const modalVerTodas = document.getElementById('modalVerTodas');
  const btnVerTodas = document.getElementById('btn-ver-todas');
  const contenedorTodas = document.getElementById('contenedor-todas-tareas');
  const btnCerrarVerTodas = document.getElementById('cerrarVerTodas');

  let tareas = [];
  const usuarioId = localStorage.getItem("ChankandoUserID");

  // Cargar tareas al iniciar
  if (usuarioId) {
    cargarTareas();
  } else {
    Swal.fire({ icon: 'info', title: 'Inicia sesión', text: 'Debes iniciar sesión para ver tus tareas' });
  }

  if (btnAgregar && modal) {
    btnAgregar.addEventListener('click', () => modal.classList.remove('hidden'));
  }
  if (btnCancelar && modal) { 
    btnCancelar.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (btnCerrarVerTodas && modalVerTodas) {
    btnCerrarVerTodas.addEventListener('click', () => modalVerTodas.classList.add('hidden'));
  }
  if (btnGuardar && modal) {
    btnGuardar.addEventListener('click', () => {
      const titulo = document.getElementById('tareaTitulo').value.trim();
      const descripcion = document.getElementById('tareaDescripcion').value.trim();
      const fecha = document.getElementById('tareaFecha').value;

      if (!titulo || !descripcion || !fecha) {
        Swal.fire('Error', 'Por favor completa todos los campos.', 'warning');
        return;
      }

      const hoy = new Date().toISOString().split('T')[0];
      if (fecha < hoy) {
        Swal.fire('Error', 'La fecha no puede ser anterior a hoy.', 'error');
        return;
      }

      guardarTarea({ titulo, descripcion, fecha });
    });
  }

  async function cargarTareas() {
    try {
      const response = await fetch(`https://chankando-1.onrender.com/obtener_tareas.php?usuario_id=${usuarioId}`);
      if (!response.ok) throw new Error('Error al cargar tareas');
      
      tareas = await response.json();
      actualizarVista();
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'No se pudieron cargar las tareas', 'error');
    }
  }

  async function guardarTarea(tarea) {
    try {
      const response = await fetch('https://chankando-1.onrender.com/guardar_tarea.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          usuario_id: usuarioId,
          titulo: tarea.titulo,
          descripcion: tarea.descripcion,
          fecha: tarea.fecha
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Error al guardar');
      
      modal.classList.add('hidden');
      document.getElementById('tareaTitulo').value = '';
      document.getElementById('tareaDescripcion').value = '';
      document.getElementById('tareaFecha').value = '';
      
      // ACTUALIZAR CONTADORES PARA LOGROS AL CREAR TAREA
      const userId = localStorage.getItem("ChankandoUserID");
      
      // Contador total de tareas creadas
      const totalCreadasKey = `totalTareasCreadas_${userId}`;
      const totalCreadas = parseInt(localStorage.getItem(totalCreadasKey)) || 0;
      localStorage.setItem(totalCreadasKey, totalCreadas + 1);
      
      // Contador de tareas con descripción
      if (tarea.descripcion && tarea.descripcion.trim().length > 0) {
        const descripcionesKey = `tareasConDescripcion_${userId}`;
        const conDescripcion = parseInt(localStorage.getItem(descripcionesKey)) || 0;
        localStorage.setItem(descripcionesKey, conDescripcion + 1);
      }
      
      await cargarTareas();
      
      // VERIFICAR LOGROS DESPUÉS DE CREAR TAREA
      if (window.verificarLogros) {
        window.verificarLogros('tarea');
        window.verificarLogros('tarea-creadas');
        window.verificarLogros('tarea-descripciones');
      }
      
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'No se pudo guardar la tarea', 'error');
    }
  }

  async function marcarTareaCompletada(id) {
    try {
      const tarea = tareas.find(t => t.id === id);
      if (!tarea) {
        throw new Error('Tarea no encontrada');
      }

      const response = await fetch('https://chankando-1.onrender.com/marcar_completada.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          usuario_id: usuarioId,
          tarea_id: id
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error('Error al marcar como completada');
      
      // ACTUALIZAR CONTADORES PARA LOGROS AL COMPLETAR TAREA
      const hoy = new Date();
      const hoyStr = hoy.toISOString().split('T')[0];
      const userId = localStorage.getItem("ChankandoUserID");
      
      // 1. Contador diario de tareas completadas
      const tareasHoyKey = `tareasCompletadasHoy_${hoyStr}_${userId}`;
      const tareasHoy = parseInt(localStorage.getItem(tareasHoyKey)) || 0;
      localStorage.setItem(tareasHoyKey, tareasHoy + 1);
      
      // 2. Verificar si se completó antes de tiempo
      const fechaLimite = new Date(tarea.fecha);
      if (hoy < fechaLimite) {
        const aTiempoKey = `tareasATiempo_${userId}`;
        const aTiempo = parseInt(localStorage.getItem(aTiempoKey)) || 0;
        localStorage.setItem(aTiempoKey, aTiempo + 1);
      }
      
      // Incrementar contador general (para stats)
      incrementarContadorTareasCompletadas();
      
      // Recargar tareas
      await cargarTareas();
      
      // 3. Verificar si completó todas las tareas del día
      const tareasPendientes = tareas.filter(t => t.completada === 0).length;
      if (tareasPendientes === 0 && tareas.length > 0) {
        const maestroKey = `maestroTareas_${userId}`;
        localStorage.setItem(maestroKey, "1");
      }
      
      // VERIFICAR TODOS LOS LOGROS RELEVANTES
      if (window.verificarLogros) {
        window.verificarLogros('tarea-completada');
        window.verificarLogros('tarea-dia'); 
        window.verificarLogros('tarea-dias-seguidos');
        window.verificarLogros('tarea-tiempo');
        window.verificarLogros('tarea-persistente');
        window.verificarLogros('tarea-semana');
        window.verificarLogros('tarea-todas');
      }
      
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'No se pudo marcar la tarea como completada', 'error');
    }
  }

  function actualizarVista() {
    if (listaTareas) listaTareas.innerHTML = '';
    if (contenedorTodas) contenedorTodas.innerHTML = '';

    const tareasMostrar = tareas.slice(0, 3);

    if (tareas.length === 0) {
      if (listaTareas) {
        listaTareas.innerHTML = `
          <div class="text-center text-gray-500 text-sm py-8">
            No hay tareas pendientes.
          </div>
        `;
      }
      if (contenedorTodas) {
        contenedorTodas.innerHTML = `
          <div class="text-center text-gray-500 text-sm py-8">
            No hay tareas disponibles para mostrar.
          </div>
        `;
      }
    } else {
      tareasMostrar.forEach(t => {
        if (listaTareas) listaTareas.appendChild(crearTarjeta(t));
      });
      tareas.forEach(t => {
        if (contenedorTodas) contenedorTodas.appendChild(crearTarjeta(t));
      });
    }
  }

  function crearTarjeta(tarea) {
    const div = document.createElement('div');
    div.className = 'border-l-4 border-yellow-500 bg-gray-50 p-4 rounded-md shadow-sm mb-3';
    div.innerHTML = `
      <div class="flex justify-between items-center">
        <h4 class="text-sm font-bold text-gray-800">${tarea.titulo}</h4>
        <span class="text-xs text-yellow-500 font-medium">${tarea.fecha}</span>
      </div>
      <p class="text-xs text-gray-600 mt-1">${tarea.descripcion}</p>
      <div class="mt-2">
        <label class="container inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" class="tarea-check absolute opacity-0" data-id="${tarea.id}">
          <span class="checkmark w-[20px] h-[20px] relative top-0 left-0 border-2 border-[#323232] rounded-[5px] shadow-[4px_4px_#323232] bg-[#ccc] transition-all duration-300"></span>
          <span class="ml-1">Marcar como completada</span>
        </label>
      </div>
    `;
    return div;
  } 

  if (listaTareas && modal) {
    listaTareas.addEventListener('change', e => {
      if (e.target.classList.contains('tarea-check')) {
        const id = parseInt(e.target.dataset.id);
        Swal.fire({
          title: '¿Estás seguro?',
          text: 'Una vez marcada, no podrás deshacer esta acción.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, completar',
          cancelButtonText: 'Cancelar'
        }).then(result => {
          if (result.isConfirmed) {
            setTimeout(() => {
              marcarTareaCompletada(id);
            }, 15000);
          } else {
            e.target.checked = false;
          }
        });
      }
    });
  }

  if (btnVerTodas && modalVerTodas) {
    btnVerTodas.addEventListener('click', () => {
      modalVerTodas.classList.remove('hidden');
      actualizarVista();
    });
  }

  function renderTareasCompletadas() {
    const data = obtenerStatsUsuario();
    if (!data) return;

    const { stats } = data;
    const tareasHistorico = JSON.parse(localStorage.getItem('statsHistorico') || '[]');
    
    const contador = document.getElementById('contador-tareas');
    const porcentaje = document.getElementById('porcentaje-tareas');
    const mesLabel = document.getElementById('mes-tareas-label');
    
    if (contador) contador.textContent = stats.mensual.tareas;
    if (mesLabel) mesLabel.textContent = 'Este mes';
    
    // Calcular porcentaje vs mes anterior
    if (tareasHistorico.length > 0) {
      const anterior = tareasHistorico[tareasHistorico.length-1].tareas || 0;
      if (anterior > 0) {
        const diff = stats.mensual.tareas - anterior;
        const percent = ((diff / anterior) * 100).toFixed(1);
        if (porcentaje) {
          porcentaje.innerHTML = `${diff >= 0 ? '▲' : '▼'} <span class="${diff >= 0 ? 'text-green-600' : 'text-red-600'}">${Math.abs(percent)}%</span> vs. mes anterior`;
        }
      } else {
        if (porcentaje) porcentaje.textContent = '';
      }
    } else {
      if (porcentaje) porcentaje.textContent = '';
    }
    
    // Actualizar perfil con datos TOTALES
    const profileTareas = document.getElementById('profile-tareas');
    if (profileTareas) profileTareas.textContent = stats.totales.tareas;
  }
  
  function inicializarContadorTareasCompletadas() {
    const userId = localStorage.getItem("ChankandoUserID");
    if (!userId) {
      Swal.fire({ icon: 'info', title: 'Inicia sesión', text: 'Debes iniciar sesión para ver tus tareas completadas' });
      return;
    }

    const key = `tareasCompletadas_${userId}`;
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth();
    const anioActual = fechaActual.getFullYear();

    const datosGuardados = JSON.parse(localStorage.getItem(key)) || {};

    if (datosGuardados.mes !== mesActual || datosGuardados.anio !== anioActual) {
      // Reiniciar si es un nuevo mes
      localStorage.setItem(key, JSON.stringify({
        mes: mesActual,
        anio: anioActual,
        contador: 0
      }));
    }

    const datosActualizados = JSON.parse(localStorage.getItem(key));
    const elContador = document.getElementById("contador-tareas");
    if (elContador) {
      elContador.textContent = datosActualizados.contador;
    }
  }

  function incrementarContadorTareasCompletadas() {
    const data = obtenerStatsUsuario();
    if (!data) {
      Swal.fire({ icon: 'info', title: 'Inicia sesión', text: 'Debes iniciar sesión para marcar tareas como completadas' });
      return;
    }

    const { stats, key } = data;
    
    // Incrementar AMBOS contadores
    stats.totales.tareas += 1;    // Total acumulativo
    stats.mensual.tareas += 1;    // Mensual (se reinicia)
    
    // Guardar y actualizar UI
    guardarStatsUsuario(stats, key);
    renderTareasCompletadas();
    
    // Verificar logros relacionados con tareas
    if (window.verificarLogros) {
      window.verificarLogros('tarea-completada');
      window.verificarLogros('tarea-dia');
    }
  }

  inicializarContadorTareasCompletadas();
  actualizarVista();
});


// LOGROS PARA LA SECCIÓN PROGRESO
function verificarSemanaPerfecta() {
  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) return false;

  try {
    const weeklyData = JSON.parse(localStorage.getItem('weeklyData')) || [0, 0, 0, 0, 0, 0, 0];
    const diasConEstudio = weeklyData.slice(0, 6).filter(horas => horas > 0).length;
        
     return diasConEstudio >= 6; 
  } catch (error) {
    console.error('Error al verificar semana perfecta:', error);
    return false;
  }
}

// Función mejorada que también verifica en el backend
async function verificarSemanaPerfectaCompleta() {
  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) return false;

  try {
    const semana = getCurrentWeekNumber();
    const anio = new Date().getFullYear();
        
    // Obtener datos actualizados del backend
    const response = await fetch(`https://chankando-1.onrender.com/grafica_semanal.php?usuario_id=${userId}&semana=${semana}&anio=${anio}`);
        
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
        
    const result = await response.json();
        
    if (result.success) {
        const datos = result.data;
          
      // Verificar que todos los días de lunes a sábado tengan al menos algunos minutos de estudio
      const diasConEstudio = [
        datos.lunes > 0,
        datos.martes > 0, 
        datos.miercoles > 0,
        datos.jueves > 0,
        datos.viernes > 0,
        datos.sabado > 0
      ].filter(estudio => estudio).length;
            
      return diasConEstudio >= 6; 
    }
        
    return false;
  } catch (error) {
    console.error('Error al verificar semana perfecta completa:', error);
    return false;
  }
}

// Función para otorgar el logro si se cumple
async function otorgarLogroSemanaPerfecta() {
  const logroId = 71;
  const userId = localStorage.getItem("ChankandoUserID");
    
  if (!userId) return;

  try {
    // Verificar si ya tiene el logro
    const logrosObtenidos = JSON.parse(localStorage.getItem(`userLogros_${userId}`)) || [];
    if (logrosObtenidos.includes(logroId)) {
      return; 
    }

    // Verificar si cumple con los requisitos
    const cumpleRequisitos = await verificarSemanaPerfectaCompleta();
        
    if (cumpleRequisitos) {
      // Otorgar el logro
      const response = await fetch('https://chankando-1.onrender.com/otorgar_logro.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: parseInt(userId),
          logro_id: logroId
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Actualizar localStorage
           logrosObtenidos.push(logroId);
          localStorage.setItem(`userLogros_${userId}`, JSON.stringify(logrosObtenidos));
            
          // Mostrar notificación
          Swal.fire({
            icon: 'success',
            title: '¡Logro Desbloqueado!',
            html: `
              <div class="text-center">
                <i class="fas fa-medal text-4xl text-yellow-500 mb-4"></i>
                <h3 class="text-xl font-bold">Semana perfecta</h3>
                <p class="text-gray-600">Estudia todos los días de la semana</p>
              </div>
            `,
            confirmButtonText: '¡Genial!'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error al otorgar logro semana perfecta:', error);
  }
}


///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SECCIÓN LOGROS ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////

async function actualizarPerfilUsuario() {
  const data = obtenerStatsUsuario();
  if (!data) return;

  const { stats, userId } = data;
  const mes = new Date().getMonth() + 1;
  const anio = new Date().getFullYear();

  try {
    const response = await fetch("https://chankando-1.onrender.com/actualizar_perfil.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        usuario_id: parseInt(userId),
        sesiones_completadas: stats.totales.sesiones,    // DATOS TOTALES ACUMULATIVOS
        tiempo_estudio_total: stats.totales.tiempo,      // DATOS TOTALES ACUMULATIVOS  
        tareas_completadas: stats.totales.tareas,        // DATOS TOTALES ACUMULATIVOS
        mes,
        anio
      })
    });

    const result = await response.json();
    if (!result.success) {
      console.error("Error al guardar perfil:", result.error);
    }
  } catch (err) {
    console.error("Error de red al guardar perfil:", err);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const isLoggedIn = localStorage.getItem("ChankandoLoggedIn");
  const userId = localStorage.getItem("ChankandoUserID");

  if (!isLoggedIn) {
    Swal.fire({
      icon: 'warning',
      title: 'Acceso restringido',
      text: 'Debes iniciar sesión para usar esta sección'
    });
  }

  // Verifica si es domingo
  const hoy = new Date();
  const diaSemanaActual = hoy.getDay();
  const esDomingo = diaSemanaActual === 0;
  const fechaHoy = hoy.toISOString().split('T')[0];

  // Variables globales
  let rachaActual = 0;
  let diasRacha = {
    lunes: false, martes: false, miercoles: false, 
    jueves: false, viernes: false, sabado: false, domingo: false
  };
  let ultimaFechaRacha = null;

  // Obtener racha desde la base de datos
  (async function cargarRachaDesdeServidor() {
    try {
      const res = await fetch(`https://chankando-1.onrender.com/obtener_racha.php?usuario_id=${userId}`);
      const data = await res.json();

      if (data.success) {
        rachaActual = parseInt(data.racha_actual || 0);
        diasRacha = JSON.parse(data.dias_racha || '{}');
        ultimaFechaRacha = data.ultima_fecha || null;

        const ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);
        const nombreAyer = obtenerNombreDia(ayer.getDay());

        if (data.ultima_fecha !== fechaHoy) {
          if (ayer.getDay() !== 0 && !diasRacha[nombreAyer]) {
            rachaActual = 0;
            reiniciarDiasRacha();
            await guardarRacha(); // sincroniza reinicio
          }
        }

        actualizarRachaUI();
      } else {
        console.warn("No se encontró racha previa, usando valores por defecto.");
      }
    } catch (error) {
      console.error("Error al cargar racha:", error);
    }
  })();

  // Función para guardar la racha en la base de datos
  async function guardarRacha() {
    const userId = localStorage.getItem("ChankandoUserID");
    const fechaHoy = new Date().toISOString().split('T')[0];

    if (!userId) {
      console.warn("No hay usuario logueado, no se guardará la racha.");
      return;
    }

    try {
      await fetch("https://chankando-1.onrender.com/guardar_racha.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: parseInt(userId),
          racha_actual: rachaActual,
          dias_racha: JSON.stringify(diasRacha),
          ultima_fecha: fechaHoy
        })
      });
    } catch (err) {
      console.error("Error al guardar racha:", err);
    }
  }

  // Función auxiliar para obtener nombre del día
  function obtenerNombreDia(diaNumero) {
    const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    return dias[diaNumero];
  }

  // Reiniciar días de racha
  function reiniciarDiasRacha() {
    diasRacha = {
      lunes: false, martes: false, miercoles: false, 
      jueves: false, viernes: false, sabado: false, domingo: false
    };
  }

  // Función para normalizar los nombres de días en el objeto diasRacha
  function normalizarDiasRacha(diasRacha) {
    return {
      lunes: diasRacha.lunes || false,
      martes: diasRacha.martes || false,
      miercoles: diasRacha.miercoles || false,
      jueves: diasRacha.jueves || false,
      viernes: diasRacha.viernes || false,
      sabado: diasRacha.sabado || false,
      domingo: diasRacha.domingo || false
    };
  }

  // Actualizar la UI de racha
  function actualizarRachaUI() {
    const contadorElemento = document.getElementById("streak-counter");
    
    if (contadorElemento) {
      contadorElemento.textContent = rachaActual;
      contadorElemento.classList.add("rising");
      setTimeout(() => contadorElemento.classList.remove("rising"), 500);
        
      if (rachaActual >= 3) {
        contadorElemento.classList.add("glow");
      } else {
        contadorElemento.classList.remove("glow");
      }
    }

    // Actualizar burbujas de días
    const hoy = new Date().getDay();
    const dias = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
    
    dias.forEach((dia, index) => {
      const elemento = document.querySelector(`[data-dia="${index}"]`);
      if (elemento) {
        elemento.classList.remove("completed", "missed", "active");
          
        // Verificar si el día está marcado
        if (diasRacha[dia]) {
          elemento.classList.add("completed");
          console.log("Marcando día como completado:", dia); // Debug
        } else if (index < hoy) {
          // Solo marcar como perdido si es un día anterior
          elemento.classList.add("missed");
        }
            
        // Resaltar día actual
        if (index === hoy) {
          elemento.classList.add("active");
        }
      }
    });
  }

  // Marcar día como estudiado
  window.marcarDiaDeRacha = async function() {
    const hoy = new Date();
    const diaSemanaActual = hoy.getDay();
    const esDomingo = diaSemanaActual === 0;
    const nombreDia = obtenerNombreDia(diaSemanaActual);
    const hoyStr = hoy.toISOString().split('T')[0];
    
    console.log("Marcando día:", nombreDia, "Fecha:", hoyStr); // Debug

    // Verificar si ya se marcó hoy
    if (ultimaFechaRacha === hoyStr) {
      console.log("Ya se registró una sesión hoy");
      return;
    }

    diasRacha = normalizarDiasRacha(diasRacha);

    // Marcar el día actual como completado
    if (!diasRacha[nombreDia]) {
      diasRacha[nombreDia] = true;
      console.log("Día marcado:", nombreDia, diasRacha);

      // Lógica para incrementar la racha
      if (!esDomingo) {
        rachaActual++;
        let rachaRecord = parseInt(localStorage.getItem("rachaRecord")) || 0;
        if (rachaActual > rachaRecord) {
          localStorage.setItem("rachaRecord", rachaActual);
        }
        console.log("Racha incrementada (día no domingo):", rachaActual);
      } else if (esDomingo) {
        rachaActual++;
        let rachaRecord = parseInt(localStorage.getItem("rachaRecord")) || 0;
        if (rachaActual > rachaRecord) {
          localStorage.setItem("rachaRecord", rachaActual);
        }
        console.log("Racha incrementada (domingo):", rachaActual);
      }

      ultimaFechaRacha = hoyStr;
        
      // Guardar en localStorage
      localStorage.setItem("rachaEstudio", rachaActual.toString());
      localStorage.setItem("diasRacha", JSON.stringify(diasRacha));
      localStorage.setItem("ultimaFechaRacha", ultimaFechaRacha);

      await guardarRacha();
      actualizarRachaUI();
      verificarLogros("racha");

    } else {
      console.log("El día ya estaba marcado:", nombreDia);
    }
  };

  // Definición de logros
  const logros = [
    // Logros de Pomodoro
    { id: 1, nombre: "Primeros pasos", descripcion: "Completa tu primera sesión Pomodoro", tipo: "pomodoro", requerimiento: 1, icono: "fa-star" },
    { id: 2, nombre: "Ritmo constante", descripcion: "Completa 3 sesiones Pomodoro en un día", tipo: "pomodoro-dia", requerimiento: 3, icono: "fa-fire" },
    { id: 3, nombre: "Maratón de estudio", descripcion: "Completa 5 sesiones Pomodoro en un día", tipo: "pomodoro-dia", requerimiento: 5, icono: "fa-mountain" },
    { id: 4, nombre: "Estudiante dedicado", descripcion: "Completa 10 sesiones Pomodoro en total", tipo: "pomodoro-total", requerimiento: 10, icono: "fa-book" },
    { id: 5, nombre: "Maestro del tiempo", descripcion: "Completa 50 sesiones Pomodoro en total", tipo: "pomodoro-total", requerimiento: 50, icono: "fa-clock" },
    { id: 6, nombre: "Centenario", descripcion: "Completa 100 sesiones Pomodoro", tipo: "pomodoro-total", requerimiento: 100, icono: "fa-hourglass" },
    { id: 7, nombre: "Sin pausas", descripcion: "Completa 3 sesiones sin interrupciones", tipo: "pomodoro-seguidas", requerimiento: 3, icono: "fa-forward" },
    { id: 8, nombre: "Sesión larga", descripcion: "Completa una sesión de 60 minutos", tipo: "pomodoro-largo", requerimiento: 1, icono: "fa-expand-alt" },
    { id: 9, nombre: "Ritmo perfecto", descripcion: "Completa 5 sesiones con descansos exactos", tipo: "pomodoro-ritmo", requerimiento: 5, icono: "fa-metronome" },
    { id: 10, nombre: "Estudiante matutino", descripcion: "Completa una sesión antes de las 8 AM", tipo: "pomodoro-temprano", requerimiento: 1, icono: "fa-sun" },

    // Logros de racha 
    { id: 11, nombre: "Principiante constante", descripcion: "Mantén una racha de 3 días", tipo: "racha", requerimiento: 3, icono: "fa-calendar-day" },
    { id: 12, nombre: "Estudiante comprometido", descripcion: "Mantén una racha de 7 días", tipo: "racha", requerimiento: 7, icono: "fa-calendar-week" },
    { id: 13, nombre: "Hábito sólido", descripcion: "Mantén una racha de 14 días", tipo: "racha", requerimiento: 14, icono: "fa-calendar-alt" },
    { id: 14, nombre: "Maestro de la disciplina", descripcion: "Mantén una racha de 30 días", tipo: "racha", requerimiento: 30, icono: "fa-calendar-check" },
    { id: 15, nombre: "Hierro", descripcion: "Mantén una racha de 60 días", tipo: "racha", requerimiento: 60, icono: "fa-dumbbell" },
    { id: 16, nombre: "Acero", descripcion: "Mantén una racha de 90 días", tipo: "racha", requerimiento: 90, icono: "fa-hard-hat" },
    { id: 17, nombre: "Platino", descripcion: "Mantén una racha de 180 días", tipo: "racha", requerimiento: 180, icono: "fa-medal" },
    { id: 18, nombre: "Diamante", descripcion: "Mantén una racha de 365 días", tipo: "racha", requerimiento: 365, icono: "fa-gem" },
    { id: 19, nombre: "Fin de semana productivo", descripcion: "Estudia un sábado y domingo", tipo: "fin-semana", requerimiento: 2, icono: "fa-umbrella-beach" },
    { id: 20, nombre: "Sin descanso", descripcion: "Completa sesiones 7 días seguidos", tipo: "racha-sin-descanso", requerimiento: 7, icono: "fa-calendar-times" },

    // Logros de notas 
    { id: 21, nombre: "Primer apunte", descripcion: "Crea tu primer apunte", tipo: "nota", requerimiento: 1, icono: "fa-file-alt" },
    { id: 22, nombre: "Coleccionista", descripcion: "Crea 5 apuntes", tipo: "nota", requerimiento: 5, icono: "fa-folder" },
    { id: 23, nombre: "Archivero", descripcion: "Crea 10 apuntes", tipo: "nota", requerimiento: 10, icono: "fa-archive" },
    { id: 24, nombre: "Bibliotecario", descripcion: "Crea 25 apuntes", tipo: "nota", requerimiento: 25, icono: "fa-book-open" },
    { id: 25, nombre: "Escribano", descripcion: "Crea apuntes en 3 materias diferentes", tipo: "nota-materias", requerimiento: 3, icono: "fa-pen-fancy" },
    { id: 26, nombre: "Polímata", descripcion: "Crea apuntes en 5 materias diferentes", tipo: "nota-materias", requerimiento: 5, icono: "fa-atom" },
    { id: 27, nombre: "Constante", descripcion: "Crea apuntes 3 días seguidos", tipo: "nota-dias", requerimiento: 3, icono: "fa-calendar-check" },
    { id: 28, nombre: "Disciplinado", descripcion: "Crea al menos un apunte cada día durante una semana", tipo: "nota-semana", requerimiento: 7, icono: "fa-calendar-week" },
    { id: 29, nombre: "Resumen maestro", descripcion: "Crea un apunte con más de 500 palabras", tipo: "nota-larga", requerimiento: 1, icono: "fa-scroll" },
    { id: 30, nombre: "Escritor Veloz", descripcion: "Crea 3 apuntes en menos de 1 hora", tipo: "nota-rapidas", requerimiento: 1, icono: "fa-bolt" },

    // Logros de calendario 
    { id: 31, nombre: "Planificador", descripcion: "Agrega tu primer evento al calendario", tipo: "evento", requerimiento: 1, icono: "fa-calendar-plus" },
    { id: 32, nombre: "Calendario lleno", descripcion: "Crea eventos en 5 en el calendario", tipo: "evento", requerimiento: 5, icono: "fa-calendar-day" },
    { id: 33, nombre: "Agenda ocupada", descripcion: "Crea 10 eventos en el calendario", tipo: "evento", requerimiento: 10, icono: "fa-calendar-alt" },
    { id: 34, nombre: "Agenda completa", descripcion: "Agrega eventos para toda la semana", tipo: "evento-semana", requerimiento: 5, icono: "fa-calendar-week" },
    { id: 35, nombre: "Evento colorido", descripcion: "Crea un evento seleccionando un color distinto al predeterminado", tipo: "evento-color", requerimiento: 1, icono: "fa-palette" },
    { id: 36, nombre: "Semana organizada", descripcion: "Agrega tu primer bloque en el horario semanal", tipo: "horario-bloques", requerimiento: 1, icono: "fa-calendar-week" },
    { id: 37, nombre: "Constancia semanal", descripcion: "Crea 15 bloques en el horario semanal", tipo: "horario-bloques", requerimiento: 15, icono: "fa-tasks" },
    { id: 38, nombre: "Examen próximo", descripcion: "Agrega un evento de examen", tipo: "evento-examen", requerimiento: 1, icono: "fa-clipboard-check" },
    { id: 39, nombre: "Proyecto grande", descripcion: "Crea un evento que dure 3+ días", tipo: "evento-largo", requerimiento: 1, icono: "fa-project-diagram" },
    { id: 40, nombre: "Limpiador", descripcion: "Elimina un evento pasado", tipo: "evento-eliminado", requerimiento: 1, icono: "fa-trash-alt" },

    // Logros de tareas
    { id: 41, nombre: "Primera tarea", descripcion: "Crea tu primera tarea", tipo: "tarea", requerimiento: 1, icono: "fa-tasks" },
    { id: 42, nombre: "Productivo", descripcion: "Completa 5 tareas", tipo: "tarea-completada", requerimiento: 5, icono: "fa-check-circle" },
    { id: 43, nombre: "Máquina de eficiencia", descripcion: "Completa 5 tareas en un día", tipo: "tarea-dia", requerimiento: 10, icono: "fa-bolt" },
    { id: 44, nombre: "Lista maestra", descripcion: "Crea 10 tareas diferentes", tipo: "tarea-creadas", requerimiento: 10, icono: "fa-list-ol" },
    { id: 45, nombre: "Constante", descripcion: "Completa tareas durante 3 días seguidos", tipo: "tarea-dias-seguidos", requerimiento: 3, icono: "fa-calendar-check" },
    { id: 46, nombre: "Plazo cumplido", descripcion: "Completa una tarea antes de su fecha", tipo: "tarea-tiempo", requerimiento: 1, icono: "fa-stopwatch" },
    { id: 47, nombre: "Detallista", descripcion: "Añade descripciones a 5 tareas", tipo: "tarea-descripciones", requerimiento: 5, icono: "fa-align-left" },
    { id: 48, nombre: "Persistente", descripcion: "Completa 100 tareas en total", tipo: "tarea-completada", requerimiento: 100, icono: "fa-clipboard-check" },
    { id: 49, nombre: "En racha", descripcion: "Completa al menos una tarea al día durante una semana", tipo: "tarea-semana", requerimiento: 7, icono: "fa-fire" },
    { id: 50, nombre: "Maestro de tareas", descripcion: "Completa todas las tareas pendientes en un día", tipo: "tarea-todas", requerimiento: 1, icono: "fa-trophy" },

    // Logros de horario
    { id: 51, nombre: "Horario establecido", descripcion: "Configura tu horario de clases", tipo: "horario", requerimiento: 6, icono: "fa-table" },
    { id: 52, nombre: "Rutina definida", descripcion: "Agrega clases para 3 días diferentes", tipo: "horario-dias", requerimiento: 3, icono: "fa-list-ol" },
    { id: 53, nombre: "Estudiante Nocturno", descripcion: "Agrega una clase en la noche (6PM-11PM)", tipo: "horario-nocturno", requerimiento: 1, icono: "fa-moon" },
    { id: 54, nombre: "Clase Express", descripcion: "Agrega una clase de 1 hora exacta", tipo: "horario-express", requerimiento: 1, icono: "fa-bolt" },
    { id: 55, nombre: "Variedad", descripcion: "Agrega 3 materias diferentes", tipo: "horario-materias", requerimiento: 3, icono: "fa-shapes" },
    { id: 56, nombre: "Actualizado", descripcion: "Modifica tu horario 3 veces", tipo: "horario-actualizado", requerimiento: 3, icono: "fa-history" },
    { id: 57, nombre: "Consistente", descripcion: "Mantén el mismo horario 2 semanas", tipo: "horario-consistente", requerimiento: 2, icono: "fa-redo-alt" },
    { id: 58, nombre: "Fin de Semana Activo", descripcion: "Agrega clases el sábado o domingo", tipo: "horario-fin-semana", requerimiento: 1, icono: "fa-weekend" },
    { id: 59, nombre: "Balance perfecto", descripcion: "Equilibra estudio y descanso", tipo: "horario-balance", requerimiento: 1, icono: "fa-balance-scale-right" },
    { id: 60, nombre: "Horario maestro", descripcion: "Configura horario para todos los días", tipo: "horario-completo", requerimiento: 5, icono: "fa-calendar-check" },

    // Logros de tiempo de estudio
    { id: 61, nombre: "Maratón de estudio", descripcion: "Estudia 5 horas en un día", tipo: "tiempo-dia", requerimiento: 5, icono: "fa-running" },
    { id: 62, nombre: "Primera hora", descripcion: "Estudia 1 hora en total", tipo: "tiempo-total", requerimiento: 1, icono: "fa-hourglass-start" },
    { id: 63, nombre: "100 horas", descripcion: "Estudia 100 horas en total", tipo: "tiempo-total", requerimiento: 100, icono: "fa-hourglass-end" },
    { id: 64, nombre: "500 horas", descripcion: "Estudia 500 horas en total", tipo: "tiempo-total", requerimiento: 500, icono: "fa-hourglass-half" },
    { id: 65, nombre: "1,000 horas", descripcion: "Estudia 1,000 horas en total", tipo: "tiempo-total", requerimiento: 1000, icono: "fa-hourglass" },
    { id: 66, nombre: "Sesión Larga", descripcion: "Completa una sesión de 60+ minutos", tipo: "pomodoro-largo", requerimiento: 1, icono: "fa-clock" },
    { id: 67, nombre: "Noctámbulo", descripcion: "Estudia después de las 10 PM", tipo: "tiempo-tarde", requerimiento: 1, icono: "fa-moon" },
    { id: 68, nombre: "Ritmo constante", descripcion: "Estudia 3+ horas por 3 días", tipo: "tiempo-consistente", requerimiento: 3, icono: "fa-wave-square" },
    { id: 69, nombre: "Fin de semana", descripcion: "Estudia 5+ horas en fin de semana", tipo: "tiempo-fin-semana", requerimiento: 5, icono: "fa-umbrella-beach" },
    { id: 70, nombre: "Día libre", descripcion: "Estudia menos de 1 hora en un día", tipo: "tiempo-descanso", requerimiento: 1, icono: "fa-couch" },

    // Logros especiales
    { id: 71, nombre: "Principiante", descripcion: "Desbloquea tu primer logro", tipo: "especial", requerimiento: 1, icono: "fa-baby" },
    { id: 72, nombre: "Avanzado", descripcion: "Desbloquea 10 logros", tipo: "especial", requerimiento: 10, icono: "fa-user" },
    { id: 73, nombre: "Experto", descripcion: "Desbloquea 25 logros", tipo: "especial", requerimiento: 25, icono: "fa-user-graduate" },
    { id: 74, nombre: "Maestro", descripcion: "Desbloquea 50 logros", tipo: "especial", requerimiento: 50, icono: "fa-user-tie" },
    { id: 75, nombre: "Leyenda", descripcion: "Desbloquea 65 logros", tipo: "especial", requerimiento: 65, icono: "fa-chess-queen" },
    { id: 76, nombre: "Ícono", descripcion: "Desbloquea todos los logros", tipo: "especial", requerimiento: 80, icono: "fa-monument" },
    { id: 77, nombre: "Versátil", descripcion: "Desbloquea logros en todas las categorías", tipo: "especial", requerimiento: 7, icono: "fa-shapes" },
    { id: 78, nombre: "Equilibrio", descripcion: "Mantén balance entre estudio y descanso", tipo: "especial", requerimiento: 1, icono: "fa-balance-scale" },
    { id: 79, nombre: "Persistente", descripcion: "Continúa después de perder una racha", tipo: "especial", requerimiento: 1, icono: "fa-redo" },
    { id: 80, nombre: "Renacido", descripcion: "Vuelve a empezar después de un descanso", tipo: "especial", requerimiento: 1, icono: "fa-phoenix-framework" },
    { id: 81, nombre: "Campeón", descripcion: "Logro final - ¡lo has conseguido todo!", tipo: "especial", requerimiento: 80, icono: "fa-trophy-alt" }
  ];

  // Inicializar logros desbloqueados
  let logrosDesbloqueados = userId ? JSON.parse(localStorage.getItem(`logrosDesbloqueados_${userId}`)) || [] : [];

  if (userId) {
    fetch(`/obtener_logros.php?usuario_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        logrosDesbloqueados = Array.isArray(data) ? data : [];
        
        localStorage.setItem(`logrosDesbloqueados_${userId}`, JSON.stringify(logrosDesbloqueados));
        
        actualizarRachaUI();
        renderizarLogros();
        actualizarProximoLogro();
        verificarTodosLosLogros();
      })
      .catch(error => {
        console.error("Error al obtener logros:", error);
        logrosDesbloqueados = JSON.parse(localStorage.getItem(`logrosDesbloqueados_${userId}`)) || [];
        renderizarLogros(); 
      });
  } else {
    logrosDesbloqueados = [];
    renderizarLogros();
  }
  
  window.verificarLogros = function(tipo) {
    const userId = localStorage.getItem("ChankandoUserID");
    if (!userId) return;

    let logroDesbloqueado = false;
    let logrosDesbloqueados = JSON.parse(localStorage.getItem(`logrosDesbloqueados_${userId}`)) || [];

    logros.forEach(logro => {
      if (logro.tipo === tipo) {
        const yaDesbloqueado = logrosDesbloqueados.includes(logro.id);
        const progreso = obtenerProgresoActual(logro);
        
        if (!yaDesbloqueado && progreso >= logro.requerimiento) {
          desbloquearLogro(logro);
          logrosDesbloqueados.push(logro.id);
          localStorage.setItem(`logrosDesbloqueados_${userId}`, JSON.stringify(logrosDesbloqueados));
          logroDesbloqueado = true;
        }
      }
    });

    if (logroDesbloqueado) {
      renderizarLogros();
      actualizarProximoLogro();
    }
  };

  function verificarTodosLosLogros() {
    const tiposUnicos = [...new Set(logros.map(logro => logro.tipo))];
    tiposUnicos.forEach(tipo => verificarLogros(tipo));
  }

  // Obtener progreso actual para un tipo de logro
  function obtenerProgresoActual(logro) {
    const data = obtenerStatsUsuario();
    const tipo = logro.tipo;
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    const notas = window.notes || [];
    const tareas = JSON.parse(localStorage.getItem("tareas")) || [];
    const eventos = JSON.parse(localStorage.getItem("calendarEvents")) || [];
    const rachaActual = parseInt(localStorage.getItem("rachaEstudio")) || 0;
    const diasRacha = JSON.parse(localStorage.getItem("diasRacha")) || {};

    switch (tipo) {
      // Pomodoro
      case "pomodoro":
        return (parseInt(localStorage.getItem("pomodorosHoy")) || 0) >= 1 ? 1 : 0;
      case "pomodoro-dia":
        return parseInt(localStorage.getItem("pomodorosHoy")) || 0;
      case "pomodoro-total":
        if (data && data.stats) {
          return data.stats.totales.sesiones;
        }
      case "pomodoro-seguidas":
        return parseInt(localStorage.getItem("pomodorosSeguidos")) || 0;
      case "pomodoro-largo":
        return parseInt(localStorage.getItem("pomodorosLargos") || 0) >= 1 ? 1 : 0;
      case "pomodoro-temprano":
        return parseInt(localStorage.getItem("pomodorosTemprano") || 0) >= 1 ? 1 : 0;
      case "pomodoro-ritmo":
        const hoy = new Date().toISOString().split('T')[0];
        const ritmoFecha = localStorage.getItem('pomodoroRitmoFecha');
        
        if (ritmoFecha === hoy) {
          return parseInt(localStorage.getItem('pomodoroRitmo')) || 0;
        }
        return 0;

      // Racha
      case "racha":
        return parseInt(localStorage.getItem("rachaRecord")) || rachaActual;
      case "fin-semana":{
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        
        if (diaSemana !== 0 && diaSemana !== 6) return 0;
        
        const semanaYear = getWeekNumber(hoy);
        const key = `finSemana_${semanaYear.semana}_${semanaYear.year}`;
        const registro = JSON.parse(localStorage.getItem(key) || '{"sabado": false, "domingo": false}');
        
        let progreso = 0;
        if (registro.sabado) progreso++;
        if (registro.domingo) progreso++;
        
        return progreso;
      }
      case "racha-sin-descanso":
        return rachaActual >= 7 ? 1 : 0;
      case "semana-perfecta": {
        const diasSemana = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        return diasSemana.filter(d => diasRacha[d]).length;
      }

      // Notas
      case "nota":
        const notasGuardadas = JSON.parse(localStorage.getItem("userNotes") || "[]");
        return notasGuardadas.length;
        
      case "nota-materias": {
        const notasGuardadas = JSON.parse(localStorage.getItem("userNotes") || "[]");
        const materias = new Set(notasGuardadas.map(n => n.tag));
        return materias.size;
      }

      case "nota-dias":
        return obtenerRachaNotas();
        
      case "nota-semana":
        const racha = obtenerRachaNotas();
        return racha >= 7 ? 7 : racha; 

      case "nota-larga":
        return verificarNotaLarga();

      case "nota-compleja":
        return notas.filter(n => n.content.includes("![") || n.content.includes("http")).length;

      case "nota-etiquetas": {
        const etiquetas = new Set(notas.map(n => n.tag));
        return etiquetas.size;
      }

      case "nota-rapidas":
        return verificarApuntesRapidos();

      // Eventos y horario
      case "evento":
        const eventosGuardados = JSON.parse(localStorage.getItem("userEvents") || "[]");
        return eventosGuardados.length;

      case "evento-semana":
        return obtenerProgresoEventoSemana();
        
      case "evento-color": 
        return verificarEventoConColorDiferente();
        
      case "horario-bloques":
        return obtenerProgresoBloquesHorario();

      case "evento-examen":
        return verificarEventoExamen();

      case "evento-largo":
        return verificarEventoLargo();

      case 'evento-eliminado':
        return verificarEventoPasadoEliminado();

      // Tareas
      case "tarea":
        const userId_primera = localStorage.getItem("ChankandoUserID");
        if (!userId_primera) return 0;
        const totalCreadasKey = `totalTareasCreadas_${userId_primera}`;
        const totalCreadas = parseInt(localStorage.getItem(totalCreadasKey)) || 0;
        return totalCreadas >= 1 ? 1 : 0;

      case "tarea-dia":
        const userId_dia = localStorage.getItem("ChankandoUserID");
        if (!userId_dia) return 0;
        
        // Buscar el máximo de tareas completadas en un solo día
        let maxTareasEnUnDia = 0;
        for (let i = 0; i < 30; i++) {
          const fecha = new Date();
          fecha.setDate(fecha.getDate() - i);
          const fechaStr = fecha.toISOString().split('T')[0];
          const key = `tareasCompletadasHoy_${fechaStr}_${userId_dia}`;
          const completadas = parseInt(localStorage.getItem(key)) || 0;
          maxTareasEnUnDia = Math.max(maxTareasEnUnDia, completadas);
        }
        return maxTareasEnUnDia;

      case "tarea-creadas":
        const userId_creadas = localStorage.getItem("ChankandoUserID");
        if (!userId_creadas) return 0;
        const totalCreadasKey_44 = `totalTareasCreadas_${userId_creadas}`;
        return parseInt(localStorage.getItem(totalCreadasKey_44)) || 0;

      case "tarea-dias-seguidos":
        const userId_seguidos = localStorage.getItem("ChankandoUserID");
        if (!userId_seguidos) return 0;
        
        const hoyS = new Date();
        let diasConsecutivos = 0;
        
        for (let i = 0; i < 30; i++) {
          const fecha = new Date(hoyS);
          fecha.setDate(fecha.getDate() - i);
          const fechaStr = fecha.toISOString().split('T')[0];
          const key = `tareasCompletadasHoy_${fechaStr}_${userId_seguidos}`;
          const completadas = parseInt(localStorage.getItem(key)) || 0;
          
          if (completadas > 0) {
            diasConsecutivos++;
          } else {
            break;
          }
        }
        return diasConsecutivos;

      case "tarea-tiempo":
        const userId_tiempo = localStorage.getItem("ChankandoUserID");
        if (!userId_tiempo) return 0;
        const aTiempoKey = `tareasATiempo_${userId_tiempo}`;
        return parseInt(localStorage.getItem(aTiempoKey)) || 0;

      case "tarea-descripciones":
        const userId_desc = localStorage.getItem("ChankandoUserID");
        if (!userId_desc) return 0;
        const descripcionesKey = `tareasConDescripcion_${userId_desc}`;
        return parseInt(localStorage.getItem(descripcionesKey)) || 0;

      case "tarea-completada":
        if (data && data.stats) {
          return data.stats.totales.tareas >= 100 ? 1 : 0;
        }
        return 0;

      case "tarea-semana": 
        const userId_semana = localStorage.getItem("ChankandoUserID");
        if (!userId_semana) return 0;
        
        const hoy_semana = new Date();
        let diasConTareas = 0;
        
        for (let i = 0; i < 7; i++) {
          const fecha = new Date(hoy_semana);
          fecha.setDate(fecha.getDate() - i);
          const fechaStr = fecha.toISOString().split('T')[0];
          const key = `tareasCompletadasHoy_${fechaStr}_${userId_semana}`;
          const completadas = parseInt(localStorage.getItem(key)) || 0;
          
          if (completadas > 0) {
            diasConTareas++;
          }
        }
        return diasConTareas >= 7 ? 1 : 0;

      case "tarea-todas":
        const userId_maestro = localStorage.getItem("ChankandoUserID");
        if (!userId_maestro) return 0;
        const maestroKey = `maestroTareas_${userId_maestro}`;
        return parseInt(localStorage.getItem(maestroKey)) || 0;
      
      // Horario
      case 'horario':
        return verificarHorarioEstablecido();
      
      case 'horario-dias':
        return verificarClasesEnDiasDiferentes();

      case 'horario-nocturno':
        return verificarClaseNocturna();

      case 'horario-express':
        return verificarClaseExpress();

      case 'horario-fin-semana':
        return verificarClaseFinSemana();

      case 'horario-materias':
        return verificarMateriasDiferentes();

      case 'horario-actualizado':
        return verificarHorarioActualizado();

      case 'horario-consistente':
        return verificarConsistenciaHorario();

      case 'horario-balance':
        return verificarBalanceEstudioDescanso();

      case 'horario-completo':
        return verificarHorarioMaestro();

      // Tiempo de estudio
      case 'tiempo-dia':
        return verificarMaratonEstudio();
      
      case 'tiempo-total':
        return verificarHorasTotalesEstudio();
      
      case 'tiempo-largo': 
        return verificarSesionLarga();
      
      case 'tiempo-tarde':
        return verificarEstudioTarde();
      
      case 'tiempo-consistente':
        return verificarRitmoConstante();
      
      case 'tiempo-fin-semana':
        return verificarEstudioFinSemana();
      
      case 'tiempo-descanso':
        return verificarDiaLibre();
      
      // Combo
      case "combo": {
      }

      // Especiales
      case "especial":
        switch (logro.id) {
          case 71: // Principiante
            return logrosDesbloqueados.length >= 1 ? 1 : 0;
          case 72: // Avanzado
            return Math.min(logrosDesbloqueados.length, 10);
          case 73: // Experto
            return Math.min(logrosDesbloqueados.length, 25);
          case 74: // Maestro
            return Math.min(logrosDesbloqueados.length, 50);
          case 75: // Leyenda
            return Math.min(logrosDesbloqueados.length, 75);
          case 76: // Ícono
            return logrosDesbloqueados.length;
          case 77: { // Versátil
            const categoriasDesbloqueadas = new Set();
            
            logrosDesbloqueados.forEach(idDesbloqueado => {
                // Buscamos el logro en tu lista maestra 'logros'
                const l = logros.find(item => item.id === idDesbloqueado);
                // Si existe y no es especial, agregamos su categoría
                if (l && l.tipo !== "especial") {
                    categoriasDesbloqueadas.add(l.tipo);
                }
            });
            return categoriasDesbloqueadas.size;
          }
          case 78: { // Equilibrio
            const tEstudio = parseInt(localStorage.getItem("tiempoEstudioTotal")) || 0;
            const tDescanso = parseInt(localStorage.getItem("tiempoDescansoTotal")) || 0;
            if (tEstudio < 60) return 0; // Mínimo 1 hora de estudio para considerar equilibrio
            const dif = Math.abs(tEstudio - tDescanso);
            return (dif <= tEstudio * 0.25) ? 1 : 0;
          }
          case 79: { // Persistente
            const rachaActual = parseInt(localStorage.getItem("rachaEstudio")) || 0;
            const ultimaRacha = parseInt(localStorage.getItem("ultimaRacha")) || 0;
            const ultimaActividad = localStorage.getItem("ultimaActividad");
            return (ultimaRacha > 0 && rachaActual === 0 && ultimaActividad) ? 1 : 0;
          }
          case 80: { // Renacido
            const ultimaActividadStr = localStorage.getItem("ultimaActividad");
            if (!ultimaActividadStr) return 0;
            const ultimaActividad = new Date(ultimaActividadStr);
            const diasInactivo = Math.floor((new Date() - ultimaActividad) / (1000 * 60 * 60 * 24));
            const sesiones = parseInt(localStorage.getItem("totalPomodorosCompletados")) || 0;
            return (diasInactivo >= 3 && sesiones > 0) ? 1 : 0;
          }
          case 81: // Campeón
            return logrosDesbloqueados.length;
          default:
            return 0;
        }

      default:
        return 0;
    }
  }

  function desbloquearLogro(logro) {
    const userId = localStorage.getItem("ChankandoUserID"); 
    if (!userId) return;

    let logrosDesbloqueados = JSON.parse(localStorage.getItem(`logrosDesbloqueados_${userId}`)) || [];
    
    if (!logrosDesbloqueados.includes(logro.id)) {
      logrosDesbloqueados.push(logro.id);
      localStorage.setItem(`logrosDesbloqueados_${userId}`, JSON.stringify(logrosDesbloqueados));
      mostrarNotificacionLogro(logro);

      fetch("https://chankando-1.onrender.com/guardar_logro.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: parseInt(userId),
          logro_id: logro.id
        })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          console.error("No se pudo guardar logro en BD:", data.error);
        }
      });
    }
  }
 
  // Mostrar notificación de logro desbloqueado
  function mostrarNotificacionLogro(logro) {
    const userId = localStorage.getItem("ChankandoUserID");
    if (!userId) return;

    const key = `logrosNotificados_${userId}`;
    const notificados = JSON.parse(localStorage.getItem(key)) || [];

    // Mostrar solo si no ha sido notificado antes
    if (notificados.includes(logro.id)) return;

    // Mostrar notificación
    const notificacion = document.createElement("div");
    notificacion.className = "fixed top-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg shadow-lg z-50 animate-bounce";
    notificacion.innerHTML = `
      <div class="flex items-center gap-3">
        <i class="fas ${logro.icono} text-2xl"></i>
        <div>
          <h3 class="font-bold">¡Logro desbloqueado!</h3>
          <p>${logro.nombre}: ${logro.descripcion}</p>
        </div>
      </div>
    `;

    document.body.appendChild(notificacion);

    setTimeout(() => {
      notificacion.classList.remove("animate-bounce");
      notificacion.classList.add("opacity-0", "transition-opacity", "duration-500");
      setTimeout(() => notificacion.remove(), 500);
    }, 2000);

    // ✅ Guardar como notificado para este usuario
    notificados.push(logro.id);
    localStorage.setItem(key, JSON.stringify(notificados));
  }

  // Renderizar logros en la UI
  function renderizarLogros() {
    const contenedorDesbloqueados = document.getElementById("logros-desbloqueados");
    const contenedorBloqueados = document.getElementById("logros-bloqueados");
    
    if (!contenedorDesbloqueados || !contenedorBloqueados) return;
    
    contenedorDesbloqueados.innerHTML = "";
    contenedorBloqueados.innerHTML = "";
    
    // Ordenar logros por ID
    const logrosOrdenados = [...logros].sort((a, b) => a.id - b.id);
    
    const userId = localStorage.getItem("ChankandoUserID");
    
    logrosOrdenados.forEach(logro => {
      const estaDesbloqueado = userId ? logrosDesbloqueados.includes(logro.id) : false;
      const contenedor = estaDesbloqueado ? contenedorDesbloqueados : contenedorBloqueados;
      
      const elemento = document.createElement("div");
      elemento.className = `rounded-xl p-4 shadow-md transition-all hover:shadow-lg ${
        estaDesbloqueado 
          ? "bg-green-50 border-l-4 border-green-600" 
          : "bg-gray-50 border-l-4 border-gray-500 opacity-75"
      }`;
      elemento.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center ${
            estaDesbloqueado ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"
          }">
            <i class="fas ${logro.icono}"></i>
          </div>
          <div>
            <h3 class="font-bold ${estaDesbloqueado ? "text-gray-800" : "text-gray-600"}">${logro.nombre}</h3>
            <p class="text-sm ${estaDesbloqueado ? "text-gray-600" : "text-gray-500"}">${logro.descripcion}</p>
            ${!estaDesbloqueado ? `
              <div class="mt-2 text-xs text-gray-400">
                ${userId ? `Progreso: ${obtenerProgresoActual(logro)}/${logro.requerimiento}` : 'Inicia sesión para desbloquear'}
              </div>
            ` : ""}
          </div>
        </div>
      `;
      
      contenedor.appendChild(elemento);
    });
  }

  // Actualizar el próximo logro a desbloquear
  function actualizarProximoLogro() {
    const proximoLogro = logros.find(logro => !logrosDesbloqueados.includes(logro.id));
    const contenedor = document.getElementById("next-achievement");
    
    if (contenedor && proximoLogro) {
      contenedor.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 text-2xl shadow-inner">
            <i class="fas ${proximoLogro.icono}"></i>
          </div>
          <div>
            <h4 class="font-bold text-lg text-gray-800">${proximoLogro.nombre}</h4>
            <p class="text-sm text-gray-500">${proximoLogro.descripcion}</p>
            <div class="mt-1 text-xs text-gray-400">
              Progreso: ${obtenerProgresoActual(proximoLogro.tipo)}/${proximoLogro.requerimiento}
            </div>
          </div>
        </div>
      `;
    }
  }

  // Inicializar
  actualizarRachaUI();
  renderizarLogros();
  actualizarProximoLogro();
  verificarTodosLosLogros();
});


// HEADER - NOTIFICACIONES
document.addEventListener("DOMContentLoaded", async () => {
  const bellBtn = document.getElementById("notification-btn");
  const bubble = document.getElementById("notification-bubble");
  const popover = document.getElementById("notification-popover");
  const list = document.getElementById("notification-list");

  const userId = localStorage.getItem("ChankandoUserID");
  if (!userId) return;

  const getDescartadas = () =>
    JSON.parse(localStorage.getItem(`notificacionesDescartadas_${userId}`) || "[]");

  const marcarComoDescartada = (id) => {
    const actuales = getDescartadas();
    if (!actuales.includes(id)) {
      actuales.push(id);
      localStorage.setItem(`notificacionesDescartadas_${userId}`, JSON.stringify(actuales));
    }
  };

  async function obtenerEventosManana() {
    const recordatorios = [];
    const descartadas = getDescartadas();
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);
    const fechaManana = manana.toISOString().split("T")[0];

    // Obtener eventos desde la base de datos
    let eventos = [];
    try {
      const res = await fetch(`https://chankando-1.onrender.com/obtener_eventos.php?usuario_id=${userId}`);
      eventos = await res.json();
    } catch (err) {
      console.error("Error cargando eventos para notificaciones:", err);
    }

    eventos.forEach((ev, i) => {
      const id = `evento-${ev.id}`;
      if (ev.start.startsWith(fechaManana) && !descartadas.includes(id)) {
        recordatorios.push({
          id,
          html: `
            <div class="relative group flex items-start gap-3 bg-blue-50 p-3 rounded-lg shadow-sm animate-fade-in border-l-4 border-blue-400" data-noti="${id}">
              <button class="absolute top-1 right-1 text-blue-400 hover:text-blue-700 text-sm font-bold px-2 focus:outline-none close-noti" title="Cerrar notificación">&times;</button>
              <i class="fas fa-calendar-alt text-blue-500 text-xl mt-1 animate-bounce"></i>
              <div>
                <p class="text-sm text-blue-700 font-medium">Tienes un evento mañana</p>
                <p class="text-sm text-gray-700">📅 <strong>${ev.title}</strong></p>
              </div>
            </div>
          `
        });
      }
    });

    const tareas = JSON.parse(localStorage.getItem(`tareas_${userId}`) || "[]");
    tareas.forEach((t, j) => {
      const id = `tarea-${j}`;
      if (t.fecha === fechaManana && !descartadas.includes(id)) {
        recordatorios.push({
          id,
          html: `
            <div class="relative group flex items-start gap-3 bg-yellow-50 p-3 rounded-lg shadow-sm animate-fade-in border-l-4 border-yellow-400" data-noti="${id}">
              <button class="absolute top-1 right-1 text-yellow-400 hover:text-yellow-700 text-sm font-bold px-2 focus:outline-none close-noti" title="Cerrar notificación">&times;</button>
              <i class="fas fa-tasks text-yellow-500 text-xl mt-1 animate-wiggle"></i>
              <div>
                <p class="text-sm text-yellow-700 font-medium">Tienes una tarea pendiente</p>
                <p class="text-sm text-gray-700">📝 <strong>${t.titulo}</strong></p>
              </div>
            </div>
          `
        });
      }
    });

    return recordatorios;
  }

  async function actualizarNotificaciones() {
    const recordatorios = await obtenerEventosManana();
    const bellIcon = document.getElementById("bell-icon");

    if (recordatorios.length > 0) {
      bubble.classList.remove("hidden");
      bubble.textContent = recordatorios.length;
      bellIcon.classList.add("bell-animate");
    } else {
      bubble.classList.add("hidden");
      bellIcon.classList.remove("bell-animate");
    }
  }

  async function renderizarNotificaciones() {
    const recordatorios = await obtenerEventosManana();
    list.innerHTML = "";

    if (recordatorios.length > 0) {
      recordatorios.forEach(obj => {
        const li = document.createElement("li");
        li.innerHTML = obj.html;
        list.appendChild(li);
      });

      popover.classList.remove("hidden");

      setTimeout(() => {
        document.querySelectorAll(".close-noti").forEach(btn => {
          btn.addEventListener("click", () => {
            const tarjeta = btn.closest("div[data-noti]");
            const id = tarjeta?.dataset?.noti;
            if (tarjeta && id) {
              tarjeta.classList.add("animate__fadeOut");
              setTimeout(() => {
                tarjeta.remove();
                marcarComoDescartada(id);

                const visibles = document.querySelectorAll('#notification-list > li > div').length;
                if (visibles > 0) {
                  bubble.classList.remove("hidden");
                  bubble.textContent = visibles;
                } else {
                  bubble.classList.add("hidden");
                  popover.classList.add("hidden");
                }
              }, 300);
            }
          });
        });
      }, 100);
    } else {
      popover.classList.add("hidden");
      Swal.fire({
        icon: "info",
        title: "Sin recordatorios por ahora",
        text: "No tienes tareas ni eventos para mañana.",
        confirmButtonColor: "#facc15"
      });
    }
  }

  bellBtn.addEventListener("click", renderizarNotificaciones);

  document.addEventListener("click", (e) => {
    if (!bellBtn.contains(e.target) && !popover.contains(e.target)) {
      popover.classList.add("hidden");
    }
  });

  actualizarNotificaciones();
});


function cargarDatosPerfil() {
  try {
    const userId = localStorage.getItem("ChankandoUserID");
    if (!userId) return;

    // Una sola lectura para todos los datos
    const stats = JSON.parse(localStorage.getItem(`userStats_${userId}`)) || {
      totales: { sesiones: 0, tiempo: 0, tareas: 0 }
    };

    // Convertir minutos a horas
    const horasTotales = (stats.totales.tiempo / 60).toFixed(1);

    // Actualizar UI - solo mostramos totales en el perfil
    document.getElementById("profile-horas").textContent = horasTotales;
    document.getElementById("profile-sesiones").textContent = stats.totales.sesiones;
    document.getElementById("profile-tareas").textContent = stats.totales.tareas;

    // Mantenemos la lógica del rol sin cambios
    const rolUsuario = localStorage.getItem("userRole") || "estudiante";
    const roleBadge = document.getElementById("profile-role-badge");
    if (roleBadge) {
      const isProfesor = rolUsuario === "profesor" || rolUsuario === "teacher";
      roleBadge.className = isProfesor 
        ? "inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold"
        : "inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold";
      roleBadge.innerHTML = isProfesor
        ? `<span class="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>Profesor Activo`
        : `<span class="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>Estudiante Activo`;
    }
  } catch (error) {
    console.error("Error al cargar datos del perfil:", error);
  }
}

// HEADER 
document.addEventListener("DOMContentLoaded", () => {
  const openProfileBtn = document.getElementById("open-profile-btn");
  const closeProfileBtn = document.getElementById("close-profile-btn");
  const profileModal = document.getElementById("profile-modal");

  const nombreUsuario = localStorage.getItem("username") || "Usuario";
  const correoUsuario = localStorage.getItem("userEmail") || "correo@ejemplo.com";
  const rolUsuario = localStorage.getItem("userRole") || "estudiante";

  // Mostrar en el header
  const headerName = document.querySelector("#profile-toggle-btn p.text-sm");
  if (headerName) headerName.textContent = nombreUsuario;

  const headerRol = document.getElementById("header-role");
  if (headerRol) {
    headerRol.textContent = rolUsuario === "profesor" ? "Profesor" : "Estudiante";
    headerRol.className = rolUsuario === "profesor" 
      ? "text-xs text-purple-500 italic" 
      : "text-xs text-blue-500 italic";
  }

  // Mostrar en el modal de perfil
  openProfileBtn.addEventListener("click", () => {
    profileModal.classList.remove("hidden");
    profileModal.classList.add("flex");

    document.getElementById("profile-name").textContent = nombreUsuario;
    document.getElementById("profile-email").textContent = correoUsuario;

    cargarDatosPerfil();
  });

  closeProfileBtn.addEventListener("click", () => {
    profileModal.classList.add("hidden");
    profileModal.classList.remove("flex");
  });

  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const isLoggedIn = localStorage.getItem("ChankandoLoggedIn") === "true";

      if (!isLoggedIn) {
        Swal.fire({
          icon: 'info',
          title: 'Sin sesión activa',
          text: 'No hay ninguna cuenta iniciada actualmente.'
        });
        return;
      }

      Swal.fire({
        title: '¿Cerrar sesión?',
        text: 'Se cerrará la sesión actual',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, cerrar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          // limpiar al cerrar sesión
          const userId = localStorage.getItem("ChankandoUserID");
          localStorage.removeItem("ChankandoLoggedIn");
          localStorage.removeItem("ChankandoUsername");
          localStorage.removeItem("ChankandoUserRole");
          localStorage.removeItem("ChankandoUserID");
          localStorage.removeItem("username");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userRole");
          localStorage.removeItem("ChankandoUserID");
          localStorage.removeItem(`logrosNotificados_${userId}`);
          localStorage.removeItem(`logrosDesbloqueados_${userId}`);
          if (userId) {
            localStorage.removeItem(`logrosDesbloqueados_${userId}`);
          }
          localStorage.removeItem("pomodoroSessions");
          localStorage.removeItem("pomodoroDailyStats");
          localStorage.removeItem("totalPomodorosCompletados");
          localStorage.removeItem("pomodorosHoy");
          localStorage.removeItem("pomodorosSeguidos");
          localStorage.removeItem("ultimoPomodoroFecha");
          localStorage.removeItem('weeklyData');
          localStorage.removeItem('monthlyData');

          location.reload();
        }
      });
    });
  }
});


// HEADER - DROPDOWN
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('profile-toggle-btn');
  const dropdown = document.getElementById('profile-dropdown');
  const chevron = document.getElementById('chevron-icon');

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
    chevron.classList.toggle('rotate-180');
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
      dropdown.classList.add('hidden');
      chevron.classList.remove('rotate-180');
    }
  });
});

function actualizarHeaderYPerfilPorRol() {
  const rol = localStorage.getItem("userRole") || "estudiante";

  // Header
  const headerRol = document.getElementById("header-role");
  if (headerRol) {
    headerRol.textContent = rol === "profesor" ? "Profesor" : "Estudiante";
    headerRol.className = rol === "profesor"
      ? "text-xs text-purple-500 italic"
      : "text-xs text-blue-500 italic";
  }

  // Modal perfil
  const roleBadge = document.getElementById("profile-role-badge");
  if (roleBadge) {
    const rolUsuario = localStorage.getItem("userRole") || "estudiante";
    const isProfesor = rolUsuario === "profesor";

    // Cambiar el texto
    roleBadge.innerHTML = `
      <span class="w-2 h-2 ${isProfesor ? 'bg-purple-500' : 'bg-blue-500'} rounded-full mr-2 animate-pulse"></span>
      ${isProfesor ? 'Profesor Activo' : 'Estudiante Activo'}
    `;

    // Cambiar colores
    roleBadge.classList.remove("bg-blue-100", "text-blue-800", "bg-purple-100", "text-purple-800");
    roleBadge.classList.add(
      isProfesor ? "bg-purple-100" : "bg-blue-100",
      isProfesor ? "text-purple-800" : "text-blue-800"
    );
  }
}


//HEADER - SANDIOBASODUBUAISD
document.addEventListener('DOMContentLoaded', function() {
  function updateRadioDots() {
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
      const container = radio.closest('.relative');
      if (!container) return;

      const dot = container.querySelector('.radio-dot div');
      if (!dot) return;

      if (radio.checked) {
        dot.classList.remove('scale-0');
        dot.classList.add('scale-100');
      } else {
        dot.classList.remove('scale-100');
        dot.classList.add('scale-0');
      }
    });
  }

  // Actualizar al cargar la página
  updateRadioDots();

  // Escuchar cambios en los radio buttons
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', updateRadioDots);
  });

  // También actualizar cuando se abran los modales
  window.toggleLoginModal = function() {
    const modal = document.getElementById('loginModal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
      updateRadioDots();
    }
  };

  window.toggleRegisterModal = function() {
    const modal = document.getElementById('registerModal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
      updateRadioDots();
    }
  };
});

// MODAL AYUDA
document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos
  const helpLink = document.querySelector('a[href="#"]:has(.fa-question-circle)'); // Selecciona el link de ayuda
  const helpModal = document.getElementById('help-modal');
  const closeBtn = document.getElementById('close-help-modal');
  const understoodBtn = document.getElementById('btn-entendido');
  const dropdown = document.getElementById('profile-dropdown');

  // Función para abrir modal
  const openModal = (e) => {
    e.preventDefault();
      
    if (dropdown) dropdown.classList.add('hidden');
      
    helpModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  // Función para cerrar modal
  const closeModal = () => {
    helpModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  };

  // Eventos
  if (helpLink) helpLink.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (understoodBtn) understoodBtn.addEventListener('click', closeModal);

  // Cerrar al hacer clic fuera del contenido blanco
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeModal();
  });

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !helpModal.classList.contains('hidden')) {
      closeModal();
    }
  });
});


// MODAL PARA AYUDA DE CONTRASEÑA
// Función para abrir el modal informativo desde el Login
function openForgotPassword() {
    const loginModal = document.getElementById('loginModal');
    if(loginModal) loginModal.classList.add('hidden');
    
    const recoveryModal = document.getElementById('forgotPasswordModal');
    if(recoveryModal) recoveryModal.classList.remove('hidden');
}

// Función para cerrar y regresar al Login
function closeRecoveryAndBackToLogin() {
    document.getElementById('forgotPasswordModal').classList.add('hidden');
    document.getElementById('loginModal').classList.remove('hidden');
}


//Función para ver y ocultar contraseñas
function togglePasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  const icon = button.querySelector('i');
    
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}


///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SECCIÓN CURSOS ///////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// Buscador de cursos
document.addEventListener('DOMContentLoaded', function() {
  // Esperar a que la página esté completamente cargada
  setTimeout(inicializarBuscador, 500);
});

function inicializarBuscador() {
  // Obtener el input de búsqueda
  const searchInput = document.querySelector('input[placeholder="Buscar curso..."]');
  
  if (!searchInput) {
    console.log('❌ Input de búsqueda no encontrado');
    return;
  }

  // Obtener todas las tarjetas de cursos
  const courseCards = document.querySelectorAll('#marketplace .card');
  
  if (courseCards.length === 0) {
    console.log('❌ No se encontraron tarjetas de cursos');
    return;
  }

  // Función para normalizar texto (quitar acentos y convertir a minúsculas)
  function normalizarTexto(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Elimina acentos
  }

  // Función principal de búsqueda
  function buscarCursos(terminoBusqueda) {
    const busquedaNormalizada = normalizarTexto(terminoBusqueda.trim());
    
    // Si el campo está vacío, mostrar todos los cursos
    if (busquedaNormalizada === '') {
      courseCards.forEach(card => {
        card.style.display = '';
        card.style.animation = 'fadeIn 0.3s ease';
      });
      mostrarMensajeSinResultados(false);
      return;
    }

    let cursosEncontrados = 0;

    // Recorrer cada tarjeta
    courseCards.forEach(card => {
      // Obtener el título del curso desde .card-title-area > span
      const tituloElement = card.querySelector('.card-title-area > span:first-child');
      
      if (!tituloElement) {
        console.warn('⚠️ Título no encontrado en una tarjeta');
        return;
      }

      const tituloCurso = normalizarTexto(tituloElement.textContent);
      
      // Verificar si el título contiene el término de búsqueda
      if (tituloCurso.includes(busquedaNormalizada)) {
        // Mostrar la tarjeta con animación
        card.style.display = '';
        card.style.animation = 'fadeIn 0.3s ease';
        cursosEncontrados++;
      } else {
        // Ocultar la tarjeta con animación
        card.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => {
          card.style.display = 'none';
        }, 200);
      }
    });

    // Mostrar mensaje si no hay resultados
    mostrarMensajeSinResultados(cursosEncontrados === 0);
    
    console.log(`🔍 Búsqueda: "${terminoBusqueda}" - ${cursosEncontrados} resultado(s)`);
  }

  // Función para mostrar/ocultar mensaje de "sin resultados"
  function mostrarMensajeSinResultados(mostrar) {
    let mensajeExistente = document.getElementById('no-results-message');
    
    if (mostrar && !mensajeExistente) {
      // Crear mensaje de "sin resultados"
      const mensaje = document.createElement('div');
      mensaje.id = 'no-results-message';
      mensaje.className = 'col-span-full text-center py-12';
      mensaje.style.gridColumn = '1 / -1'; // Ocupa todas las columnas
      mensaje.innerHTML = `
        <div class="flex flex-col items-center gap-4">
          <svg class="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
            </path>
          </svg>
          <div class="text-gray-600 text-lg font-medium">
            No se encontraron cursos
          </div>
          <div class="text-gray-400 text-sm">
            Intenta con otro término de búsqueda
          </div>
        </div>
      `;
      mensaje.style.animation = 'fadeIn 0.3s ease';
      
      // Insertar en el contenedor de tarjetas
      const contenedorCursos = document.querySelector('#marketplace .grid');
      if (contenedorCursos) {
        contenedorCursos.appendChild(mensaje);
      }
    } else if (!mostrar && mensajeExistente) {
      // Eliminar mensaje con animación
      mensajeExistente.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        mensajeExistente.remove();
      }, 200);
    }
  }

  // Event listener para el input
  searchInput.addEventListener('input', function(e) {
    buscarCursos(e.target.value);
  });

  // También buscar al hacer focus (por si vuelve a una búsqueda anterior)
  searchInput.addEventListener('focus', function(e) {
    if (e.target.value.trim() !== '') {
      buscarCursos(e.target.value);
    }
  });

  // Limpiar búsqueda con tecla Escape
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      e.target.value = '';
      buscarCursos('');
      e.target.blur(); // Quitar el foco del input
    }
  });

  // Añadir botón de limpiar búsqueda
  agregarBotonLimpiar();

  function agregarBotonLimpiar() {
    const contenedorInput = searchInput.parentElement;
    
    // Verificar si ya existe el botón
    if (document.getElementById('clear-search-btn')) {
      return;
    }
    
    // Crear botón de limpiar
    const btnLimpiar = document.createElement('button');
    btnLimpiar.type = 'button';
    btnLimpiar.className = 'absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition hidden';
    btnLimpiar.id = 'clear-search-btn';
    btnLimpiar.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    
    contenedorInput.appendChild(btnLimpiar);

    // Mostrar/ocultar botón según haya texto
    searchInput.addEventListener('input', function() {
      if (this.value.trim() !== '') {
        btnLimpiar.classList.remove('hidden');
      } else {
        btnLimpiar.classList.add('hidden');
      }
    });

    // Funcionalidad del botón
    btnLimpiar.addEventListener('click', function() {
      searchInput.value = '';
      buscarCursos('');
      btnLimpiar.classList.add('hidden');
      searchInput.focus();
    });
  }
}

// Agregar estilos CSS para las animaciones (solo una vez)
if (!document.getElementById('search-animations-style')) {
  const style = document.createElement('style');
  style.id = 'search-animations-style';
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-10px);
      }
    }
  `;
  document.head.appendChild(style);
}

// Filtros
let filtroActual = {
  tipo_precio: 'todos',
  asignatura: 'todos',
  nivel: 'todos',
  busqueda: ''
};

// Inicializar filtros
setTimeout(inicializarFiltros, 600);

function inicializarFiltros() {
  const courseCards = document.querySelectorAll('#marketplace .card');
  
  if (courseCards.length === 0) {
    console.log('❌ No se encontraron tarjetas para los filtros');
    return;
  }

  // Obtener todos los dropdowns
  const dropdowns = document.querySelectorAll('.custom-orange-dropdown');
  
  if (dropdowns.length < 3) {
    console.log('❌ No se encontraron todos los filtros');
    return;
  }

  // Identificar dropdowns por su botón
  let dropdownAsignaturas = null;
  let dropdownNivel = null;
  let dropdownTipoPrecio = null;

  dropdowns.forEach(dropdown => {
    const btnText = dropdown.querySelector('button').textContent.trim();
    if (btnText.includes('Asignaturas')) {
      dropdownAsignaturas = dropdown;
    } else if (btnText.includes('Nivel')) {
      dropdownNivel = dropdown;
    } else if (btnText.includes('Tipo de precio')) {
      dropdownTipoPrecio = dropdown;
    }
  });

  if (!dropdownAsignaturas || !dropdownNivel || !dropdownTipoPrecio) {
    console.log('❌ No se identificaron correctamente los filtros');
    return;
  }

  console.log('✅ Filtros inicializados correctamente');

  // Configurar filtro de Asignaturas
  const opcionesAsignaturas = dropdownAsignaturas.querySelectorAll('.dropdown-item');
  opcionesAsignaturas.forEach(opcion => {
    opcion.addEventListener('click', function(e) {
      e.preventDefault();
      const textoOpcion = this.textContent.trim();
      
      // Actualizar el texto del botón
      const btnAsignaturas = dropdownAsignaturas.querySelector('button');
      if (textoOpcion === 'Todos') {
        btnAsignaturas.innerHTML = `Asignaturas <i class="ms-2 dropdown-arrow"></i>`;
        filtroActual.asignatura = 'todos';
      } else {
        btnAsignaturas.innerHTML = `${textoOpcion} <i class="ms-2 dropdown-arrow"></i>`;
        filtroActual.asignatura = textoOpcion.toLowerCase();
      }
      
      aplicarFiltros();
    });
  });

  // Configurar filtro de Nivel
  const opcionesNivel = dropdownNivel.querySelectorAll('.dropdown-item');
  opcionesNivel.forEach(opcion => {
    opcion.addEventListener('click', function(e) {
      e.preventDefault();
      const textoOpcion = this.textContent.trim();
      
      const btnNivel = dropdownNivel.querySelector('button');
      if (textoOpcion === 'Todos') {
        btnNivel.innerHTML = `Nivel <i class="ms-2 dropdown-arrow"></i>`;
        filtroActual.nivel = 'todos';
      } else {
        btnNivel.innerHTML = `${textoOpcion} <i class="ms-2 dropdown-arrow"></i>`;
        filtroActual.nivel = textoOpcion; // ← CAMBIA ESTO (QUITA .toLowerCase())
      }
      
      console.log('🔍 NIVEL SELECCIONADO:', filtroActual.nivel); // ← AÑADE ESTO
      aplicarFiltros();
    });
  });

  // Configurar filtro de Tipo de Precio
  const opcionesTipoPrecio = dropdownTipoPrecio.querySelectorAll('.dropdown-item');
  opcionesTipoPrecio.forEach(opcion => {
    opcion.addEventListener('click', function(e) {
      e.preventDefault();
      const tipoPrecio = this.getAttribute('data-tipo');
      
      // Actualizar el texto del botón
      const btnTipoPrecio = dropdownTipoPrecio.querySelector('button');
      if (tipoPrecio === 'todos') {
        btnTipoPrecio.innerHTML = `Tipo de precio <i class="ms-2 dropdown-arrow"></i>`;
        filtroActual.tipo_precio = 'todos';
      } else {
        const textoBoton = tipoPrecio === 'Por hora' ? 'Por hora' : 'Curso completo';
        btnTipoPrecio.innerHTML = `${textoBoton} <i class="ms-2 dropdown-arrow"></i>`;
        filtroActual.tipo_precio = tipoPrecio;
      }
      
      aplicarFiltros();
    });
  });
}

// Función para normalizar texto (quitar acentos)
function normalizarTextoFiltro(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Función principal para aplicar todos los filtros
function aplicarFiltros() {
  const courseCards = document.querySelectorAll('#marketplace .card');
  let cursosVisibles = 0;

  courseCards.forEach(card => {
    // Obtener título de la tarjeta
    const tituloElement = card.querySelector('.card-title-area > span:first-child');
    const tituloCurso = tituloElement ? normalizarTextoFiltro(tituloElement.textContent) : '';
    
    // Obtener nivel desde los feature-text dentro de la tarjeta
    let nivelCard = '';
    const featureTexts = card.querySelectorAll('.feature-text');
    featureTexts.forEach(feature => {
      const texto = feature.textContent.trim().toLowerCase();
      // Verificar si el texto coincide con algún nivel válido
      if (['secundaria', 'preuniversitaria', 'universitaria'].includes(texto)) {
        nivelCard = texto;
      }
    });
    
    // Normalizar valores
    const nivelNormalizado = normalizarTextoFiltro(nivelCard);
    const busquedaNormalizada = normalizarTextoFiltro(filtroActual.busqueda);
    const asignaturaBuscada = normalizarTextoFiltro(filtroActual.asignatura);

    // Verificar cada filtro
    // Para asignatura: buscar si el título contiene la asignatura seleccionada
    let cumpleAsignatura = filtroActual.asignatura === 'todos' || 
                           tituloCurso.includes(asignaturaBuscada);
    
    let cumpleNivel = filtroActual.nivel === 'todos' || 
                      nivelNormalizado === normalizarTextoFiltro(filtroActual.nivel);
    
    let cumpleBusqueda = busquedaNormalizada === '' || 
                         tituloCurso.includes(busquedaNormalizada);

    // Mostrar/ocultar tarjeta según cumpla TODOS los filtros
    if (cumpleAsignatura && cumpleNivel && cumpleBusqueda) {
      card.style.display = '';
      card.style.animation = 'fadeIn 0.3s ease';
      cursosVisibles++;
    } else {
      card.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        card.style.display = 'none';
      }, 200);
    }
  });

  // Mostrar mensaje si no hay resultados
  mostrarMensajeSinResultadosFiltros(cursosVisibles === 0);

  aplicarFiltrosConPaginacion();

  console.log(`🔍 Filtros aplicados - ${cursosVisibles} curso(s) visible(s)`);
  console.log(`   Asignatura: ${filtroActual.asignatura}`);
  console.log(`   Nivel: ${filtroActual.nivel}`);
  console.log(`   Búsqueda: ${filtroActual.busqueda || '(ninguna)'}`);
}

// Función para mostrar mensaje cuando no hay resultados
function mostrarMensajeSinResultadosFiltros(mostrar) {
  let mensajeExistente = document.getElementById('no-results-message');
  
  if (mostrar && !mensajeExistente) {
    const mensaje = document.createElement('div');
    mensaje.id = 'no-results-message';
    mensaje.className = 'col-span-full text-center py-12';
    mensaje.style.gridColumn = '1 / -1';
    mensaje.innerHTML = `
      <div class="flex flex-col items-center gap-4">
        <svg class="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
          </path>
        </svg>
        <div class="text-gray-600 text-lg font-medium">
          No se encontraron cursos
        </div>
        <div class="text-gray-400 text-sm">
          ${getFiltrosActivos()}
        </div>
      </div>
    `;
    mensaje.style.animation = 'fadeIn 0.3s ease';
    
    const contenedorCursos = document.querySelector('#marketplace .grid');
    if (contenedorCursos) {
      contenedorCursos.appendChild(mensaje);
    }
  } else if (!mostrar && mensajeExistente) {
    mensajeExistente.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => {
      mensajeExistente.remove();
    }, 200);
  }
}

// Función para obtener texto descriptivo de filtros activos
function getFiltrosActivos() {
  let filtros = [];
  
  if (filtroActual.asignatura !== 'todos') {
    filtros.push(`Asignatura: ${filtroActual.asignatura}`);
  }
  if (filtroActual.nivel !== 'todos') {
    filtros.push(`Nivel: ${filtroActual.nivel}`);
  }
  if (filtroActual.busqueda !== '') {
    filtros.push(`Búsqueda: "${filtroActual.busqueda}"`);
  }
  
  if (filtros.length > 0) {
    return 'Intenta cambiar los filtros: ' + filtros.join(' • ');
  }
  return 'Intenta con otros criterios de búsqueda';
}

// Agregar estilos CSS para las animaciones (solo una vez)
if (!document.getElementById('search-animations-style')) {
  const style = document.createElement('style');
  style.id = 'search-animations-style';
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-10px);
      }
    }
  `;
  document.head.appendChild(style);
}

// Pagination
// Variables globales para paginación
let paginaActual = 1;
const tarjetasPorPagina = 12;
let totalPaginas = 8; // Forzar 8 páginas para pruebas

// Inicializar paginación
setTimeout(inicializarPaginacion, 700);

function inicializarPaginacion() {
  const paginationNav = document.querySelector('.pagination');
  
  if (!paginationNav) {
    console.log('❌ Navegación de paginación no encontrada');
    return;
  }

  console.log('✅ Paginación inicializada - 8 páginas fijas');
  
  // Configurar botones de paginación
  configurarBotonesPaginacion();
  
  // Calcular y mostrar primera página
  actualizarPaginacion();
}

function configurarBotonesPaginacion() {
  const paginationNav = document.querySelector('.pagination');
  
  if (!paginationNav) {
    console.log('❌ No se encontró el contenedor de paginación');
    return;
  }
  
  // Eliminar listeners anteriores clonando el elemento
  const nuevoPagination = paginationNav.cloneNode(true);
  paginationNav.parentNode.replaceChild(nuevoPagination, paginationNav);
  
  // Agregar event listener al nuevo elemento
  nuevoPagination.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = e.target.closest('.pagination-btn');
    if (!btn) return;
    
    // Verificar si el botón está deshabilitado
    if (btn.disabled || btn.classList.contains('opacity-50')) {
      return;
    }
    
    const ariaLabel = btn.getAttribute('aria-label');
    const numeroPagina = btn.textContent.trim();
    
    console.log('Click en botón:', ariaLabel || numeroPagina);
    
    // Botón anterior
    if (ariaLabel === 'Anterior') {
      if (paginaActual > 1) {
        paginaActual--;
        aplicarFiltrosConPaginacion();
      }
    }
    // Botón siguiente
    else if (ariaLabel === 'Siguiente') {
      if (paginaActual < totalPaginas) {
        paginaActual++;
        aplicarFiltrosConPaginacion();
      }
    }
    // Botones numéricos
    else if (!isNaN(numeroPagina) && numeroPagina !== '') {
      const nuevaPagina = parseInt(numeroPagina);
      if (nuevaPagina !== paginaActual) {
        paginaActual = nuevaPagina;
        aplicarFiltrosConPaginacion();
      }
    }
  });
}

// ============================================
// NUEVA FUNCIÓN: Aplicar Filtros con Backend
// ============================================
async function aplicarFiltrosConPaginacion() {
  const marketplaceSection = document.querySelector('#marketplace .cards-container') || document.querySelector('#marketplace');
  
  // Mostrar loading
  mostrarLoading(true);
  
  try {
    // Si es página 1, usamos las cards del HTML
    if (paginaActual === 1) {
      await aplicarFiltrosPagina1();
    } else {
      // Páginas 2+: traer datos desde la base de datos
      await aplicarFiltrosPaginaDinamica();
    }
    
    // Actualizar UI de paginación
    actualizarBotonesPaginacion();
    
    // Scroll suave
    if (marketplaceSection) {
      marketplaceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
  } catch (error) {
    console.error('❌ Error al aplicar filtros:', error);
    mostrarMensajeError('Error al cargar los cursos. Intenta nuevamente.');
  } finally {
    mostrarLoading(false);
  }
}

// ============================================
// PÁGINA 1: Filtrar cards estáticas del HTML
// ============================================
async function aplicarFiltrosPagina1() {
  const courseCards = document.querySelectorAll('#marketplace .card');
  const tarjetasFiltradas = [];

  courseCards.forEach(card => {
    const tituloElement = card.querySelector('.card-title-area > span:first-child');
    const tituloCurso = tituloElement ? normalizarTextoFiltro(tituloElement.textContent) : '';
    
    let nivelCard = '';
    const featureTexts = card.querySelectorAll('.feature-text');
    featureTexts.forEach(feature => {
      const texto = feature.textContent.trim().toLowerCase();
      if (['secundaria', 'preuniversitaria', 'universitaria'].includes(texto)) {
        nivelCard = texto;
      }
    });
    
    const nivelNormalizado = normalizarTextoFiltro(nivelCard);
    const busquedaNormalizada = normalizarTextoFiltro(filtroActual.busqueda);
    const asignaturaBuscada = normalizarTextoFiltro(filtroActual.asignatura);

    let cumpleAsignatura = filtroActual.asignatura === 'todos' || 
                           tituloCurso.includes(asignaturaBuscada);
    
    let cumpleNivel = filtroActual.nivel === 'todos' || 
                      nivelNormalizado === normalizarTextoFiltro(filtroActual.nivel);
    
    let cumpleBusqueda = busquedaNormalizada === '' || 
                         tituloCurso.includes(busquedaNormalizada);

    let tipoPrecioCard = '';
    const precioElement = card.querySelector('.price-period');
    if (precioElement) {
      const textoPrecio = precioElement.textContent.trim().toLowerCase();
      if (textoPrecio.includes('hora')) {
        tipoPrecioCard = 'Por hora';
      } else if (textoPrecio.includes('total')) {
        tipoPrecioCard = 'Curso completo';
      }
    }

    let cumpleTipoPrecio = filtroActual.tipo_precio === 'todos' || 
                          filtroActual.tipo_precio === tipoPrecioCard;

    if (cumpleAsignatura && cumpleNivel && cumpleBusqueda && cumpleTipoPrecio) {
      tarjetasFiltradas.push(card);
    }
  });

  // Ocultar todas las cards
  courseCards.forEach(card => {
    card.style.display = 'none';
  });

  // Mostrar solo las filtradas (máximo 12)
  const fin = Math.min(tarjetasPorPagina, tarjetasFiltradas.length);
  tarjetasFiltradas.forEach((card, index) => {
    if (index < fin) {
      card.style.display = '';
      card.style.animation = 'fadeIn 0.3s ease';
    }
  });

  // Eliminar mensaje previo
  const mensajeProximamente = document.getElementById('proximamente-message');
  if (mensajeProximamente) mensajeProximamente.remove();

  // Mensaje si no hay resultados
  if (tarjetasFiltradas.length === 0) {
    mostrarMensajeSinResultadosFiltros(true);
  } else {
    mostrarMensajeSinResultadosFiltros(false);
  }

  console.log(`📄 Página 1: Mostrando ${fin} de ${tarjetasFiltradas.length} curso(s)`);
}

// ============================================
// PÁGINAS 2+: Traer datos de la base de datos
// ============================================
async function aplicarFiltrosPaginaDinamica() {
  // Dar order a la paginación
  const paginacionContainer = document.querySelector('#marketplace .pagination-container') ||
                            document.querySelector('#marketplace [class*="pagination"]');
  if (paginacionContainer) {
    paginacionContainer.style.order = '2';
  }

  // Construir URL con filtros
  const params = new URLSearchParams({
    p: paginaActual,
    busqueda: filtroActual.busqueda || '',
    asignatura: filtroActual.asignatura || 'todos',
    nivel: filtroActual.nivel || 'todos',
    tipo_precio: filtroActual.tipo_precio || 'todos'
  });

  const url = `https://chankando-1.onrender.com/obtener_cursos.php?${params.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Error desconocido');
  }

  // Limpiar cards estáticas de la página 1
  const courseCards = document.querySelectorAll('#marketplace .card');
  courseCards.forEach(card => card.style.display = 'none');

  // Eliminar mensajes previos
  const mensajeProximamente = document.getElementById('proximamente-message');
  if (mensajeProximamente) mensajeProximamente.remove();
  
  const mensajeSinResultados = document.querySelector('.no-results-message');
  if (mensajeSinResultados) mensajeSinResultados.remove();

  // Eliminar contenedor de cards dinámicas previo
  let contenedorDinamico = document.getElementById('cards-dinamicas');
  if (contenedorDinamico) {
    contenedorDinamico.remove();
  }

  // Crear nuevo contenedor para cards dinámicas
  const marketplace = document.querySelector('#marketplace');
  contenedorDinamico = document.createElement('div');
  contenedorDinamico.id = 'cards-dinamicas';
  contenedorDinamico.className = 'dynamic-cards-grid'; // Añadir clase para CSS
  contenedorDinamico.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2rem;
    width: 100%;
    margin-bottom: 2rem;
  `;

  // Si no hay cursos, mostrar mensaje
  if (!data.cursos || data.cursos.length === 0) {
    mostrarMensajeSinResultadosFiltros(true);
    console.log(`📄 Página ${paginaActual}: Sin resultados`);
    return;
  }

  // Generar cards desde la base de datos
  data.cursos.forEach(curso => {
    // obtener_cursos.php ya parsea el JSON, solo verificamos que sea array
    let temasArray = Array.isArray(curso.descripcion) 
      ? curso.descripcion 
      : [];

    const cardData = {
      id: curso.id,
      tiene_cv: curso.tiene_cv,
      curso: curso.curso_nombre,
      biografia: curso.biografia,
      temas: temasArray,
      nivel: curso.nivel,
      precio: curso.precio,
      tipo_precio: curso.tipo_precio,
      nombre: curso.nombre_profesor,
      telefono: curso.telefono,
      email: curso.email_contacto,
      cv: curso.cv_url
    };

    const cardHtml = generarHtmlCard(cardData);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHtml;
    const cardElement = tempDiv.firstElementChild;
    
    // Añadir animación
    cardElement.style.animation = 'fadeIn 0.3s ease';
    contenedorDinamico.appendChild(cardElement);
  });

  const todosLosHijos = Array.from(marketplace.children);

  // Encontrar el índice donde están los botones de paginación
  let indicePaginacion = -1;
  todosLosHijos.forEach((hijo, index) => {
    const texto = hijo.textContent || '';
    // Buscar elemento que contenga los números de página o flechas
    if (texto.includes('←') || texto.includes('→') || /^\s*\d+\s*$/.test(texto)) {
      indicePaginacion = index;
    }
  });

  // Insertar el contenedor dinámico
  if (indicePaginacion > 0) {
    marketplace.insertBefore(contenedorDinamico, todosLosHijos[indicePaginacion]);
  } else {
    marketplace.appendChild(contenedorDinamico);
  }

  console.log('📍 Índice de paginación:', indicePaginacion);
  console.log('📦 Total hijos:', todosLosHijos.length);

  console.log(`📄 Página ${paginaActual}: Mostrando ${data.cursos.length} curso(s) desde BD`);
}

// ============================================
// HELPERS
// ============================================
function mostrarLoading(mostrar) {
  let loader = document.getElementById('loading-spinner');
  
  if (mostrar) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'loading-spinner';
      loader.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        background: rgba(255, 255, 255, 0.95);
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      `;
      loader.innerHTML = `
        <div style="text-align: center;">
          <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; 
                      border-top: 4px solid #ff3e00; border-radius: 50%; 
                      animation: spin 1s linear infinite; margin: 0 auto;"></div>
          <p style="margin-top: 1rem; color: #333;">Cargando cursos...</p>
        </div>
      `;
      document.body.appendChild(loader);
      
      // Añadir keyframes si no existe
      if (!document.getElementById('spin-animation')) {
        const style = document.createElement('style');
        style.id = 'spin-animation';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    }
    loader.style.display = 'block';
  } else {
    if (loader) {
      loader.style.display = 'none';
    }
  }
}

function mostrarMensajeError(mensaje) {
  const marketplace = document.querySelector('#marketplace');
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    background: #fee;
    color: #c33;
    padding: 1.5rem;
    border-radius: 8px;
    margin: 2rem 0;
    text-align: center;
    border: 1px solid #fcc;
  `;
  errorDiv.textContent = mensaje;
  marketplace.appendChild(errorDiv);
  
  // Remover después de 5 segundos
  setTimeout(() => errorDiv.remove(), 5000);
}

function mostrarMensajeProximamente() {
  const contenedorCursos = document.querySelector('#marketplace .grid');
  if (!contenedorCursos) return;

  const mensaje = document.createElement('div');
  mensaje.id = 'proximamente-message';
  mensaje.className = 'col-span-full text-center py-16';
  mensaje.style.gridColumn = '1 / -1';
  mensaje.innerHTML = `
    <div class="flex flex-col items-center gap-6">
      <svg class="w-32 h-32 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M12 6v6m0 0v6m0-6h6m-6 0H6">
        </path>
      </svg>
      <div>
        <div class="text-gray-700 text-2xl font-bold mb-2">
          📚 Próximamente más cursos
        </div>
        <div class="text-gray-500 text-base">
          Estamos trabajando para agregar más profesores y cursos increíbles
        </div>
      </div>
      <div class="mt-4">
        <button onclick="paginaActual = 1; aplicarFiltrosConPaginacion();" 
                class="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition duration-300 font-semibold shadow-md hover:shadow-lg">
          Volver a la página 1
        </button>
      </div>
    </div>
  `;
  mensaje.style.animation = 'fadeIn 0.5s ease';
  
  contenedorCursos.appendChild(mensaje);
}

function actualizarBotonesPaginacion() {
  const paginationNav = document.querySelector('.pagination');
  if (!paginationNav) return;

  // Construir nueva estructura de botones
  let botonesHTML = `
    <button class="pagination-btn ${paginaActual === 1 ? 'opacity-50 cursor-not-allowed' : ''}" 
            aria-label="Anterior" ${paginaActual === 1 ? 'disabled' : ''}>
      &larr;
    </button>
  `;

  // Lógica de botones numéricos
  if (totalPaginas <= 5) {
    // Mostrar todos los botones si hay 5 o menos páginas
    for (let i = 1; i <= totalPaginas; i++) {
      botonesHTML += `
        <button class="pagination-btn ${i === paginaActual ? 'active' : ''}">${i}</button>
      `;
    }
  } else {
    // Lógica más compleja para muchas páginas
    botonesHTML += `<button class="pagination-btn ${1 === paginaActual ? 'active' : ''}">1</button>`;
    
    if (paginaActual > 3) {
      botonesHTML += `<span class="pagination-ellipsis">...</span>`;
    }
    
    // Mostrar páginas cercanas a la actual
    let inicio = Math.max(2, paginaActual - 1);
    let fin = Math.min(totalPaginas - 1, paginaActual + 1);
    
    for (let i = inicio; i <= fin; i++) {
      botonesHTML += `
        <button class="pagination-btn ${i === paginaActual ? 'active' : ''}">${i}</button>
      `;
    }
    
    if (paginaActual < totalPaginas - 2) {
      botonesHTML += `<span class="pagination-ellipsis">...</span>`;
    }
    
    botonesHTML += `
      <button class="pagination-btn ${totalPaginas === paginaActual ? 'active' : ''}">${totalPaginas}</button>
    `;
  }

  botonesHTML += `
    <button class="pagination-btn ${paginaActual === totalPaginas ? 'opacity-50 cursor-not-allowed' : ''}" 
            aria-label="Siguiente" ${paginaActual === totalPaginas ? 'disabled' : ''}>
      &rarr;
    </button>
  `;

  paginationNav.innerHTML = botonesHTML;
  
  // IMPORTANTE: Reconfigurar event listeners después de actualizar HTML
  configurarBotonesPaginacion();
}

function actualizarPaginacion() {
  // Resetear a página 1 cuando se aplican nuevos filtros
  paginaActual = 1;
  aplicarFiltrosConPaginacion();
}

// Agregar estilos CSS para las animaciones (solo una vez)
if (!document.getElementById('search-animations-style')) {
  const style = document.createElement('style');
  style.id = 'search-animations-style';
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-10px);
      }
    }
  `;
  document.head.appendChild(style);
}


// Contactar Profesor
setTimeout(inicializarModalContacto, 800);

function inicializarModalContacto() {
  const botonesContactar = document.querySelectorAll('.card-button');

  // Agregar event listener a cada botón "Contactar"
  botonesContactar.forEach(boton => {
    boton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Obtener la tarjeta padre
      const card = this.closest('.card');
      if (!card) return;
      
      // Extraer información de la tarjeta
      const datosProfesor = extraerDatosCard(card);
      console.log('⚠️ SE EJECUTÓ extraerDatosCard (NO debería pasar en cards dinámicas)');
      
      // Mostrar modal con la información
      mostrarModalContacto(datosProfesor);
    });
  });
}

function DatosCard(card) {
  const titulo = card.querySelector('.card-title-area span')?.textContent.trim() || 'Curso';
  const descripcion = card.querySelector('.card-description')?.textContent.trim() || '';
  
  // Buscamos todos los textos de las features (Nivel y Temas)
  const featureTexts = Array.from(card.querySelectorAll('.feature-text')).map(el => el.textContent.trim());
  
  // El primer feature SIEMPRE es el nivel según tu estructura
  const nivel = featureTexts[0] || 'No especificado';
  const especializaciones = featureTexts.slice(1); // El resto son temas

  return {
    curso: titulo,
    profesor: 'Profesor Chankando', 
    nivel: nivel, // <--- AQUÍ SE CAPTURA EL NIVEL
    especializaciones: especializaciones,
    descripcion: descripcion,
    telefono: '+51 900000000', 
    email: 'contacto@chankando.com'
  };
}

function mostrarModalContacto(datos) {

  console.log('🔍 DATOS QUE LLEGAN AL MODAL:', {
    tiene_cv: datos.tiene_cv,
    curso_id: datos.curso_id,
    curso: datos.curso,
    profesor: datos.profesor
  });

  // Crear modal si no existe
  let modal = document.getElementById('modal-contacto-profesor');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-contacto-profesor';
    modal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4';
    document.body.appendChild(modal);
  }
  
  // Contenido del modal
  modal.innerHTML = `
    <div class="modal-content-wrapper relative w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <!-- Decoración de esquina superior izquierda -->
      <div class="absolute -top-4 -left-4 w-24 h-24 bg-[#ff3e00] rounded-full opacity-20 blur-2xl pointer-events-none"></div>
      
      <!-- Decoración de esquina inferior derecha -->
      <div class="absolute -bottom-4 -right-4 w-32 h-32 bg-[#ff3e00] rounded-full opacity-20 blur-2xl pointer-events-none"></div>
      
      <!-- Contenedor principal con scroll interno -->
      <div class="relative bg-white rounded-3xl shadow-2xl border-4 border-[#ff3e00] max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <!-- Header decorativo -->
        <div class="relative bg-gradient-to-r from-[#ff3e00] to-[#ff6a3d] p-6 pb-8">
          <!-- Patrón de puntos decorativos -->
          <div class="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="2" fill="white"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)"/>
            </svg>
          </div>
          
          <!-- Botón cerrar -->
          <button type="button" id="cerrar-modal-contacto" class="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full w-10 h-10 flex items-center justify-center transition duration-300 group z-10">
            <svg class="w-6 h-6 text-white group-hover:rotate-90 transition duration-300" fill="none" stroke="black" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          
          <!-- Título del curso -->
          <div class="relative text-center">
            <div class="inline-block bg-white bg-opacity-20 px-6 py-2 rounded-full mb-3">
              <span class="text-black text-sm font-semibold tracking-wider">📚 CURSO</span>
            </div>
            <h2 class="text-4xl font-bold text-white mb-2">${datos.curso}</h2>
            <div class="flex items-center justify-center gap-2 text-white text-opacity-90">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
              </svg>
              <p class="text-xl font-medium">${datos.profesor}</p>
            </div>
          </div>
        </div>
        
        <!-- Cuerpo del modal -->
        <div class="p-8">
          <!-- Grid de información -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            
            <!-- Sección: Información del profesor (2 columnas) -->
            <div class="md:col-span-2 bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#ff3e00] transition duration-300">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-[#ff3e00] flex items-center justify-center flex-shrink-0">
                  <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                  </svg>
                </div>
                <h3 class="text-lg font-bold text-gray-800">Sobre el Profesor</h3>
              </div>
              <div class="space-y-3 text-sm text-gray-600">
                <p class="leading-relaxed">${datos.descripcion}</p>
                <div class="pt-3 border-t border-gray-200">
                  <p class="text-xs text-gray-500 italic">✨ Experiencia comprobada en enseñanza</p>
                </div>
              </div>
            </div>
            
            <!-- Sección: Nivel (1 columna) -->
            <div class="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border-2 border-blue-200 hover:border-[#ff3e00] transition duration-300">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-[#ff3e00] flex items-center justify-center flex-shrink-0">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <h3 class="text-lg font-bold text-gray-800">Nivel Educativo</h3>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex-1 bg-[#ff3e00] text-white rounded-xl px-4 py-3 text-center font-bold shadow-md">
                  ${datos.nivel}
                </div>
              </div>
              <p class="text-xs text-gray-500 mt-3 text-center">📖 Adaptado a tu nivel de aprendizaje</p>
            </div>
          </div>
          
          <!-- Temas especializados -->
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-[#ff3e00] flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-gray-800">Temas Especializados</h3>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              ${datos.especializaciones.map(tema => `
                <div class="bg-blue-500 text-white rounded-lg px-4 py-3 text-center text-sm font-medium shadow hover:bg-blue-600 transition duration-300 border-2 border-blue-600">
                  ${tema}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Sección CV del Profesor -->
          ${datos.tiene_cv ? `
          <div class="mb-6">
            <div class="flex items-center justify-between bg-orange-50 p-4 rounded-2xl border-2 border-dashed border-[#ff3e00]">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#ff3e00] flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-gray-800">Currículum Vitae</h3>
                  <p class="text-xs text-gray-500">Disponible para revisión</p>
                </div>
              </div>
              <a href="https://chankando-1.onrender.com/ver_cv.php?id=${datos.curso_id}" target="_blank"
                class="bg-white text-[#ff3e00] border-2 border-[#ff3e00] hover:bg-[#ff3e00] hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition duration-300 flex items-center gap-2">
                Ver PDF
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>
            </div>
          </div>
          ` : ''}
          
          <!-- Sección de contacto -->
          <div class="bg-gradient-to-r from-[#ff3e00] to-[#ff6a3d] rounded-2xl p-6 text-white">
            <div class="flex items-center gap-3 mb-4">
              <svg class="w-8 h-8 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
              </svg>
              <div>
                <h3 class="text-xl font-bold">¿Interesado? ¡Contáctanos!</h3>
                <p class="text-sm text-white text-opacity-90">Comunícate directamente con el profesor</p>
              </div>
            </div>
            
            <div class="space-y-3 bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5" fill="black" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-white text-opacity-70">Teléfono / WhatsApp</p>
                  <p class="text-lg font-bold break-all">${datos.telefono}</p>
                </div>
                <a href="https://wa.me/${datos.telefono.replace(/\D/g, '')}" target="_blank" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-300 flex items-center gap-2 whitespace-nowrap">
                  <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </a>
              </div>
              
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5" fill="black" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-white text-opacity-70">Correo electrónico</p>
                  <p class="text-lg font-bold break-all">${datos.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Mostrar modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  
  // Agregar animación de entrada
  setTimeout(() => {
    const wrapper = modal.querySelector('.modal-content-wrapper');
    if (wrapper) {
      wrapper.style.animation = 'modalSlideIn 0.4s ease-out';
    }
  }, 10);
  
  // Configurar botón cerrar
  const btnCerrar = document.getElementById('cerrar-modal-contacto');
  if (btnCerrar) {
    btnCerrar.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      cerrarModalContacto();
    };
  }
  
  // Cerrar al hacer click fuera del modal
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      cerrarModalContacto();
    }
  });
  
  // Cerrar con tecla ESC
  document.addEventListener('keydown', function cerrarConEsc(e) {
    if (e.key === 'Escape') {
      cerrarModalContacto();
      document.removeEventListener('keydown', cerrarConEsc);
    }
  });
}

function cerrarModalContacto() {
  const modal = document.getElementById('modal-contacto-profesor');
  if (modal) {
    const wrapper = modal.querySelector('.modal-content-wrapper');
    if (wrapper) {
      wrapper.style.animation = 'modalSlideOut 0.3s ease-in';
    }
    
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }, 300);
  }
}

// Agregar estilos para animaciones del modal
if (!document.getElementById('modal-contacto-styles')) {
  const style = document.createElement('style');
  style.id = 'modal-contacto-styles';
  style.textContent = `
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    @keyframes modalSlideOut {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      to {
        opacity: 0;
        transform: scale(0.9) translateY(-20px);
      }
    }
    
    #modal-contacto-profesor {
      transition: all 0.3s ease;
    }
    
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #ff3e00;
      border-radius: 10px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #e63600;
    }
  `;
  document.head.appendChild(style);
}


// Enviar curso al servidor
async function enviarCursoAlServidor(data) {
  
  const formData = new FormData();

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      if (key === "temas") {
        // data.temas ya es el array filtrado que viene de preConfirm
        formData.append("temas", JSON.stringify(data.temas));
      } else {
        formData.append(key, data[key]);
      }
    }
  });

  try {
    const res = await fetch('https://chankando-1.onrender.com/publicar_curso.php', {
      method: 'POST',
      body: formData
    });

    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch(e) {
        console.error("Respuesta no válida del servidor:", text);
        throw new Error("El servidor devolvió una respuesta inesperada.");
    }

    if (json.success) {
      Swal.fire('Curso publicado', 'Tu curso fue publicado correctamente', 'success');
      cargarCursos(1); 
    } else {
      Swal.fire('Error', json.error || 'No se pudo publicar el curso', 'error');
    }

  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message || 'Error de conexión con el servidor', 'error');
  }
  console.log('📤 Datos que se enviarán:');
  for (let [key, value] of formData.entries()) {
    console.log(`   ${key}:`, value);
  }
}


//Inyección dinámica de la Card (Sin tocar tu CSS)

function generarHtmlCard(data) {
  const temasArray = Array.isArray(data.temas) ? data.temas.slice(0, 3) : [];
  const bioTruncada = truncarTexto(data.biografia, 130);

  // Creamos un ID único para no pasar el JSON pesado por el onclick (evita errores de comillas)
  const cardId = `card-${Math.random().toString(36).substr(2, 9)}`;
  window[cardId] = data;

  return `
    <div class="card">
      <div class="card-pattern-grid"></div>
      <div class="card-overlay-dots"></div>
      <div class="card-title-area">
        <span>${data.curso}</span>
      </div>
      <div class="card-body">
        <div class="card-description">${bioTruncada}</div>
        <div class="feature-grid">
          <div class="feature-item">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"></path>
              </svg>
            </div>
            <span class="feature-text font-bold text-[#ff3e00]">${data.nivel}</span>
          </div>
          ${temasArray.map(t => `
            <div class="feature-item">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M12,17.56L16.07,16.43L16.62,10.33H9.38L9.2,8.3H16.8L17,6.31H7L7.56,12.32H14.45L14.22,14.9L12,15.5L9.78,14.9L9.64,13.24H7.64L7.93,16.43L12,17.56M4.07,3H19.93L18.5,19.2L12,21L5.5,19.2L4.07,3Z"></path>
                </svg>
              </div>
              <span class="feature-text">${t.trim()}</span>
            </div>
          `).join('')}
        </div>
        <div class="card-actions">
          <div class="price">
            <span class="price-currency">$</span>${data.precio}
            <span class="price-period">${data.tipo_precio === 'Por hora' ? 'por hora' : 'total'}</span>
          </div>
          <button class="card-button" onclick="prepararModalDesdeCardId('${cardId}')">Contactar</button>
        </div>
      </div>
    </div>
  `;
}

// Función puente corregida
function prepararModalDesdeCardId(id) {
  console.log('✅ SE EJECUTÓ prepararModalDesdeCardId con ID:', id);
  const data = window[id];
  console.log('📦 Datos de window[id]:', data);
  prepararModalContacto(data);
}

// Función puente para adaptar tus datos al modal de contacto que ya tienes
function prepararModalContacto(data) {

  console.log('🔍 DATOS RAW (antes de formatear):', data);

    const formatData = {
        curso: data.curso,
        profesor: data.nombre,
        descripcion: data.biografia,
        nivel: data.nivel,
        especializaciones: Array.isArray(data.temas) ? data.temas : [data.temas], 
        telefono: data.telefono,
        email: data.email || localStorage.getItem('userEmail'),
        curso_id: data.id || data.curso_id,
        tiene_cv: data.tiene_cv || false
    };
    mostrarModalContacto(formatData);
}


// Función para cargar cursos desde la BD
let htmlCardsEstaticas = ""; // Variable para guardar tus 12 cards originales

async function cargarCursos(numPagina = 1) {
  const contenedor = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');

  try {
    const response = await fetch(`https://chankando-1.onrender.com/obtener_cursos.php?p=${numPagina}`);
    const data = await response.json();

    if (data.success) {
      console.log('📦 CURSOS QUE DEVUELVE obtener_cursos.php:', data.cursos);
      contenedor.innerHTML = ""; // Limpiamos siempre

      // Renderizamos TODAS las páginas desde la BD
      data.cursos.forEach(curso => {
        const cardHtml = generarHtmlCard({
          id: curso.id,
          tiene_cv: curso.tiene_cv,
          curso: curso.curso_nombre,
          nombre: curso.nombre_profesor,
          biografia: curso.biografia,
          temas: curso.descripcion,
          nivel: curso.nivel,
          precio: curso.precio,
          tipo_precio: curso.tipo_precio,
          telefono: curso.telefono,
          email: curso.email_contacto
        });
        contenedor.innerHTML += cardHtml;
      });

      // Actualizar variables globales de paginación
      totalPaginas = data.total_paginas;
      paginaActual = data.pagina_actual;
      actualizarBotonesPaginacion();
    }
  } catch (error) {
    console.error("Error cargando cursos:", error);
  }
}

// Se ejecuta al iniciar
document.addEventListener('DOMContentLoaded', () => {
  cargarCursos(1); 
});


function truncarTexto(texto, limite) {
  if (!texto) return "";
  if (texto.length <= limite) return texto;
  return texto.substring(0, limite) + "...";
}

function abrirFormularioDocente() {
  Swal.fire({
    title: '<span class="text-2xl font-bold text-[#ff3e00]">Publicar Nuevo Curso</span>',
    html: `
      <div id="form-curso-docente" class="text-left space-y-4">

        <input id="docente-nombre" class="swal2-input w-full m-0"
          placeholder="Nombre completo del profesor" required>

        <input id="curso-nombre" class="swal2-input w-full m-0"
          placeholder="Curso que enseña (Ej: Química)" required>

        <textarea id="docente-bio" class="swal2-textarea w-full m-0" style="height: 100px;" 
          placeholder="Sobre el profesor (Experiencia, metodología...)"></textarea>

        <div class="grid grid-cols-3 gap-3">
          <input id="tema1" class="swal2-input m-0" placeholder="Tema 1" required>
          <input id="tema2" class="swal2-input m-0" placeholder="Tema 2">
          <input id="tema3" class="swal2-input m-0" placeholder="Tema 3">
        </div>

        <label class="block text-sm font-semibold text-gray-700 mt-2">Nivel educativo</label>
        <select id="curso-nivel" class="swal2-select w-full m-0">
          <option value="Secundaria">Secundaria</option>
          <option value="Preuniversitaria">Preuniversitaria</option>
          <option value="Universitaria">Universitaria</option>
        </select>

        <div class="grid grid-cols-2 gap-2">
          <input id="curso-precio" type="number"
            class="swal2-input m-0"
            placeholder="Precio" min="1">

          <select id="curso-tipo-precio" class="swal2-select m-0">
            <option value="Por hora">Por hora</option>
            <option value="Curso completo">Curso completo</option>
          </select>
        </div>

        <input id="docente-telefono" type="tel"
          class="swal2-input w-full m-0"
          placeholder="Teléfono / WhatsApp" required>

        <label class="block text-sm font-semibold text-gray-700">
          CV del profesor (PDF opcional)
        </label>
        <input id="docente-cv" type="file" accept=".pdf"
          class="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-orange-50 file:text-orange-700
          hover:file:bg-orange-100">

      </div>
    `,
    confirmButtonText: 'Publicar Curso',
    confirmButtonColor: '#ff3e00',
    showCancelButton: true,
    focusConfirm: false,

    preConfirm: () => {
      const nombre = document.getElementById('docente-nombre').value.trim();
      const curso = document.getElementById('curso-nombre').value.trim();
      const biografia = document.getElementById('docente-bio').value.trim();
      const nivel = document.getElementById('curso-nivel').value;
      const precio = document.getElementById('curso-precio').value;
      const tipoPrecio = document.getElementById('curso-tipo-precio').value;
      const telefono = document.getElementById('docente-telefono').value.trim();
      const cv = document.getElementById('docente-cv').files[0];
      
      // Error #3: Solo capturamos hasta el tema 3
      const temasArray = [
        document.getElementById('tema1').value,
        document.getElementById('tema2').value,
        document.getElementById('tema3').value,
      ].map(t => t.trim()).filter(t => t !== "");

      if (temasArray.length === 0) {
        Swal.showValidationMessage('Debes ingresar al menos un tema');
        return false;
      }

      if (!nombre || !curso || !telefono || !biografia) {
        Swal.showValidationMessage('Nombre, curso, biografía y teléfono son obligatorios');
        return false;
      }

      return {
        nombre,
        curso,
        biografia, // Se envía al servidor
        temas: temasArray,
        nivel,
        precio,
        tipo_precio: tipoPrecio,
        telefono,
        cv,
        email: localStorage.getItem('userEmail') || '',
        profesor_id: localStorage.getItem('userId') || null
      };
    }
  }).then(result => {
    if (result.isConfirmed) {
      enviarCursoAlServidor(result.value);
    }
  });
}
