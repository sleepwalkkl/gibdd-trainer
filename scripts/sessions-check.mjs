// Проверяем настоящие обработчики приложения с управляемыми часами и хранилищем.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readProgress} from '../dist/progress.js';
const json=name=>JSON.parse(readFileSync(new URL('../dist/'+name,import.meta.url)));
const bank=json('questions.json'), byId=new Map(bank.map(q=>[q.id,q]));
const empty={solved:[],mistakes:[],history:[],marathon:null,exam:null};
let now=10000000, stored=JSON.stringify(empty), serial=0, events, visibility, alertCount=0;
const dom={querySelector:()=>({}),querySelectorAll:()=>[],addEventListener:(key,fn)=>events[key]=fn};
globalThis.document={querySelector:()=>dom,addEventListener:(key,fn)=>visibility=fn};
globalThis.localStorage={getItem:()=>stored,setItem:(_,s)=>stored=s};
globalThis.fetch=async path=>({ok:true,json:()=>json(path.slice(2))});
globalThis.alert=()=>alertCount++;
globalThis.confirm=()=>true;
const oldNow=Date.now, oldInterval=setInterval;
Date.now=()=>now; globalThis.setInterval=()=>0;
const state=()=>JSON.parse(stored);
async function load(){events={};await import('../dist/app.js?test='+serial++);}
const click=action=>events.click({target:{closest:()=>({dataset:{action}})}});
const upload=data=>events.change({target:{id:'import',files:[{text:async()=>JSON.stringify(data)}]}});
const start=async()=>{stored=JSON.stringify(empty);await load();click('start-exam');return state().exam;};
function submit(i){
  const els=Array.from({length:5},(_,i)=>({dataset:{answer:i}}));
  dom.querySelectorAll=k=>k==='[data-answer]'?els:[];
  click('exam-info'); els[i].onclick();click('confirm');
}
try{
  let exam=await start();
  for(let i=0;i<2;i++){const q=byId.get(exam.ids[i]);submit((q.correct+1)%q.answers.length);}
  assert.equal(state().history[0].errors,2);assert.equal(state().mistakes.length,2);
  for(const skips of [[0],[0,5],[0,1],[0,5,10]]){
    exam=await start();const data=state();
    for(const [i,id] of data.exam.ids.entries())if(!skips.includes(i))data.exam.answers[id]=byId.get(id).correct;
    stored=JSON.stringify(data);now=exam.deadline+60000;await load();click('exam-info');
    if(skips.length<=2 && skips[1]!==1){
      const extra=state().exam;assert.equal(extra.ids.length,5*skips.length);
      assert.equal(extra.deadline,exam.deadline+300000*skips.length);
      assert.deepEqual(readProgress(state(),bank).exam,extra);
      now=extra.deadline;visibility();assert.equal(state().history[0].at,now);
    }
    assert.equal(state().exam,null);assert.equal(state().history.length,1);assert.equal(state().history[0].passed,false);
  }
  exam=await start();for(const id of exam.ids)submit(byId.get(id).correct);
  assert.equal(state().history[0].passed,true);
  const backup=state();backup.exam=exam;
  const hard=bank.filter(q=>q.hard).map(q=>q.id);
  backup.marathon={mode:'practice',ids:hard,index:1,answers:{[hard[0]]:byId.get(hard[0]).correct},marathon:true,feedback:false,title:'Марафон'};
  await upload({version:1,...backup});assert.deepEqual(state(),backup);
  const broken=structuredClone(backup);broken.exam.index=700;
  await upload({version:1,...broken});assert.equal(alertCount,1);assert.deepEqual(state(),backup);
  now=exam.deadline+600000;await load();click('exam-info');assert.equal(state().exam,null);
  console.log('Проверены восстановление экзамена, сроки, ошибки и полный импорт прогресса.');
}finally{Date.now=oldNow;globalThis.setInterval=oldInterval;}
