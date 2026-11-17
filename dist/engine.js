import { leastUsed } from './selection.js';
export function makeExam(bank, random = Math.random, usage = []) {
  const questions = [];
  const tickets = [];
  for (let group = 0; group < 4; group++) {
    const candidates = leastUsed(Array.from({length:40}, (_,i)=>i+1), ticket=>usage[group]?.[ticket-1] || 0);
    const ticket = candidates[Math.floor(random() * candidates.length)];
    tickets.push(ticket);
    questions.push(...bank.filter(q => q.ticket === ticket && q.group === group));
  }
  if (questions.length !== 20) throw new Error('Неполный банк экзамена');
  return { questions, tickets };
}
export function gradeMain(questions, answers) {
  const errors = questions.filter(q => answers[q.id] !== q.correct);
  const groups = errors.map(q => q.group);
  return {
    errors,
    failed: errors.length > 2 || new Set(groups).size !== groups.length,
    groups
  };
}
export function makeExtra(bank, groups, tickets, random = Math.random) {
  return groups.flatMap(group => {
    const choices = Array.from({length:40}, (_,i) => i + 1).filter(t => t !== tickets[group]);
    const ticket = choices[Math.floor(random() * choices.length)];
    return bank.filter(q => q.ticket === ticket && q.group === group);
  });
}
