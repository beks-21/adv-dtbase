
const db = new Dexie('PortfolioDB');


db.version(1).stores({
  projects: '++id, category, createdAt'
});

const CATEGORIES = ['Web', 'Systems', 'Brand / Logo', 'Automation'];

const form = document.querySelector('#project-form');
const formTitle = document.querySelector('#form-title');
const idInput = document.querySelector('#project-id');
const titleInput = document.querySelector('#title');
const categoryInput = document.querySelector('#category');
const descriptionInput = document.querySelector('#description');
const tagsInput = document.querySelector('#tags');
const linkInput = document.querySelector('#link');
const cancelBtn = document.querySelector('#cancel-btn');
const searchInput = document.querySelector('#search');
const filterSelect = document.querySelector('#filter');
const listEl = document.querySelector('#project-list');
const countEl = document.querySelector('#count');


function fillCategoryOptions() {
  CATEGORIES.forEach((name) => {
    categoryInput.add(new Option(name, name));
    filterSelect.add(new Option(name, name));
  });
}


function readForm() {
  return {
    title: titleInput.value.trim(),
    category: categoryInput.value,
    description: descriptionInput.value.trim(),
    tags: tagsInput.value.split(',').map((t) => t.trim()).filter(Boolean),
    link: linkInput.value.trim()
  };
}

async function createProject(data) {
  return db.projects.add({ ...data, createdAt: Date.now() });
}

async function getProjects() {
  const category = filterSelect.value;
  const text = searchInput.value.trim().toLowerCase();


  let list = category === 'All'
    ? await db.projects.toArray()
    : await db.projects.where('category').equals(category).toArray();

  if (text) {
    list = list.filter((p) =>
      p.title.toLowerCase().includes(text) ||
      p.tags.some((t) => t.toLowerCase().includes(text))
    );
  }

  
  return list.sort((a, b) => b.createdAt - a.createdAt);
}


function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function render() {
  const projects = await getProjects();
  countEl.textContent = `${projects.length} project(s)`;

  if (projects.length === 0) {
    listEl.innerHTML = '<p class="empty">No projects yet.</p>';
    return;
  }

  listEl.innerHTML = projects.map((p) => `
    <article class="project">
      <span class="badge">${escapeHTML(p.category)}</span>
      <h3>${escapeHTML(p.title)}</h3>
      <p>${escapeHTML(p.description)}</p>
      <p class="tags">${p.tags.map((t) => `<span>#${escapeHTML(t)}</span>`).join('')}</p>
      ${p.link.startsWith('http')
        ? `<a href="${escapeHTML(p.link)}" target="_blank" rel="noopener">View project</a>`
        : ''}
      <div class="actions">
        <button data-action="edit" data-id="${p.id}">Edit</button>
        <button data-action="delete" data-id="${p.id}" class="danger">Delete</button>
      </div>
    </article>
  `).join('');
}

async function updateProject(id, changes) {
  return db.projects.update(id, changes);
}


function startEdit(project) {
  idInput.value = project.id;
  titleInput.value = project.title;
  categoryInput.value = project.category;
  descriptionInput.value = project.description;
  tagsInput.value = project.tags.join(', ');
  linkInput.value = project.link;
  formTitle.textContent = 'Edit project';
  cancelBtn.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  form.reset();
  idInput.value = '';
  formTitle.textContent = 'Add a project';
  cancelBtn.hidden = true;
}

async function deleteProject(id) {
  return db.projects.delete(id);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = readForm();
  const id = Number(idInput.value);

  if (id) {
    await updateProject(id, data);
  } else {
    await createProject(data);
  }

  resetForm();
  await render();
});


listEl.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = Number(button.dataset.id);

  if (button.dataset.action === 'edit') {
    startEdit(await db.projects.get(id));
  }

  if (button.dataset.action === 'delete' && confirm('Delete this project?')) {
    await deleteProject(id);
    await render();
  }
});

cancelBtn.addEventListener('click', resetForm);
searchInput.addEventListener('input', render);
filterSelect.addEventListener('change', render);

// Start the app
fillCategoryOptions();
render();