document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  fetchSubjectDetails();
});

function initAuth() {
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
    // Redirect to login if not authenticated
    window.location.href = 'login.html';
  }
}

window.logout = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  window.location.href = 'login.html';
}

let allResources = [];
let allQuestions = [];

async function fetchSubjectDetails() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const urlParams = new URLSearchParams(window.location.search);
  const subjectId = urlParams.get('id');

  if (!subjectId) {
    document.getElementById('subject-title').textContent = 'Invalid Subject';
    return;
  }
  
  document.getElementById('subject-title').textContent = `Subject Details (ID: ${subjectId})`;
  
  const aiSubjectName = document.getElementById('ai-subject-name');
  if (aiSubjectName) {
      aiSubjectName.textContent = `Subject ${subjectId}`; // Will update with real name if backend sends it
  }

  try {
    // Fetch Resources
    const resResources = await fetch(`http://127.0.0.1:5000/api/resources?subject_id=${subjectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (resResources.ok) {
      const json = await resResources.json();
      allResources = json.data || [];
      renderResources('all');
    } else {
      document.getElementById('resources-grid').innerHTML = '<p class="text-neutral-500">Failed to load resources.</p>';
    }

    // Fetch Questions
    const resQuestions = await fetch(`http://127.0.0.1:5000/api/questions?subject_id=${subjectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const questionsGrid = document.getElementById('questions-grid');
    if (resQuestions.ok) {
      const json = await resQuestions.json();
      allQuestions = json.data || [];
      
      if (allQuestions.length > 0) {
        questionsGrid.innerHTML = `
          <div class="resource-card" style="grid-column: 1 / -1; align-items: center; text-align: center; padding: 40px;">
            <i data-lucide="clipboard-list" style="width:48px;height:48px;color:var(--primary-500);margin-bottom:16px;"></i>
            <h3>Practice Quiz Available</h3>
            <p class="text-neutral-500" style="margin-bottom:20px;">Test your knowledge with ${allQuestions.length} multiple choice questions.</p>
            <button onclick="startQuiz()" class="btn btn--primary">Take Quiz</button>
          </div>
        `;
      } else {
        questionsGrid.innerHTML = '<p class="text-neutral-500">No practice questions found.</p>';
      }
    } else {
      questionsGrid.innerHTML = '<p class="text-neutral-500">Practice questions are currently unavailable.</p>';
    }
  } catch (err) {
    console.error('Failed to fetch subject details', err);
  }
  
  // Set up tab switching
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all tabs
      tabs.forEach(t => {
          t.classList.remove('active');
          t.style.borderBottomColor = 'transparent';
          t.style.color = 'var(--text-secondary)';
      });
      tabContents.forEach(c => c.style.display = 'none');
      
      // Activate clicked tab
      tab.classList.add('active');
      tab.style.borderBottomColor = 'var(--primary-color)';
      tab.style.color = 'var(--primary-color)';
      
      const target = tab.dataset.target;
      const contentEl = document.getElementById(`tab-${target}`);
      if (contentEl) {
          contentEl.style.display = 'block';
      }
    });
  });

  // Set up filter chips
  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      chips.forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      renderResources(e.target.dataset.filter);
    });
  });

  // Initialize AI Chat handler
  initAIChat();

  lucide.createIcons();
}

function renderResources(filterType) {
  const resourcesGrid = document.getElementById('resources-grid');
  
  let filtered = allResources;
  if (filterType !== 'all') {
    filtered = allResources.filter(r => r.type.toLowerCase() === filterType.toLowerCase());
  }

  if (filtered.length > 0) {
    resourcesGrid.innerHTML = '';
    filtered.forEach(res => {
      let icon = 'file-text';
      if (res.type.toLowerCase() === 'note') icon = 'book';
      if (res.type.toLowerCase() === 'mcq') icon = 'check-square';
      if (res.type.toLowerCase() === 'pyq') icon = 'archive';

      resourcesGrid.innerHTML += `
        <div class="resource-card">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="resource-type" style="display: flex; align-items: center; gap: 6px;">
              <i data-lucide="${icon}" style="width:14px;height:14px;"></i>
              ${res.type}
            </span>
          </div>
          <h3>${res.title}</h3>
          <a href="${res.url}" target="_blank" class="btn btn--secondary" style="padding: 6px 12px; font-size: 14px; margin-top: auto;">Open Resource</a>
        </div>
      `;
    });
    lucide.createIcons();
  } else {
    resourcesGrid.innerHTML = `<p class="text-neutral-500">No resources found for filter: ${filterType}.</p>`;
  }
}

