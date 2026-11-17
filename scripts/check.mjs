import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { makeExam, gradeMain, makeExtra } from '../dist/engine.js';
const bank=JSON.parse(readFileSync(new URL('../dist/questions.json',import.meta.url)));
assert.equal(bank.length,800);
assert.equal(new Set(bank.map(q=>q.id)).size,800);
for(const q of bank){
  assert.ok(q.answers[q.correct]);
  assert.ok(q.explanation);
  if(q.image) assert.ok(existsSync(new URL('../dist/'+q.image,import.meta.url)));
}
const {questions,tickets}=makeExam(bank,()=>0);
assert.equal(questions.length,20);
assert.deepEqual(questions.map(q=>q.number),Array.from({length:20},(_,i)=>i+1));
const answers=Object.fromEntries(questions.map(q=>[q.id,q.correct]));
assert.equal(gradeMain(questions,answers).errors.length,0);
answers[questions[0].id]=-1;
assert.deepEqual(gradeMain(questions,answers).groups,[0]);
answers[questions[5].id]=-1;
assert.equal(gradeMain(questions,answers).failed,false);
const extra=makeExtra(bank,[0,1],tickets,()=>0);
assert.equal(extra.length,10);
assert.ok(extra.every(q=>q.ticket!==tickets[q.group]));
answers[questions[1].id]=-1;
assert.equal(gradeMain(questions,answers).failed,true);
delete answers[questions[1].id];
assert.equal(gradeMain(questions,answers).failed,true);
console.log('Bank, assets, exam blocks, error rules and extra blocks verified');
await import('./cache-version.mjs');
await import('./sessions-check.mjs');

await import("./view-check.mjs");

await import("./selection-check.mjs");
