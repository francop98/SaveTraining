document.addEventListener('DOMContentLoaded', function () {

  var STORAGE_KEY = 'savetraining_v1';
  var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

  var params = new URLSearchParams(window.location.search);
  var selectedDate = params.get('date');

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
    setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

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

  document.getElementById('saveExBtn').addEventListener('click', function () {
    var name = document.getElementById('exName').value.trim();
    if (!name) { showToast('⚠️ Ingresá el nombre del ejercicio'); return; }
    if (!selectedDate) { showToast('⚠️ No se encontró la fecha'); return; }

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

    document.getElementById('exName').value  = '';
    document.getElementById('exNotes').value = '';
    addSets = [];
    renderAddSets();

    showToast('✓ Ejercicio guardado');
  });

  renderAddSets();
});