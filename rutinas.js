document.addEventListener('DOMContentLoaded', function () {

  var TRASH_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="3 6 5 6 21 6"/>' +
    '<path d="M19 6l-1 14H6L5 6"/>' +
    '<path d="M10 11v6"/>' +
    '<path d="M14 11v6"/>' +
    '<path d="M9 6V4h6v2"/>' +
    '</svg>';

  var LINK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>' +
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>' +
    '</svg>';

  var RUTINAS_KEY = 'savetraining_rutinas';
  var rutinas = JSON.parse(localStorage.getItem(RUTINAS_KEY) || '[]');
  var ejerciciosActuales = [];
  // gruposSuperserie: array de arrays de índices agrupados
  // ej: [[0,1], [2], [3,4]] => ej 0 y 1 son superserie, ej 2 solo, ej 3 y 4 superserie
  var gruposSuperserie = [];
  var editandoIdx = null;

  function saveRutinas() {
    localStorage.setItem(RUTINAS_KEY, JSON.stringify(rutinas));
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ─── Calcular grupos desde ejerciciosActuales ─── */
  function recalcularGrupos() {
    // Reconstruir grupos: cada ejercicio que no tenga superserieGrupo asignado
    // va solo. Mantener grupos existentes, limpiar índices fuera de rango.
    var n = ejerciciosActuales.length;
    var asignado = new Array(n).fill(false);
    var nuevosGrupos = [];

    gruposSuperserie.forEach(function (grupo) {
      var valid = grupo.filter(function (i) { return i < n; });
      if (valid.length > 0) {
        valid.forEach(function (i) { asignado[i] = true; });
        nuevosGrupos.push(valid);
      }
    });

    // Los no asignados van solos, en su posición original
    for (var i = 0; i < n; i++) {
      if (!asignado[i]) {
        // Insertar en posición correcta
        var insertPos = nuevosGrupos.findIndex(function (g) { return g[0] > i; });
        if (insertPos === -1) {
          nuevosGrupos.push([i]);
        } else {
          nuevosGrupos.splice(insertPos, 0, [i]);
        }
      }
    }
    gruposSuperserie = nuevosGrupos;
  }

  /* ─── Mover ejercicio a la misma superserie que el anterior ─── */
  function toggleSuperserie(ejIdx) {
    recalcularGrupos();
    // ¿En qué grupo está este ejercicio?
    var grupoActual = gruposSuperserie.findIndex(function (g) { return g.indexOf(ejIdx) !== -1; });
    var grupoAnterior = gruposSuperserie.findIndex(function (g) { return g.indexOf(ejIdx - 1) !== -1; });

    if (grupoActual === -1 || grupoAnterior === -1) return;

    if (grupoActual === grupoAnterior) {
      // Ya está agrupado: desagrupar — sacarlo a su propio grupo
      gruposSuperserie[grupoActual] = gruposSuperserie[grupoActual].filter(function (i) { return i !== ejIdx; });
      // Insertar como grupo propio después del grupo anterior
      gruposSuperserie.splice(grupoActual + 1, 0, [ejIdx]);
    } else {
      // Agrupar con el anterior: mover este ejercicio al grupo anterior
      gruposSuperserie[grupoActual] = gruposSuperserie[grupoActual].filter(function (i) { return i !== ejIdx; });
      if (gruposSuperserie[grupoActual].length === 0) {
        gruposSuperserie.splice(grupoActual, 1);
      }
      // Encontrar de nuevo el grupo anterior (índice puede haber cambiado)
      var gAnterior = gruposSuperserie.findIndex(function (g) { return g.indexOf(ejIdx - 1) !== -1; });
      if (gAnterior !== -1) gruposSuperserie[gAnterior].push(ejIdx);
    }
    renderEjerciciosBuilder();
  }

  /* ─── Sets builder ─── */
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

  /* ─── Render principal del builder ─── */
  function renderEjerciciosBuilder() {
    recalcularGrupos();
    var container = document.getElementById('ejerciciosRutina');
    container.innerHTML = '';

    // Renderizar por grupos para mostrar el conector visual de superserie
    gruposSuperserie.forEach(function (grupo) {
      var esSuperserie = grupo.length > 1;

      if (esSuperserie) {
        // Wrapper visual de superserie
        var wrapper = document.createElement('div');
        wrapper.className = 'superserie-wrapper';
        wrapper.innerHTML = '<div class="superserie-label">' + LINK_SVG + ' SUPERSERIE</div>';

        grupo.forEach(function (i, posEnGrupo) {
          wrapper.appendChild(buildEjercicioRow(i, posEnGrupo > 0, true));
        });
        container.appendChild(wrapper);
      } else {
        var i = grupo[0];
        container.appendChild(buildEjercicioRow(i, false, false));
      }
    });
  }

  function buildEjercicioRow(i, estaAgrupado, dentroDeSuperserie) {
    var row = document.createElement('div');
    row.className = 'ejercicio-builder-row' + (dentroDeSuperserie ? ' en-superserie' : '');
    row.dataset.idx = i;

    var canAgrupar = i > 0;
    var btnSuperserieHtml = '';
    if (canAgrupar) {
      var yaAgrupado = estaAgrupado; // si ya está en el mismo grupo que el anterior
      btnSuperserieHtml =
        '<button class="btn-superserie' + (yaAgrupado ? ' activo' : '') + '" data-idx="' + i + '" title="' + (yaAgrupado ? 'Desagrupar superserie' : 'Agrupar con ejercicio anterior como superserie') + '">' +
        LINK_SVG +
        '<span>' + (yaAgrupado ? 'Desagrupar' : 'Superserie con anterior') + '</span>' +
        '</button>';
    }

    row.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<span style="font-size:12px;color:var(--text-muted);font-weight:600">EJERCICIO ' + (i + 1) + '</span>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
      btnSuperserieHtml +
      '<button class="btn-remove-set btn-danger btn-sm btn-eliminar-ej" data-idx="' + i + '" title="Eliminar ejercicio">' + TRASH_SVG + '</button>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Nombre</label>' +
      '<input type="text" placeholder="Ej: Press banca..." value="' + (ejerciciosActuales[i].name || '') + '" data-idx="' + i + '" data-field="name"/>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Categoría</label>' +
      '<select data-idx="' + i + '" data-field="category">' +
      ['Pecho','Espalda','Piernas','Hombros','Bíceps','Tríceps','Core','Cardio','Otro'].map(function (c) {
        return '<option value="' + c + '"' + (ejerciciosActuales[i].category === c ? ' selected' : '') + '>' + c + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Series de referencia (opcional)</label>' +
      '<div class="sets-builder" id="setsBuilder' + i + '"></div>' +
      '<button class="btn-add-set btn-add-set-ej" data-ejidx="' + i + '">+ Añadir serie</button>' +
      '</div>';

    // Bind eventos
    row.querySelectorAll('input[data-field], select[data-field]').forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        ejerciciosActuales[parseInt(e.target.dataset.idx)][e.target.dataset.field] = e.target.value;
      });
    });

    row.querySelectorAll('.btn-superserie').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        toggleSuperserie(parseInt(e.currentTarget.dataset.idx));
      });
    });

    row.querySelectorAll('.btn-eliminar-ej').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var idx = parseInt(e.currentTarget.dataset.idx);
        ejerciciosActuales.splice(idx, 1);
        // Reconstruir grupos eliminando el índice y decrementando los mayores
        gruposSuperserie = gruposSuperserie.map(function (g) {
          return g.filter(function (gi) { return gi !== idx; }).map(function (gi) { return gi > idx ? gi - 1 : gi; });
        }).filter(function (g) { return g.length > 0; });
        renderEjerciciosBuilder();
      });
    });

    row.querySelectorAll('.btn-add-set-ej').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var idx = parseInt(e.currentTarget.dataset.ejidx);
        ejerciciosActuales[idx].sets.push({ reps: '', weight: '' });
        renderEjerciciosBuilder();
      });
    });

    // Render sets después de insertar en DOM (en siguiente tick)
    setTimeout(function () { renderSetsDeEjercicio(i); }, 0);

    return row;
  }

  document.getElementById('addEjercicioBtn').addEventListener('click', function () {
    ejerciciosActuales.push({ name: '', category: 'Pecho', sets: [] });
    recalcularGrupos();
    renderEjerciciosBuilder();
  });

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
    gruposSuperserie = [];
    renderEjerciciosBuilder();
    setFormMode('create', null);
  }

  document.getElementById('cancelEditBtn').addEventListener('click', function () { resetForm(); });

  document.getElementById('saveRutinaBtn').addEventListener('click', function () {
    var name = document.getElementById('rutinaName').value.trim();
    if (!name) { showToast('⚠ Ingresá el nombre de la rutina'); return; }
    if (ejerciciosActuales.length === 0) { showToast('⚠ Añadí al menos un ejercicio'); return; }

    recalcularGrupos();
    var rutina = {
      name: name,
      ejercicios: JSON.parse(JSON.stringify(ejerciciosActuales)),
      grupos: JSON.parse(JSON.stringify(gruposSuperserie))
    };

    if (editandoIdx !== null) {
      rutinas[editandoIdx] = rutina;
      saveRutinas();
      resetForm();
      renderRutinas();
      showToast('✓ Rutina actualizada');
    } else {
      rutinas.push(rutina);
      saveRutinas();
      resetForm();
      renderRutinas();
      showToast('✓ Rutina guardada');
    }
  });

  /* ─── Render lista de rutinas guardadas ─── */
  function renderRutinas() {
    var container = document.getElementById('rutinasList');
    container.innerHTML = '';

    if (rutinas.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No hay rutinas creadas todavía.</p></div>';
      return;
    }

    rutinas.forEach(function (rutina, ri) {
      var grupos = rutina.grupos || rutina.ejercicios.map(function (_, i) { return [i]; });
      var nGrupos = grupos.length;
      var nSuperseries = grupos.filter(function (g) { return g.length > 1; }).length;

      var card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '12px';
      card.style.cursor = 'pointer';

      var metaHtml = '<span style="font-size:12px;color:var(--text-muted)">📌 <strong style="color:var(--accent)">' + rutina.ejercicios.length + '</strong> ejercicios';
      if (nSuperseries > 0) metaHtml += ' · ' + LINK_SVG + ' <strong style="color:var(--accent)">' + nSuperseries + '</strong> superserie' + (nSuperseries > 1 ? 's' : '');
      metaHtml += '</span>';

      card.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div class="section-title" style="margin-bottom:0">' + rutina.name + '</div>' +
        '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-sm btn-edit" id="btn-edit-rutina-' + ri + '">Editar</button>' +
        '<button class="btn btn-sm btn-danger" id="btn-del-rutina-' + ri + '">' + TRASH_SVG + '</button>' +
        '</div>' +
        '</div>' +
        '<div style="margin-top:8px">' + metaHtml + '</div>';

      container.appendChild(card);

      // Toggle detalle
      card.addEventListener('click', function () {
        var detalle = card.querySelector('.detalle-rutina');
        if (detalle) { detalle.remove(); return; }

        var grupos = rutina.grupos || rutina.ejercicios.map(function (_, i) { return [i]; });
        var ejHtml = grupos.map(function (grupo) {
          var esSuper = grupo.length > 1;
          var innerHtml = grupo.map(function (ejIdx) {
            var ej = rutina.ejercicios[ejIdx];
            var setsHtml = (ej.sets || []).map(function (s, si) {
              return '<div class="set-chip"><div class="set-num">S' + (si+1) + '</div>' +
                '<div class="set-data"><span>' + (s.reps || '-') + '</span> reps <span>' + (s.weight || '0') + 'kg</span></div></div>';
            }).join('');
            return '<div class="exercise-item" style="margin-bottom:6px">' +
              '<div class="exercise-item-header">' +
              '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
              '<div class="exercise-name">' + ej.name + '</div>' +
              '<div class="exercise-category">' + ej.category + '</div>' +
              '</div></div>' +
              (setsHtml ? '<div class="sets-grid" style="margin-top:8px">' + setsHtml + '</div>' : '') +
              '</div>';
          }).join('');

          if (esSuper) {
            return '<div class="superserie-wrapper" style="margin-bottom:8px"><div class="superserie-label">' + LINK_SVG + ' SUPERSERIE</div>' + innerHtml + '</div>';
          }
          return innerHtml;
        }).join('');

        var detalle = document.createElement('div');
        detalle.className = 'detalle-rutina';
        detalle.style.marginTop = '16px';
        detalle.innerHTML = '<div class="exercise-list">' + ejHtml + '</div>';
        card.appendChild(detalle);
      });

      document.getElementById('btn-edit-rutina-' + ri).addEventListener('click', function (e) {
        e.stopPropagation();
        var r = rutinas[ri];
        document.getElementById('rutinaName').value = r.name;
        ejerciciosActuales = JSON.parse(JSON.stringify(r.ejercicios));
        gruposSuperserie = JSON.parse(JSON.stringify(r.grupos || r.ejercicios.map(function (_, i) { return [i]; })));
        renderEjerciciosBuilder();
        setFormMode('edit', ri);
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