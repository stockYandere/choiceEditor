/*
 * 대사 변주 (text variations)
 *
 * 같은 사건·같은 대사라도 보유 상태, 기억, 방문 횟수, 무작위에 따라
 * 단어나 문장 일부만 달라지게 하는 작은 문법입니다. ink의 조건부 텍스트·
 * 대안(sequence/cycle/shuffle), Yarn Spinner의 방문 조건,
 * Failbetter의 품질 기반 서사(qualities)를 참고했습니다.
 *
 *   {용기? 문을 박차고 들어간다|문 앞에서 망설인다}   조건이 맞으면 앞, 아니면 뒤 (뒤는 생략 가능)
 *   {!우산? 옷이 흠뻑 젖었다}                         보유하지 않았을 때
 *   {용기 2? ...}  {돈>=2? ...}  {체력<=1? ...}      레벨·수량 비교 (= != < <= > >=)
 *   {용기 & 붕대? ...}                                 여러 조건을 모두 만족할 때
 *   {방문>=2? 또 왔네.}                                이 사건에 들어온 횟수
 *   {@다리 위? 다리에서 본 그 사람이다.}               다른 사건을 지나온 적이 있을 때
 *   {처음 왔다|또 왔다|지겹도록 왔다}                  방문할 때마다 다음 문구, 마지막에서 멈춤
 *   {&아침|점심|저녁}                                   방문할 때마다 돌아가며
 *   {~비가 온다|바람이 분다|조용하다}                  무작위 (같은 화면에서는 고정)
 *   {=돈}  또는  {돈}                                  현재 값
 *
 * 중첩 가능: {용기? {~씩 웃으며|담담하게} 들어간다|도망친다}
 * "?" 바로 뒤의 공백 한 칸은 무시합니다. "|" 주변 공백은 그대로 표시합니다.
 * 조건 이름을 찾지 못한 블록은 순서 변주로 읽거나, 그것도 아니면 글자 그대로 둡니다.
 */
