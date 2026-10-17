/*
 * 내용 탭 도우미
 *
 *  1. 변주 넣기   — 선택한 문구를 감싸서 {조건? A|B}, {A|B}(방문마다), {~A|B}(무작위)로 바꿉니다.
 *  2. 변주 미리보기 — 상태 칩(용기 있음/없음, 체력 2, 방문 2번째…)을 눌러 같은 대사가
 *                    어떻게 달라지는지 바로 봅니다. 선택지의 잠김·숨김도 같은 상태로 보여 줍니다.
 *  3. 선택지 목록 — 탭을 옮기지 않고 대사 바로 아래에서 선택지를 고치고 추가합니다.
 *  4. 들어오는 길 — 이 사건으로 연결된 선택지를 모아 한 번에 이동합니다.
 *
 * app.js의 전역 상태(project, selected, persist, choiceForm, renderEditor 등)를 사용하며,
 * 에디터 화면에서만 호출됩니다. 플레이 화면에는 영향을 주지 않습니다.
 */
(function (root) {
  'use strict';

  const V = root.GameVariations;
  const RESOURCE_BY_ID = { '@hp': '체력', '@mental': '멘탈', '@money': '돈' };
  const TYPE_LABEL = { ability: '능력', item: '아이템', state: '상태', memory: '기억' };

  // Preview values survive scene changes so "용기 있음" stays on while browsing.
  const previewValues = new Map();
  let previewSeed = 1;

  const byId = id => document.getElementById(id);
  const escapeHtml = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function knownName(name) {
    return V.builtinNames().includes(name)
      || project.definitions.some(d => d.name === name)
      || (name.startsWith('@') && project.events.some(e => '@' + e.title.trim() === name));
  }

  function defaultValue(name) {
    if (name === '체력') return project.hp;
    if (name === '멘탈') return project.mental ?? 3;
    if (name === '돈') return project.money ?? 3;
    if (name === '방문') return 1;
    if (name.startsWith('@')) return 0;
    return project.definitions.find(d => d.name === name)?.initial ?? 0;
  }

  function valueOf(name) {
    if (!knownName(name)) return undefined;
    return previewValues.has(name) ? previewValues.get(name) : defaultValue(name);
  }

  function renderText(text) {
    return V.render(text || '', { value: valueOf, visits: valueOf('방문'), seed: 'preview:' + previewSeed });
  }

  // Which names the scene reads, and the smallest value that satisfies each of them.
  function sceneQualities(e) {
    const needs = new Map(), notes = { visits: false, random: false, errors: [], unknown: [] };
    const need = (name, n) => needs.set(name, Math.max(needs.get(name) || 0, n || 1));
    for (const text of [e.speaker, e.text, ...e.choices.map(c => c.text)]) {
      const info = V.inspect(text, knownName);
      for (const [n, v] of Object.entries(info.needs)) need(n, v);
      notes.visits ||= info.visits;
      notes.random ||= info.random;
      notes.errors.push(...info.errors);
      notes.unknown.push(...info.unknown);
    }
    for (const c of e.choices) if (c.requires) need(RESOURCE_BY_ID[c.requires] || name(c.requires), c.requiresCount ?? 1);
    if (notes.visits) need('방문', 2);
    notes.errors = [...new Set(notes.errors)];
    notes.unknown = [...new Set(notes.unknown)];
    return { needs, notes };
  }

  function chipLabel(nameText, value, needValue) {
    if (nameText === '방문') return '방문 ' + value + '번째';
    if (['체력', '멘탈', '돈'].includes(nameText)) return nameText + ' ' + value;
    if (nameText.startsWith('@')) return nameText.slice(1) + (value ? ' 지나옴' : ' 안 지나옴');
    const d = project.definitions.find(x => x.name === nameText);
    const kind = d ? TYPE_LABEL[d.type] + ' · ' : '';
    if (!value) return kind + nameText + ' 없음';
    return kind + nameText + (needValue > 1 || value > 1 ? ' ' + value : ' 있음');
  }

  function nextChipValue(nameText, value, needValue) {
    if (nameText === '방문') return value >= 4 ? 1 : value + 1;
    if (nameText === '체력') return value >= project.maxHp ? 0 : value + 1;
    if (['멘탈', '돈'].includes(nameText)) return value >= 3 ? 0 : value + 1;
    return value >= needValue ? 0 : needValue;
  }

  function choiceState(c) {
    if (!c.requires) return { ok: true, label: '' };
    const n = c.requiresCount ?? 1, label = RESOURCE_BY_ID[c.requires] || name(c.requires);
    const value = valueOf(label) ?? 0, ok = (value >= n) !== !!c.requiresNot;
    const text = label + (n > 1 ? ' ' + n : '') + (c.requiresNot ? ' 없을 때만' : ' 필요');
    return { ok, label: text, hidden: !ok && c.hideLocked };
  }

  function finalConsonant(word) {
    const code = word.charCodeAt(word.length - 1);
    return code >= 0xAC00 && code <= 0xD7A3 ? (code - 0xAC00) % 28 : /[0136-8]$/.test(word) ? 1 : 0;
  }

  // Until the writer has put the caret somewhere, add to the end of the text, not before it.
  function caret(textarea) {
    if (textarea.dataset.caretPlaced) return [textarea.selectionStart, textarea.selectionEnd];
    const n = textarea.value.length;
    return [n, n];
  }

  function insertVariation(textarea, build, range) {
    const [start, end] = range || caret(textarea), selection = textarea.value.slice(start, end);
    const built = build(selection), lead = start === end && start > 0 && !/\s$/.test(textarea.value.slice(0, start)) ? ' ' : '';
    const { text, from, to } = { text: lead + built.text, from: built.from + lead.length, to: built.to + lead.length };
    textarea.setRangeText(text, start, end, 'end');
    textarea.dataset.caretPlaced = '1';
    textarea.focus();
    textarea.setSelectionRange(start + from, start + to);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const wrapCondition = condition => sel => {
    const a = sel || '이럴 때 문장', b = sel || '아닐 때 문장', head = '{' + condition + '? ';
    return { text: head + a + '|' + b + '}', from: head.length, to: head.length + a.length };
  };
  const wrapVisits = sel => {
    const a = sel || '처음 올 때', b = sel ? sel : '다시 올 때';
    return { text: '{' + a + '|' + b + '}', from: 1, to: 1 + a.length };
  };
  const wrapRandom = sel => {
    const a = sel || '하나', rest = sel ? '|' + sel : '|둘|셋';
    return { text: '{~' + a + rest + '}', from: 2, to: 2 + a.length };
  };

  function conditionOptions(e) {
    const group = (label, items) => items.length ? `<optgroup label="${label}">${items.join('')}</optgroup>` : '';
    const option = (value, text) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`;
    const defs = type => project.definitions.filter(d => d.type === type && !/[{}|?&!]/.test(d.name)).map(d => option(d.name, d.name));
    const scenes = project.events.filter(x => x.id !== e.id && x.title.trim() && !/[{}|?&!]/.test(x.title)).slice(0, 80).map(x => option('@' + x.title.trim(), x.title.trim() + (finalConsonant(x.title.trim()) ? '을' : '를') + ' 지나왔을 때'));
    return '<option value="">어떤 조건에서 달라질까요?</option>'
      + group('기억 · 지난 선택', defs('memory'))
      + group('능력', defs('ability')) + group('아이템', defs('item')) + group('상태', defs('state'))
      + group('생존 자원', [option('체력<=1', '체력 1 이하'), option('멘탈<=1', '멘탈 1 이하'), option('돈>=2', '돈 2 이상'), option('돈=0', '돈 없음')])
      + group('반복', [option('방문>=2', '두 번째 방문부터')])
      + group('지나온 사건', scenes);
  }

  function helpHtml() {
    return `<p class="hint">대사·말하는 사람·선택지 문구에서 쓸 수 있습니다. 문구를 길게 눌러 선택한 뒤 버튼을 누르면 자동으로 감쌉니다.</p>
<div class="varHelp">
<p><code>{용기? 문을 박차고 들어간다|문 앞에서 망설인다}</code><br>조건이 맞으면 앞, 아니면 뒤. 뒤는 비워도 됩니다.</p>
<p><code>{!우산? 옷이 흠뻑 젖었다}</code><br>없을 때만.</p>
<p><code>{용기 2? …}</code> <code>{돈>=2? …}</code> <code>{체력<=1? …}</code><br>레벨·수량 비교 (= != &lt; &lt;= &gt; &gt;=).</p>
<p><code>{용기 & 붕대? …}</code><br>모두 만족할 때.</p>
<p><code>{처음 보는 문이다|또 그 문이다|지겹도록 본 문이다}</code><br>이 사건에 올 때마다 다음 문구, 마지막에서 멈춥니다.</p>
<p><code>{&아침|점심|저녁}</code><br>올 때마다 돌아가며.</p>
<p><code>{~비가 온다|바람이 분다}</code><br>무작위.</p>
<p><code>{@다리 위? 다리에서 본 그 사람이다.}</code><br>그 사건을 지나왔을 때.</p>
<p><code>{방문>=3? 단골이네.}</code> · <code>{=돈}</code><br>방문 횟수 조건 · 현재 값 표시.</p>
<p><code>{용기? {~씩 웃으며|담담하게} 들어간다|도망친다}</code><br>겹쳐 쓸 수 있습니다.</p>
</div>
<p class="hint"><b>기억</b>은 가방에 보이지 않는 표시입니다. 선택 결과 → <b>이 선택을 기억</b>으로 만들고, 조건·대사 변주·선택지 숨김에 씁니다. 같은 사건도 지난 선택에 따라 한두 문장, 선택지 하나가 달라지게 할 수 있어요.</p>`;
  }

  function incomingLinks(e) {
    const links = [];
    for (const scene of project.events) for (const c of scene.choices) {
      if (c.next === e.id || c.branch?.next === e.id) links.push({ scene, c });
    }
    return links;
  }

  /* Fill #sceneHelpers (variation tools and preview) inside the content tab for scene e. */
  function mount(e) {
    const host = byId('sceneHelpers');
    if (!host) return;
    host.innerHTML = `<div class="varTools" role="group" aria-label="대사 변주 넣기">
<button type="button" id="varCondition" class="chip" title="선택한 문구를 조건에 따라 바꾸기">＋ 조건</button>
<button type="button" id="varVisits" class="chip" title="이 사건에 다시 올 때마다 다른 문구">＋ 방문마다</button>
<button type="button" id="varRandom" class="chip" title="무작위 문구">＋ 무작위</button>
<button type="button" id="varHelp" class="chip quiet" aria-label="변주 문법 보기">?</button>
<select id="varPick" aria-label="변주 조건 고르기" hidden>${conditionOptions(e)}</select>
</div>
<div id="varPreview" class="varPreview" aria-live="polite"></div>`;
    const textarea = byId('copy');
    byId('varVisits').onclick = () => insertVariation(textarea, wrapVisits);
    byId('varRandom').onclick = () => insertVariation(textarea, wrapRandom);
    byId('varHelp').onclick = () => open('대사 변주 문법', helpHtml());
    const pick = byId('varPick');
    let range = [0, 0];
    byId('varCondition').onclick = () => {
      range = caret(textarea);
      pick.hidden = false;
      pick.value = '';
      pick.focus();
      try { pick.showPicker?.(); } catch (err) { /* showPicker needs a user gesture on some browsers */ }
    };
    pick.onchange = () => {
      const condition = pick.value;
      pick.hidden = true;
      if (!condition) return;
      textarea.setSelectionRange(range[0], range[1]);
      insertVariation(textarea, wrapCondition(condition));
    };
    pick.onblur = () => { if (!pick.value) pick.hidden = true; };
    textarea.addEventListener('focus', () => { textarea.dataset.caretPlaced = '1'; });
    textarea.addEventListener('input', () => refresh(e));
    byId('speaker').addEventListener('input', () => refresh(e));
    refresh(e);

  }

  /* Sheet listing the choices that lead to scene e; tapping one opens that scene. */
  function showIncoming(e) {
    const incoming = incomingLinks(e);
    open('이 사건으로 오는 길 ' + incoming.length, incoming.length ? incoming.slice(0, 30).map((l, i) => `<button type="button" class="quiet full linkJump" data-jump="${i}"><b>${escapeHtml(l.scene.title || '제목 없음')}</b><small>${escapeHtml(l.c.text || '선택지')}</small></button>`).join('') : '<p class="hint">아직 이 사건으로 오는 선택지가 없습니다. 다른 사건의 선택 결과 → 다음 진행에서 연결하세요.</p>');
    byId('modalBody').querySelectorAll('[data-jump]').forEach(b => b.onclick = () => {
      byId('modal').close();
      selected = incoming[Number(b.dataset.jump)].scene.id;
      renderEditor();
    });
  }

  function refresh(e) {
    const box = byId('varPreview');
    if (!box) return;
    const { needs, notes } = sceneQualities(e);
    const varied = [e.speaker, e.text, ...e.choices.map(c => c.text)].some(V.has);
    const chips = [...needs].filter(([n]) => knownName(n));
    if (!varied && !chips.length && !notes.errors.length) {
      box.hidden = true;
    } else {
      box.hidden = false;
      const problems = [...notes.errors, ...notes.unknown.map(n => `'${n}' 항목을 찾지 못했습니다`)];
      box.innerHTML = `<div class="varChips"><small>미리보기 상태</small>${chips.map(([n, needValue]) => {
        const value = valueOf(n);
        return `<button type="button" class="chip state ${value >= needValue ? 'on' : ''}" data-quality="${escapeHtml(n)}" data-need="${needValue}" aria-pressed="${value >= needValue}">${escapeHtml(chipLabel(n, value, needValue))}</button>`;
      }).join('')}${notes.random ? '<button type="button" class="chip" id="varShuffle" aria-label="무작위 다시 뽑기">🎲 다시</button>' : ''}</div>`
        + (varied ? `<div class="varLine"><b>${escapeHtml(renderText(e.speaker) || '내레이션')}</b><p>${escapeHtml(renderText(e.text)) || '<span class="hint">대사가 비어 있습니다.</span>'}</p></div>` : '')
        + (problems.length ? `<p class="loss hint">${problems.map(escapeHtml).join('<br>')}</p>` : '');
      box.querySelectorAll('[data-quality]').forEach(b => b.onclick = () => {
        const n = b.dataset.quality;
        previewValues.set(n, nextChipValue(n, valueOf(n), Number(b.dataset.need)));
        refresh(e);
      });
      if (byId('varShuffle')) byId('varShuffle').onclick = () => { previewSeed++; refresh(e); };
    }
    renderChoices(e);
  }

  // The 선택지 tab returns to the page you were on for each scene.
  const choicePages = new Map();

  function renderChoices(e) {
    const list = byId('sceneChoiceList');
    if (!list) return;
    list.innerHTML = e.choices.map(c => {
      const state = choiceState(c), shown = renderText(c.text) || '선택지 문구 입력';
      const tag = c.requires ? `<span class="requirement ${state.ok ? 'met' : 'missing'}">${state.ok ? '✓' : '×'} ${escapeHtml(state.label)}${state.hidden ? ' · 숨김' : ''}</span>` : '';
      return `<button type="button" class="sceneChoice ${state.hidden ? 'hiddenChoice' : state.ok ? '' : 'locked'}" data-scene-choice="${c.id}" data-choice="${c.id}">${tag}<span>${escapeHtml(shown)}</span><small>${escapeHtml(summary(c))}</small></button>`;
    }).join('');
    list.querySelectorAll('[data-scene-choice]').forEach(b => b.onclick = () => choiceForm(e.choices.find(c => c.id === b.dataset.sceneChoice)));
    // In the 선택지 tab the list pages when it does not fit (app.js paginate).
    if (list.closest('.choicesLayout') && typeof paginate === 'function') {
      const pageNow = () => paginate(list, choicePages.get(e.id) || 0, at => choicePages.set(e.id, at));
      pageNow();
      requestAnimationFrame(pageNow);
    }
  }

  // Keep {이름?…} references in every line when a quality or scene title is renamed.
  function renameEverywhere(from, to) {
    if (!from || !to || from === to) return 0;
    let changed = 0;
    const known = n => n === to || knownName(n);
    for (const e of project.events) {
      for (const [owner, key] of [[e, 'text'], [e, 'speaker'], ...e.choices.map(c => [c, 'text'])]) {
        const next = V.rename(owner[key], from, to, known);
        if (next !== owner[key]) { owner[key] = next; changed++; }
      }
    }
    return changed;
  }

  /* Where a quality is given (sources) and where it changes the story (uses). */
  function usageOf(d) {
    const sources = [], uses = [];
    for (const e of project.events) {
      for (const c of e.choices) {
        const label = c.text || '선택지';
        if (c.gain === d.id || c.branch?.gain === d.id) sources.push({ e, text: label + ' · 획득' });
        if (c.reward?.pool.includes(d.id)) sources.push({ e, text: label + ' · 랜덤 보상 후보' });
        if (c.remember === d.id) sources.push({ e, text: label + ' · 기억' });
        if (c.requires === d.id) uses.push({ e, text: label + (c.requiresNot ? ' · 없을 때만' : ' · 필요') + (c.hideLocked ? ' · 숨김' : '') });
        if (c.lose === d.id || c.branch?.lose === d.id) uses.push({ e, text: label + ' · 소모' });
        if (c.branch?.when === d.id) uses.push({ e, text: label + ' · 보유 시 다른 결과' });
      }
      const lines = [e.speaker, e.text, ...e.choices.map(c => c.text)].filter(t => V.inspect(t, knownName).names.includes(d.name));
      if (lines.length) uses.push({ e, text: '대사 변주 ' + lines.length + '곳' });
    }
    return { sources, uses };
  }

  function usageLabel(d) {
    const { sources, uses } = usageOf(d);
    return '얻는 곳 ' + sources.length + ' · 쓰는 곳 ' + uses.length;
  }

  function showUsage(d) {
    if (!d) return;
    const { sources, uses } = usageOf(d);
    const rows = list => list.map(x => `<button type="button" class="quiet full linkJump" data-usage-jump="${x.e.id}"><b>${escapeHtml(x.e.title || '제목 없음')}</b><small>${escapeHtml(x.text)}</small></button>`).join('');
    open(d.name + ' · 쓰이는 곳', `<p class="hint">${TYPE_LABEL[d.type]} · 시작 보유 ${d.initial}. 누르면 그 사건으로 이동합니다.</p>`
      + `<h3 class="usageHead">얻는 곳 ${sources.length}</h3>${rows(sources) || '<p class="hint">아직 없습니다.' + (d.type === 'memory' ? ' 선택 결과 → 이 선택을 기억에서 지정하세요.' : '') + '</p>'}`
      + `<h3 class="usageHead">쓰는 곳 ${uses.length}</h3>${rows(uses) || '<p class="hint">아직 없습니다. 선택 조건이나 대사 변주 {' + escapeHtml(d.name) + '? …}에서 쓸 수 있어요.</p>'}`);
    byId('modalBody').querySelectorAll('[data-usage-jump]').forEach(b => b.onclick = () => {
      byId('modal').close();
      selected = b.dataset.usageJump;
      part = 'content';
      page = 'story';
      render();
    });
  }

  root.SceneHelpers = { mount, refresh, renderChoices, incomingLinks, showIncoming, renameEverywhere, knownName, usageLabel, showUsage };
})(globalThis);
