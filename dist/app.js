import { randomUnit, drawPractice, readSelection, trainingTopics } from './selection.js';
import { readProgress } from './progress.js';
import { makeExam, gradeMain, makeExtra } from './engine.js';
const app = document.querySelector('#app');
const KEY = 'gibdd-progress-v1';
let lastExamResult;
const DRAW_KEY = 'gibdd-selection-v1';
let selection;
function saveSelection() {
  try { localStorage.setItem(DRAW_KEY,JSON.stringify(selection)); }
  catch { savingAvailable = false; }
}
let bank, research, session = null, savingAvailable = true;
let state = { mistakes: [], solved: [], history: [], marathon: null, exam: null };
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { savingAvailable = false; }
}
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const find = id => bank.find(q => q.id === id);
const button = (text, action, className = '') => '<button class="' + className + '" data-action="' + action + '">' + esc(text) + '</button>';
const VIEW_KEY = 'gibdd-view-v1';
let currentView = {name:'home', args:[]};
let advanceTimer;
function rememberView(name, ...args) {
  clearTimeout(advanceTimer);
  currentView = {name, args};
  persistView();
}
function persistView() {
  try {
    sessionStorage.setItem(VIEW_KEY, JSON.stringify({
      ...currentView, session:currentView.name === 'question' ? session : null,
      result:lastExamResult, scrollY:window.scrollY
    }));
  } catch { /* Занятия доступны и при запрете хранилища. */ }
}
function restoreView() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(VIEW_KEY) || 'null');
    if (!saved) return false;
    if (saved.name === 'question') {
      const active = saved.session;
      if (!active || !Array.isArray(active.ids) || !active.ids.length ||
          !Number.isInteger(active.index) || active.index < 0 || active.index >= active.ids.length ||
          !active.ids.every(id => find(id)) || !active.answers || typeof active.answers !== 'object') return false;
      if (active.mode === 'exam') {
        // Проверяем сессию тем же валидатором, что и резервную копию.
        session = readProgress({...state, exam:active}, bank).exam;
        const q = find(session.ids[session.index]);
        if (Number.isInteger(active.selected) && active.selected >= 0 && active.selected < q.answers.length)
          session.selected = active.selected;
      } else {
        if (active.mode !== 'practice' || typeof active.title !== 'string' ||
            !Object.entries(active.answers).every(([id,answer]) =>
              active.ids.includes(id) && Number.isInteger(answer) && answer >= 0 && answer < find(id).answers.length))
          return false;
        session = active;
        session.feedback = session.answers[session.ids[session.index]] !== undefined;
      }
      renderQuestion();
    } else {
      const screens = {home:renderHome, topics:renderTopics, sources, history:renderHistory,
        'exam-info':examInfo, attempt:renderAttempt, 'exam-result':renderExamResult,
        'exam-mistakes':renderExamMistakes};
      if (!screens[saved.name] || !Array.isArray(saved.args)) return false;
      if (saved.name === 'attempt') {
        const [index,position] = saved.args;
        if (!Number.isInteger(index) || !Number.isInteger(position) ||
            !state.history[index]?.questions?.[position]) return false;
      }
      if (saved.name === 'exam-result' || saved.name === 'exam-mistakes') {
        if (!saved.result || !Array.isArray(saved.result.mistakes) ||
            !saved.result.mistakes.every(row => find(row.id))) return false;
        lastExamResult = saved.result;
      }
      screens[saved.name](...saved.args);
    }
    if (Number.isFinite(saved.scrollY)) window.scrollTo({top:saved.scrollY});
    return true;
  } catch { return false; }
}

