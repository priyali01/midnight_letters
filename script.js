const STORAGE_KEY = 'midnight-letters-v1';
const MEMORY_DB_NAME = 'midnight-letters-memories';
const MEMORY_STORE_NAME = 'photos';
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const prompts = [
  'What would you say if you knew you wouldn’t be interrupted?',
  'What are you still learning to forgive yourself for?',
  'Write about a version of you that deserves a little kindness.',
  'What do you wish someone had understood without you explaining?',
  'If you could leave one sentence in the past, what would it be?',
  'What are you ready to put down, even if only for tonight?',
  'Write a thank-you note to a moment you almost overlooked.',
  'What would hope sound like if it spoke in your own voice?'
];
const moodLines = {
  Longing: ['Some names stay warm long after the room goes cold.', 'You can miss a moment and still be glad it happened.', 'Distance is only a quiet kind of closeness.'],
  Healing: ['Slowly still counts as moving.', 'You are allowed to be unfinished and still deserve gentleness.', 'Tonight, rest is enough of an answer.'],
  Hope: ['Something small is already turning toward the light.', 'The next page is blank, and that is the good part.', 'Even this night carries the seed of morning.'],
  Unsent: ['Say it here. It has already done its work by being said.', 'Not every sentence needs a reader to matter.', 'Some letters are doors you only need to open, not walk through.']
};
const moodLine = document.querySelector('#mood-line');
const form = document.querySelector('#letter-form');
const titleInput = document.querySelector('#letter-title');
const bodyInput = document.querySelector('#letter-body');
const wordCount = document.querySelector('#word-count');
const formMessage = document.querySelector('#form-message');
const lettersGrid = document.querySelector('#letters-grid');
const savedCount = document.querySelector('#saved-count');
const letterSearch = document.querySelector('#letter-search');
const toast = document.querySelector('#toast');
const memoryPanel = document.querySelector('.memory-panel');
const memoryPhoto = document.querySelector('#memory-photo');
const memoryPreview = document.querySelector('#memory-preview');
const memoryPreviewImage = document.querySelector('#memory-preview-image');
const removeMemoryPhoto = document.querySelector('#remove-memory-photo');
const memoryPhotoHint = document.querySelector('#memory-photo-hint');
const memoryDate = document.querySelector('#memory-date');
const memoryCaption = document.querySelector('#memory-caption');
const memoryPoem = document.querySelector('#memory-poem');
const memoryMessage = document.querySelector('#memory-message');
let selectedMood = 'Longing';
let toastTimer;
let editingLetterId = null;
let selectedPhoto = null;
let selectedPhotoUrl = null;

function openMemoryDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable.'));
      return;
    }
    const request = indexedDB.open(MEMORY_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(MEMORY_STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open image storage.'));
  });
}

async function storePhoto(letterId, file) {
  const database = await openMemoryDatabase();
  await new Promise((resolve, reject) => {
    const request = database.transaction(MEMORY_STORE_NAME, 'readwrite')
      .objectStore(MEMORY_STORE_NAME)
      .put(file, letterId);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error || new Error('Could not save photograph.'));
  });
  database.close();
}

async function loadPhoto(letterId) {
  const database = await openMemoryDatabase();
  const photo = await new Promise((resolve, reject) => {
    const request = database.transaction(MEMORY_STORE_NAME, 'readonly')
      .objectStore(MEMORY_STORE_NAME)
      .get(letterId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Could not load photograph.'));
  });
  database.close();
  return photo;
}

async function removePhoto(letterId) {
  try {
    const database = await openMemoryDatabase();
    await new Promise((resolve, reject) => {
      const request = database.transaction(MEMORY_STORE_NAME, 'readwrite')
        .objectStore(MEMORY_STORE_NAME)
        .delete(letterId);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error || new Error('Could not remove photograph.'));
    });
    database.close();
  } catch (error) {
    console.warn('Photograph cleanup was unavailable.', error);
  }
}

