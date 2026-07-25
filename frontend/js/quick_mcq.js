let allSubjects = [];
let currentSubjectId = null;
let allQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};

document.addEventListener('DOMContentLoaded', () => {
  initQuickMCQ();
});

async function initQuickMCQ() {
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
  
  await fetchSubjects(token);
}

window.logout = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  window.location.href = 'login.html';
}

async function fetchSubjects(token) {
  try {
    const dashRes = await fetch('https://unisprep-bach.onrender.com/api/dashboard/data', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (dashRes.ok) {
      const data = await dashRes.json();
      allSubjects = data.subjects || [];
      renderSubjectSelection();
    } else {
      document.getElementById('subjects-grid').innerHTML = '<p class="text-neutral-500">Failed to load subjects.</p>';
    }
  } catch (e) {
    console.error(e);
    document.getElementById('subjects-grid').innerHTML = '<p class="text-neutral-500">Network error while fetching subjects.</p>';
  }
}

function renderSubjectSelection() {
  const grid = document.getElementById('subjects-grid');
  if (!grid) return;
  
  if (allSubjects.length > 0) {
    grid.innerHTML = '';
    allSubjects.forEach(sub => {
      grid.innerHTML += `
        <div class="resource-card" style="cursor: pointer;" onclick="selectSubject(${sub.id}, '${sub.name.replace(/'/g, "\\'")}')">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span class="dashboard__subject-icon dashboard__subject-icon--${sub.color}">
              <i data-lucide="${sub.icon}" style="width:24px;height:24px;"></i>
            </span>
            <i data-lucide="chevron-right" style="width:20px;height:20px;color:var(--neutral-400);"></i>
          </div>
          <h3 style="margin:0;">${sub.name}</h3>
        </div>
      `;
    });
    lucide.createIcons();
  } else {
    grid.innerHTML = '<p class="text-neutral-500" style="grid-column: 1/-1;">No subjects found.</p>';
  }
}

window.selectSubject = async function(subjectId, subjectName) {
  currentSubjectId = subjectId;
  document.getElementById('subject-selection').style.display = 'none';
  document.getElementById('quiz-section').style.display = 'block';
  
  document.getElementById('mcq-subtitle').textContent = `Subject: ${subjectName}`;
  
  const token = localStorage.getItem('token');
  
  try {
    const resQuestions = await fetch(`https://unisprep-bach.onrender.com/api/questions?subject_id=${subjectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const questionsGrid = document.getElementById('questions-grid');
    const quizWrapper = document.getElementById('quiz-wrapper');
    quizWrapper.innerHTML = ''; // clear any active quiz
    
    if (resQuestions.ok) {
      const json = await resQuestions.json();
      allQuestions = json.data || [];
      
      if (allQuestions.length > 0) {
        questionsGrid.innerHTML = `
          <div class="resource-card" style="grid-column: 1 / -1; align-items: center; text-align: center; padding: 40px;">
            <i data-lucide="clipboard-list" style="width:48px;height:48px;color:var(--primary-500);margin-bottom:16px;"></i>
            <h3>Practice Quiz Available</h3>
            <p class="text-neutral-500" style="margin-bottom:20px;">Test your knowledge with ${allQuestions.length} multiple choice questions.</p>
            <button onclick="startQuiz()" class="btn btn--primary">Start Quiz</button>
          </div>
        `;
      } else {
        questionsGrid.innerHTML = '<p class="text-neutral-500" style="grid-column: 1/-1;">No MCQs Available Yet.</p>';
      }
    } else {
      questionsGrid.innerHTML = '<p class="text-neutral-500" style="grid-column: 1/-1;">Practice questions are currently unavailable.</p>';
    }
    lucide.createIcons();
  } catch (err) {
    console.error(err);
  }
}

window.backToSubjects = function() {
  document.getElementById('quiz-section').style.display = 'none';
  document.getElementById('subject-selection').style.display = 'block';
  document.getElementById('mcq-subtitle').textContent = 'Select a subject to start practicing multiple choice questions.';
  document.getElementById('questions-grid').innerHTML = '';
  document.getElementById('quiz-wrapper').innerHTML = '';
}


// Quiz Logic (Copied and adapted from subject.js)

window.startQuiz = function() {
  currentQuestionIndex = 0;
  userAnswers = {};
  document.getElementById('questions-grid').innerHTML = ''; // Hide start button
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
        <button onclick="backToSubjects()" class="btn btn--secondary">Back to Subjects</button>
        <button onclick="restartQuiz()" class="btn btn--primary">Restart Quiz</button>
      </div>
      
      ${reviewHtml}
    </div>
  `;
  lucide.createIcons();

  // Save to backend
  const token = localStorage.getItem('token');

  try {
    const res = await fetch('https://unisprep-bach.onrender.com/api/activity_scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subject_id: currentSubjectId,
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
