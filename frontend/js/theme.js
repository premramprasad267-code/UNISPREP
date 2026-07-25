// Theme Logic
(function() {
  function getInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  const theme = getInitialTheme();
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  }

  // Update theme toggle icon on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    updateThemeToggleIcon();
  });
})();

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeToggleIcon();
}

function updateThemeToggleIcon() {
  const toggles = document.querySelectorAll('.theme-toggle-icon');
  const isDark = document.documentElement.classList.contains('dark');
  
  toggles.forEach(toggle => {
    if (isDark) {
      toggle.setAttribute('data-lucide', 'sun');
    } else {
      toggle.setAttribute('data-lucide', 'moon');
    }
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
