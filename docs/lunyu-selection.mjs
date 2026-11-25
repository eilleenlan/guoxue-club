const selections = new Map();

function selectionKey(academicYear, grade) {
  return `${academicYear}:${grade}`;
}

export function selectedLunyuChildren(collection, academicYear, grade) {
  const selected = selections.get(selectionKey(academicYear, grade));
  if (collection.id !== 'lunyu' || !selected) return collection.children;
  return collection.children.filter(child => selected.has(child.id));
}

export function renderLunyuSelection(collection, academicYear, grade, onChange) {
  const previous = document.getElementById('lunyu-selection');
  const wasOpen = previous?.open ?? false;
  previous?.remove();
  if (collection?.id !== 'lunyu' || !['3', '5'].includes(String(grade))) return;

  const key = selectionKey(academicYear, grade);
  const children = selectedLunyuChildren(collection, academicYear, grade);
  const selected = new Set(children.map(child => child.id));
  const details = document.createElement('details');
  details.id = 'lunyu-selection';
  details.className = 'lunyu-selection';
  details.open = wasOpen;
  const summary = document.createElement('summary');
  summary.textContent = `自選章句 · 已選 ${children.length}／${collection.children.length} 則`;
  details.append(summary);

  const actions = document.createElement('div');
  actions.className = 'lunyu-selection-actions';
  for (const [label, ids] of [
    ['全選章句', collection.children.map(child => child.id)],
    ['清除選取', []]
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.onclick = () => {
      selections.set(key, new Set(ids));
      onChange();
    };
    actions.append(button);
  }
  details.append(actions);

  const choices = document.createElement('div');
  choices.className = 'lunyu-selection-choices';
  for (const child of collection.children) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = selected.has(child.id);
    input.onchange = () => {
      if (input.checked) selected.add(child.id);
      else selected.delete(child.id);
      selections.set(key, selected);
      onChange();
      document.getElementById(`lunyu-choice-${child.id}`)?.focus();
    };
    input.id = `lunyu-choice-${child.id}`;
    label.append(input, document.createTextNode(child.title));
    choices.append(label);
  }
  details.append(choices);
  const catalog = document.getElementById('catalog-picker') ?? document.getElementById('catalog');
  catalog.before(details);
}