function renderHome() {
  rememberView('home');
  session = null;
  const hard = bank.filter(q => q.hard);
  const learned = hard.filter(q => state.solved.includes(q.id) && !state.mistakes.includes(q.id)).length;
  app.innerHTML = '<section class="hero"><p class="eyebrow">Сложные вопросы ПДД</p><h1>Разберись в том,<br>где чаще ошибаются.</h1><p class="muted">Практика по темам, длинная дистанция и проверка в условиях экзамена.</p></section>' +
    '<div class="metrics"><div><strong>' + hard.length + '</strong>в подборке</div><div><strong>' + learned + '</strong>разобрано</div><div><strong>' + state.mistakes.length + '</strong>к повторению</div></div>' +
    '<section class="cards"><article class="card featured"><span class="tag">800 вопросов · по темам</span><h2>Тесты</h2><p>Выбери тему и разберись со сложными ситуациями.</p>' + button('Выбрать тему','topics') + '</article><article class="card"><span class="tag">' + hard.length + ' вопросов</span><h2>Марафон</h2><p>Вся подборка подряд. Можно остановиться и продолжить позже.</p>' + button(state.marathon ? 'Продолжить марафон' : 'Начать марафон','marathon') + '</article><article class="card"><span class="tag">20 вопросов · 20 минут</span><h2>Экзамен</h2><p>Полный банк, случайные блоки и дополнительные вопросы за ошибки.</p>' + button(state.exam ? 'Продолжить экзамен' : 'К экзамену','exam-info') + (state.exam ? button('Новая попытка','new-exam','quiet') : '') + '</article></section>' +
    '<section class="panel row"><div><h2>Закрепи результат</h2><p class="muted">Вернись к вопросам, в которых ошибся.</p></div>' + button('Повторить ошибки','mistakes','quiet') + '</section>' +
    '<p class="notice">Банк AB — 800 вопросов. Проверка редакции на 2026 год продолжается. Подборка сложности проверена 17 ноября 2026.</p>' +
    (!savingAvailable ? '<p role="alert">Браузер не разрешает сохранять прогресс. Экспортируй его перед закрытием.</p>' : '') +
    '<div class="row">' + button('Экспорт прогресса','export','quiet') + '<label>Импорт прогресса <input id="import" type="file" accept="application/json"></label></div>' +
    '<p>' + button('История экзаменов','history','quiet') + '</p>';
}
function renderTopics() {
  rememberView('topics');
  const topics = trainingTopics(bank);
  app.innerHTML = '<p class="eyebrow">Тематическая практика</p><h1>Выбери тему</h1>' +
    '<p class="muted">Все темы банка из 800 вопросов. В тесте до 20 вопросов: сначала те, которые встречались реже. В конце круга тест может быть короче.</p>' +
    '<div class="topics">' + topics.map((t,i) => '<button class="topic" data-topic="' + i + '">' +
      esc(t.title) + '<span>' + t.questions.length + '</span></button>').join('') + '</div>';
  app.querySelectorAll('[data-topic]').forEach(el => el.onclick = () => {
    const chosen = topics[+el.dataset.topic];
    startPractice(chosen.questions,chosen.title);
  });
}
function startPractice(questions, title, marathon = false) {
  if (!questions.length) { app.innerHTML = '<section class="empty"><h1>Ошибок пока нет</h1><p>Начни тест или марафон — вопросы для повторения появятся здесь.</p>' + button('К режимам','home') + '</section>'; return; }
  if (!marathon) {
    questions = drawPractice(questions,selection.practice);
    for (const q of questions) selection.practice[q.id] = (selection.practice[q.id] || 0) + 1;
    saveSelection();
  }
  session = { mode:'practice', ids:questions.map(q => q.id), index:0, answers:{}, title, marathon, feedback:false };
  if (marathon && state.marathon && state.marathon.ids.every(id => find(id))) {
    session = { ...session, ...state.marathon, feedback:false };
    if (session.answers[session.ids[session.index]] !== undefined) session.feedback = true;
  }
  checkpoint();
  renderQuestion();
}
function checkpoint() {
  if (session.mode === 'exam') state.exam = session;
  if (session.marathon) state.marathon = session;
  save();
  persistView();
}
function renderQuestion() {
  if (!session) return;
  const q = find(session.ids[session.index]);
  if (!q) return finishPractice();
  rememberView('question');
  const isExam = session.mode === 'exam';
  const picked = session.answers[q.id];
  app.innerHTML = '<section class="question"><div class="row"><span class="eyebrow">' + esc(session.title) + '</span>' + (isExam ? '<span id="clock" class="time"></span>' : '<span>' + (session.index + 1) + ' / ' + session.ids.length + '</span>') + '</div><div class="progress"><span style="width:' + (100 * session.index / session.ids.length) + '%"></span></div>' +
    '<p class="muted">Билет ' + q.ticket + ' · вопрос ' + q.number + '</p><h1>' + esc(q.question) + '</h1>' +
    (q.image ? '<img class="scene" src="./' + esc(q.image) + '" alt="Дорожная ситуация к вопросу">' : '') +
    '<div class="answers">' + q.answers.map((a,i) => {
      let cls = 'answer';
      if (isExam && session.selected === i) cls += ' selected';
      if (!isExam && session.feedback && i === q.correct) cls += ' correct';
      if (!isExam && session.feedback && picked === i && i !== q.correct) cls += ' wrong';
      return '<button class="' + cls + '" data-answer="' + i + '" ' + (picked !== undefined || session.feedback ? 'disabled' : '') + '><span class="letter">' + (i + 1) + '</span><span>' + esc(a) + '</span></button>';
    }).join('') + '</div>' +
    (isExam ? '<div class="panel row">' + button('Подтвердить ответ','confirm') + button('Пропустить','skip','quiet') + '</div><div class="navigation">' + session.ids.map((id,i) => '<button aria-label="Вопрос ' + (i+1) + '" class="dot ' + (session.answers[id] !== undefined ? 'answered ' : '') + (i === session.index ? 'active' : '') + '" data-index="' + i + '">' + (i+1) + '</button>').join('') + '</div>' + button('Завершить досрочно','end-exam','quiet') :
      session.feedback ? '<section class="explanation' + (picked === q.correct ? ' success' : '') + '"><h2>' +
        (picked === q.correct ? 'Верно' : 'Неверно') + '</h2>' +
        (picked === q.correct ? '' : '<p><strong>Правильный ответ:</strong> ' + esc(q.answers[q.correct]) + '</p><p>' + esc(q.explanation) + '</p>') +
        button(session.index === session.ids.length - 1 ? 'Посмотреть результат' : 'Следующий вопрос','next') + '</section>' : '') + '</section>';
  app.querySelectorAll('[data-answer]').forEach(el => el.onclick = () => answer(+el.dataset.answer));
  app.querySelectorAll('[data-index]').forEach(el => el.onclick = () => { session.index = +el.dataset.index; session.selected = null; checkpoint(); renderQuestion(); });
  if (!isExam && session.feedback && picked === q.correct) {
    const active = session, position = session.index;
    advanceTimer = setTimeout(() => {
      if (session === active && session.index === position && currentView.name === 'question') next();
    }, 1000);
  }
  if (isExam) { app.querySelector('[data-action="confirm"]').disabled = session.selected == null || picked !== undefined; tick(); }
}
function record(q, picked) {
  if (picked === q.correct) {
    state.solved = [...new Set([...state.solved, q.id])];
    state.mistakes = state.mistakes.filter(id => id !== q.id);
  } else state.mistakes = [...new Set([...state.mistakes, q.id])];
}
function answer(picked) {
  const q = find(session.ids[session.index]);
  if (session.answers[q.id] !== undefined) return;
  if (session.mode === 'exam') { session.selected = picked; renderQuestion(); return; }
  session.answers[q.id] = picked;
  record(q,picked);
  session.feedback = true;
  checkpoint();
  renderQuestion();
  app.querySelector('.explanation').scrollIntoView({block:'nearest'});
}
function next() {
  session.index++;
  session.feedback = false;
  checkpoint();
  if (session.index >= session.ids.length) finishPractice();
  else { renderQuestion(); window.scrollTo({top:0}); }
}
function finishPractice() {
  if (!session) return;
  const total = session.ids.length;
  const right = session.ids.filter(id => session.answers[id] === find(id).correct).length;
  if (session.marathon) state.marathon = null;
  save(); session = null;
  app.innerHTML = '<section class="hero"><p class="eyebrow">Практика завершена</p><h1>' + right + ' из ' + total + '</h1><p>Ошибки сохранены для повторения.</p>' + button('К режимам','home') + ' ' + button('Повторить ошибки','mistakes','quiet') + '</section>';
}
function examInfo() {
  rememberView('exam-info');
  if (state.exam) { session = state.exam; session.selected = null; renderQuestion(); return; }
  app.innerHTML = '<section class="panel"><p class="eyebrow">Экзамен · категория B</p><h1>Проверь готовность</h1><p>20 вопросов за 20 минут. Билет состоит из четырёх случайных блоков по пять вопросов. Выбирай вопросы в любом порядке и подтверждай каждый ответ.</p><p>Одна ошибка — ещё 5 вопросов за 5 минут. Две ошибки в разных блоках — 10 вопросов за 10 минут. Две ошибки в одном блоке, три ошибки в билете или ошибка в дополнительном блоке завершают экзамен.</p><p>Пропущенный вопрос по окончании времени считается ошибкой. Пояснения будут доступны после результата. Таймер продолжает идти при закрытии страницы.</p>' + button('Начать экзамен','start-exam') + '</section>';
}
function startExam() {
  const exam = makeExam(bank,randomUnit,selection.exam);
  exam.tickets.forEach((ticket,group)=>selection.exam[group][ticket-1]++);
  saveSelection();
  session = { mode:'exam', phase:'main', ids:exam.questions.map(q => q.id), tickets:exam.tickets, mainIds:exam.questions.map(q => q.id), answers:{}, index:0, selected:null, deadline:Date.now()+1200000, started:Date.now(), title:'Экзамен' };
  checkpoint(); renderQuestion();
}
function confirmAnswer() {
  if (!session || session.selected == null || Date.now() >= session.deadline) return tick();
  const q = find(session.ids[session.index]);
  if (session.answers[q.id] !== undefined) return;
  session.answers[q.id] = session.selected;
  session.selected = null;
  const answeredErrors = session.ids.filter(id => session.answers[id] !== undefined && session.answers[id] !== find(id).correct);
  if ((session.phase === 'extra' && answeredErrors.length) || (session.phase === 'main' && (answeredErrors.length >= 3 || new Set(answeredErrors.map(id => find(id).group)).size !== answeredErrors.length))) return finishExam(false, false);
  if (session.ids.every(id => session.answers[id] !== undefined)) return endPhase();
  session.index = session.ids.findIndex(id => session.answers[id] === undefined);
  checkpoint(); renderQuestion();
}
function endPhase() {
  if (session.phase === 'extra') {
    const pass = session.ids.every(id => session.answers[id] === find(id).correct);
    return finishExam(pass);
  }
  const grade = gradeMain(session.mainIds.map(find),session.answers);
  if (grade.failed) return finishExam(false);
  if (!grade.errors.length) return finishExam(true);
  const extra = makeExtra(bank,grade.groups,session.tickets,randomUnit);
  session.phase = 'extra'; session.ids = extra.map(q => q.id); session.index = 0;
  session.selected = null; session.deadline = Math.min(Date.now(), session.deadline)+grade.errors.length*300000;
  session.title = 'Дополнительные вопросы';
  checkpoint(); renderQuestion();
}
function finishExam(passed, countUnanswered = true) {
  const all = [...new Set([...session.mainIds,...session.ids])];
  const ended=Math.min(Date.now(),session.deadline);
  const elapsed=Math.max(0,Math.floor((ended-session.started)/1000));
  const assessed = all.filter(id => countUnanswered || session.answers[id] !== undefined ||
    (session.phase === 'extra' && session.mainIds.includes(id)));
  const errors = assessed.filter(id => session.answers[id] !== find(id).correct);
  assessed.forEach(id => record(find(id),session.answers[id]));
  const questions = all.map(id => ({
    id, picked: session.answers[id] ?? null, assessed: assessed.includes(id)
  }));
  state.history.push({at:ended,passed,errors:errors.length,questions});
  state.history = state.history.slice(-100);
  lastExamResult = {
    passed, elapsed,
    mistakes: errors.map(id => ({ id, picked: session.answers[id] }))
  };
  state.exam = null; save(); session = null;
  renderExamResult();
}
function renderExamResult() {
  rememberView('exam-result');
  const {passed, elapsed, mistakes} = lastExamResult;
  app.innerHTML = '<section class="hero"><p class="eyebrow">Экзамен завершён</p><h1>' +
    (passed ? 'Сдал' : 'Не сдал') + '</h1><p>Ошибок и пропусков — ' + mistakes.length +
    '. Время: ' + Math.floor(elapsed/60) + ' мин ' + elapsed%60 + ' с.</p>' +
    button('Новый экзамен','start-exam') + ' ' + button('К режимам','home','quiet') + ' ' + button('Мои ошибки','exam-mistakes','quiet') + ' ' +
    button('Посмотреть экзамен','attempt-' + (state.history.length-1),'quiet') + '</section>';
}
function questionReview(id, picked) {
  const q = find(id);
  const correct = picked === q.correct;
  return (q.image ? '<img class="scene" src="./' + esc(q.image) + '" alt="Дорожная ситуация к вопросу">' : '') +
    (picked == null ? '<p><strong>Вопрос пропущен</strong></p>' :
      '<p><strong>Ваш ответ:</strong> ' + esc(q.answers[picked]) + '</p>') +
    (correct ? '' : '<p><strong>Правильный ответ:</strong> ' + esc(q.answers[q.correct]) + '</p><p>' + esc(q.explanation) + '</p>');
}
function renderHistory() {
  rememberView('history');
  const entries = state.history.map((entry, index) => {
    const title = 'Попытка ' + (index+1) + ' · ' + new Date(entry.at).toLocaleString('ru-RU') +
      ' · ' + (entry.passed ? 'Сдал' : 'Не сдал') + ' · ошибок и пропусков: ' + entry.errors;
    const detail = entry.questions
      ? button('Открыть экзамен', 'attempt-' + index)
      : '<p class="muted">Сохранён только итог. В этой записи нет вопросов и ваших ответов.</p>';
    return '<li class="panel"><h2>' + esc(title) + '</h2>' + detail + '</li>';
  }).reverse();
  app.innerHTML = '<h1>История экзаменов</h1>' + button('К режимам','home','quiet') +
    (entries.length ? '<ul class="attempt-list">' + entries.join('') + '</ul>' : '<p>Здесь появятся завершённые экзамены.</p>');
}
function renderAttempt(index, position = 0) {
  rememberView('attempt', index, position);
  const entry = state.history[index];
  const {id, picked, assessed} = entry.questions[position];
  const q = find(id);
  const total = entry.questions.length;
  const action = number => 'attempt-' + index + '-' + number;
  const status = !assessed ? 'Не оценивался' : picked === null ? 'Пропущен' : picked === q.correct ? 'Верно' : 'Ошибка';
  const options = q.answers.map((answer, i) => {
    const labels = [];
    if (i === picked) labels.push('Ваш ответ');
    if (i === q.correct) labels.push('Правильный ответ');
    const color = i === q.correct ? ' correct' : i === picked ? ' wrong' : '';
    return '<div class="answer' + color + '"><span class="letter">' + (i+1) + '</span><span>' +
      esc(answer) + (labels.length ? '<br><strong>' + labels.join(' · ') + '</strong>' : '') + '</span></div>';
  }).join('');
  const numbers = entry.questions.map((_, i) =>
    '<button class="dot' + (i === position ? ' active' : '') + '" aria-label="Вопрос ' + (i+1) + '"' +
    (i === position ? ' aria-current="step"' : '') + ' data-action="' + action(i) + '">' + (i+1) + '</button>'
  ).join('');
  app.innerHTML = '<section class="question"><div class="row"><span class="eyebrow">Попытка ' + (index+1) +
    ' · ' + (entry.passed ? 'Сдал' : 'Не сдал') + '</span>' + button('К истории','history','quiet') +
    '</div><nav class="navigation" aria-label="Вопросы экзамена">' + numbers + '</nav><p>Вопрос ' +
    (position+1) + ' из ' + total + (position >= 20 ? ' · Дополнительный блок' : '') + ' · ' + status +
    '</p><p class="muted">Билет ' + q.ticket + ' · вопрос ' + q.number + '</p><h1>' + esc(q.question) + '</h1>' +
    (q.image ? '<img class="scene" src="./' + esc(q.image) + '" alt="Дорожная ситуация к вопросу">' : '') +
    '<div class="answers">' + options + '</div>' +
    (assessed && picked !== q.correct ? '<section class="explanation"><h2>Пояснение</h2><p>' + esc(q.explanation) + '</p></section>' : '') +
    '<nav class="navigation" aria-label="Перелистывание">' +
    (position > 0 ? button('← Назад',action(position-1),'quiet') : '') +
    (position+1 < total ? button('Далее →',action(position+1)) : button('К истории','history')) + '</nav></section>';
  window.scrollTo({top:0});
}
function renderExamMistakes() {
  rememberView('exam-mistakes');
  const cards = lastExamResult.mistakes.map(({id, picked}) => {
    const q = find(id);
    return '<article class="panel"><p class="eyebrow">Билет ' + q.ticket + ' · вопрос ' + q.number +
      '</p><h2>' + esc(q.question) + '</h2>' + questionReview(id,picked) + '</article>';
  });
  app.innerHTML = '<h1>Мои ошибки</h1>' + button('К результату','exam-result','quiet') + ' ' +
    button('К режимам','home','quiet') +
    (cards.length ? cards.join('') : '<p>Все вопросы этого экзамена решены верно.</p>');
}
function tick() {
  if (!session || session.mode !== 'exam') return;
  const left = Math.max(0,Math.ceil((session.deadline-Date.now())/1000));
  const clock = document.querySelector('#clock');
  if (clock) clock.textContent = String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
  if (!left) endPhase();
}
function sources() {
  rememberView('sources');
  session = null;
  const entries=bank.filter(q=>q.hard).map(q=>{
    const links=q.evidence.map(key=>key==='drom'
      ? '<a href="https://www.drom.ru/pdd/themes/hard/">Подборка Дрома</a>'
      : '<a href="https://pdd-exam.ru/diff/100/">Подборка по ответам PDD-EXAM</a>');
    const stat=research.top10.find(x=>x.id===q.id);
    return '<li>Билет '+q.ticket+', вопрос '+q.number+' · '+esc(q.topics.join(', '))+' — '+links.join('; ')+(stat?' · ошибок на PDD-EXAM: '+stat.errorPercent+'%':'')+'</li>';
  }).join('');
  app.innerHTML='<p class="eyebrow">Исследование · 17 ноября 2026</p><h1>Почему эти вопросы</h1><p>'+research.selectionCount+' вопросов — объединение подборки PDD-EXAM (100) и Дрома (19), с удалением '+research.overlap+' совпадений по номеру билета и вопроса.</p><p>На форумах и в комментариях повторяются затруднения с формулировками, траекториями и похожими ситуациями. Эти наблюдения использованы для выбора формата объяснений. Частота обсуждения сама по себе не определяет сложность.</p><p>Проценты ниже опубликованы PDD-EXAM для своей аудитории. Метод подсчёта, независимость ответов и размер выборки по каждому вопросу не проверены. Это ориентир внутри одного источника.</p><table><thead><tr><th>Билет / вопрос</th><th>Ошибки по источнику</th></tr></thead><tbody>'+research.top10.map(x=>'<tr><td>'+esc(x.id.replace('-',' / '))+'</td><td>'+x.errorPercent+'%</td></tr>').join('')+'</tbody></table><h2>Сложные вопросы по темам</h2><p class="muted">Число отобранных вопросов показывает состав подборки. У вопроса может быть несколько тем.</p>'+Object.entries(research.byTopic).map(([t,n])=>'<p>'+esc(t)+' — '+n+'</p>').join('')+'<details><summary>Основания отбора всех '+research.selectionCount+' вопросов</summary><p>Снимок от 17 ноября. Размер выборки для отдельного вопроса не опубликован.</p><ol>'+entries+'</ol></details><h2>Что вызывает затруднения</h2><p><a href="https://www.drom.ru/pdd/bilet_5/vopros_1/">Билет 5, вопрос 1: обсуждение на Дроме</a>. Ученики принимают двойную сплошную за разделительную полосу. Это наблюдение из комментариев, а не отдельная статистика ошибок.</p><h2>Материалы</h2><p><a href="https://pdd-exam.ru/diff/100/" target="_blank" rel="noopener">PDD-EXAM — подборка 100</a><br><a href="https://www.drom.ru/pdd/themes/hard/" target="_blank" rel="noopener">Дром — подборка 19</a><br><a href="https://www.drom.ru/pdd/comments/page3.html" target="_blank" rel="noopener">Обсуждения учеников</a><br><a href="https://www.consultant.ru/document/cons_doc_LAW_380236/f8d7876883620f8f1511a9ca70054b464f2f2619/" target="_blank" rel="noopener">Приказ МВД №80, порядок экзамена</a></p><p>Банк и иллюстрации взяты из <a href="https://github.com/chibsaabji/PDD-2026">PDD-2026</a>, снимок от 31 июля 2026, лицензия MIT. Репозиторий использует материалы etspring/pdd_russia. Полная сверка с официальным банком Госавтоинспекции ещё не завершена.</p><p><a href="./THIRD-PARTY-LICENSE.txt">Лицензия материалов</a></p>'+button('К режимам','home');
}
app.addEventListener('click', e => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action.startsWith('attempt-')) return renderAttempt(...action.slice(8).split('-').map(Number));
  const actions = {
    history:renderHistory, home:renderHome, topics:renderTopics, marathon:()=>startPractice(bank.filter(q=>q.hard),'Марафон',true),
    mistakes:()=>startPractice(state.mistakes.map(find).filter(Boolean),'Мои ошибки'),
    'exam-mistakes':renderExamMistakes,'exam-result':renderExamResult,
    'exam-info':examInfo,'start-exam':startExam,
    'new-exam':()=>{if(confirm('Начать новый экзамен? Незаконченная попытка будет заменена.'))startExam();},confirm:confirmAnswer,next,
    skip:()=>{session.index=(session.index+1)%session.ids.length;session.selected=null;checkpoint();renderQuestion();},
    'end-exam':()=>{if(confirm('Завершить экзамен? Неотвеченные вопросы будут считаться ошибками.'))finishExam(false);},
    export:()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,...state})],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='gibdd-progress.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  };
  actions[action]?.();
});
app.addEventListener('change', async e=>{
  if(e.target.id!=='import'||!e.target.files[0])return;
  try {
    const imported=JSON.parse(await e.target.files[0].text());
    if(imported.version!==1)throw Error();
    const restored=readProgress(imported,bank);
    if(!confirm('Заменить текущий прогресс данными из резервной копии?'))return;
    state=restored;
    save();renderHome();
  } catch {alert('Не удалось прочитать файл прогресса. Выбери файл экспорта этого тренажёра.');}
});
document.querySelector('#home').onclick=renderHome;
document.querySelector('#sources').onclick=sources;
app.innerHTML='<p>Загружаем вопросы…</p>';
try {
  const responses=await Promise.all([fetch('./questions.json'),fetch('./research.json')]);
  if(responses.some(r=>!r.ok))throw Error();
  [bank,research]=await Promise.all(responses.map(r=>r.json()));
  let saved;
  try { saved=localStorage.getItem(KEY); } catch { savingAvailable=false; }
  if(saved) {
    try { state=readProgress(JSON.parse(saved),bank); }
    catch { alert('Сохранённый прогресс не удалось прочитать. Можно восстановить резервную копию.'); }
  }
  let savedSelection;
  try { savedSelection=JSON.parse(localStorage.getItem(DRAW_KEY) || 'null'); } catch {}
  selection=readSelection(savedSelection,bank,state.history);
  if (!restoreView()) renderHome();
  setInterval(tick,500);
  document.addEventListener('visibilitychange', () => { persistView(); save(); tick(); });
  window.addEventListener('pagehide', () => { persistView(); save(); });
  window.addEventListener('pageshow', tick);
  if('serviceWorker' in navigator) {
    const offline=document.querySelector('#offline');
    navigator.serviceWorker.register('./sw.js').then(async()=>{
      await navigator.serviceWorker.ready;
      offline.textContent='Готово для занятий без интернета';
    }).catch(()=>{offline.textContent='Офлайн пока недоступен';});
  }
} catch {app.innerHTML='<h1>Не удалось загрузить вопросы</h1><p>Проверь подключение и обнови страницу.</p>';}
