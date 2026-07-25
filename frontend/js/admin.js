// Admin logic for UniPrep

const API_BASE = '/api';
let subjectsData = [];
let coursesData = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    await checkAdminAuth();
    setupTabs();
    setupLogout();
    await fetchCourses();
    await fetchSubjects(); // Pre-fetch subjects for dropdowns
    
    // Load data for active tab
    fetchSubjectsTable();
});

// Authentication
async function checkAdminAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/admin/check`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        if (!data.is_admin) throw new Error('Not Admin');
        
        // Show the admin layout now that auth is verified
        const layout = document.querySelector('.admin-layout');
        if (layout) {
            layout.style.display = 'flex';
        }
    } catch (err) {
        console.error('Auth Error:', err);
        window.location.replace('index.html');
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user_name');
            window.location.href = 'login.html';
        });
    }
}

// Tabs
function setupTabs() {
    const tabs = document.querySelectorAll('.admin-nav-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active button
            document.querySelector('.admin-nav-item.active').classList.remove('active');
            tab.classList.add('active');
            
            // Show corresponding section
            const target = tab.getAttribute('data-tab');
            document.querySelectorAll('.admin-tab').forEach(section => {
                section.style.display = 'none';
            });
            document.getElementById(`tab-${target}`).style.display = 'block';
            
            // Fetch data
            if (target === 'subjects') fetchSubjectsTable();
            if (target === 'resources') fetchResources();
            if (target === 'questions') fetchQuestions();
            if (target === 'users') fetchUsers();
        });
    });
}

// Modals
function openModal(id, mode = 'add') {
    document.getElementById(id).classList.add('active');
    // Reset forms if it's an add action
    if (mode === 'add') {
        const form = document.querySelector(`#${id} form`);
        if (form) form.reset();
        const idInput = form.querySelector('input[type="hidden"]');
        if (idInput) idInput.value = '';
        
        document.getElementById(`${id}-title`).innerText = `Add ${id.split('-')[0]}`;
    } else {
        document.getElementById(`${id}-title`).innerText = `Edit ${id.split('-')[0]}`;
    }
    populateSubjectDropdowns();
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function populateSubjectDropdowns() {
    const options = `<option value="">Select Subject</option>` + 
        subjectsData.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    const rSelect = document.getElementById('resource-subject-id');
    if (rSelect) rSelect.innerHTML = options;
    const rFilter = document.getElementById('resource-subject-filter');
    if (rFilter && rFilter.options.length <= 1) rFilter.innerHTML = options;
    
    const qSelect = document.getElementById('question-subject-id');
    if (qSelect) qSelect.innerHTML = options;
    const qFilter = document.getElementById('question-subject-filter');
    if (qFilter && qFilter.options.length <= 1) qFilter.innerHTML = options;
}

// Helper: API Request
async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, config);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'API Request Failed');
        }
        return await res.json();
    } catch(err) {
        showToast('Error', err.message, 'error');
        throw err;
    }
}

// Toast Notifications
function showToast(title, message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}" class="toast-icon" style="width: 24px; height: 24px;"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Courses ---
async function fetchCourses() {
    try {
        const res = await apiRequest('/admin/courses');
        coursesData = res.data;
        const options = `<option value="">Select Course</option>` + 
            coursesData.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const cSelect = document.getElementById('subject-course-id');
        if (cSelect) cSelect.innerHTML = options;
    } catch (e) { console.error(e); }
}

// --- Users Management ---
async function fetchUsers() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';
    
    try {
        const res = await fetch(`${API_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok) {
            tbody.innerHTML = '';
            json.data.forEach(user => {
                const roleBadge = user.is_admin ? '<span class="resource-type" style="background:var(--primary-100);color:var(--primary-700)">Admin</span>' : '<span class="resource-type">Student</span>';
                const date = new Date(user.last_login).toLocaleString();
                tbody.innerHTML += `
                    <tr>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${roleBadge}</td>
                        <td>${date}</td>
                        <td>
                            <button onclick="deleteUser('${user.id}')" class="btn btn--danger" style="padding:4px 8px;font-size:12px;">Delete</button>
                        </td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="error-text">${json.error || 'Failed to load users'}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="error-text">Network error</td></tr>';
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            fetchUsers();
        } else {
            alert(data.error || 'Failed to delete user');
        }
    } catch (e) {
        alert('Network error');
    }
}

// --- Subjects Management ---
async function fetchSubjects() {
    try {
        const res = await apiRequest('/admin/subjects');
        subjectsData = res.data;
    } catch (e) { console.error(e); }
}

