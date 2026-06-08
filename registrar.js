document.addEventListener('DOMContentLoaded', function () {

  var TRASH_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="3 6 5 6 21 6"/>' +
    '<path d="M19 6l-1 14H6L5 6"/>' +
    '<path d="M10 11v6"/>' +
    '<path d="M14 11v6"/>' +
    '<path d="M9 6V4h6v2"/>' +
    '</svg>';

  /* Validación GLOBAL de nombre único */
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

  /* ─── NUEVA FUNCIÓN: buscar último registro de un ejercicio ─── */
  function getLastRecord(exerciseName, data, excludeDateKey) {
    var lower = exerciseName.trim().toLowerCase();
    // Ordenar fechas de más reciente a más antigua
    var sortedDates = Object.keys(data)
      .filter(function (k) {
        return k !== excludeDateKey && data[k] && data[k].trained && data[k].exercises;
      })
      .sort(function (a, b) { return b.localeCompare(a); });

    for (var i = 0; i < sortedDates.length; i++) {
      var day = data[sortedDates[i]];
      var match = day.exercises.find(function (ex) {
        return ex.name.trim().toLowerCase() === lower;
      });
      if (match && match.sets && match.sets.length > 0) {
        return { date: sortedDates[i], sets: match.sets };
      }
    }
    return null;
  }

  var STORAGE_KEY = 'savetraining_v1';
  var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  var params = new URLSearchParams(window.location.search);
  var selectedDate = params.get('date') || localStorage.getItem('selectedDate');
  var addSets = [];

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

  /* Helper: construir fila de serie */
  function buildSetRow(set, i, isFirst) {
    var row = document.createElement('div');
    row.className = 'set-row' + (isFirst ? ' no-repeat' : '');
    var repeatHtml = isFirst ? '' :
      '<button class="btn-repeat-set" data-idx="' + i + '" title="Repetir serie anterior">↑ Repetir</button>';
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
        var idx = parseInt(e.currentTarget.dataset.idx);
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

    if (exerciseExistsGlobally(name, data)) {
      showToast('⚠ Este ejercicio ya existe, podés editarlo en los ejercicios existentes');
      return;
    }

    var validSets = addSets.filter(function (s) { return s.reps || s.weight; });
    if (validSets.length === 0) { showToast('⚠ Añadí al menos una serie'); return; }

    var day = getDay(selectedDate);
    day.trained = true;
    day.exercises.push({
      name: name,
      category: document.getElementById('exCategory').value,
      sets: validSets.map(function (s) { return { reps: s.reps || '-', weight: s.weight || '0' }; }),
      notes: document.getElementById('exNotes').value.trim()
    });

    saveData();

    document.getElementById('exName').value = '';
    document.getElementById('exNotes').value = '';
    addSets = [];
    renderAddSets();
    showToast('✓ Ejercicio guardado');
  });

  /* ─── RENDER DE EJERCICIOS CARGADOS DESDE RUTINA ─── */
  function renderEjerciciosCargados() {
    var contenedor = document.getElementById('ejerciciosCargadosContainer');
    if (!contenedor) return;

    // Recargar data por si la rutina ya la modificó
    data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    var day = data[selectedDate];
    if (!day || !day.exercises || day.exercises.length === 0) {
      contenedor.innerHTML = '';
      return;
    }

    contenedor.innerHTML = '';

    day.exercises.forEach(function (ex, exIdx) {
      var lastRecord = getLastRecord(ex.name, data, selectedDate);

      var card = document.createElement('div');
      card.className = 'ejercicio-cargado-card';

      // Badge del último registro
      var lastRecordHtml = '';
      if (lastRecord) {
        var partes = lastRecord.date.split('-');
        var fechaFormateada = partes[2] + '/' + partes[1] + '/' + partes[0];
        var resumenSeries = lastRecord.sets.map(function (s, si) {
          return '<span class="ultimo-serie-chip">' +
            'S' + (si + 1) + ': <strong>' + (s.reps || '-') + '</strong> reps × <strong>' + (s.weight || '0') + 'kg</strong>' +
            '</span>';
        }).join('');

        lastRecordHtml =
          '<div class="ultimo-registro-banner">' +
          '<div class="ultimo-registro-label">📅 Último registro (' + fechaFormateada + ')</div>' +
          '<div class="ultimo-series-list">' + resumenSeries + '</div>' +
          '<button class="btn-copiar-ultimo" data-exidx="' + exIdx + '">⬇ Usar estos pesos</button>' +
          '</div>';
      } else {
        lastRecordHtml =
          '<div class="ultimo-registro-banner sin-registro">' +
          '<div class="ultimo-registro-label">Sin registros anteriores para este ejercicio</div>' +
          '</div>';
      }

      // Sets editables
      var setsHtml = '';
      ex.sets.forEach(function (set, si) {
        var isFirst = si === 0;
        var repeatBtn = isFirst ? '' :
          '<button class="btn-repeat-set-cargado" data-exidx="' + exIdx + '" data-sidx="' + si + '" title="Copiar serie anterior">↑ Repetir</button>';

        setsHtml +=
          '<div class="set-row' + (isFirst ? ' no-repeat' : '') + '" data-exidx="' + exIdx + '" data-sidx="' + si + '">' +
          '<span class="set-label">S' + (si + 1) + '</span>' +
          '<input type="number" placeholder="Reps" min="1" value="' + (set.reps !== '-' ? set.reps : '') + '" ' +
          'data-exidx="' + exIdx + '" data-sidx="' + si + '" data-field="reps"/>' +
          '<input type="number" placeholder="Peso kg" min="0" step="0.5" value="' + (set.weight !== '0' ? set.weight : '') + '" ' +
          'data-exidx="' + exIdx + '" data-sidx="' + si + '" data-field="weight"/>' +
          repeatBtn +
          '<button class="btn-remove-set btn-remove-set-cargado" data-exidx="' + exIdx + '" data-sidx="' + si + '" title="Eliminar serie">' + TRASH_SVG + '</button>' +
          '</div>';
      });

      card.innerHTML =
        '<div class="ejercicio-cargado-header">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<div class="exercise-name">' + ex.name + '</div>' +
        '<div class="exercise-category">' + ex.category + '</div>' +
        '</div>' +
        '</div>' +
        lastRecordHtml +
        '<div class="sets-builder ejercicio-sets-builder" id="setsBuilder_ex_' + exIdx + '">' +
        setsHtml +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px">' +
        '<button class="btn-add-set btn-add-set-cargado" data-exidx="' + exIdx + '" style="flex:1">+ Añadir serie</button>' +
        '<button class="btn btn-sm btn-danger btn-eliminar-ejercicio-cargado" data-exidx="' + exIdx + '" style="margin-top:4px">Eliminar</button>' +
        '</div>';

      contenedor.appendChild(card);
    });

    // Bind eventos inputs
    contenedor.querySelectorAll('input[data-exidx]').forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        var ei = parseInt(e.target.dataset.exidx);
        var si = parseInt(e.target.dataset.sidx);
        data[selectedDate].exercises[ei].sets[si][e.target.dataset.field] = e.target.value;
        saveData();
      });
    });

    // Bind: eliminar serie
    contenedor.querySelectorAll('.btn-remove-set-cargado').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var ei = parseInt(e.currentTarget.dataset.exidx);
        var si = parseInt(e.currentTarget.dataset.sidx);
        data[selectedDate].exercises[ei].sets.splice(si, 1);
        saveData();
        renderEjerciciosCargados();
      });
    });

    // Bind: repetir serie anterior
    contenedor.querySelectorAll('.btn-repeat-set-cargado').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var ei = parseInt(e.currentTarget.dataset.exidx);
        var si = parseInt(e.currentTarget.dataset.sidx);
        var sets = data[selectedDate].exercises[ei].sets;
        var prev = sets[si - 1];
        if (prev) {
          sets[si] = { reps: prev.reps, weight: prev.weight };
          saveData();
          renderEjerciciosCargados();
        }
      });
    });

    // Bind: añadir serie a ejercicio cargado
    contenedor.querySelectorAll('.btn-add-set-cargado').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var ei = parseInt(e.currentTarget.dataset.exidx);
        data[selectedDate].exercises[ei].sets.push({ reps: '', weight: '' });
        saveData();
        renderEjerciciosCargados();
      });
    });

    // Bind: copiar último registro
    contenedor.querySelectorAll('.btn-copiar-ultimo').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var ei = parseInt(e.currentTarget.dataset.exidx);
        var exName = data[selectedDate].exercises[ei].name;
        var lastRecord = getLastRecord(exName, data, selectedDate);
        if (!lastRecord) return;
        data[selectedDate].exercises[ei].sets = lastRecord.sets.map(function (s) {
          return { reps: s.reps, weight: s.weight };
        });
        saveData();
        renderEjerciciosCargados();
        showToast('✓ Pesos del último entrenamiento cargados');
      });
    });

    // Bind: eliminar ejercicio completo
    contenedor.querySelectorAll('.btn-eliminar-ejercicio-cargado').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var ei = parseInt(e.currentTarget.dataset.exidx);
        var nombre = data[selectedDate].exercises[ei].name;
        if (!confirm('¿Eliminar ' + nombre + ' de este entrenamiento?')) return;
        data[selectedDate].exercises.splice(ei, 1);
        if (data[selectedDate].exercises.length === 0) data[selectedDate].trained = false;
        saveData();
        renderEjerciciosCargados();
        showToast('Ejercicio eliminado');
      });
    });
  }

  // Exponer para que registrarEntrenamiento.html la llame después de cargar rutina
  window._renderEjerciciosCargados = renderEjerciciosCargados;

  renderAddSets();

  // Si ya hay ejercicios cargados (por rutina pre-cargada), mostrarlos
  if (selectedDate && data[selectedDate] && data[selectedDate].exercises && data[selectedDate].exercises.length > 0) {
    renderEjerciciosCargados();
  }
});