function clearPhotoPreview() {
  if (selectedPhotoUrl) URL.revokeObjectURL(selectedPhotoUrl);
  selectedPhotoUrl = null;
  selectedPhoto = null;
  memoryPhoto.value = '';
  memoryPreview.hidden = true;
  memoryPreviewImage.removeAttribute('src');
}

function setPhotoPreview(file) {
  if (selectedPhotoUrl) URL.revokeObjectURL(selectedPhotoUrl);
  selectedPhoto = file;
  selectedPhotoUrl = URL.createObjectURL(file);
  memoryPreviewImage.src = selectedPhotoUrl;
  memoryPreview.hidden = false;
}

function memoryHasContent(memory) {
  return Boolean(memory && (memory.imageId || memory.date || memory.caption || memory.poem));
}

function memoryExportText(letter) {
  const memory = letter.memory;
  if (!memoryHasContent(memory)) return '';
  return `\n\nMEMORY${memory.date ? `\nMemory date: ${memory.date}` : ''}${memory.caption ? `\nCaption: ${memory.caption}` : ''}${memory.poem ? `\nPoem or quote:\n${memory.poem}` : ''}${memory.imageId ? '\nPhotograph: saved on this device' : ''}\n`;
}

function resetMemoryFields() {
  memoryPanel.open = false;
  clearPhotoPreview();
  memoryDate.value = '';
  memoryCaption.value = '';
  memoryPoem.value = '';
  memoryMessage.textContent = '';
  memoryPhotoHint.textContent = 'Images stay on this device and are not uploaded.';
}

function loadMemoryFields(letter) {
  const memory = letter.memory || {};
  memoryPanel.open = memoryHasContent(memory);
  memoryDate.value = memory.date || '';
  memoryCaption.value = memory.caption || '';
  memoryPoem.value = memory.poem || '';
  clearPhotoPreview();
  if (memory.imageId) {
    loadPhoto(memory.imageId).then(photo => {
      if (photo && editingLetterId === letter.id) setPhotoPreview(photo);
    }).catch(() => {
      memoryMessage.textContent = 'This photograph is no longer available, but the rest of the memory is safe.';
    });
  }
}

function setMood(mood) {
  selectedMood = mood;
  document.body.dataset.mood = mood;
  document.querySelectorAll('.mood').forEach(item => {
    const active = item.dataset.mood === mood;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
}

function revealLine() {
  const options = moodLines[selectedMood].filter(line => line !== moodLine.textContent);
  moodLine.textContent = options[Math.floor(Math.random() * options.length)];
  moodLine.classList.remove('line-reveal');
  requestAnimationFrame(() => moodLine.classList.add('line-reveal'));
}

function loadLetters() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.body === 'string') : [];
  } catch (error) {
    return [];
  }
}

