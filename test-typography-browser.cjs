// 0.1.24 글꼴·글자 크기·선택지 모양·멘탈 표정 아이콘 (3개 세로 화면)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const url = require('node:url').pathToFileURL(path.join(__dirname, 'assets/index.html')).href;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const viewport of [{ width: 412, height: 850 }, { width: 360, height: 640 }, { width: 320, height: 568 }]) {
    const p = await browser.newPage({ viewport }), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(url);
    await p.waitForFunction(() => !document.getElementById('openEditor').disabled);
    // 번들 글꼴 3종이 모두 실제로 읽힘
    assert.equal(await p.evaluate(() => document.fonts.check('16px StorySerif', '한글') && document.fonts.check('600 15px ActionSans', '한글') && document.fonts.check('15px StoryPixel', '한글') && [...document.fonts].every(f => f.status === 'loaded')), true);
    // 에디터 UI도 Pretendard
    assert.match(await p.evaluate(() => getComputedStyle(document.body).fontFamily), /ActionSans/);
    await p.click('#openEditor');
    await p.locator('[data-edit-game]').first().click();
    await p.waitForFunction(() => page === 'story');
    await p.evaluate(() => { project.theme = 'cream'; startTest(project.events[0].id); finishDialogue(true); });
    const style = await p.evaluate(() => {
      const d = getComputedStyle(document.getElementById('dialogue')), b = document.querySelector('#answers button'), c = getComputedStyle(b), s = getComputedStyle(b.querySelector('span'));
      return { prose: d.fontFamily, wordBreak: d.wordBreak, size: parseFloat(d.fontSize), choice: parseFloat(s.fontSize), weight: s.fontWeight, height: b.getBoundingClientRect().height, border: c.borderTopStyle };
    });
    assert.match(style.prose, /StorySerif/);
    assert.equal(style.wordBreak, 'keep-all', '한국어 어절 단위 줄바꿈');
    const fit = viewport.height <= 620 ? .94 : 1;
    assert(Math.abs(style.size - 16 * fit) < .05, 'prose ' + style.size);
    assert(Math.abs(style.choice - 15 * fit) < .05, 'choice ' + style.choice);
    assert.equal(style.weight, '600');
    assert(style.height >= 48, '선택지 터치 높이 48px 이상');
    assert.notEqual(style.border, 'none', '선택지는 테두리 있는 줄');
    // 고딕·픽셀 테마의 본문
    await p.evaluate(() => { run.p.theme = 'noir'; renderTest(); });
    assert.match(await p.evaluate(() => getComputedStyle(document.getElementById('dialogue')).fontFamily), /^ActionSans/);
    await p.evaluate(() => { run.p.theme = 'retro'; renderTest(); });
    assert.match(await p.evaluate(() => getComputedStyle(document.getElementById('dialogue')).fontFamily), /^StoryPixel/);
    await p.evaluate(() => { run.p.theme = 'cream'; renderTest(); });

    // 멘탈 표정: 3 웃음 · 2 무표정 · 1 찡그림, 빈 칸은 외곽선 얼굴
    const moods = await p.evaluate(() => [3, 2, 1].map(n => { run.mental = n; renderTest(); return [...document.querySelectorAll('#mental [data-icon=mood]')].map(x => x.dataset.mood).join(); }));
    assert.deepEqual(moods, ['good,good,good', 'okay,okay,okay', 'low,low,low']);
    assert.equal(await p.locator('#mental').getAttribute('aria-label'), '멘탈 1 / 3');
    await p.evaluate(() => { run.mental = 3; renderTest(); finishDialogue(true); });

    // 글자 크기: 가방 → 글자 크기 → 크게, 저장되고 이전 대화에도 적용
    await p.locator('#bag').click();
    await p.locator('#playerTextSettings summary').click();
    await p.locator('[data-text-size=large]').click();
    assert.equal(await p.evaluate(() => store.preferences.textSize), 'large');
    assert.equal(await p.locator('[data-text-size=large]').getAttribute('aria-pressed'), 'true');
    await p.evaluate(() => document.getElementById('stateSheet').close());
    const large = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('dialogue')).fontSize));
    assert(Math.abs(large - 16 * 1.15 * fit) < .05, 'large ' + large);
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('historySheet')).getPropertyValue('--story-scale').trim()), '1.15');
    // 고정 대화창 크기·바깥 스크롤은 그대로
    const d = await p.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, box: document.getElementById('conversation').getBoundingClientRect().height }));
    assert.equal(d.w, viewport.width);
    assert.equal(d.h, viewport.height);
    assert(Math.abs(d.box - Math.min(260, viewport.height * .34)) <= 1, 'conversation box ' + d.box);
    await p.evaluate(() => { store.preferences.textSize = 'normal'; applyTextSize(); });
    assert.deepEqual(errors, []);
    console.log('PASS typography', viewport.width + 'x' + viewport.height, ': bundled fonts, keep-all, 16/15px scale, 48px choices, theme fonts, mood faces, text size setting, fixed box.');
    await p.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
