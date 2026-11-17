import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeExam} from '../dist/engine.js';
import {drawPractice,readSelection,trainingTopics} from '../dist/selection.js';
const bank=JSON.parse(readFileSync(new URL('../dist/questions.json',import.meta.url)));
let ledger=readSelection(null,bank);
const seen=Array.from({length:4},()=>new Set());
for(let attempt=0;attempt<80;attempt++){
  if(attempt===40)seen.forEach(group=>group.clear());
  const exam=makeExam(bank,()=>0,ledger.exam);
  assert.equal(exam.questions.length,20);
  for(let group=0;group<4;group++){
    const ticket=exam.tickets[group];
    assert.ok(!seen[group].has(ticket),'Блок повторился до исчерпания банка');
    seen[group].add(ticket);
    ledger.exam[group][ticket-1]++;
    const block=exam.questions.slice(group*5,group*5+5);
    assert.ok(block.every(q=>q.ticket===ticket && q.group===group));
  }
  ledger=readSelection(JSON.parse(JSON.stringify(ledger)),bank);
}
assert.ok(ledger.exam.flat().every(n=>n===2));
const topics=trainingTopics(bank);
assert.equal(new Set(topics.flatMap(t=>t.questions.map(q=>q.id))).size,800);
for(const title of ['Эксплуатация и неисправности ТС','Медицинская помощь',
  'Документы и обязанности водителя','Штрафы и ответственность','Трамваи и трамвайные пути']){
  const topic=topics.find(t=>t.title===title);
  assert.ok(topic.questions.length>0,title);
  const counts={},ids=new Set();
  while(ids.size<topic.questions.length){
    const drawn=drawPractice(topic.questions,counts,()=>0);
    assert.ok(drawn.length>0 && drawn.length<=20);
    for(const q of drawn){assert.ok(!ids.has(q.id));ids.add(q.id);counts[q.id]=(counts[q.id]||0)+1;}
  }
}
assert.deepEqual(drawPractice([],{}),[]);
const oldHistory=[{questions:bank.slice(0,20).map(q=>({id:q.id}))}];
assert.ok(readSelection(null,bank,oldHistory).exam.every(group=>group[0]===1));
console.log('80 экзаменов: блоки не повторяются в пределах круга из 40 попыток.');
console.log('Тематические тесты покрывают все 800 вопросов, выборка без повторов до конца круга.');
console.log(topics.slice(0,5).map(t=>t.title+': '+t.questions.length).join('\n'));
