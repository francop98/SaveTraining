document.addEventListener('DOMContentLoaded', function () {

  /* ─── SVG del cesto ─── */
  var TRASH_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="3 6 5 6 21 6"/>' +
      '<path d="M19 6l-1 14H6L5 6"/>' +
      '<path d="M10 11v6"/>' +
      '<path d="M14 11v6"/>' +
      '<path d="M9 6V4h6v2"/>' +
    '</svg>';

  /* ─── Validación GLOBAL de nombre único ─── */
  function exerciseExistsGlobally(name, data, excludeDateKey, excludeIdx) {
    var lower = name.trim().toLowerCase();
    return Object.keys(data).some(function (dateKey) {
      var day = data[dateKey];
      if (!day || !day.exercises) return false;
      return day.exercises.some(function (ex, idx) {
        // Al editar, excluir el propio ejercicio
        if (dateKey === excludeDateKey && idx === excludeIdx) return false;
        return ex.name.trim().toLowerCase() === lower;
      });
    });
  }

  /* ─── ESTADO ─── */
  var STORAGE_KEY = 'savetraining_v1';
  var data        = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  var selectedDate = null;
  var editSets    = [];
  var addSets     = [];
  var editingIdx  = null;

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getDay(dateKey) {
    if (!data[dateKey]) data[dateKey] = { trained: false, exercises: [] };
    return data[dateKey];
  }

  function formatDate(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2500);
  }

  function updateTotalDays() {
    var year  = String(new Date().getFullYear());
    var count = Object.keys(data).filter(function (k) {
      return data[k].trained && k.startsWith(year);
    }).length;
    document.getElementById('totalDays').textContent = count;
  }

  function updateStats() {
    if (!selectedDate || !data[selectedDate]) {
      document.getElementById('statExercises').textContent = '0';
      document.getElementById('statSets').textContent      = '0';
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
    var wEl = document.getElementById('statWeight');
    if (wEl) wEl.textContent = totalKg.toLocaleString('es-AR') + 'kg';
  }

  /* ─── CALENDARIO ─── */
  var DAY_FULL  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var DAY_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  function renderWeek() {
    var grid     = document.getElementById('calGrid');
    var today    = new Date();
    var todayStr = formatDate(today);
    grid.innerHTML = '';

    var dd      = String(today.getDate()).padStart(2, '0');
    var mm      = String(today.getMonth() + 1).padStart(2, '0');
    var trained = data[todayStr] && data[todayStr].trained;

    var div = document.createElement('div');
    div.className = 'cal-day today';
    if (todayStr === selectedDate) div.classList.add('selected');

    div.innerHTML =
      '<div class="day-name">'   + DAY_SHORT[today.getDay()] + '</div>' +
      '<div class="day-number">' + dd + '/' + mm + '</div>' +
      '<div class="day-status">' + (trained ? 'Entrenado ✓' : 'Sin entrenar') + '</div>';

    div.addEventListener('click', function () {
      window.location.href = 'pages/registrarEntrenamiento.html?date=' + todayStr;
    });

    grid.appendChild(div);
  }

  function selectDay(dateKey, dateObj) {
    selectedDate = dateKey;
    renderWeek();
    var dow  = dateObj.getDay();
    var dd   = String(dateObj.getDate()).padStart(2, '0');
    var mm   = String(dateObj.getMonth() + 1).padStart(2, '0');
    var yyyy = dateObj.getFullYear();
    document.getElementById('selectedDateLabel').textContent =
      DAY_FULL[dow] + ' ' + dd + '/' + mm + '/' + yyyy;
    var trained = data[dateKey] && data[dateKey].trained;
    document.getElementById('trainedBadge').style.display = trained ? 'block' : 'none';
    renderExerciseList();
    updateStats();
  }

  /* ─── Helper: construir fila de serie ─── */
  function buildSetRow(set, i, isFirst) {
    var row = document.createElement('div');
    row.className = 'set-row' + (isFirst ? ' no-repeat' : '');
    var repeatHtml = isFirst ? '' :
      '<button class="btn-repeat-set" data-idx="' + i + '" title="Repetir serie anterior">↩ Repetir</button>';
    row.innerHTML =
      '<span class="set-label">S' + (i + 1) + '</span>' +
      '<input type="number" placeholder="Reps" min="1" value="' + (set.reps || '') + '" data-idx="' + i + '" data-field="reps"/>' +
      '<input type="number" placeholder="Peso kg" min="0" step="0.5" value="' + (set.weight || '') + '" data-idx="' + i + '" data-field="weight"/>' +
      repeatHtml +
      '<button class="btn-remove-set" data-idx="' + i + '" title="Eliminar serie">' + TRASH_SVG + '</button>';
    return row;
  }

  function bindSetEvents(container, setsArr, rerenderFn) {
    container.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        setsArr[parseInt(e.target.dataset.idx)][e.target.dataset.field] = e.target.value;
      });
    });
    container.querySelectorAll('.btn-remove-set').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        setsArr.splice(parseInt(e.currentTarget.dataset.idx), 1);
        rerenderFn();
      });
    });
    container.querySelectorAll('.btn-repeat-set').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var idx  = parseInt(e.currentTarget.dataset.idx);
        var prev = setsArr[idx - 1];
        if (prev) { setsArr[idx] = { reps: prev.reps, weight: prev.weight }; rerenderFn(); }
      });
    });
  }

  /* ─── SETS BUILDER — Añadir ─── */
  function renderAddSets() {
    var container = document.getElementById('setsBuilder');
    container.innerHTML = '';
    addSets.forEach(function (set, i) { container.appendChild(buildSetRow(set, i, i === 0)); });
    bindSetEvents(container, addSets, renderAddSets);
  }

  document.getElementById('addSetBtn').addEventListener('click', function () {
    addSets.push({ reps: '', weight: '' });
    renderAddSets();
  });

  /* ─── GUARDAR EJERCICIO ─── */
  document.getElementById('saveExBtn').addEventListener('click', function () {
    var name = document.getElementById('exName').value.trim();
    if (!name) { showToast('⚠ Ingresá el nombre del ejercicio'); return; }
    if (!selectedDate) { showToast('⚠ Seleccioná un día primero'); return; }

    if (exerciseExistsGlobally(name, data, null, null)) {
      showToast('⚠ Este ejercicio ya existe, podés editarlo en los ejercicios existentes');
      return;
    }

    var validSets = addSets.filter(function (s) { return s.reps || s.weight; });
    if (validSets.length === 0) { showToast('⚠ Añadí al menos una serie'); return; }

    var day = getDay(selectedDate);
    day.trained = true;
    day.exercises.push({
      name:     name,
      category: document.getElementById('exCategory').value,
      sets:     validSets.map(function (s) { return { reps: s.reps || ' ', weight: s.weight || '0' }; }),
      notes:    document.getElementById('exNotes').value.trim()
    });

    saveData();
    renderWeek();
    renderExerciseList();
    updateStats();
    updateTotalDays();

    document.getElementById('exName').value  = '';
    document.getElementById('exNotes').value = '';
    addSets = [];
    renderAddSets();
    document.getElementById('trainedBadge').style.display = 'block';
    showToast('✓ Ejercicio guardado');
  });

  /* ─── LISTA DE EJERCICIOS ─── */
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
          '<div class="set-data"><span>' + s.reps + '</span> reps <span>' + s.weight + 'kg</span></div>' +
          '</div>';
      }).join('');

      item.innerHTML =
        '<div class="exercise-item-header">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<div class="exercise-name">'     + ex.name     + '</div>' +
            '<div class="exercise-category">' + ex.category + '</div>' +
          '</div>' +
          '<div class="exercise-actions">' +
            '<button class="btn btn-sm btn-edit">Editar</button>' +
            '<button class="btn btn-sm btn-danger" title="Eliminar ejercicio">' + TRASH_SVG + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="sets-grid">' + setsHtml + '</div>' +
        (ex.notes ? '<div style="font-size:12px;color:var(--text-muted);margin-top:8px">📝 ' + ex.notes + '</div>' : '');

      (function (idx) {
        item.querySelector('.btn-edit').addEventListener('click', function () { openEdit(idx); });
        item.querySelector('.btn-danger').addEventListener('click', function () { deleteExercise(idx); });
      })(i);

      list.appendChild(item);
    });
  }

  /* ─── ELIMINAR EJERCICIO ─── */
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

  /* ─── EDITAR EJERCICIO ─── */
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
    editSets.forEach(function (set, i) { container.appendChild(buildSetRow(set, i, i === 0)); });
    bindSetEvents(container, editSets, renderEditSets);
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
    if (!name) { showToast('⚠ Ingresá el nombre'); return; }

    var validSets = editSets.filter(function (s) { return s.reps || s.weight; });
    if (validSets.length === 0) { showToast('⚠ Necesitás al menos una serie'); return; }

    // Al editar: permitir mantener el mismo nombre (excluir el propio)
    if (exerciseExistsGlobally(name, data, selectedDate, editingIdx)) {
      showToast('⚠ Este ejercicio ya existe, podés editarlo en los ejercicios existentes');
      return;
    }

    var ex      = data[selectedDate].exercises[editingIdx];
    ex.name     = name;
    ex.category = document.getElementById('editCategory').value;
    ex.notes    = document.getElementById('editNotes').value.trim();
    ex.sets     = validSets.map(function (s) { return { reps: s.reps || ' ', weight: s.weight || '0' }; });

    saveData();
    renderExerciseList();
    updateStats();
    document.getElementById('editModal').classList.remove('open');
    showToast('✓ Ejercicio actualizado');
  });

  /* ─── INIT ─── */
  renderAddSets();
  renderWeek();
  updateTotalDays();
  var todayDate = new Date();
  selectDay(formatDate(todayDate), todayDate);
});