function saveLetters(letters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
    return true;
  } catch (error) {
    showToast('Your browser could not save this letter. Try exporting it instead.');
    return false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function updateWordCount() {
  const count = countWords(bodyInput.value);
  wordCount.textContent = `${count} ${count === 1 ? 'word' : 'words'}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderLetters() {
  const letters = loadLetters();
  const query = letterSearch.value.trim().toLowerCase();
  const filteredLetters = query
    ? letters.filter(letter => [
      letter.title,
      letter.body,
      letter.mood,
      letter.memory && letter.memory.date,
      letter.memory && letter.memory.caption,
      letter.memory && letter.memory.poem
    ].some(value => String(value || '').toLowerCase().includes(query)))
    : letters;
  lettersGrid.innerHTML = '';
  savedCount.textContent = `${letters.length} ${letters.length === 1 ? 'LETTER' : 'LETTERS'} KEPT`;
  if (!letters.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<span class="empty-icon">☾</span><p>No letters yet.</p><span>Your first one can begin above.</span>';
    lettersGrid.appendChild(empty);
    return;
  }
  if (!filteredLetters.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<span class="empty-icon">⌕</span><p>No matching letters.</p><span>Try a different title, word, or mood.</span>';
    lettersGrid.appendChild(empty);
    return;
  }
  filteredLetters.forEach(letter => {
    const card = document.createElement('article');
    card.className = 'letter-card';
    card.innerHTML = `
      <span class="card-mood">${escapeText(letter.mood || 'Unsent')}</span>
      ${memoryHasContent(letter.memory) ? `<span class="memory-badge">✦ memory</span>` : ''}
      <h3>${escapeText(letter.title || 'Untitled feeling')}</h3>
      <p class="card-preview">${escapeText(letter.body)}</p>
      <div class="memory-card-content" data-memory-for="${escapeText(letter.id)}">${letter.memory && (letter.memory.date || letter.memory.caption || letter.memory.poem) ? `<div class="memory-text">${letter.memory.date ? `<time>${escapeText(letter.memory.date)}</time>` : ''}${letter.memory.caption ? `<p class="memory-caption">${escapeText(letter.memory.caption)}</p>` : ''}${letter.memory.poem ? `<blockquote>${escapeText(letter.memory.poem)}</blockquote>` : ''}</div>` : ''}</div>
      <div class="card-footer"><span>${formatDate(letter.createdAt)}</span><div class="card-actions"><button type="button" data-action="read" aria-expanded="false">Read</button><button type="button" data-action="edit" data-id="${escapeText(letter.id)}">Edit</button><button type="button" data-action="download" data-id="${escapeText(letter.id)}">Download</button><button type="button" data-action="delete" data-id="${escapeText(letter.id)}">Delete</button></div></div>`;
    lettersGrid.appendChild(card);
    if (letter.memory && letter.memory.imageId) hydrateMemoryPhoto(card, letter);
  });
}

async function hydrateMemoryPhoto(card, letter) {
  try {
    const photo = await loadPhoto(letter.memory.imageId);
    if (!photo || !card.isConnected) return;
    const content = card.querySelector('.memory-card-content');
    const url = URL.createObjectURL(photo);
    content.innerHTML = `<figure class="memory-photo-card"><img src="${url}" alt="Photograph saved with ${escapeText(letter.title || 'this letter')}" /><figcaption>${escapeText(letter.memory.caption || 'A moment worth keeping')}</figcaption></figure>`;
  } catch (error) {
    card.classList.add('memory-photo-missing');
  }
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(value) {
  return (value || 'midnight-letter').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'midnight-letter';
}

document.querySelectorAll('.mood').forEach(button => {
  button.addEventListener('click', () => { setMood(button.dataset.mood); revealLine(); });
});

document.querySelector('#new-line').addEventListener('click', revealLine);

document.querySelector('#new-prompt').addEventListener('click', () => {
  const current = document.querySelector('#prompt-text').textContent;
  const options = prompts.filter(prompt => prompt !== current);
  document.querySelector('#prompt-text').textContent = options[Math.floor(Math.random() * options.length)];
});

bodyInput.addEventListener('input', updateWordCount);
letterSearch.addEventListener('input', renderLetters);

memoryPhoto.addEventListener('change', () => {
  const file = memoryPhoto.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    clearPhotoPreview();
    memoryMessage.textContent = 'Please choose an image file.';
    return;
  }
  if (file.size > MAX_PHOTO_SIZE) {
    clearPhotoPreview();
    memoryMessage.textContent = 'That photograph is larger than 5 MB. Please choose a smaller image.';
    return;
  }
  memoryMessage.textContent = '';
  setPhotoPreview(file);
});

removeMemoryPhoto.addEventListener('click', clearPhotoPreview);

form.addEventListener('submit', async event => {
  event.preventDefault();
  const body = bodyInput.value.trim();
  if (!body) {
    formMessage.textContent = 'Your letter needs at least a few words before it can be kept.';
    bodyInput.focus();
    return;
  }
  const wasEditing = Boolean(editingLetterId);
  const letters = loadLetters();
  const id = editingLetterId || ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const existingLetter = letters.find(item => item.id === id);
  const previousMemory = existingLetter && existingLetter.memory ? existingLetter.memory : {};
  const memory = {
    ...previousMemory,
    date: memoryDate.value,
    caption: memoryCaption.value.trim(),
    poem: memoryPoem.value.trim()
  };
  if (selectedPhoto) {
    try {
      await storePhoto(id, selectedPhoto);
      memory.imageId = id;
    } catch (error) {
      delete memory.imageId;
      memoryMessage.textContent = 'The letter was saved, but the photograph could not be kept in this browser.';
    }
  } else if (!memoryPreview.hidden && previousMemory.imageId) {
    memory.imageId = previousMemory.imageId;
  } else if (!memoryPanel.open || memoryPreview.hidden) {
    delete memory.imageId;
  }
  const letter = {
    id,
    title: titleInput.value.trim(),
    mood: selectedMood,
    body,
    createdAt: new Date().toISOString()
  };
  if (memoryHasContent(memory)) letter.memory = memory;
  const nextLetters = editingLetterId ? letters.map(item => item.id === id ? { ...item, ...letter, createdAt: existingLetter.createdAt } : item) : [letter, ...letters];
  if (saveLetters(nextLetters)) {
    if (editingLetterId && previousMemory.imageId && !memory.imageId) await removePhoto(id);
    form.reset();
    editingLetterId = null;
    resetMemoryFields();
    setMood('Longing');
    updateWordCount();
    formMessage.textContent = wasEditing ? 'Your memory has been updated gently.' : 'Your letter has been kept gently. You can download or delete it anytime.';
    renderLetters();
    showToast('Letter kept. Take a breath. ✧');
  }
});

document.querySelector('#clear-letter').addEventListener('click', () => {
  form.reset();
  editingLetterId = null;
  resetMemoryFields();
  setMood('Longing');
  formMessage.textContent = '';
  updateWordCount();
  bodyInput.focus();
});

lettersGrid.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'read') {
    const card = button.closest('.letter-card');
    const open = card.classList.toggle('expanded');
    button.textContent = open ? 'Close' : 'Read';
    button.setAttribute('aria-expanded', String(open));
    return;
  }
  const letters = loadLetters();
  const letter = letters.find(item => item.id === button.dataset.id);
  if (!letter) return;
  if (button.dataset.action === 'edit') {
    editingLetterId = letter.id;
    titleInput.value = letter.title || '';
    bodyInput.value = letter.body || '';
    setMood(letter.mood || 'Longing');
    loadMemoryFields(letter);
    formMessage.textContent = 'Editing this letter. Keep it again when you are ready.';
    updateWordCount();
    document.querySelector('#write').scrollIntoView({ behavior: 'smooth' });
    bodyInput.focus();
    return;
  }
  if (button.dataset.action === 'delete') {
    if (!window.confirm('Delete this letter from this browser? This cannot be undone.')) return;
    if (saveLetters(letters.filter(item => item.id !== letter.id))) {
      await removePhoto(letter.id);
      renderLetters();
      showToast('Letter removed from your archive.');
    }
  }
  if (button.dataset.action === 'download') {
    const content = `${letter.title || 'Untitled feeling'}\nMood: ${letter.mood}\nDate: ${formatDate(letter.createdAt)}\n\n${letter.body}${memoryExportText(letter)}`;
    downloadText(`${safeFilename(letter.title)}.txt`, content);
  }
});

document.querySelector('#download-all').addEventListener('click', () => {
  const letters = loadLetters();
  if (!letters.length) {
    showToast('There are no letters to export yet.');
    return;
  }
  const content = letters.map((letter, index) => `${index + 1}. ${letter.title || 'Untitled feeling'}\nMood: ${letter.mood}\nDate: ${formatDate(letter.createdAt)}\n\n${letter.body}${memoryExportText(letter)}`).join('\n\n----------------------------------------\n\n');
  downloadText('midnight-letters-archive.txt', content);
  showToast('Your archive is ready to keep.');
});

setMood('Longing');
revealLine();
updateWordCount();
renderLetters();
