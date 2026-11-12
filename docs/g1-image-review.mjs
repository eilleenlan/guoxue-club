const secondBatch = new URLSearchParams(location.search).get('batch') === '2';
const reviewNumbers = secondBatch ? Array.from({ length: 10 }, (_, i) => 121 + i) : [10, 15, 18, 22, 24, 33, 38, 41, 48, 67, 77, 80, 84, 86, 87, 91, 94, 96, 100, 103, 106, 113, 115, 116];
const labels = { pending: '尚未驗收', passed: '通過', 'needs-change': '需要修改' };
const storageKey = 'guoxue:g1-image-review:v1';
const byId = id => document.getElementById(id);
if (secondBatch) {
  document.title = 'G1 第二批題圖驗收｜小小國學所';
  document.querySelector('h1').textContent = 'G1 第二批題圖驗收';
}
const cards = [];
let records = {};

function readRecords() {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw Error('驗收紀錄格式不符');
  return saved;
}

function entry(question) {
  const record = records[question.id];
  if (record?.imagePath === question.imagePath && Object.hasOwn(labels, record.status)) return record;
  return { status: question.imageReview?.status === 'parent-approved' || !secondBatch ? 'passed' : 'pending', note: '' };
}

function refresh() {
  const groups = { pending: [], passed: [], 'needs-change': [] };
  const filter = byId('review-filter').value;
  let visible = 0;
  for (const { question, card, status, note, noteField } of cards) {
    const record = entry(question);
    status.value = record.status;
    if (note.value !== record.note) note.value = record.note;
    noteField.hidden = record.status !== 'needs-change';
    card.hidden = filter !== 'all' && filter !== record.status;
    if (!card.hidden) visible++;
    const title = '#' + question.sourceNumber + ' ' + question.word;
    const detail = record.status === 'needs-change' && record.note.trim() ? ' — ' + record.note.trim() : '';
    groups[record.status].push(title + detail);
  }
  const total = cards.length;
  const counts = '已通過 ' + groups.passed.length + '／' + total +
    '，需要修改 ' + groups['needs-change'].length + '，尚未驗收 ' + groups.pending.length;
  byId('review-progress').textContent = counts;
  byId('review-empty').hidden = visible !== 0;
  byId('review-summary').value = [
    secondBatch ? '小小國學所｜G1 第二批題圖驗收' : '小小國學所｜G1 題圖驗收', counts,
    ...['needs-change', 'pending', 'passed'].flatMap(status => [
      '', labels[status] + '（' + groups[status].length + '）', ...groups[status],
    ]),
  ].join('\n');
  byId('copy-status').textContent = '';
}

function save(question, status, note) {
  const error = byId('save-error');
  try {
    const next = readRecords();
    next[question.id] = { imagePath: question.imagePath, status, note };
    localStorage.setItem(storageKey, JSON.stringify(next));
    records = next;
    error.hidden = true;
  } catch {
    error.textContent = '無法儲存驗收紀錄，請確認瀏覽器允許本機儲存。';
    error.hidden = false;
  }
  refresh();
}

function createCard(question) {
  const card = document.createElement('article');
  card.className = 'review-card';
  const title = document.createElement('h2');
  title.textContent = '#' + question.sourceNumber + ' ' + question.word;

  const zoom = document.createElement('button');
  zoom.type = 'button';
  zoom.className = 'zoom';
  zoom.disabled = true;
  zoom.setAttribute('aria-label', '放大 ' + title.textContent);
  const img = new Image();
  img.alt = question.word;
  zoom.append(img);
  zoom.onclick = () => {
    byId('zoom-title').textContent = title.textContent;
    byId('zoom-image').src = img.src;
    byId('zoom-image').alt = img.alt;
    byId('image-dialog').showModal();
  };
  const imageError = document.createElement('p');
  imageError.hidden = true;

  const stateField = document.createElement('label');
  stateField.className = 'review-field';
  stateField.textContent = '驗收狀態';
  const status = document.createElement('select');
  status.setAttribute('aria-label', title.textContent + ' 驗收狀態');
  for (const [value, text] of Object.entries(labels)) status.add(new Option(text, value));
  stateField.append(status);

  const noteField = document.createElement('label');
  noteField.className = 'review-field';
  noteField.textContent = '修改備註';
  const note = document.createElement('textarea');
  note.rows = 2;
  note.maxLength = 300;
  note.setAttribute('aria-label', title.textContent + ' 修改備註');
  noteField.append(note);
  status.onchange = () => save(question, status.value, note.value);
  note.oninput = () => save(question, status.value, note.value);
  card.append(title, zoom, imageError, stateField, noteField);
  byId('review-grid').append(card);
  cards.push({ question, card, status, note, noteField });
  return { img, zoom, imageError, status };
}

async function loadImage(question, controls) {
  let url;
  try {
    const response = await fetch(question.imagePath);
    if (!response.ok) throw Error('圖片無法讀取');
    url = URL.createObjectURL(new Blob([await response.text()], { type: 'image/svg+xml' }));
    controls.img.src = url;
    await controls.img.decode();
    controls.zoom.disabled = false;
  } catch {
    if (url) URL.revokeObjectURL(url);
    controls.imageError.textContent = '這張題圖載入失敗，請重新整理。';
    controls.imageError.hidden = false;
    controls.status.disabled = true;
  }
}

byId('review-filter').onchange = refresh;
byId('copy-summary').onclick = async () => {
  const summary = byId('review-summary');
  try {
    await navigator.clipboard.writeText(summary.value);
    byId('copy-status').textContent = '已複製驗收摘要。';
  } catch {
    summary.focus();
    summary.select();
    byId('copy-status').textContent = '已選取摘要，可用瀏覽器的複製指令帶走。';
  }
};

try {
  const response = await fetch('./data/g1-sounds.json');
  if (!response.ok) throw Error('題庫無法讀取');
  const bank = await response.json();
  const questions = reviewNumbers.map(number => {
    const matches = bank.entries.filter(question => question.sourceNumber === number);
    if (matches.length !== 1 || matches[0].status !== 'READY' ||
        matches[0].promptType !== 'IMAGE' || !matches[0].word || !matches[0].imagePath) {
      throw Error('第 ' + number + ' 題缺少可驗收的題圖資料');
    }
    return matches[0];
  });
  try {
    records = readRecords();
  } catch {
    byId('save-error').textContent = '無法讀取本機驗收紀錄，請確認瀏覽器的儲存設定。';
    byId('save-error').hidden = false;
  }
  const loading = questions.map(question => loadImage(question, createCard(question)));
  refresh();
  byId('copy-summary').disabled = false;
  await Promise.all(loading);
} catch (error) {
  byId('review-progress').textContent = error.message;
}
