// 0.1.24 대사 변주 · 기억 · 방문 횟수 · 조건부 선택지 검사
const assert = require('node:assert/strict');
const V = require('./assets/variations.js');
const C = require('./assets/core.js');
require('./assets/variation-sample.js');

// ── 문법 ──────────────────────────────────────────────
const values = { 용기: 1, 붕대: 0, 우산: 0, 체력: 1, 멘탈: 3, 돈: 2, 방문: 1, '@다리 위': 1, '붉은 열쇠': 2 };
const ctx = (extra = {}) => ({ value: n => (n in extra ? extra[n] : values[n]), visits: extra.visits || 1, seed: extra.seed || 's' });
const r = (text, extra) => V.render(text, ctx(extra));

assert.equal(r('{용기? 들어간다|망설인다}'), '들어간다');
assert.equal(r('{용기? 들어간다|망설인다}', { 용기: 0 }), '망설인다');
assert.equal(r('{우산? 우산을 편다}'), '');
assert.equal(r('{!우산? 젖었다}'), '젖었다');
assert.equal(r('{용기 2? 강|약}'), '약');
assert.equal(r('{용기 2? 강|약}', { 용기: 2 }), '강');
assert.equal(r('{돈>=2? 부|빈}'), '부');
assert.equal(r('{돈=0? 없음|있음}'), '있음');
assert.equal(r('{돈!=2? a|b}'), 'b');
assert.equal(r('{체력<=1? 숨차다}'), '숨차다');
assert.equal(r('{체력>1? a|b}'), 'b');
assert.equal(r('{용기 & 붕대? 둘|아님}'), '아님');
assert.equal(r('{용기 & !붕대? 하나만|아님}'), '하나만');
assert.equal(r('{@다리 위? 그 사람}'), '그 사람');
assert.equal(r('{붉은 열쇠 2? 둘}'), '둘');
assert.equal(r('돈 {=돈}, 체력 {체력}'), '돈 2, 체력 1');
// 방문마다: 순서(마지막에서 멈춤)·순환
assert.deepEqual([1, 2, 3, 4].map(visits => r('{처음|또|계속}', { visits })), ['처음', '또', '계속', '계속']);
assert.deepEqual([1, 2, 3, 4].map(visits => r('{&아침|점심|저녁}', { visits })), ['아침', '점심', '저녁', '아침']);
// 무작위: 같은 seed는 같은 결과, seed가 바뀌면 여러 결과가 나옴
assert.equal(r('{~a|b|c}', { seed: 'x' }), r('{~a|b|c}', { seed: 'x' }));
assert.equal(new Set(Array.from({ length: 60 }, (_, i) => r('{~a|b|c}', { seed: 'n' + i }))).size, 3);
// 중첩
assert.match(r('{용기? {~씩 웃으며|담담하게} 들어간다|도망친다}'), /^(씩 웃으며|담담하게) 들어간다$/);
assert.equal(r('{용기? {우산? 함께|혼자} 간다|못 간다}'), '혼자 간다');
// 물음표가 있는 대사의 순서 변주, 모르는 이름, 짝 없는 괄호, 이스케이프
assert.equal(r('{괜찮아?|또 왔어?}', { visits: 2 }), '또 왔어?');
assert.equal(r('{!모르는것? 가}'), '{!모르는것? 가}');
assert.equal(r('열린 { 괄호'), '열린 { 괄호');
assert.equal(r('\\{그대로\\}'), '{그대로}');
assert.equal(r('변주 없음'), '변주 없음');

// ── 정적 분석 ────────────────────────────────────────
const known = n => values[n] !== undefined;
let info = V.inspect('{용기 2? a|b} {!붕대? c} {돈>3? d} {~e|f} {g|h}', known);
assert.deepEqual(info.needs, { 용기: 2, 붕대: 1, 돈: 4 });
assert.equal(info.random, true);
assert.equal(info.visits, true);
assert.deepEqual(V.inspect('{!용긔? a}', known).unknown, ['용긔']);
assert.equal(V.inspect('{용긔? a}', known).unknown[0], '용긔');
assert.equal(V.inspect('{a}', known).errors.length, 1);
assert.equal(V.inspect('a } b', known).errors.length, 1);
assert.equal(V.inspect('{괜찮아?|또 왔어?}', known).errors.length, 0);

// ── 이름 바꾸기 ──────────────────────────────────────
assert.equal(V.rename('{용기 & 우산? 가|나} {용기 2? x} {=용기} {!용기? y} 용기', '용기', '담력', known), '{담력 & 우산? 가|나} {담력 2? x} {=담력} {!담력? y} 용기');
assert.equal(V.rename('{처음|용기}', '용기', '담력', known), '{처음|용기}');

