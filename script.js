// ====================
// 1. Basic Setup
// ====================

// Grab the task columns
const board = {
  toDo: document.getElementById('todo-list'),
  inProgress: document.getElementById('inprogress-list'),
  completed: document.getElementById('completed-list')
};

// Grab input elements
const addBtn = document.getElementById('add-task-btn');
const taskInput = document.getElementById('new-task-input');
const categorySelect = document.getElementById('category-select');
const emojiSelect = document.getElementById('emoji-select');

// ====================
// 2. User Management
// ====================

function showLoginPopup() {
  document.getElementById('user-modal').style.display = 'flex';
}

function hideLoginPopup() {
  document.getElementById('user-modal').style.display = 'none';
}

function loadUser() {
  const data = localStorage.getItem('kanbanUser');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    console.error('Could not load user.');
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem('kanbanUser', JSON.stringify(user));
}

let currentUser = loadUser();

// ====================
// 3. Task Storage & Categories
// ====================

let tasks = [];

const categories = [
  { key: 'work', label: 'Work' },
  { key: 'personal', label: 'Personal' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'other', label: 'Other' }
];

function getStorageKey() {
  return currentUser ? `kanbanTasks-${currentUser.username}` : 'kanbanTasks';
}

function saveTasks() {
  localStorage.setItem(getStorageKey(), JSON.stringify(tasks));
}

function loadTasks() {
  const stored = localStorage.getItem(getStorageKey());
  try {
    const parsed = stored ? JSON.parse(stored) : [];
    tasks = Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('Task load failed.');
    tasks = [];
  }
}

// ====================
// 4. Displaying Tasks
// ====================

function showTasksOnBoard() {
  Object.values(board).forEach(col => col.innerHTML = '');
  tasks.forEach(task => {
    const card = createTaskCard(task);
    board[task.column].appendChild(card);
  });
}

// ====================
// 5. Task Card Builder
// ====================

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.setAttribute('draggable', 'true');
  card.dataset.taskId = task.id;

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = task.user;
  card.appendChild(avatar);

  // Content container
  const content = document.createElement('div');
  content.className = 'task-content';

  // Title
  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = task.title;
  title.title = 'Double-click to edit';
  title.addEventListener('dblclick', () => enableEdit(title, task));
  content.appendChild(title);

  // Meta info
  const meta = document.createElement('div');
  meta.className = 'task-meta';

  if (task.emoji) {
    const emoji = document.createElement('span');
    emoji.className = 'task-label';
    emoji.textContent = task.emoji;
    meta.appendChild(emoji);
  }

  const cat = document.createElement('span');
  cat.className = `task-label ${task.category}`;
  cat.textContent = categories.find(c => c.key === task.category)?.label || 'Other';
  meta.appendChild(cat);

  const created = new Date(task.created).toLocaleString();
  meta.innerHTML += `<span title="Created">🕒 ${created}</span>`;

  if (task.updated !== task.created) {
    const updated = new Date(task.updated).toLocaleString();
    meta.innerHTML += `<span title="Updated"> 🔄 ${updated}</span>`;
  }

  content.appendChild(meta);
  card.appendChild(content);

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.textContent = '❌';
  delBtn.title = 'Delete task';
  delBtn.onclick = () => deleteTask(task.id);
  card.appendChild(delBtn);

  // Drag handlers
  card.addEventListener('dragstart', startDrag);
  card.addEventListener('dragend', endDrag);

  return card;
}

// ====================
// 6. Task Actions
// ====================

addBtn.onclick = () => {
  const title = taskInput.value.trim();
  if (!title) return;

  let category = categorySelect.value;
  if (!categories.some(c => c.key === category)) category = 'other';

  const emoji = emojiSelect.value;
  const avatar = currentUser.avatar;
  const now = Date.now();

  const task = {
    id: now.toString() + Math.random().toString(36).substring(2, 9),
    title,
    column: 'toDo',
    created: now,
    updated: now,
    category,
    user: avatar,
    emoji
  };

  tasks.push(task);
  saveTasks();
  showTasksOnBoard();

  taskInput.value = '';
  categorySelect.value = 'work';
  emojiSelect.value = '💼';
};

taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBtn.onclick();
});

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  showTasksOnBoard();
}

function enableEdit(titleDiv, task) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = task.title;
  input.className = 'task-title editing';

  titleDiv.replaceWith(input);
  input.focus();

  function saveEdit() {
    const newTitle = input.value.trim();
    if (newTitle) {
      task.title = newTitle;
      task.updated = Date.now();
      saveTasks();
      showTasksOnBoard();
    } else {
      input.replaceWith(titleDiv);
    }
    input.removeEventListener('blur', saveEdit);
    input.removeEventListener('keydown', handleKey);
  }

  function handleKey(e) {
    if (e.key === 'Enter') input.blur();
  }

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', handleKey);
}

// ====================
// 7. Drag & Drop
// ====================

let draggingTaskId = null;

function startDrag(e) {
  draggingTaskId = this.dataset.taskId;
  this.classList.add('dragging');
  setTimeout(() => this.style.display = 'none', 0);
}

function endDrag(e) {
  this.classList.remove('dragging');
  this.style.display = '';
  draggingTaskId = null;
}

Object.entries(board).forEach(([columnKey, column]) => {
  const container = column.parentElement;

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    container.classList.add('drag-over-highlight');
  });

  container.addEventListener('dragleave', () => {
    container.classList.remove('drag-over-highlight');
  });

  container.addEventListener('drop', () => {
    container.classList.remove('drag-over-highlight');
    if (!draggingTaskId) return;

    const task = tasks.find(t => t.id === draggingTaskId);
    if (task && task.column !== columnKey) {
      task.column = columnKey;
      task.updated = Date.now();
      saveTasks();
      showTasksOnBoard();
    }
  });
});

// ====================
// 8. Page Load Setup
// ====================

document.addEventListener('DOMContentLoaded', () => {
  if (!currentUser) {
    showLoginPopup();
  } else {
    hideLoginPopup();
    updateUserHeader();
    loadTasks();
    showTasksOnBoard();
  }

  document.getElementById('create-user-btn').onclick = () => {
    const input = document.getElementById('username-input');
    const name = input.value.trim();
    if (!name) {
      alert('Please enter a username!');
      return;
    }

    currentUser = {
      username: name,
      avatar: name[0].toUpperCase()
    };

    saveUser(currentUser);
    hideLoginPopup();
    updateUserHeader();
    loadTasks();
    showTasksOnBoard();
  };
});

function updateUserHeader() {
  let bar = document.getElementById('user-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'user-bar';
    bar.classList.add('user-bar-styles');
    document.body.appendChild(bar);
  }

  bar.innerHTML = `
    <b>${currentUser.username}</b>
    <button id="switch-user-btn" class="switch-user-btn-styles">Switch User</button>
  `;

  document.getElementById('switch-user-btn').onclick = () => {
    localStorage.removeItem('kanbanUser');
    location.reload();
  };
}

// Faster pre-load
if (currentUser) {
  updateUserHeader();
  loadTasks();
  showTasksOnBoard();
}
