document.addEventListener('DOMContentLoaded', function () {

  var RUTINAS_KEY = 'savetraining_rutinas';
  var rutinas = JSON.parse(localStorage.getItem(RUTINAS_KEY) || '[]');

  var ejerciciosActuales = [];

  function saveRutinas() {
    localStorage.setItem(RUTINAS_KEY, JSON.stringify(rutinas));
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function renderEjerciciosBuilder() {
    var container = document.getElementById('ejerciciosRutina');
    container.innerHTML = '';

    ejerciciosActuales.forEach(function (ej, i) {
      var row = document.createElement('div');
      row.style.cssText = 'background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px';
      row.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-size:12px;color:var(--text-muted);font-weight:600">EJERCICIO ' + (i+1) + '</span>' +
          '<button class="btn-remove-set" data-idx="' + i + '">✕</button>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Nombre</label>' +
          '<input type="text" placeholder="Ej: Press banca..." value="' + (ej.name || '') + '" data-idx="' + i + '" data-field="name"/>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Categoría</label>' +
          '<select data-idx="' + i + '" data-field="category">' +
            ['Pecho','Espalda','Piernas','Hombros','Bíceps','Tríceps','Core','Cardio','Otro'].map(function(c) {
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

      // Renderizar series del ejercicio
      renderSetsDeEjercicio(i);

      row.querySelectorAll('input[data-field], select[data-field]').forEach(function(inp) {
        inp.addEventListener('input', function(e) {
          ejerciciosActuales[parseInt(e.target.dataset.idx)][e.target.dataset.field] = e.target.value;
        });
      });

      row.querySelectorAll('.btn-add-set[data-ejidx]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          var idx = parseInt(e.target.dataset.ejidx);
          ejerciciosActuales[idx].sets.push({ reps: '', weight: '' });
          renderEjerciciosBuilder();
        });
      });

      row.querySelectorAll('.btn-remove-set[data-idx]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          ejerciciosActuales.splice(parseInt(e.target.dataset.idx), 1);
          renderEjerciciosBuilder();
        });
      });
    });
  }

  function renderSetsDeEjercicio(ejIdx) {
    var container = document.getElementById('setsBuilder' + ejIdx);
    if (!container) return;
    container.innerHTML = '';
    var sets = ejerciciosActuales[ejIdx].sets || [];

    sets.forEach(function(set, si) {
      var row = document.createElement('div');
      row.className = 'set-row';
      row.innerHTML =
        '<span class="set-label">S' + (si+1) + '</span>' +
        '<input type="number" placeholder="Reps" min="1" value="' + (set.reps || '') + '" data-ejidx="' + ejIdx + '" data-sidx="' + si + '" data-field="reps"/>' +
        '<input type="number" placeholder="Peso kg" min="0" step="0.5" value="' + (set.weight || '') + '" data-ejidx="' + ejIdx + '" data-sidx="' + si + '" data-field="weight"/>' +
        '<button class="btn-remove-set" data-ejidx="' + ejIdx + '" data-sidx="' + si + '">✕</button>';
      container.appendChild(row);
    });

    container.querySelectorAll('input').forEach(function(inp) {
      inp.addEventListener('input', function(e) {
        var ei = parseInt(e.target.dataset.ejidx);
        var si = parseInt(e.target.dataset.sidx);
        ejerciciosActuales[ei].sets[si][e.target.dataset.field] = e.target.value;
      });
    });

    container.querySelectorAll('.btn-remove-set').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        var ei = parseInt(e.target.dataset.ejidx);
        var si = parseInt(e.target.dataset.sidx);
        ejerciciosActuales[ei].sets.splice(si, 1);
        renderSetsDeEjercicio(ei);
      });
    });
  }

  document.getElementById('addEjercicioBtn').addEventListener('click', function() {
    ejerciciosActuales.push({ name: '', category: 'Pecho', sets: [] });
    renderEjerciciosBuilder();
  });

  document.getElementById('saveRutinaBtn').addEventListener('click', function() {
    var name = document.getElementById('rutinaName').value.trim();
    if (!name) { showToast('⚠️ Ingresá el nombre de la rutina'); return; }
    if (ejerciciosActuales.length === 0) { showToast('⚠️ Añadí al menos un ejercicio'); return; }

    rutinas.push({ name: name, ejercicios: ejerciciosActuales });
    saveRutinas();

    document.getElementById('rutinaName').value = '';
    ejerciciosActuales = [];
    renderEjerciciosBuilder();
    renderRutinas();
    showToast('✓ Rutina guardada');
  });

  function renderRutinas() {
    var container = document.getElementById('rutinasList');
    container.innerHTML = '';

    if (rutinas.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No hay rutinas creadas todavía.</p></div>';
      return;
    }

    rutinas.forEach(function(rutina, ri) {
      var card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '12px';
      card.style.cursor = 'pointer';

      card.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div class="section-title" style="margin-bottom:0">' + rutina.name + '</div>' +
        '<button class="btn btn-sm btn-danger" id="btn-del-rutina-' + ri + '">Eliminar</button>' +
        '</div>';

      container.appendChild(card);

      card.addEventListener('click', function() {
        var detalle = card.querySelector('.detalle-rutina');
        if (detalle) {
          detalle.remove();
          return;
        }

        var ejHtml = rutina.ejercicios.map(function(ej) {
          var setsHtml = ej.sets.map(function(s, si) {
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

      document.getElementById('btn-del-rutina-' + ri).addEventListener('click', function(e) {
        e.stopPropagation();
        if (!confirm('¿Eliminar la rutina "' + rutina.name + '"?')) return;
        rutinas.splice(ri, 1);
        saveRutinas();
        renderRutinas();
        showToast('Rutina eliminada');
      });
    });
  }

  renderRutinas();
});