async function fetchSubjectsTable() {
    await fetchSubjects();
    const tbody = document.getElementById('subjects-tbody');
    tbody.innerHTML = '';
    
    subjectsData.forEach(sub => {
        const courseName = coursesData.find(c => c.id === sub.course_id)?.name || sub.course_id;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sub.id}</td>
            <td>${sub.name}</td>
            <td>${courseName}</td>
            <td class="action-btns">
                <button class="btn-icon" onclick='editSubject(${JSON.stringify(sub)})'><i data-lucide="edit-2"></i></button>
                <button class="btn-icon delete" onclick="deleteItem('/admin/subjects/${sub.id}', fetchSubjectsTable)"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

async function handleSubjectSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('subject-id').value;
    const data = {
        name: document.getElementById('subject-name').value,
        course_id: parseInt(document.getElementById('subject-course-id').value)
    };
    
    try {
        if (id) {
            await apiRequest(`/admin/subjects/${id}`, 'PUT', data);
            showToast('Success', 'Subject updated successfully');
        } else {
            await apiRequest('/admin/subjects', 'POST', data);
            showToast('Success', 'Subject added successfully');
        }
        closeModal('subject-modal');
        fetchSubjectsTable();
    } catch (e) {
        // Error handled in apiRequest
    }
}

function editSubject(sub) {
    openModal('subject-modal', 'edit');
    document.getElementById('subject-id').value = sub.id;
    document.getElementById('subject-name').value = sub.name;
    document.getElementById('subject-course-id').value = sub.course_id;
}


// --- Resources ---
async function fetchResources() {
    const filter = document.getElementById('resource-subject-filter').value;
    const endpoint = filter ? `/resources?subject_id=${filter}` : `/resources`; // using the public/protected endpoint
    
    try {
        const res = await apiRequest(endpoint);
        const tbody = document.getElementById('resources-tbody');
        tbody.innerHTML = '';
        
        res.data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.title}</td>
                <td>${item.type}</td>
                <td><a href="${item.url}" target="_blank">Link</a></td>
                <td class="action-btns">
                    <button class="btn-icon" onclick='editResource(${JSON.stringify(item)})'><i data-lucide="edit-2"></i></button>
                    <button class="btn-icon delete" onclick="deleteItem('/admin/resources/${item.id}', fetchResources)"><i data-lucide="trash-2"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

async function handleResourceSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('resource-id').value;
    const submitBtn = document.getElementById('resource-submit-btn');
    const fileInput = document.getElementById('resource-file');
    const urlInput = document.getElementById('resource-url');
    const progressEl = document.getElementById('upload-progress');
    
    let finalUrl = urlInput.value;
    
    // Handle File Upload first if a file is selected
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        
        // Basic validation
        if (file.type !== 'application/pdf') {
            showToast('Error', 'Only PDF files are allowed', 'error');
            return;
        }
        
        submitBtn.disabled = true;
        progressEl.style.display = 'block';
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Upload failed');
            }
            
            const data = await res.json();
            finalUrl = data.url;
            urlInput.value = finalUrl; // Set it in the input so it's visible if edit happens again
            showToast('Success', 'PDF uploaded successfully');
        } catch (err) {
            submitBtn.disabled = false;
            progressEl.style.display = 'none';
            showToast('Error', err.message, 'error');
            return; // Stop form submission
        }
    }
    
    if (!finalUrl) {
        showToast('Error', 'Please provide a URL or upload a PDF', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    
    const data = {
        subject_id: parseInt(document.getElementById('resource-subject-id').value),
        title: document.getElementById('resource-title').value,
        type: document.getElementById('resource-type').value,
        url: finalUrl
    };
    
    try {
        if (id) {
            await apiRequest(`/admin/resources/${id}`, 'PUT', data);
            showToast('Success', 'Resource updated successfully');
        } else {
            await apiRequest('/admin/resources', 'POST', data);
            showToast('Success', 'Resource added successfully');
        }
        closeModal('resource-modal');
        fetchResources();
    } catch (e) {
        // Error handled in apiRequest
    } finally {
        submitBtn.disabled = false;
        progressEl.style.display = 'none';
        fileInput.value = ''; // clear file input
    }
}

function editResource(item) {
    openModal('resource-modal', 'edit');
    document.getElementById('resource-id').value = item.id;
    document.getElementById('resource-subject-id').value = item.subject_id;
    document.getElementById('resource-title').value = item.title;
    document.getElementById('resource-type').value = item.type;
    document.getElementById('resource-url').value = item.url;
}


// --- Questions ---
async function fetchQuestions() {
    const filter = document.getElementById('question-subject-filter').value;
    const endpoint = filter ? `/questions?subject_id=${filter}` : `/questions`; // using protected endpoint
    
    try {
        const res = await apiRequest(endpoint);
        const tbody = document.getElementById('questions-tbody');
        tbody.innerHTML = '';
        
        res.data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.question}</td>
                <td>${item.correct_option}</td>
                <td class="action-btns">
                    <button class="btn-icon" onclick='editQuestion(${JSON.stringify(item).replace(/'/g, "&#39;")})'><i data-lucide="edit-2"></i></button>
                    <button class="btn-icon delete" onclick="deleteItem('/admin/questions/${item.id}', fetchQuestions)"><i data-lucide="trash-2"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

async function handleQuestionSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('question-id').value;
    const data = {
        subject_id: parseInt(document.getElementById('question-subject-id').value),
        question: document.getElementById('question-text').value,
        option_a: document.getElementById('question-a').value,
        option_b: document.getElementById('question-b').value,
        option_c: document.getElementById('question-c').value,
        option_d: document.getElementById('question-d').value,
        correct_option: document.getElementById('question-correct').value
    };
    
    try {
        if (id) {
            await apiRequest(`/admin/questions/${id}`, 'PUT', data);
            showToast('Success', 'Question updated successfully');
        } else {
            await apiRequest('/admin/questions', 'POST', data);
            showToast('Success', 'Question added successfully');
        }
        closeModal('question-modal');
        fetchQuestions();
    } catch (e) {
        // Error handled in apiRequest
    }
}

function editQuestion(item) {
    openModal('question-modal', 'edit');
    document.getElementById('question-id').value = item.id;
    document.getElementById('question-subject-id').value = item.subject_id;
    document.getElementById('question-text').value = item.question;
    document.getElementById('question-a').value = item.option_a;
    document.getElementById('question-b').value = item.option_b;
    document.getElementById('question-c').value = item.option_c;
    document.getElementById('question-d').value = item.option_d;
    document.getElementById('question-correct').value = item.correct_option;
}

// --- Common ---
async function deleteItem(endpoint, callback) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            await apiRequest(endpoint, 'DELETE');
            showToast('Success', 'Item deleted successfully');
            callback();
        } catch (e) {
            // Error handled in apiRequest
        }
    }
}
