let allResources = [];
let allSubjects = [];
let currentFilter = 'all';
let resourceType = '';
let emptyMessage = '';

async function initQuickAction(type, emptyMsg) {
  resourceType = type;
  emptyMessage = emptyMsg;

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName');
  
  const authContainer = document.querySelector('.navbar__actions');
  if (token && userName) {
    if(authContainer) {
      authContainer.innerHTML = `
        <span style="font-weight: 500; margin-right: 15px;">Hi, ${userName.split(' ')[0]}</span>
        <button onclick="logout()" class="btn btn--ghost">Logout</button>
      `;
    }
  } else {
    window.location.href = 'login.html';
    return;
  }

  lucide.createIcons();
  
  await fetchSubjectsAndResources(token);
}

window.logout = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  window.location.href = 'login.html';
}

async function fetchSubjectsAndResources(token) {
  try {
    // 1. Fetch subjects from dashboard data
    const dashRes = await fetch('/api/dashboard/data', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (dashRes.ok) {
      const data = await dashRes.json();
      allSubjects = data.subjects || [];
      renderSubjectFilters();
    }

    // 2. Fetch all resources
    const resRes = await fetch('/api/resources', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (resRes.ok) {
      const resData = await resRes.json();
      allResources = resData.data || [];
      renderResources();
    } else {
      document.getElementById('resources-grid').innerHTML = '<p class="text-neutral-500">Failed to load resources.</p>';
    }
  } catch (e) {
    console.error(e);
    document.getElementById('resources-grid').innerHTML = '<p class="text-neutral-500">Network error while fetching resources.</p>';
  }
}

function renderSubjectFilters() {
  const container = document.getElementById('subject-filters');
  if (!container) return;
  
  // Keep "All Subjects" chip which is already there, append the rest
  allSubjects.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = sub.name;
    btn.dataset.filter = sub.id;
    btn.onclick = (e) => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = sub.id;
      renderResources();
    };
    container.appendChild(btn);
  });

  // Re-bind click for "All Subjects"
  const allBtn = container.querySelector('[data-filter="all"]');
  if (allBtn) {
    allBtn.onclick = (e) => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      allBtn.classList.add('active');
      currentFilter = 'all';
      renderResources();
    };
  }
}

function renderResources() {
  const resourcesGrid = document.getElementById('resources-grid');
  if (!resourcesGrid) return;
  
  let filtered = allResources.filter(r => {
    const typeMatch = resourceType === 'pyq' ? (r.type.toLowerCase() === 'pyq' || r.type.toLowerCase() === 'paper') : (r.type.toLowerCase() === resourceType.toLowerCase());
    const subjectMatch = currentFilter === 'all' ? true : (r.subject_id == currentFilter);
    return typeMatch && subjectMatch;
  });

  if (filtered.length > 0) {
    resourcesGrid.innerHTML = '';
    filtered.forEach(res => {
      let icon = 'file-text';
      if (res.type.toLowerCase() === 'note') icon = 'book';
      if (res.type.toLowerCase() === 'mcq') icon = 'check-square';
      if (res.type.toLowerCase() === 'pyq' || res.type.toLowerCase() === 'paper') icon = 'archive';

      const subjectName = allSubjects.find(s => s.id === res.subject_id)?.name || 'Unknown Subject';

      resourcesGrid.innerHTML += `
        <div class="resource-card">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="resource-type" style="display: flex; align-items: center; gap: 6px;">
              <i data-lucide="${icon}" style="width:14px;height:14px;"></i>
              ${res.type}
            </span>
            <span style="font-size: 12px; color: var(--neutral-500); background: var(--neutral-100); padding: 2px 6px; border-radius: 4px;">${subjectName}</span>
          </div>
          <h3>${res.title}</h3>
          <div style="display:flex; gap:8px; margin-top: auto;">
            <a href="${res.url}" target="_blank" class="btn btn--secondary" style="padding: 6px 12px; font-size: 14px; flex:1; text-align:center;">Open Resource</a>
            <button onclick="bookmarkResource(${res.id})" class="btn btn--ghost" style="padding: 6px; border: 1px solid var(--gray-200); border-radius: 8px;" title="Save Resource">
              <i data-lucide="bookmark" style="width:16px;height:16px;color:var(--gray-500);"></i>
            </button>
          </div>
        </div>
      `;
    });
    lucide.createIcons();
  } else {
    resourcesGrid.innerHTML = `<p class="text-neutral-500" style="grid-column: 1/-1;">${emptyMessage}</p>`;
  }
}

window.bookmarkResource = async function(resourceId) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert("Please login to save resources.");
    return;
  }
  try {
    const res = await fetch('/api/user/saved_resources', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource_id: resourceId })
    });
    if (res.ok) {
      alert("Resource saved to your dashboard!");
    } else {
      alert("Failed to save resource or already saved.");
    }
  } catch(e) {
    alert("Network error. Try again.");
  }
}
