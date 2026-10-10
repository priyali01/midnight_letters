const STORAGE_KEY = 'midnight-letters-v1';
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
const toast = document.querySelector('#toast');
let selectedMood = 'Longing';
let toastTimer;

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
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderLetters() {
  const letters = loadLetters();
  lettersGrid.innerHTML = '';
  savedCount.textContent = `${letters.length} ${letters.length === 1 ? 'LETTER' : 'LETTERS'} KEPT`;
  if (!letters.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<span class="empty-icon">☾</span><p>No letters yet.</p><span>Your first one can begin above.</span>';
    lettersGrid.appendChild(empty);
    return;
  }
  letters.forEach(letter => {
    const card = document.createElement('article');
    card.className = 'letter-card';
    card.innerHTML = `
      <span class="card-mood">${escapeText(letter.mood || 'Unsent')}</span>
      <h3>${escapeText(letter.title || 'Untitled feeling')}</h3>
      <p class="card-preview">${escapeText(letter.body)}</p>
      <div class="card-footer"><span>${formatDate(letter.createdAt)}</span><div class="card-actions"><button type="button" data-action="read" aria-expanded="false">Read</button><button type="button" data-action="download" data-id="${escapeText(letter.id)}">Download</button><button type="button" data-action="delete" data-id="${escapeText(letter.id)}">Delete</button></div></div>`;
    lettersGrid.appendChild(card);
  });
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

form.addEventListener('submit', event => {
  event.preventDefault();
  const body = bodyInput.value.trim();
  if (!body) {
    formMessage.textContent = 'Your letter needs at least a few words before it can be kept.';
    bodyInput.focus();
    return;
  }
  const letters = loadLetters();
  const letter = {
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: titleInput.value.trim(),
    mood: selectedMood,
    body,
    createdAt: new Date().toISOString()
  };
  letters.unshift(letter);
  if (saveLetters(letters)) {
    form.reset();
    setMood('Longing');
    updateWordCount();
    formMessage.textContent = 'Your letter has been kept gently. You can download or delete it anytime.';
    renderLetters();
    showToast('Letter kept. Take a breath. ✧');
  }
});

document.querySelector('#clear-letter').addEventListener('click', () => {
  form.reset();
  setMood('Longing');
  formMessage.textContent = '';
  updateWordCount();
  bodyInput.focus();
});

lettersGrid.addEventListener('click', event => {
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
  if (button.dataset.action === 'delete') {
    if (!window.confirm('Delete this letter from this browser? This cannot be undone.')) return;
    saveLetters(letters.filter(item => item.id !== letter.id));
    renderLetters();
    showToast('Letter removed from your archive.');
  }
  if (button.dataset.action === 'download') {
    const content = `${letter.title || 'Untitled feeling'}\nMood: ${letter.mood}\nDate: ${formatDate(letter.createdAt)}\n\n${letter.body}\n`;
    downloadText(`${safeFilename(letter.title)}.txt`, content);
  }
});

document.querySelector('#download-all').addEventListener('click', () => {
  const letters = loadLetters();
  if (!letters.length) {
    showToast('There are no letters to export yet.');
    return;
  }
  const content = letters.map((letter, index) => `${index + 1}. ${letter.title || 'Untitled feeling'}\nMood: ${letter.mood}\nDate: ${formatDate(letter.createdAt)}\n\n${letter.body}`).join('\n\n----------------------------------------\n\n');
  downloadText('midnight-letters-archive.txt', content);
  showToast('Your archive is ready to keep.');
});

setMood('Longing');
revealLine();
updateWordCount();
renderLetters();
