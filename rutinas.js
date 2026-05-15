document.addEventListener('DOMContentLoaded', function () {

  var TRASH_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="3 6 5 6 21 6"/>' +
    '<path d="M19 6l-1 14H6L5 6"/>' +
    '<path d="M10 11v6"/>' +
    '<path d="M14 11v6"/>' +
    '<path d="M9 6V4h6v2"/>' +
    '</svg>';

  var RUTINAS_KEY = 'savetraining_rutinas';
  var rutinas = JSON.parse(localStorage.getItem(RUTINAS_KEY) || '[]');
  var ejerciciosActuales = [];
  var editandoIdx = null; // null = crear, número = editar

  function saveRutinas() {
    localStorage.setItem(RUTINAS_KEY, JSON.stringify(rutinas));
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function buildSetRow(set, ejIdx, si, isFirst) {
    var row = document.createElement('div');
    row.className = 'set-row' + (isFirst ? ' no-repeat' : '');
    var repeatHtml = isFirst ? '' :
      '<button class="btn-repeat-set" data-ejidx="' + ejIdx + '" data-sidx="' + si + '" title="Repetir serie anterior">↑ Repetir</button>';
    row.innerHTML =
      '<span class="set-label">S' + (si + 1) + '</span>' +
      '<input type="number" placeholder="Reps" min="1" value="' + (set.reps || '') + '" data-ejidx="' + ejIdx + '" data-sidx="' + si + '" data-field="reps"/>' +
      '<input type="number" placeholder="Peso kg" min="0" step="0.5" value="' + (set.weight || '') + '" data-ejidx="' + ejIdx + '" data-sidx="' + si + '" data-field="weight"/>' +
      repeatHtml +
      '<button class="btn-remove-set" data-ejidx="' + ejIdx + '" data-sidx="' + si + '" title="Eliminar serie">' + TRASH_SVG + '</button>';
    return row;
  }

  function renderSetsDeEjercicio(ejIdx) {
    var container = document.getElementById('setsBuilder' + ejIdx);
    if (!container) return;
    container.innerHTML = '';
    var sets = ejerciciosActuales[ejIdx].sets || [];
    sets.forEach(function (set, si) {
      container.appendChild(buildSetRow(set, ejIdx, si, si === 0));
    });

    container.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        var ei = parseInt(e.target.dataset.ejidx);
        var si = parseInt(e.target.dataset.sidx);
        ejerciciosActuales[ei].sets[si][e.target.dataset.field] = e.target.value;
      });
    });

    container.querySelectorAll('.btn-remove-set').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var ei = parseInt(e.currentTarget.dataset.ejidx);
        var si = parseInt(e.currentTarget.dataset.sidx);
        ejerciciosActuales[ei].sets.splice(si, 1);
        renderSetsDeEjercicio(ei);
      });
    });

    container.querySelectorAll('.btn-repeat-set').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var ei = parseInt(e.currentTarget.dataset.ejidx);
        var si = parseInt(e.currentTarget.dataset.sidx);
        var prev = ejerciciosActuales[ei].sets[si - 1];
        if (prev) {
          ejerciciosActuales[ei].sets[si] = { reps: prev.reps, weight: prev.weight };
          renderSetsDeEjercicio(ei);
        }
      });
    });
  }

  function renderEjerciciosBuilder() {
    var container = document.getElementById('ejerciciosRutina');
    container.innerHTML = '';

    ejerciciosActuales.forEach(function (ej, i) {
      var row = document.createElement('div');
      row.style.cssText = 'background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px';
      row.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<span style="font-size:12px;color:var(--text-muted);font-weight:600">EJERCICIO ' + (i + 1) + '</span>' +
        '<button class="btn-remove-set btn-danger btn-sm" data-idx="' + i + '" title="Eliminar ejercicio">' + TRASH_SVG + '</button>' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Nombre</label>' +
        '<input type="text" placeholder="Ej: Press banca..." value="' + (ej.name || '') + '" data-idx="' + i + '" data-field="name"/>' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Categoría</label>' +
        '<select data-idx="' + i + '" data-field="category">' +
        ['Pecho','Espalda','Piernas','Hombros','Bíceps','Tríceps','Core','Cardio','Otro'].map(function (c) {
          return '<option value="' + c + '"' + (ej.category === c ? ' selected' : '') + '>' + c + '</option>';
        }).join('') +
        '</select>' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Series</label>' +
        '<div class="sets-builder" id="setsBuilder' + i + '"></div>' +
        '<button class="btn-add-set" data-ejidx="' + i + '">+ Añadir serie</button>' +
        '</div>';

      container.appendChild(row);
      renderSetsDeEjercicio(i);

      row.querySelectorAll('input[data-field], select[data-field]').forEach(function (inp) {
        inp.addEventListener('input', function (e) {
          ejerciciosActuales[parseInt(e.target.dataset.idx)][e.target.dataset.field] = e.target.value;
        });
      });

      row.querySelectorAll('.btn-add-set[data-ejidx]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          var idx = parseInt(e.target.dataset.ejidx);
          ejerciciosActuales[idx].sets.push({ reps: '', weight: '' });
          renderEjerciciosBuilder();
        });
      });

      row.querySelectorAll('.btn-remove-set[data-idx]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          ejerciciosActuales.splice(parseInt(e.currentTarget.dataset.idx), 1);
          renderEjerciciosBuilder();
        });
      });
    });
  }

  document.getElementById('addEjercicioBtn').addEventListener('click', function () {
    ejerciciosActuales.push({ name: '', category: 'Pecho', sets: [] });
    renderEjerciciosBuilder();
  });

  // Actualizar título del formulario y botón según modo
  function setFormMode(mode, idx) {
    var title = document.getElementById('formTitle');
    var btn = document.getElementById('saveRutinaBtn');
    var cancelBtn = document.getElementById('cancelEditBtn');
    if (mode === 'edit') {
      editandoIdx = idx;
      title.textContent = 'Editar Rutina';
      btn.textContent = 'GUARDAR CAMBIOS';
      cancelBtn.style.display = 'block';
    } else {
      editandoIdx = null;
      title.textContent = 'Crear Rutina';
      btn.textContent = 'GUARDAR RUTINA';
      cancelBtn.style.display = 'none';
    }
  }

  function resetForm() {
    document.getElementById('rutinaName').value = '';
    ejerciciosActuales = [];
    renderEjerciciosBuilder();
    setFormMode('create', null);
  }

  document.getElementById('cancelEditBtn').addEventListener('click', function () {
    resetForm();
  });

  document.getElementById('saveRutinaBtn').addEventListener('click', function () {
    var name = document.getElementById('rutinaName').value.trim();
    if (!name) { showToast('⚠ Ingresá el nombre de la rutina'); return; }
    if (ejerciciosActuales.length === 0) { showToast('⚠ Añadí al menos un ejercicio'); return; }

    if (editandoIdx !== null) {
      // Editar rutina existente
      rutinas[editandoIdx] = { name: name, ejercicios: JSON.parse(JSON.stringify(ejerciciosActuales)) };
      saveRutinas();
      resetForm();
      renderRutinas();
      showToast('✓ Rutina actualizada');
    } else {
      // Crear nueva
      rutinas.push({ name: name, ejercicios: JSON.parse(JSON.stringify(ejerciciosActuales)) });
      saveRutinas();
      resetForm();
      renderRutinas();
      showToast('✓ Rutina guardada');
    }
  });

  function renderRutinas() {
    var container = document.getElementById('rutinasList');
    container.innerHTML = '';

    if (rutinas.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><div class="empty-icon">📋</div><p>No hay rutinas creadas todavía.</p></div>';
      return;
    }

    rutinas.forEach(function (rutina, ri) {
      var card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '12px';
      card.style.cursor = 'pointer';

      card.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div class="section-title" style="margin-bottom:0">' + rutina.name + '</div>' +
        '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-sm btn-edit" id="btn-edit-rutina-' + ri + '" title="Editar rutina">Editar</button>' +
        '<button class="btn btn-sm btn-danger" id="btn-del-rutina-' + ri + '" title="Eliminar rutina">' + TRASH_SVG + '</button>' +
        '</div>' +
        '</div>';

      container.appendChild(card);

      card.addEventListener('click', function () {
        var detalle = card.querySelector('.detalle-rutina');
        if (detalle) { detalle.remove(); return; }

        var ejHtml = rutina.ejercicios.map(function (ej) {
          var setsHtml = ej.sets.map(function (s, si) {
            return '<div class="set-chip">' +
              '<div class="set-num">Serie ' + (si + 1) + '</div>' +
              '<div class="set-data"><span>' + (s.reps || '-') + '</span> reps <span>' + (s.weight || '0') + 'kg</span></div>' +
              '</div>';
          }).join('');
          return '<div class="exercise-item" style="margin-bottom:8px">' +
            '<div class="exercise-item-header">' +
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<div class="exercise-name">' + ej.name + '</div>' +
            '<div class="exercise-category">' + ej.category + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="sets-grid">' + setsHtml + '</div>' +
            '</div>';
        }).join('');

        var detalle = document.createElement('div');
        detalle.className = 'detalle-rutina';
        detalle.style.marginTop = '16px';
        detalle.innerHTML = '<div class="exercise-list">' + ejHtml + '</div>';
        card.appendChild(detalle);
      });

      document.getElementById('btn-edit-rutina-' + ri).addEventListener('click', function (e) {
        e.stopPropagation();
        // Cargar datos en el formulario
        var r = rutinas[ri];
        document.getElementById('rutinaName').value = r.name;
        ejerciciosActuales = JSON.parse(JSON.stringify(r.ejercicios));
        renderEjerciciosBuilder();
        setFormMode('edit', ri);
        // Scroll al formulario
        document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
      });

      document.getElementById('btn-del-rutina-' + ri).addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm('¿Eliminar la rutina "' + rutina.name + '"?')) return;
        rutinas.splice(ri, 1);
        saveRutinas();
        if (editandoIdx === ri) resetForm();
        renderRutinas();
        showToast('Rutina eliminada');
      });
    });
  }

  setFormMode('create', null);
  renderRutinas();
});