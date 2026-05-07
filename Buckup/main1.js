document.addEventListener("DOMContentLoaded", () => {
const STORAGE_KEY = 'workout_tracker_data';
let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

let currentDate = new Date();
let viewYear = currentDate.getFullYear();
let viewMonth = currentDate.getMonth();
let selectedDate = formatDate(currentDate);
let editTarget = null;
let editSets = [];
let addSets = [{ reps: '', weight: '' }];

function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseDate(str) {
    const [y,m,d] = str.split('-').map(Number);
    return new Date(y, m-1, d);
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDay(dateKey) {
    if (!data[dateKey]) data[dateKey] = { trained: false, exercises: [] };
    return data[dateKey];
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
}

function formatDateLabel(dateKey) {
    const d = parseDate(dateKey);
    return d.toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function renderCalendar() {
    document.getElementById('calMonth').textContent = `${MONTHS[viewMonth]} ${viewYear}`;
    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';

    DAYS.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-name';
    el.textContent = d;
    grid.appendChild(el);
    });

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
    const todayStr = formatDate(currentDate);

    for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el = document.createElement('div');
    el.className = 'cal-day';
    el.textContent = d;

    if (dateKey === todayStr) el.classList.add('today');
    if (dateKey === selectedDate) el.classList.add('selected');
    if (data[dateKey]?.trained) el.classList.add('trained');

    el.addEventListener('click', () => selectDate(dateKey));
    grid.appendChild(el);
    }
}

function selectDate(dateKey) {
    selectedDate = dateKey;
    renderCalendar();
    renderExerciseList();
    renderStats();

    const label = document.getElementById('selectedDateLabel');
    const formatted = formatDateLabel(dateKey);
    label.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    const badge = document.getElementById('trainedBadge');
    badge.style.display = data[dateKey]?.trained ? 'block' : 'none';
}

document.getElementById('prevMonth').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
});