// ── 규칙 연결: 기억·방문·숨김·없을 때만 ───────────────
const p = C.fresh();
p.randomStart = 0;
p.definitions = [
  { id: 'courage', name: '용기', type: 'ability', initial: 0 },
  { id: 'opened', name: '문을 열었다', type: 'memory', initial: 0 },
];
const a = C.event(), b = C.event();
Object.assign(a, { id: 'a', title: '골목', text: '비. {용기? 고개를 든다|움츠린다}', speaker: '{용기? 씩씩한 나|나}' });
Object.assign(a.choices[0], { text: '{~걷는다|걷는다}', next: 'b', remember: 'opened' });
Object.assign(b, { id: 'b', title: '문 앞', kind: 'encounter', once: false, text: '{처음 보는|또 그|지겨운} 문. {문을 열었다? 틈이 있다.} {@골목? 골목을 지나왔다.}' });
b.choices = [
  { ...C.choice(), id: 'again', text: '다시', next: 'b' },
  { ...C.choice(), id: 'secret', text: '비밀', requires: 'opened', hideLocked: true, next: 'end' },
  { ...C.choice(), id: 'timid', text: '용기 없을 때만', requires: 'courage', requiresNot: true, next: 'end' },
];
p.events = [a, b];
C.validate(p);
assert.deepEqual(C.inspect(p).filter(i => i.message.includes('변주')), []);

const run = new C.Run(p, () => 0);
assert.equal(run.say(a.text, a), '비. 움츠린다');
assert.equal(run.say(a.speaker, a), '나');
assert.equal(run.visibleChoices(b).some(c => c.id === 'secret'), false, '기억이 없으면 숨김 선택지가 보이지 않음');
run.choose(a.choices[0].id);
assert.equal(run.current, 'b');
assert.equal(run.bag.opened, 1);
assert.equal(run.message, '변화 없음', '기억은 획득 알림에 나오지 않음');
assert.deepEqual(run.lastChange.items, []);
assert.equal(run.recent.includes('opened'), false);
assert.equal(run.say(b.text, b), '처음 보는 문. 틈이 있다. 골목을 지나왔다.');
assert.equal(run.visibleChoices(b).some(c => c.id === 'secret'), true);
assert.equal(run.blocked(b.choices[2]), '');
run.choose('again');
assert.equal(run.say(b.text, b), '또 그 문. 틈이 있다. 골목을 지나왔다.');
run.choose('again');
assert.equal(run.visits.b, 3);
assert.equal(run.say(b.text, b), '지겨운 문. 틈이 있다. 골목을 지나왔다.');
// 이전 대화에는 플레이어가 실제로 읽은 문장이 남음
assert.equal(run.dialogueHistory[0].text, '비. 움츠린다');
assert.equal(run.dialogueHistory[0].speaker, '나');
assert.equal(run.dialogueHistory[0].choice, '걷는다');
assert.equal(run.dialogueHistory[1].text, '처음 보는 문. 틈이 있다. 골목을 지나왔다.');
run.bag.courage = 1;
assert.equal(run.blocked(b.choices[2]), 'courage', '없을 때만 선택지는 보유하면 막힘');
// 저장/불러오기: 방문 횟수 유지, 예전 저장은 방문 기록으로 추정
const saved = run.snapshot();
const restored = new C.Run(p);
restored.restore(saved);
assert.equal(restored.visits.b, 3);
const legacy = { ...saved };
delete legacy.visits;
restored.restore(legacy);
assert.deepEqual(restored.visits, { a: 1, b: 1 });

// ── 검증 ───────────────────────────────────────────
const bad = JSON.parse(JSON.stringify(p));
bad.events[0].choices[0].remember = 'missing';
assert.throws(() => C.validate(bad));
const bad2 = JSON.parse(JSON.stringify(p));
bad2.events[1].choices[1].hideLocked = 'yes';
assert.throws(() => C.validate(bad2));

// ── 점검 ───────────────────────────────────────────
const q = JSON.parse(JSON.stringify(p));
q.events[1].text = '{!문을 열엇다? 오타} {닫힌 괄호';
q.definitions.push({ id: 'unused', name: '쓰지 않는 기억', type: 'memory', initial: 0 });
q.events[0].text += ' {쓰지 않는 기억? 쓴다}';
const issues = C.inspect(q).map(i => i.message);
assert(issues.some(m => m.includes("'문을 열엇다'")));
assert(issues.some(m => m.includes('괄호')));
assert(issues.some(m => m.includes("기억 '쓰지 않는 기억'을 남기는 선택이 없습니다")));
assert(!issues.some(m => m.includes('용기을 얻지만')), '대사 변주에서 쓰는 항목은 사용처가 있음');

// ── 변주 예제: 실제 규칙으로 무작위 완주 ─────────────
const sample = C.validate(JSON.parse(JSON.stringify(globalThis.VARIATION_SAMPLE)));
assert.deepEqual(C.inspect(sample), []);
const endings = new Set(), dawnLines = new Set();
for (let i = 0; i < 2000; i++) {
  let seed = i + 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const play = new C.Run(sample, rng);
  for (let turn = 0; !play.ended && turn < 300; turn++) {
    const e = sample.events.find(x => x.id === play.current);
    const options = play.visibleChoices(e).filter(c => !play.blocked(c));
    assert(options.length, '선택지가 모두 막힌 장면: ' + e.title);
    play.choose(options[Math.floor(rng() * options.length)].id, rng);
  }
  assert(play.ended, '300턴 안에 끝남');
  endings.add(play.dead ? 'dead' : play.current);
  if (!play.dead && play.current === 'dawn') dawnLines.add(play.say(sample.events.find(e => e.id === 'dawn').text));
}
assert(endings.has('dawn') && endings.has('together'));
assert(dawnLines.size >= 6, '새벽 대사가 기억에 따라 여러 갈래로 갈라짐: ' + dawnLines.size);

console.log('variations ok · 새벽 대사', dawnLines.size, '갈래 · 결말', [...endings].join(', '));