// Quiz State
let currentQuestionIndex = 0;
let userAnswers = {};

window.startQuiz = function() {
  currentQuestionIndex = 0;
  userAnswers = {};
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const wrapper = document.getElementById('quiz-wrapper');
  
  if (currentQuestionIndex >= allQuestions.length) {
    showQuizResults();
    return;
  }

  const q = allQuestions[currentQuestionIndex];
  
  let optionsHtml = '';
  const labels = ['A', 'B', 'C', 'D'];
  const options = [q.option_a, q.option_b, q.option_c, q.option_d];
  
  const selectedAnswer = userAnswers[q.id];

  options.forEach((opt, idx) => {
    if (opt) {
      const isChecked = selectedAnswer === labels[idx] ? 'checked' : '';
      optionsHtml += `
        <label class="quiz-option" style="display:flex; align-items:center; gap: 10px;">
          <input type="radio" name="q${q.id}" value="${labels[idx]}" ${isChecked} onchange="enableNextButton()">
          <span><b>${labels[idx]}.</b> ${opt}</span>
        </label>
      `;
    }
  });

  const progressPercent = Math.round(((currentQuestionIndex) / allQuestions.length) * 100);

  let buttonsHtml = '';
  if (currentQuestionIndex > 0) {
    buttonsHtml += `<button onclick="prevQuestion()" class="btn btn--secondary">Previous</button>`;
  }
  
  const nextBtnText = (currentQuestionIndex === allQuestions.length - 1) ? 'Submit' : 'Next';
  const nextDisabled = selectedAnswer ? '' : 'disabled';
  
  buttonsHtml += `<button id="quiz-next-btn" onclick="nextQuestion()" class="btn btn--primary" ${nextDisabled}>${nextBtnText}</button>`;

  wrapper.innerHTML = `
    <div class="quiz-container">
      <div style="width: 100%; background: var(--neutral-200); height: 8px; border-radius: 4px; margin-bottom: 24px; overflow: hidden;">
        <div style="width: ${progressPercent}%; background: var(--primary-500); height: 100%; transition: width 0.3s ease;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom: 20px;">
        <span style="font-weight:600; color:var(--primary-600);">Question ${currentQuestionIndex + 1} of ${allQuestions.length}</span>
      </div>
      <h3 style="font-size: 18px; margin-bottom: 20px;">${q.question || q.text}</h3>
      <div style="margin-bottom: 24px;">
        ${optionsHtml}
      </div>
      <div style="display:flex; justify-content: flex-end; gap: 12px;">
        ${buttonsHtml}
      </div>
    </div>
  `;
}

window.enableNextButton = function() {
  const btn = document.getElementById('quiz-next-btn');
  if (btn) btn.disabled = false;
}

window.prevQuestion = function() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuizQuestion();
  }
}

window.nextQuestion = function() {
  const q = allQuestions[currentQuestionIndex];
  const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
  
  if (!selected) {
    return;
  }

  userAnswers[q.id] = selected.value; // Will be 'A', 'B', etc.
  currentQuestionIndex++;
  renderQuizQuestion();
}

window.restartQuiz = function() {
  startQuiz();
}

