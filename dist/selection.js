export function randomUnit() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] / 4294967296;
  }
  return Math.random();
}

export function leastUsed(items, count) {
  const minimum = Math.min(...items.map(count));
  return items.filter(item => count(item) === minimum);
}

export function drawPractice(questions, usage, random = randomUnit, limit = 20) {
  if (!questions.length) return [];
  const pool = leastUsed(questions, q => usage[q.id] || 0);
  // Перемешивание Фишера — Йетса без сортировки по случайному компаратору.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, limit);
}

export function readSelection(raw, bank, history = []) {
  const result = {exam:Array.from({length:4},()=>Array(40).fill(0)), practice:{}};
  const validCount = n => Number.isSafeInteger(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER;
  if (raw && Array.isArray(raw.exam) && raw.exam.length === 4 &&
      raw.exam.every(group => Array.isArray(group) && group.length === 40 && group.every(validCount))) {
    result.exam = raw.exam.map(group => [...group]);
  } else {
    const byId = new Map(bank.map(q => [q.id,q]));
    for (const entry of history) {
      for (let group = 0; group < 4; group++) {
        const q = byId.get(entry.questions?.[group*5]?.id);
        if (q) result.exam[group][q.ticket-1]++;
      }
    }
  }
  for (const q of bank) {
    if (validCount(raw?.practice?.[q.id])) result.practice[q.id] = raw.practice[q.id];
  }
  return result;
}

export function trainingTopics(bank) {
  const topic = name => bank.filter(q => q.topics.includes(name));
  const text = q => [q.question,...q.answers,q.explanation].join(' ').toLowerCase();
  const featured = [
    {title:'Эксплуатация и неисправности ТС', questions:bank.filter(q => q.topics.includes('Неисправности и условия допуска транспортных средств к эксплуатации') || /эксплуатац|неисправност|протектор|давлени.*шин/.test(text(q)))},
    {title:'Медицинская помощь', questions:topic('Оказание доврачебной медицинской помощи')},
    {title:'Документы и обязанности водителя', questions:bank.filter(q => q.topics.includes('Общие обязанности водителей') || /документ|водительск.{0,30}удостоверен|страхов.{0,30}полис/.test(text(q)))},
    {title:'Штрафы и ответственность', questions:bank.filter(q => q.topics.includes('Ответственность водителя') || /штраф|административн|лишени.{0,40}прав|ответственност/.test(text(q)))},
    {title:'Трамваи и трамвайные пути', questions:bank.filter(q => /трамва/.test(text(q)))},
    {title:'Сложные вопросы из подборок', questions:bank.filter(q => q.hard)}
  ];
  const covered = new Set([
    'Неисправности и условия допуска транспортных средств к эксплуатации',
    'Оказание доврачебной медицинской помощи','Общие обязанности водителей','Ответственность водителя'
  ]);
  const remaining = [...new Set(bank.flatMap(q=>q.topics))].filter(name=>!covered.has(name)).sort();
  return [...featured,...remaining.map(title=>({title,questions:topic(title)}))];
}
