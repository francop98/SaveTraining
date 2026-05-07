document.addEventListener('DOMContentLoaded', function () {

  /* ══════════════════════════════════════
    ESTADO
  ══════════════════════════════════════ */
  var STORAGE_KEY = 'savetraining_v1';

  var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  // Estructura: { "YYYY-MM-DD": { trained: bool, exercises: [] } }

  var selectedDate = null;
  var editSets     = [];
  var addSets      = [];

  /* ══════════════════════════════════════
    HELPERS
  ══════════════════════════════════════ */
  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getDay(dateKey) {
    if (!data[dateKey]) data[dateKey] = { trained: false, exercises: [] };
    return data[dateKey];
  }

  function formatDate(d) {
    var yyyy = d.getFullYear();
    var mm   = String(d.getMonth() + 1).padStart(2, '0');
    var dd   = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function updateTotalDays() {
    var count = Object.values(data).filter(function (d) { return d.trained; }).length;
    document.getElementById('totalDays').textContent = count;
  }

  function updateStats() {
    if (!selectedDate || !data[selectedDate]) {
      document.getElementById('statExercises').textContent = '0';
      document.getElementById('statSets').textContent      = '0';
      document.getElementById('statWeight').textContent    = '0kg';
      return;
    }
    var exercises = data[selectedDate].exercises || [];
    var totalSets = exercises.reduce(function (s, ex) { return s + ex.sets.length; }, 0);
    var totalKg   = exercises.reduce(function (s, ex) {
      return s + ex.sets.reduce(function (s2, set) {
        return s2 + (parseFloat(set.weight) || 0) * (parseFloat(set.reps) || 0);
      }, 0);
    }, 0);
    document.getElementById('statExercises').textContent = exercises.length;
    document.getElementById('statSets').textContent      = totalSets;
    document.getElementById('statWeight').textContent    = totalKg.toLocaleString('es-AR') + 'kg';
  }

  /* ══════════════════════════════════════
     SEMANA — los 7 días (Lun→Dom)
  ══════════════════════════════════════ */
  var DAY_FULL  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var DAY_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  function getMondayOfWeek() {
    var today = new Date();
    var dow   = today.getDay(); // 0=Dom
    var diff  = (dow + 6) % 7; // días desde el lunes
    var mon   = new Date(today);
    mon.setDate(today.getDate() - diff);
    return mon;
  }

  function renderWeek() {
  var grid     = document.getElementById('calGrid');
  var today    = new Date();
  var todayStr = formatDate(today);

  grid.innerHTML = '';

  var dateKey = todayStr;
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0');

  var dayData = data[dateKey];
  var trained = dayData && dayData.trained;

  var div = document.createElement('div');
  div.className = 'cal-day';
  div.classList.add('today');
  if (trained)              div.classList.add('trained');
  if (dateKey === selectedDate) div.classList.add('selected');

  var statusText = trained ? 'Entrenado ✓' : 'Sin entrenar';

  div.innerHTML =
    '<div class="day-name">' + DAY_SHORT[today.getDay()] + '</div>' +
    '<div class="day-number">' + dd + '/' + mm + '</div>' +
    '<div class="day-status">' + statusText + '</div>';

  div.addEventListener('click', function () { window.location.href = 'registrarEntrenamiento.html'; });

  grid.appendChild(div);
}

  /* ══════════════════════════════════════
    SELECCIONAR DÍA
  ══════════════════════════════════════ */
  function selectDay(dateKey, dateObj) {
    selectedDate = dateKey;
    renderWeek(); // re-pintar para marcar selected

    // Banner
    var dow = dateObj.getDay();
    var dd  = String(dateObj.getDate()).padStart(2, '0');
    var mm  = String(dateObj.getMonth() + 1).padStart(2, '0');
    var yyyy = dateObj.getFullYear();
    document.getElementById('selectedDateLabel').textContent =
      DAY_FULL[dow] + ' ' + dd + '/' + mm + '/' + yyyy;

    // Badge entrenado
    var trained = data[dateKey] && data[dateKey].trained;
    document.getElementById('trainedBadge').style.display = trained ? 'block' : 'none';

    renderExerciseList();
    updateStats();
  }

  /* ══════════════════════════════════════
     SETS BUILDER (formulario añadir)
  ══════════════════════════════════════ */
  function renderAddSets() {
    var container = document.getElementById('setsBuilder');
    container.innerHTML = '';

    addSets.forEach(function (set, i) {
      var row = document.createElement('div');
      row.className = 'set-row';
      row.innerHTML =
        '<span class="set-label">S' + (i + 1) + '</span>' +
        '<input type="number" placeholder="Reps" min="1" value="' + (set.reps || '') + '" data-idx="' + i + '" data-field="reps"/>' +
        '<input type="number" placeholder="Peso kg" min="0" step="0.5" value="' + (set.weight || '') + '" data-idx="' + i + '" data-field="weight"/>' +
        '<button class="btn-remove-set" data-idx="' + i + '">✕</button>';
      container.appendChild(row);
    });

    container.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        var idx   = parseInt(e.target.dataset.idx);
        var field = e.target.dataset.field;
        addSets[idx][field] = e.target.value;
      });
    });

    container.querySelectorAll('.btn-remove-set').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var idx = parseInt(e.target.dataset.idx);
        addSets.splice(idx, 1);
        renderAddSets();
      });
    });
  }

  document.getElementById('addSetBtn').addEventListener('click', function () {
    addSets.push({ reps: '', weight: '' });
    renderAddSets();
  });

  /* ══════════════════════════════════════
     GUARDAR EJERCICIO
  ══════════════════════════════════════ */
  document.getElementById('saveExBtn').addEventListener('click', function () {
    var name = document.getElementById('exName').value.trim();
    if (!name) { showToast('⚠️ Ingresá el nombre del ejercicio'); return; }
    if (!selectedDate) { showToast('⚠️ Seleccioná un día primero'); return; }

    var validSets = addSets.filter(function (s) { return s.reps || s.weight; });
    if (validSets.length === 0) { showToast('⚠️ Añadí al menos una serie'); return; }

    var day = getDay(selectedDate);
    day.trained = true;
    day.exercises.push({
      name:     name,
      category: document.getElementById('exCategory').value,
      sets:     validSets.map(function (s) { return { reps: s.reps || '—', weight: s.weight || '0' }; }),
      notes:    document.getElementById('exNotes').value.trim()
    });

    saveData();
    renderWeek();
    renderExerciseList();
    updateStats();
    updateTotalDays();

    // Reset form
    document.getElementById('exName').value  = '';
    document.getElementById('exNotes').value = '';
    addSets = [];
    renderAddSets();

    document.getElementById('trainedBadge').style.display = 'block';
    showToast('✓ Ejercicio guardado');
  });

  /* ══════════════════════════════════════
     LISTA DE EJERCICIOS DEL DÍA
  ══════════════════════════════════════ */
  function renderExerciseList() {
    var list = document.getElementById('exerciseList');
    var day  = selectedDate ? data[selectedDate] : null;

    if (!day || !day.exercises || day.exercises.length === 0) {
      list.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-icon">🏋️</div>' +
        '<p>No hay ejercicios para este día.<br>Añadí uno con el formulario.</p>' +
        '</div>';
      return;
    }

    list.innerHTML = '';
    day.exercises.forEach(function (ex, i) {
      var item = document.createElement('div');
      item.className = 'exercise-item';

      var setsHtml = ex.sets.map(function (s, si) {
        return '<div class="set-chip">' +
          '<div class="set-num">Serie ' + (si + 1) + '</div>' +
          '<div class="set-data"><span>' + s.reps + '</span> reps · <span>' + s.weight + 'kg</span></div>' +
          '</div>';
      }).join('');

      item.innerHTML =
        '<div class="exercise-item-header">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<div class="exercise-name">' + ex.name + '</div>' +
            '<div class="exercise-category">' + ex.category + '</div>' +
          '</div>' +
          '<div class="exercise-actions">' +
            '<button class="btn btn-sm btn-edit">Editar</button>' +
            '<button class="btn btn-sm btn-danger">Eliminar</button>' +
          '</div>' +
        '</div>' +
        '<div class="sets-grid">' + setsHtml + '</div>' +
        (ex.notes ? '<div style="font-size:12px;color:var(--muted);margin-top:8px">📝 ' + ex.notes + '</div>' : '');

      // Botón editar
      (function (idx) {
        item.querySelector('.btn-edit').addEventListener('click', function () { openEdit(idx); });
        item.querySelector('.btn-danger').addEventListener('click', function () { deleteExercise(idx); });
      })(i);

      list.appendChild(item);
    });
  }

  /* ══════════════════════════════════════
     ELIMINAR EJERCICIO
  ══════════════════════════════════════ */
  function deleteExercise(idx) {
    if (!confirm('¿Eliminar este ejercicio?')) return;
    data[selectedDate].exercises.splice(idx, 1);
    if (data[selectedDate].exercises.length === 0) {
      data[selectedDate].trained = false;
      document.getElementById('trainedBadge').style.display = 'none';
    }
    saveData();
    renderWeek();
    renderExerciseList();
    updateStats();
    updateTotalDays();
    showToast('Ejercicio eliminado');
  }

  /* ══════════════════════════════════════
     EDITAR EJERCICIO — MODAL
  ══════════════════════════════════════ */
  var editingIdx = null;

  function openEdit(idx) {
    editingIdx = idx;
    var ex = data[selectedDate].exercises[idx];
    document.getElementById('editName').value     = ex.name;
    document.getElementById('editCategory').value = ex.category;
    document.getElementById('editNotes').value    = ex.notes || '';
    editSets = ex.sets.map(function (s) { return { reps: s.reps, weight: s.weight }; });
    renderEditSets();
    document.getElementById('editModal').classList.add('open');
  }

  function renderEditSets() {
    var container = document.getElementById('editSetsBuilder');
    container.innerHTML = '';

    editSets.forEach(function (set, i) {
      var row = document.createElement('div');
      row.className = 'set-row';
      row.innerHTML =
        '<span class="set-label">S' + (i + 1) + '</span>' +
        '<input type="number" placeholder="Reps" min="1" value="' + (set.reps || '') + '" data-idx="' + i + '" data-field="reps"/>' +
        '<input type="number" placeholder="Peso kg" min="0" step="0.5" value="' + (set.weight || '') + '" data-idx="' + i + '" data-field="weight"/>' +
        '<button class="btn-remove-set" data-idx="' + i + '">✕</button>';
      container.appendChild(row);
    });

    container.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        var idx   = parseInt(e.target.dataset.idx);
        var field = e.target.dataset.field;
        editSets[idx][field] = e.target.value;
      });
    });

    container.querySelectorAll('.btn-remove-set').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var idx = parseInt(e.target.dataset.idx);
        editSets.splice(idx, 1);
        renderEditSets();
      });
    });
  }

  document.getElementById('editAddSetBtn').addEventListener('click', function () {
    editSets.push({ reps: '', weight: '' });
    renderEditSets();
  });

  document.getElementById('cancelEdit').addEventListener('click', function () {
    document.getElementById('editModal').classList.remove('open');
  });

  document.getElementById('editModal').addEventListener('click', function (e) {
    if (e.target === document.getElementById('editModal')) {
      document.getElementById('editModal').classList.remove('open');
    }
  });

  document.getElementById('confirmEdit').addEventListener('click', function () {
    var name = document.getElementById('editName').value.trim();
    if (!name) { showToast('⚠️ Ingresá el nombre'); return; }

    var validSets = editSets.filter(function (s) { return s.reps || s.weight; });
    if (validSets.length === 0) { showToast('⚠️ Necesitás al menos una serie'); return; }

    var ex = data[selectedDate].exercises[editingIdx];
    ex.name     = name;
    ex.category = document.getElementById('editCategory').value;
    ex.notes    = document.getElementById('editNotes').value.trim();
    ex.sets     = validSets.map(function (s) { return { reps: s.reps || '—', weight: s.weight || '0' }; });

    saveData();
    renderExerciseList();
    updateStats();
    document.getElementById('editModal').classList.remove('open');
    showToast('✓ Ejercicio actualizado');
  });

  /* ══════════════════════════════════════
    INIT
  ══════════════════════════════════════ */
  renderAddSets();  // inicializar sets vacío (muestra el builder limpio)
  renderWeek();
  updateTotalDays();

  // Seleccionar hoy automáticamente
  var todayDate = new Date();
  selectDay(formatDate(todayDate), todayDate);
});