async function showQuizResults() {
  const wrapper = document.getElementById('quiz-wrapper');
  
  let score = 0;
  let reviewHtml = '<div style="margin-top: 30px; text-align: left;">';
  
  allQuestions.forEach((q, i) => {
    const isCorrect = userAnswers[q.id] === q.correct_option;
    if (isCorrect) score++;
    
    const color = isCorrect ? 'var(--primary-600)' : 'red';
    const icon = isCorrect ? 'check-circle' : 'x-circle';
    const userSelected = userAnswers[q.id] || "None";
    
    reviewHtml += `
      <div style="padding: 16px; border: 1px solid var(--neutral-200); border-radius: 8px; margin-bottom: 12px; background: ${isCorrect ? '#ecfdf5' : '#fef2f2'};">
        <h4 style="margin-bottom: 8px; display:flex; align-items:center; gap: 8px; color: ${color};">
          <i data-lucide="${icon}" style="width:18px;height:18px;"></i>
          Q${i+1}: ${q.question || q.text}
        </h4>
        <p style="margin:0; font-size: 14px; color: var(--neutral-600);">
          Your Answer: <b>${userSelected}</b> | Correct Answer: <b>${q.correct_option}</b>
        </p>
      </div>
    `;
  });
  reviewHtml += '</div>';

  const percentage = Math.round((score / allQuestions.length) * 100);

  wrapper.innerHTML = `
    <div class="quiz-container" style="text-align:center; padding: 40px;">
      <i data-lucide="award" style="width:64px;height:64px;color:var(--primary-500);margin-bottom:20px;"></i>
      <h2 style="margin-bottom:10px;">Quiz Completed!</h2>
      <p style="font-size: 24px; font-weight:700; color:var(--neutral-900); margin-bottom: 10px;">
        Your Score: ${score} / ${allQuestions.length} (${percentage}%)
      </p>
      <p id="save-status" style="color:var(--neutral-500); margin-bottom: 24px;">Saving your score...</p>
      
      <div style="display:flex; justify-content:center; gap: 12px;">
        <button onclick="location.reload()" class="btn btn--secondary">Back to Resources</button>
        <button onclick="restartQuiz()" class="btn btn--primary">Restart Quiz</button>
      </div>
      
      ${reviewHtml}
    </div>
  `;
  lucide.createIcons();

  // Save to backend
  const token = localStorage.getItem('token');
  const urlParams = new URLSearchParams(window.location.search);
  const subjectId = urlParams.get('id');

  try {
    const res = await fetch('http://127.0.0.1:5000/api/activity_scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subject_id: subjectId,
        score: score,
        total_questions: allQuestions.length
      })
    });
    
    if (res.ok) {
      document.getElementById('save-status').textContent = "Score saved successfully! Check your dashboard.";
      document.getElementById('save-status').style.color = "green";
    } else {
      document.getElementById('save-status').textContent = "Failed to save score.";
      document.getElementById('save-status').style.color = "red";
    }
  } catch(e) {
    document.getElementById('save-status').textContent = "Network error while saving score.";
  }
}

// AI Chat Architecture
function initAIChat() {
    const aiForm = document.getElementById('ai-chat-form');
    const aiInput = document.getElementById('ai-chat-input');
    const chatHistory = document.getElementById('chat-history');
    
    if (!aiForm || !aiInput || !chatHistory) return;

    aiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userMessage = aiInput.value.trim();
        if (!userMessage) return;

        // Append User Message
        appendMessage(userMessage, 'user');
        aiInput.value = '';

        // Show typing indicator
        const typingId = 'typing-' + Date.now();
        appendMessage('...', 'ai', typingId);
        
        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // Mock AI Network Request (Ready to be swapped with OpenAI/Gemini call)
        setTimeout(() => {
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();

            const mockResponse = generateMockAIResponse(userMessage);
            appendMessage(mockResponse, 'ai');
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }, 1500);
    });
}

function appendMessage(text, sender, id = null) {
    const chatHistory = document.getElementById('chat-history');
    const msgDiv = document.createElement('div');
    if (id) msgDiv.id = id;
    
    msgDiv.style.maxWidth = '80%';
    msgDiv.style.padding = '1rem 1.25rem';
    msgDiv.style.borderRadius = '1rem';
    msgDiv.style.marginBottom = '1rem';
    msgDiv.style.boxShadow = 'var(--shadow-sm)';
    msgDiv.style.border = '1px solid var(--border-color)';
    msgDiv.style.lineHeight = '1.5';

    if (sender === 'user') {
        msgDiv.style.alignSelf = 'flex-end';
        msgDiv.style.background = 'var(--primary-500)';
        msgDiv.style.color = 'white';
        msgDiv.style.borderBottomRightRadius = '4px';
    } else {
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.style.background = 'white';
        msgDiv.style.color = 'var(--text-primary)';
        msgDiv.style.borderBottomLeftRadius = '4px';
    }

    msgDiv.innerHTML = `<p style="margin: 0;">${text}</p>`;
    chatHistory.appendChild(msgDiv);
}

function generateMockAIResponse(query) {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('explain')) {
        return "Here is a simplified explanation: The core concept revolves around breaking down complex structures into smaller, manageable components. Does this make sense, or would you like an example?";
    } else if (lowerQuery.includes('mcq') || lowerQuery.includes('quiz')) {
        return "Sure, here is a practice question:<br><br><b>Which of the following is true?</b><br>A) Option A<br>B) Option B<br>C) Option C<br><br>Take a guess!";
    } else {
        return "That's a great question about this subject. In a production environment, I will connect to a powerful AI model to give you a precise, context-aware answer based on your university's syllabus!";
    }
}
