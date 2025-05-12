// app.js
const SERVER = 'http://localhost:3001';
const CURRENT_USER_ID = 1; // placeholder

let currentData = null;

document.addEventListener('DOMContentLoaded', async () => {
  const select = document.getElementById('userSelect');
  const loadBtn = document.getElementById('loadBtn');

  // 1) Fetch users for dropdown
  try {
    const res  = await fetch(`${SERVER}/users`);
    const list = await res.json();
    select.innerHTML = '<option value="">Select a user…</option>';
    list.forEach(u => {
      const label = u.alias?.trim() ? u.alias : u.username;
      const opt = new Option(label, u.id);
      select.add(opt);
    });
    select.disabled = false;
    select.addEventListener('change', () => {
      loadBtn.disabled = !select.value;
    });
    loadBtn.addEventListener('click', loadUser);
  } catch (err) {
    console.error('Error loading users:', err);
    select.innerHTML = '<option>Error loading users</option>';
  }

  // 2) Bind buttons
  document.getElementById('editBtn').addEventListener('click', enterEditMode);
  document.getElementById('saveBtn').addEventListener('click', saveUser);
  document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
});

async function loadUser() {
  // 1) Clean up any previous file‐input
  const oldInput = document.getElementById('avatarInput');
  if (oldInput) oldInput.remove();

  // 2) Get the selected user ID
  const id = document.getElementById('userSelect').value;
  if (!id) return;

  // 3) Grab the avatar <img> and immediately clear it to a placeholder
  const avatarEl = document.getElementById('avatar');
  avatarEl.src = 'https://via.placeholder.com/80?text=Loading…';
  avatarEl.style.opacity = '0.3';

  // 4) Fetch the user data
  const res  = await fetch(`${SERVER}/user/${id}`);
  const data = await res.json();
  if (!res.ok) {
    return alert(data.error || 'Failed to fetch user');
  }

  // 5) Store the data & compute state
  currentData = data;
  const isMe   = +id === CURRENT_USER_ID;
  const handle = data.alias?.trim() ? data.alias : data.username;
  document.getElementById('username').textContent = '@' + handle;

  // 6) Determine the real avatar URL (or fallback)
  const newUrl = data.avatarUrl
    ? SERVER + data.avatarUrl + `?_=${Date.now()}`
    : 'https://via.placeholder.com/80?text=No+Avatar';

  // 7) Preload the new image, swap it in onload
  const tmp = new Image();
  tmp.onload = () => {
    avatarEl.src = newUrl;
    avatarEl.style.opacity = '1';
  };
  tmp.src = newUrl;

  // 8) Populate public info
  document.getElementById('alias').textContent = handle;

  // 9) Populate private info
  document.getElementById('fullName').textContent = data.full_name || '';
  document.getElementById('email').textContent    = data.email;
  document.getElementById('created').textContent  = data.created_at;
  document.getElementById('online').textContent   = data.online ? 'Yes' : 'No';

  // 10) Show/hide private section and buttons based on "logged‐in" user
  document.getElementById('privateInfo').style.display = isMe ? 'block' : 'none';
  document.getElementById('editBtn').style.display    = isMe ? 'inline-block' : 'none';
  document.getElementById('saveBtn').style.display    = 'none';
  document.getElementById('cancelBtn').style.display  = 'none';

  // 11) Display the modal
  document.getElementById('profileOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('profileOverlay').classList.remove('active');
}

function enterEditMode() {
  // Hide / show action buttons
  document.getElementById('editBtn').style.display   = 'none';
  document.getElementById('saveBtn').style.display   = 'inline-block';
  document.getElementById('cancelBtn').style.display = 'inline-block';

  // Swap text spans for inputs
  [
    { id: 'alias',    inputId: 'aliasInput',    val: currentData.alias || currentData.username },
    { id: 'fullName', inputId: 'fullNameInput', val: currentData.full_name || '' },
    { id: 'email',    inputId: 'emailInput',    val: currentData.email }
  ].forEach(({ id, inputId, val }) => {
    const el = document.getElementById(id);
    el.innerHTML = `<input type="text" id="${inputId}" value="${val}" style="width:100%">`;
  });

  // Inject file chooser for avatar
  if (!document.getElementById('avatarInput')) {
    document.getElementById('avatar')
      .insertAdjacentHTML(
        'afterend',
        `<input type="file" id="avatarInput" accept="image/*" style="margin:0.5rem 0; display:block;">`
      );
  }
}

function cancelEdit() {
  closeModal();
  loadUser();
}

async function saveUser() {
  const id = currentData.id;

  // 1) Upload avatar if a file was picked
  const fileEl = document.getElementById('avatarInput');
  if (fileEl?.files.length) {
    const fd = new FormData();
    fd.append('file', fileEl.files[0]);
    const upRes  = await fetch(`${SERVER}/avatar/${id}`, {
      method: 'POST',
      body: fd
    });
    const upBody = await upRes.json();
    if (!upRes.ok) {
      return alert(upBody.error || 'Avatar upload failed');
    }
    // swap in the new image URL (cache-bust with timestamp)
    document.getElementById('avatar').src = SERVER + upBody.url + `?_=${Date.now()}`;
  }

  // 2) Then save alias/full_name/email as before…
  const alias     = document.getElementById('aliasInput').value.trim();
  const full_name = document.getElementById('fullNameInput').value.trim();
  const email     = document.getElementById('emailInput').value.trim();

  const res  = await fetch(`${SERVER}/user/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ alias, full_name, email })
  });
  const body = await res.json();
  if (!res.ok) return alert(body.error || 'Failed to save profile');

  // 3) Update UI & dropdown
  currentData = { ...currentData, ...body };
  const handle = currentData.alias?.trim() ? currentData.alias : currentData.username;
  document.getElementById('username').textContent = '@' + handle;
  document.getElementById('alias').textContent    = handle;
  document.getElementById('fullName').textContent = currentData.full_name;
  document.getElementById('email').textContent    = currentData.email;

  const sel = document.getElementById('userSelect');
  const opt = sel.querySelector(`option[value="${id}"]`);
  if (opt) opt.textContent = handle;

  // 4) Exit edit mode
  document.getElementById('saveBtn').style.display   = 'none';
  document.getElementById('cancelBtn').style.display = 'none';
  document.getElementById('editBtn').style.display   = 'inline-block';
  fileEl?.remove();
}