(function (root) {
  'use strict';

  const RESOURCE_NAMES = ['체력', '멘탈', '돈'];
  const SPECIAL_NAMES = ['방문'];
  const OPERATORS = ['>=', '<=', '!=', '=', '<', '>'];

  function has(text) {
    return typeof text === 'string' && text.includes('{') && text.includes('}');
  }

  // Index of the closing brace that matches text[start] === '{', or -1.
  function closing(text, start) {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\\') { i++; continue; }
      if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) return i;
    }
    return -1;
  }

  // Split by a separator character only at nesting depth 0.
  function splitTop(text, separator, limit = Infinity) {
    const parts = [];
    let depth = 0, last = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\\') { i++; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === separator && depth === 0 && parts.length < limit - 1) {
        parts.push(text.slice(last, i));
        last = i + 1;
      }
    }
    parts.push(text.slice(last));
    return parts;
  }

  // "용기", "!우산", "용기 2", "돈>=2", "@다리 위" -> { name, not, op, count }
  function parseAtom(raw, known) {
    let text = raw.trim();
    let not = false;
    if (text.startsWith('!')) { not = true; text = text.slice(1).trim(); }
    if (!text) return null;
    if (known(text)) return { name: text, not, op: '>=', count: 1 };
    for (const op of OPERATORS) {
      const at = text.indexOf(op);
      if (at > 0) {
        const name = text.slice(0, at).trim(), number = text.slice(at + op.length).trim();
        if (/^\d{1,3}$/.test(number)) return { name, not, op, count: Number(number) };
      }
    }
    const level = text.match(/^(.+?)\s+(\d{1,3})$/);
    if (level) return { name: level[1].trim(), not, op: '>=', count: Number(level[2]) };
    return { name: text, not, op: '>=', count: 1 };
  }

  function parseCondition(raw, known) {
    const atoms = raw.split('&').map(a => parseAtom(a, known));
    return atoms.every(Boolean) ? atoms : null;
  }

  function compare(value, op, count) {
    switch (op) {
      case '=': return value === count;
      case '!=': return value !== count;
      case '<': return value < count;
      case '<=': return value <= count;
      case '>': return value > count;
      default: return value >= count;
    }
  }

  function atomText(a) {
    const prefix = a.not ? '!' : '';
    if (a.op === '>=' && a.count === 1) return prefix + a.name;
    if (a.op === '>=') return prefix + a.name + ' ' + a.count;
    return prefix + a.name + a.op + a.count;
  }

  // Small deterministic hash so a shuffled line stays the same while the page is re-rendered.
  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /*
   * Classify a block body. Returns one of
   *   { kind: 'condition', condition, then, otherwise, raw }
   *   { kind: 'sequence' | 'cycle' | 'random', parts }
   *   { kind: 'value', name }
   *   { kind: 'literal' }
   */
  function classify(body, known) {
    if (body.startsWith('~') || body.startsWith('&')) {
      return { kind: body[0] === '~' ? 'random' : 'cycle', parts: splitTop(body.slice(1), '|') };
    }
    if (body.startsWith('=')) return { kind: 'value', name: body.slice(1).trim() };
    const question = splitTop(body, '?', 2);
    if (question.length === 2) {
      const raw = question[0], condition = parseCondition(raw, known);
      if (condition && condition.every(a => known(a.name))) {
        // One space after "?" is only for readability: {용기? 들어간다}
        const [then, otherwise = ''] = splitTop(question[1].replace(/^ /, ''), '|', 2);
        return { kind: 'condition', condition, then, otherwise, raw: raw.trim() };
      }
    }
    const parts = splitTop(body, '|');
    if (parts.length > 1) return { kind: 'sequence', parts };
    if (known(body.trim())) return { kind: 'value', name: body.trim() };
    return { kind: 'literal' };
  }

  /*
   * ctx = {
   *   value(name) -> number | undefined   (undefined: unknown name)
   *   visits: number                      (this scene, counting the current visit)
   *   seed: string                        (stable per page)
   *   override?(conditionText) -> boolean | undefined   (editor preview toggles)
   * }
   */
  function render(text, ctx) {
    if (!has(text)) return unescape(text || '');
    const known = name => ctx.value(name) !== undefined;
    let counter = 0;
    function walk(source) {
      let out = '';
      for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === '\\' && i + 1 < source.length) { out += source[++i]; continue; }
        if (ch !== '{') { out += ch; continue; }
        const end = closing(source, i);
        if (end < 0) { out += source.slice(i); break; }
        const body = source.slice(i + 1, end), block = classify(body, known), index = counter++;
        out += block.kind === 'literal' ? '{' + walk(body) + '}' : walk(choose(block, index));
        i = end;
      }
      return out;
    }
    function choose(block, index) {
      const visits = Math.max(1, ctx.visits || 1);
      switch (block.kind) {
        case 'condition': {
          const forced = ctx.override ? ctx.override(block.raw) : undefined;
          const ok = forced !== undefined ? forced : block.condition.every(a => compare(ctx.value(a.name) || 0, a.op, a.count) !== a.not);
          return ok ? block.then : block.otherwise;
        }
        case 'sequence': return block.parts[Math.min(visits, block.parts.length) - 1];
        case 'cycle': return block.parts[(visits - 1) % block.parts.length];
        case 'random': return block.parts[hash((ctx.seed || '') + ':' + index) % block.parts.length];
        case 'value': return String(ctx.value(block.name) ?? 0);
        default: return '';
      }
    }
    return walk(text);
  }

  function unescape(text) {
    return String(text).replace(/\\([{}|?\\])/g, '$1');
  }

  /*
   * Static description used by the editor preview and the story check.
   * known(name) -> boolean
   */
  function inspect(text, known) {
    const info = { conditions: [], names: [], needs: {}, unknown: [], misread: [], visits: false, random: false, errors: [] };
    if (!has(text)) {
      if (typeof text === 'string' && /[{}]/.test(text.replace(/\\[{}]/g, ''))) info.errors.push('괄호 { } 짝이 맞지 않습니다.');
      return info;
    }
    const seenConditions = new Set(), seenNames = new Set();
    const addName = name => {
      if (seenNames.has(name)) return;
      seenNames.add(name);
      info.names.push(name);
      info.needs[name] = info.needs[name] || 1;
    };
    (function walk(source) {
      for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === '\\') { i++; continue; }
        if (ch === '}') { info.errors.push('괄호 { } 짝이 맞지 않습니다.'); continue; }
        if (ch !== '{') continue;
        const end = closing(source, i);
        if (end < 0) { info.errors.push('괄호 { } 짝이 맞지 않습니다.'); return; }
        const body = source.slice(i + 1, end), block = classify(body, known);
        if (block.kind === 'condition') {
          if (!seenConditions.has(block.raw)) { seenConditions.add(block.raw); info.conditions.push(block.raw); }
          for (const a of block.condition) {
            addName(a.name);
            if (a.name === '방문') info.visits = true;
            // Smallest value that makes the plain (not negated) comparison true.
            const need = a.op === '>' ? a.count + 1 : a.op === '>=' || a.op === '=' ? Math.max(1, a.count) : 1;
            info.needs[a.name] = Math.max(info.needs[a.name] || 0, need);
          }
          walk(block.then); walk(block.otherwise);
        } else if (block.kind === 'sequence' || block.kind === 'cycle' || block.kind === 'random') {
          if (block.kind === 'random') info.random = true; else info.visits = true;
          // {용가? 들어간다|망설인다} with a misspelt name reads as 방문마다 and shows "용가? 들어간다":
          // a short name-like head before "?" followed by text means a condition was probably meant.
          if (block.kind === 'sequence') {
            const [head, rest] = splitTop(block.parts[0], '?', 2), atoms = rest !== undefined && rest.trim() && head.trim().length <= 30 && !/[.,"'~…]/.test(head) ? parseCondition(head, known) : null;
            if (atoms) for (const a of atoms) if (!known(a.name)) info.misread.push(a.name);
          }
          block.parts.forEach(walk);
        } else if (block.kind === 'value') {
          if (known(block.name)) addName(block.name);
          else info.unknown.push(block.name);
        } else {
          const question = splitTop(body, '?', 2);
          if (question.length === 2) {
            const atoms = parseCondition(question[0], known) || [];
            for (const a of atoms) if (!known(a.name)) info.unknown.push(a.name);
          } else if (body.trim()) {
            info.errors.push('{' + body + '}는 변주로 읽지 못해 글자 그대로 보입니다.');
          }
          walk(body);
        }
        i = end;
      }
    })(text);
    info.errors = [...new Set(info.errors)];
    info.unknown = [...new Set(info.unknown)];
    info.misread = [...new Set(info.misread)];
    return info;
  }

  // Rename a quality inside every block of a text, keeping the rest untouched.
  // known(name) tells which other names are valid conditions.
  function rename(text, from, to, known = () => false) {
    if (!has(text) || !from || from === to) return text;
    const isKnown = name => name === from || known(name);
    return (function walk(source) {
      let out = '';
      for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === '\\' && i + 1 < source.length) { out += ch + source[++i]; continue; }
        if (ch !== '{') { out += ch; continue; }
        const end = closing(source, i);
        if (end < 0) { out += source.slice(i); break; }
        const body = source.slice(i + 1, end), block = classify(body, isKnown);
        if (block.kind === 'condition') {
          const head = block.condition.map(a => atomText(a.name === from ? { ...a, name: to } : a)).join(' & ');
          out += '{' + head + '?' + walk(splitTop(body, '?', 2)[1]) + '}';
        } else if (block.kind === 'value' && block.name === from) {
          out += '{' + (body.startsWith('=') ? '=' : '') + to + '}';
        } else {
          out += '{' + walk(body) + '}';
        }
        i = end;
      }
      return out;
    })(text);
  }

  // Names that are always valid inside a condition.
  function builtinNames() {
    return [...RESOURCE_NAMES, ...SPECIAL_NAMES];
  }

  const api = { has, render, inspect, rename, builtinNames, unescape };
  if (typeof module !== 'undefined') module.exports = api;
  else root.GameVariations = api;
})(globalThis);