function renderSetsBuilder(containerId, sets) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    sets.forEach((set, i) => {
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
        <span class="set-label">S${i+1}</span>
        <input type="number" placeholder="Reps" min="1" value="${set.reps}" data-idx="${i}" data-field="reps" style="padding:8px 10px;font-size:13px"/>
        <input type="number" placeholder="Peso (kg)" min="0" step="0.5" value="${set.weight}" data-idx="${i}" data-field="weight" style="padding:8px 10px;font-size:13px"/>
        <button class="btn-remove-set" data-idx="${i}" title="Eliminar">✕</button>
    `;
    container.appendChild(row);
    });

    container.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', e => {
        const idx = +e.target.dataset.idx;
        const field = e.target.dataset.field;
        sets[idx][field] = e.target.value;
    });
    });

    container.querySelectorAll('.btn-remove-set').forEach(btn => {
    btn.addEventListener('click', e => {
        const idx = +e.target.dataset.idx;
        sets.splice(idx, 1);
        if (sets.length === 0) sets.push({ reps:'', weight:'' });
        renderSetsBuilder(containerId, sets);
    });
    });
}

document.getElementById('addSetBtn').addEventListener('click', () => {
    addSets.push({ reps:'', weight:'' });
    renderSetsBuilder('setsBuilder', addSets);
});

document.getElementById('editAddSetBtn').addEventListener('click', () => {
    editSets.push({ reps:'', weight:'' });
    renderSetsBuilder('editSetsBuilder', editSets);
});

document.getElementById('saveExBtn').addEventListener('click', () => {
    const name = document.getElementById('exName').value.trim();
    if (!name) { showToast('⚠️ Ingresa el nombre del ejercicio'); return; }
    if (!selectedDate) { showToast('⚠️ Selecciona un día primero'); return; }

    const validSets = addSets.filter(s => s.reps || s.weight);
    if (validSets.length === 0) { showToast('⚠️ Añade al menos una serie'); return; }

    const day = getDay(selectedDate);
    day.trained = true;
    day.exercises.push({
    name,
    category: document.getElementById('exCategory').value,
    sets: validSets.map(s => ({ reps: s.reps || '—', weight: s.weight || '0' })),
    notes: document.getElementById('exNotes').value.trim()
    });

    saveData();
    renderCalendar();
    renderExerciseList();
    renderStats();
    updateTotalDays();

    document.getElementById('exName').value = '';
    document.getElementById('exNotes').value = '';
    addSets = [{ reps:'', weight:'' }];
    renderSetsBuilder('setsBuilder', addSets);

    document.getElementById('trainedBadge').style.display = 'block';
    showToast('✓ Ejercicio guardado');
});

function renderExerciseList() {
    const list = document.getElementById('exerciseList');
    const day = data[selectedDate];

    if (!day || !day.exercises || day.exercises.length === 0) {
    list.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🏋️</div>
        <p>No hay ejercicios registrados para este día.<br>Añade uno con el formulario.</p>
    </div>`;
    return;
    }

    list.innerHTML = '';
    day.exercises.forEach((ex, i) => {
    const item = document.createElement('div');
    item.className = 'exercise-item';
    const setsHtml = ex.sets.map((s, si) =>
        `<div class="set-chip">
        <div class="set-num">Serie ${si+1}</div>
        <div class="set-data"><span>${s.reps}</span> reps · <span>${s.weight}kg</span></div>
        </div>`
    ).join('');

    item.innerHTML = `
        <div class="exercise-item-header">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="exercise-name">${ex.name}</div>
            <div class="exercise-category">${ex.category}</div>
        </div>
        <div class="exercise-actions">
            <button class="btn btn-sm btn-edit" onclick="openEdit('${selectedDate}', ${i})">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="deleteExercise('${selectedDate}', ${i})">Eliminar</button>
        </div>
        </div>
        <div class="sets-grid">${setsHtml}</div>
        ${ex.notes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:10px">📝 ${ex.notes}</div>` : ''}
    `;
    list.appendChild(item);
    });
}

function deleteExercise(dateKey, idx) {
    if (!confirm('¿Eliminar este ejercicio?')) return;
    data[dateKey].exercises.splice(idx, 1);
    if (data[dateKey].exercises.length === 0) {
    data[dateKey].trained = false;
    document.getElementById('trainedBadge').style.display = 'none';
    }
    saveData();
    renderCalendar();
    renderExerciseList();
    renderStats();
    updateTotalDays();
    showToast('Ejercicio eliminado');
}

function openEdit(dateKey, idx) {
    editTarget = { dateKey, idx };
    const ex = data[dateKey].exercises[idx];
    document.getElementById('editName').value = ex.name;
    document.getElementById('editCategory').value = ex.category;
    document.getElementById('editNotes').value = ex.notes || '';
    editSets = ex.sets.map(s => ({ ...s }));
    renderSetsBuilder('editSetsBuilder', editSets);
    document.getElementById('editModal').classList.add('open');
}

document.getElementById('cancelEdit').addEventListener('click', () => {
    document.getElementById('editModal').classList.remove('open');
});

document.getElementById('editModal').addEventListener('click', e => {
    if (e.target === document.getElementById('editModal'))
    document.getElementById('editModal').classList.remove('open');
});

document.getElementById('confirmEdit').addEventListener('click', () => {
    const name = document.getElementById('editName').value.trim();
    if (!name) { showToast('⚠️ Ingresa el nombre'); return; }
    const validSets = editSets.filter(s => s.reps || s.weight);
    if (validSets.length === 0) { showToast('⚠️ Necesitas al menos una serie'); return; }

    const ex = data[editTarget.dateKey].exercises[editTarget.idx];
    ex.name = name;
    ex.category = document.getElementById('editCategory').value;
    ex.notes = document.getElementById('editNotes').value.trim();
    ex.sets = validSets.map(s => ({ reps: s.reps || '—', weight: s.weight || '0' }));

    saveData();
    renderExerciseList();
    renderStats();
    document.getElementById('editModal').classList.remove('open');
    showToast('✓ Ejercicio actualizado');
});

function renderStats() {
    const day = data[selectedDate];
    if (!day || !day.exercises || day.exercises.length === 0) {
    document.getElementById('statExercises').textContent = '0';
    document.getElementById('statSets').textContent = '0';
    document.getElementById('statWeight').textContent = '0kg';
    return;
    }
    const exercises = day.exercises;
    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const totalWeight = exercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s2, set) => s2 + (parseFloat(set.weight) || 0) * (parseFloat(set.reps) || 0), 0), 0);

    document.getElementById('statExercises').textContent = exercises.length;
    document.getElementById('statSets').textContent = totalSets;
    document.getElementById('statWeight').textContent = totalWeight.toLocaleString('es-AR') + 'kg';
}

function updateTotalDays() {
    const count = Object.values(data).filter(d => d.trained).length;
    document.getElementById('totalDays').textContent = count;
}

renderSetsBuilder('setsBuilder', addSets);
renderCalendar();
selectDate(selectedDate);
updateTotalDays();


});