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
  function exerciseExistsGlobally(name, data) {
    var lower = name.trim().toLowerCase();
    return Object.keys(data).some(function (dateKey) {
      var day = data[dateKey];
      if (!day || !day.exercises) return false;
      return day.exercises.some(function (ex) {
        return ex.name.trim().toLowerCase() === lower;
      });
    });
  }

  var STORAGE_KEY  = 'savetraining_v1';
  var data         = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  var params       = new URLSearchParams(window.location.search);
  var selectedDate = params.get('date') || localStorage.getItem('selectedDate');
  var addSets      = [];

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getDay(dateKey) {
    if (!data[dateKey]) data[dateKey] = { trained: false, exercises: [] };
    return data[dateKey];
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2500);
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

  function renderAddSets() {
    var container = document.getElementById('setsBuilder');
    container.innerHTML = '';
    addSets.forEach(function (set, i) { container.appendChild(buildSetRow(set, i, i === 0)); });

    container.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        addSets[parseInt(e.target.dataset.idx)][e.target.dataset.field] = e.target.value;
      });
    });

    container.querySelectorAll('.btn-remove-set').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        addSets.splice(parseInt(e.currentTarget.dataset.idx), 1);
        renderAddSets();
      });
    });

    container.querySelectorAll('.btn-repeat-set').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var idx  = parseInt(e.currentTarget.dataset.idx);
        var prev = addSets[idx - 1];
        if (prev) { addSets[idx] = { reps: prev.reps, weight: prev.weight }; renderAddSets(); }
      });
    });
  }

  document.getElementById('addSetBtn').addEventListener('click', function () {
    addSets.push({ reps: '', weight: '' });
    renderAddSets();
  });

  document.getElementById('saveExBtn').addEventListener('click', function () {
    var name = document.getElementById('exName').value.trim();
    if (!name) { showToast('⚠ Ingresá el nombre del ejercicio'); return; }
    if (!selectedDate) { showToast('⚠ No se encontró la fecha'); return; }

    // Validación global
    if (exerciseExistsGlobally(name, data)) {
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

    document.getElementById('exName').value  = '';
    document.getElementById('exNotes').value = '';
    addSets = [];
    renderAddSets();
    showToast('✓ Ejercicio guardado');
  });

  renderAddSets();
});