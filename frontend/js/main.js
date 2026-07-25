/**
 * UniPrep — Main JavaScript
 * Handles: Navigation, scroll effects, smooth scrolling, reveal animations
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSmoothScroll();
  initRevealAnimations();
  initAuth();
});


function initAuth() {
  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName');
  
  const authContainers = [
    document.querySelector('.navbar__actions'),
    document.querySelector('.navbar__mobile-actions')
  ];

  if (token && userName) {
    authContainers.forEach(container => {
      if(container) {
        container.innerHTML = `
          <span style="font-weight: 500; margin-right: 15px;">Hi, ${userName.split(' ')[0]}</span>
          <button onclick="logout()" class="btn btn--ghost">Logout</button>
        `;
      }
    });

    // Also fetch dashboard data to populate the hero section mockup
    fetchDashboardData();
  }
}

window.logout = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  sessionStorage.setItem('justLoggedOut', 'true');
  window.location.reload();
}

async function fetchDashboardData() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('https://unisprep-bach.onrender.com/api/dashboard/data', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      
      // Update Hero Section Mockup
      const courseEl = document.querySelector('.dashboard__course');
      if (courseEl) courseEl.textContent = `${data.course} • Semester 2`;
      
      const subjectsContainer = document.querySelector('.dashboard__subjects');
      if (subjectsContainer && data.subjects) {
        subjectsContainer.innerHTML = '';
        data.subjects.forEach(sub => {
          subjectsContainer.innerHTML += `
            <a href="subject.html?id=${sub.id}" style="text-decoration: none; color: inherit; display: block; cursor: pointer; transition: transform 0.2s ease;">
              <div class="dashboard__subject" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <span class="dashboard__subject-icon dashboard__subject-icon--${sub.color}">
                  <i data-lucide="${sub.icon}" style="width:16px;height:16px;"></i>
                </span>
                <span class="dashboard__subject-text">${sub.name}</span>
                <i data-lucide="chevron-right" class="dashboard__subject-arrow" style="width:16px;height:16px;"></i>
              </div>
            </a>
          `;
        });
        lucide.createIcons();
      }

      // Update User Progress Stats
      if (data.stats) {
        const statsGrid = document.querySelector('.stats__grid');
        if (statsGrid) {
          statsGrid.innerHTML = `
            <div class="stats__item reveal revealed" style="transition: none;">
              <div class="stats__number"><span class="gradient-text">${data.stats.quizzes_completed}</span></div>
              <div class="stats__label">Quizzes Completed</div>
            </div>
            <div class="stats__item reveal revealed" style="transition: none;">
              <div class="stats__number"><span class="gradient-text">${data.stats.average_score}</span></div>
              <div class="stats__label">Average Score</div>
            </div>
            <div class="stats__item reveal revealed" style="transition: none;">
              <div class="stats__number"><span class="gradient-text">${data.stats.total_score}</span></div>
              <div class="stats__label">Total Points</div>
            </div>
            <div class="stats__item reveal revealed" style="transition: none;">
              <div class="stats__number"><span class="gradient-text">Active</span></div>
              <div class="stats__label">Status</div>
            </div>
          `;
        }
      }
      
      // Fetch Saved Resources
      fetchSavedResources();
    }
  } catch(e) {
    console.error("Dashboard fetch error:", e);
  }
}

async function fetchSavedResources() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const container = document.getElementById('saved-resources-container');
  if (!container) return;

  try {
    const res = await fetch('https://unisprep-bach.onrender.com/api/user/saved_resources', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        container.innerHTML = '';
        json.data.forEach(item => {
           let icon = 'file-text';
           if (item.type.toLowerCase() === 'note') icon = 'book';
           if (item.type.toLowerCase() === 'mcq') icon = 'check-square';
           if (item.type.toLowerCase() === 'pyq') icon = 'archive';
           
           container.innerHTML += `
            <a href="${item.url}" target="_blank" style="text-decoration:none; color:inherit; display:block;">
              <div class="dashboard__subject" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <span class="dashboard__subject-icon" style="background:var(--primary-50); color:var(--primary-600);">
                  <i data-lucide="${icon}" style="width:16px;height:16px;"></i>
                </span>
                <span class="dashboard__subject-text" style="font-size: 0.9rem;">${item.title}</span>
                <i data-lucide="external-link" class="dashboard__subject-arrow" style="width:14px;height:14px;color:var(--gray-400);"></i>
              </div>
            </a>
           `;
        });
        lucide.createIcons();
      } else {
        container.innerHTML = '<p class="text-neutral-500" style="font-size: 0.9rem; margin-top: 0;">No saved resources yet.</p>';
      }
    }
  } catch(e) {
    console.error("Failed to load saved resources:", e);
    container.innerHTML = '<p class="error-text" style="font-size: 0.9rem;">Could not load bookmarks.</p>';
  }
}


/* ============================================
   NAVBAR
   ============================================ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = navMenu.querySelectorAll('.navbar__link');

  // Scroll effect — add "scrolled" class on scroll
  function handleScroll() {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Run on load

  // Mobile toggle
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', isOpen);

    // Prevent body scroll when menu is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close mobile menu on link click
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
}


/* ============================================
   SMOOTH SCROLLING
   ============================================ */
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || href === '#!') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const navbarHeight = document.getElementById('navbar').offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}


/* ============================================
   REVEAL ANIMATIONS (IntersectionObserver)
   ============================================ */
function initRevealAnimations() {
  const revealElements = document.querySelectorAll('.reveal');

  if (!revealElements.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach((el, index) => {
    // Add stagger delay for grid children
    const parent = el.parentElement;
    if (parent && parent.classList.contains('reveal-stagger')) {
      const siblings = Array.from(parent.children).filter(child => child.classList.contains('reveal'));
      const staggerIndex = siblings.indexOf(el);
      el.style.setProperty('--stagger', staggerIndex);
    }

    observer.observe(el);
  });
}

