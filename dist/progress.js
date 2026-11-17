// Один формат для резервной копии и локального хранилища.
export function readProgress(data, bank) {
  const byId = new Map(bank.map(q => [q.id, q]));
  const check = ok => { if (!ok) throw Error('Повреждён прогресс'); };
  const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const integer = (x,a,b) => Number.isSafeInteger(x) && x >= a && x <= b;
  const ids = x => {
    check(Array.isArray(x) && x.every(id => byId.has(id)) && new Set(x).size === x.length);
    return [...x];
  };
  const same = (a,b) => a.length === b.length && a.every((x,i) => x === b[i]);
  const time = t => integer(t,1,8640000000000000);
  check(obj(data));
  const solved = ids(data.solved), mistakes = ids(data.mistakes);
  check(Array.isArray(data.history) && data.history.length <= 100);
  const history = data.history.map(h => {
    check(obj(h) && time(h.at) && typeof h.passed === 'boolean' && integer(h.errors,0,30));
    return {at:h.at, passed:h.passed, errors:h.errors};
  });
  function restore(s, exam) {
    if (s === null) return null;
    check(obj(s));
    const current = ids(s.ids);
    check(integer(s.index,0,current.length-1) && obj(s.answers));
    const main = exam ? ids(s.mainIds) : [];
    const allowed = new Set([...main,...current]);
    const answers = Object.fromEntries(Object.entries(s.answers).map(([id,i]) => {
      check(allowed.has(id) && integer(i,0,byId.get(id).answers.length-1));
      return [id,i];
    }));
    const common = {ids:current,index:s.index,answers};
    if (!exam) {
      check(s.mode === 'practice' && s.marathon === true && current.every(id=>byId.get(id).hard));
      return {...common,mode:'practice',marathon:true,title:'Марафон',feedback:answers[current[s.index]] !== undefined};
    }
    check(s.mode === 'exam' && ['main','extra'].includes(s.phase) && time(s.started) && time(s.deadline));
    check(s.deadline >= s.started && s.deadline <= s.started+1800001);
    check(Array.isArray(s.tickets) && s.tickets.length===4 && s.tickets.every(t=>integer(t,1,40)));
    const block = (t,g) => bank.filter(q=>q.ticket===t && q.group===g).map(q=>q.id);
    check(same(main,s.tickets.flatMap(block)));
    if (s.phase==='main') check(same(main,current));
    else {
      const groups = main.filter(id=>answers[id]!==byId.get(id).correct).map(id=>byId.get(id).group);
      check(groups.length>=1 && groups.length<=2 && new Set(groups).size===groups.length && current.length===5*groups.length);
      groups.forEach((g,i)=>{
        const t=byId.get(current[i*5]).ticket;
        check(t!==s.tickets[g] && same(current.slice(i*5,i*5+5),block(t,g)));
      });
    }
    return {...common,mode:'exam',phase:s.phase,tickets:[...s.tickets],mainIds:main,started:s.started,
      deadline:s.deadline,selected:null,title:s.phase==='main'?'Экзамен':'Дополнительные вопросы'};
  }
  return {solved,mistakes,history,marathon:restore(data.marathon,false),exam:restore(data.exam,true)};
}
