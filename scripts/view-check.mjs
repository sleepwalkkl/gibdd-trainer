import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const bank = JSON.parse(readFileSync(new URL('../dist/questions.json',import.meta.url)));
const json = path => JSON.parse(readFileSync(new URL('../dist/'+path,import.meta.url)));
let progress = null, view = null, events = {}, lifecycle = {}, visibility, serial = 0;
const answers = Array.from({length:5},(_,i)=>({dataset:{answer:i}}));
const topic = {dataset:{topic:'0'}};
const dom = {
  innerHTML:'',
  querySelector:()=>({scrollIntoView(){}}),
  querySelectorAll:selector => selector === '[data-answer]' ? answers :
    selector === '[data-topic]' ? [topic] : [],
  addEventListener:(name,fn)=>events[name]=fn
};
globalThis.document = {querySelector:()=>dom, addEventListener:(name,fn)=>visibility=fn};
globalThis.window = {scrollY:0,scrollTo(){}, addEventListener:(name,fn)=>lifecycle[name]=fn};
globalThis.sessionStorage = {getItem:()=>view,setItem:(_,s)=>view=s};
globalThis.localStorage = {getItem:()=>progress,setItem:(_,s)=>progress=s};
globalThis.fetch = async path=>({ok:true,json:()=>json(path.slice(2))});
globalThis.alert = ()=>{throw Error('Unexpected alert');};
globalThis.confirm = ()=>true;
const interval = globalThis.setInterval;
const timeout = globalThis.setTimeout, cancelTimeout = globalThis.clearTimeout;
let pending;
globalThis.setTimeout = (fn, delay) => { assert.equal(delay,300); pending=fn; return 1; };
globalThis.clearTimeout = () => { pending=null; };
const advance = () => { assert.ok(pending); const fn=pending; pending=null; fn(); };
globalThis.setInterval = ()=>0;
const load = async()=>{await import('../dist/app.js?view-test='+serial++);};
const click = action=>events.click({target:{closest:()=>({dataset:{action}})}});
try {
  await load();
  click('topics');
  topic.onclick();
  const first = JSON.parse(view).session;
  const firstQuestion = bank.find(q=>q.id===first.ids[first.index]);
  answers[(firstQuestion.correct+1)%firstQuestion.answers.length].onclick();
  let saved = JSON.parse(view);
  assert.equal(saved.name,'question');
  assert.equal(saved.session.mode,'practice');
  assert.equal(saved.session.feedback,true);
  const original = saved.session;
  lifecycle.pagehide();
  await load();
  assert.deepEqual(JSON.parse(view).session, original);
  assert.ok(dom.innerHTML.includes('Следующий вопрос'));
  click('next');
  const index = JSON.parse(view).session.index;
  visibility();
  await load();
  assert.equal(JSON.parse(view).session.index,index);
  let active = JSON.parse(view).session;
  let question = bank.find(q=>q.id===active.ids[active.index]);
  answers[question.correct].onclick();
  assert.equal(JSON.parse(view).session.index,index);
  assert.ok(dom.innerHTML.includes(' correct'));
  assert.ok(dom.innerHTML.includes('Верно'));
  advance();
  assert.equal(JSON.parse(view).session.index,index+1);
  assert.equal(JSON.parse(view).session.feedback,false);
  while (!dom.innerHTML.includes('Практика завершена')) {
    active = JSON.parse(view).session;
    question = bank.find(q=>q.id===active.ids[active.index]);
    answers[question.correct].onclick();
    advance();
  }
  assert.ok(dom.innerHTML.includes('Практика завершена'));

  click('home'); await load();
  assert.ok(dom.innerHTML.includes('Разберись в том'));
  click('start-exam');
  const exam = JSON.parse(progress).exam;
  answers[1].onclick(); lifecycle.pagehide();
  await load();
  saved = JSON.parse(view);
  assert.equal(saved.session.selected,1);
  assert.equal(saved.session.deadline,exam.deadline);
  assert.ok(dom.innerHTML.includes('Подтвердить ответ'));

  click('history'); await load();
  assert.equal(JSON.parse(view).name,'history');
  click('home'); click('marathon');
  lifecycle.pagehide(); await load();
  assert.equal(JSON.parse(view).session.marathon,true);
  const marathon = JSON.parse(view).session;
  const marathonQuestion = bank.find(q=>q.id===marathon.ids[marathon.index]);
  answers[marathonQuestion.correct].onclick();
  advance();
  assert.equal(JSON.parse(view).session.index,marathon.index+1);

  const current = JSON.parse(view).session;
  const correct = bank.find(q=>q.id===current.ids[current.index]).correct;
  answers[correct].onclick();
  const stale = pending;
  click('home');
  assert.equal(pending,null);
  stale();
  assert.ok(dom.innerHTML.includes('Разберись в том'));

  view = '{"name":"question","session":{"ids":["bad"],"index":0}}';
  await load();
  assert.equal(JSON.parse(view).name,'home');
  console.log('Восстановление теста, ответа, марафона, экзамена и экрана после перезагрузки проверено.');
} finally {
  globalThis.setInterval = interval;
  globalThis.setTimeout = timeout; globalThis.clearTimeout = cancelTimeout;
}
