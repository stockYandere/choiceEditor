// 0.1.24 내용 탭 변주 도구 · 미리보기 · 선택지 목록 · 기억 · 플레이 렌더링 (3개 세로 화면)
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
    const id = await p.evaluate(() => store.games.find(g => g.builtinExample === 'same-alley-variations-v1')?.id);
    assert(id, '변주 예제가 설치됨');
    await p.click('#openEditor');
    await p.locator(`[data-edit-game="${id}"]`).click();
    await p.waitForFunction(() => page === 'story');
    const noOverflow = async label => {
      const d = await p.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
      assert.equal(d.w, viewport.width, label + ' 가로 스크롤 없음');
      assert.equal(d.h, viewport.height, label + ' 바깥 세로 스크롤 없음');
    };

    // 첫 사건: 변주 도구, 미리보기, 선택지 목록이 내용 탭에 함께 보임
    assert.equal(await p.locator('#varTools, .varTools').count(), 1);
    assert.equal(await p.locator('#sceneChoiceList [data-scene-choice]').count(), 3);
    const before = await p.locator('.varLine p').innerText();
    assert.match(before, /다가가도 될까/);
    await p.locator('[data-quality="용기"]').click();
    assert.match(await p.locator('.varLine p').innerText(), /망설임 없이 쪼그려 앉았다/);
    assert.equal(await p.locator('[data-quality="용기"]').getAttribute('aria-pressed'), 'true');
    // 선택지 문구도 같은 상태로 미리보기
    assert.match(await p.locator('#sceneChoiceList').innerText(), /우산을 기울여 씌워 준다/);
    await noOverflow('내용 탭');

    // 다음 사건: 방문 칩을 돌리면 같은 대사가 방문마다 바뀜
    await p.click('#nextEvent');
    assert.match(await p.locator('.varLine p').innerText(), /처음 보는 얼굴의/);
    await p.locator('[data-quality="방문"]').click();
    assert.match(await p.locator('.varLine p').innerText(), /또 그 고양이/);
    await p.locator('[data-quality="방문"]').click();
    assert.match(await p.locator('.varLine p').innerText(), /이제는 익숙한[\s\S]*발소리를 아는/);
    // 기억이 없으면 숨김 선택지는 흐리게 표시
    assert.equal(await p.locator('.sceneChoice.hiddenChoice').count(), 1);
    await p.locator('[data-quality="보리라고 불렀다"]').click();
    assert.equal(await p.locator('.sceneChoice.hiddenChoice').count(), 0);

    // 선택한 문구를 조건으로 감싸기 (2번 터치)
    await p.evaluate(() => { const t = document.getElementById('copy'); const i = t.value.indexOf('담벼락'); t.focus(); t.setSelectionRange(i, i + 3); });
    await p.click('#varCondition');
    await p.selectOption('#varPick', '관찰력');
    const text = await p.inputValue('#copy');
    assert(text.includes('{관찰력? 담벼락|담벼락}'), text);
    await p.waitForFunction(() => project.events[1].text.includes('{관찰력? 담벼락|담벼락}'));
    // 방문마다 / 무작위 버튼은 선택 없이도 예시를 넣고 첫 문구를 선택
    await p.evaluate(() => { const t = document.getElementById('copy'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
    await p.click('#varRandom');
    assert((await p.inputValue('#copy')).endsWith('{~하나|둘|셋}'));
    assert.equal(await p.evaluate(() => { const t = document.getElementById('copy'); return t.value.slice(t.selectionStart, t.selectionEnd); }), '하나');
    await p.click('#undoEdit');
    await p.click('#varHelp');
    assert.match(await p.locator('#modalBody').innerText(), /방문할 때마다|올 때마다/);
    await noOverflow('문법 도움말');
    await p.click('#closeModal');

    // 선택지 폼: 없을 때만 / 숨김 / 기억 만들기
    await p.locator('#sceneChoiceList [data-scene-choice]').nth(3).click();
    assert(await p.locator('#cRequiresExtra').isHidden());
    await p.selectOption('#cRequires', 'eye');
    assert(await p.locator('#cRequiresExtra').isVisible());
    await p.selectOption('#cRequiresMode', 'not');
    await p.check('#cHideLocked');
    await p.click('#cRememberQuick');
    await p.waitForFunction(() => project.definitions.some(d => d.type === 'memory' && d.name === '자리를 뜬다'));
    await p.click('#saveChoice');
    const saved = await p.evaluate(() => project.events[1].choices[3]);
    assert.equal(saved.requires, 'eye');
    assert.equal(saved.requiresNot, true);
    assert.equal(saved.hideLocked, true);
    assert(saved.remember);
    assert.match(await p.locator('#sceneChoiceList').innerText(), /관찰력 없을 때만/);

    // 보유 항목 이름을 바꾸면 대사 속 조건도 함께 바뀜
    await p.click('[data-page=inventory]');
    await p.locator('[data-edit-def="nerve"]').click();
    await p.fill('#dName', '담력');
    await p.click('#saveDef');
    const alley = await p.evaluate(() => project.events[0].text + project.events[0].choices.map(c => c.text).join());
    assert(alley.includes('{담력? 나는') && !alley.includes('{용기?'), alley);
    // 예약어는 거부
    await p.locator('[data-edit-def="nerve"]').click();
    await p.fill('#dName', '방문');
    await p.click('#saveDef');
    assert.match(await p.locator('#formError').innerText(), /방문/);
    await p.click('#closeModal');
    // 쓰이는 곳: 기억을 남기는 선택과 그 기억을 읽는 대사·조건을 모아 보고 이동
    assert.match(await p.locator('[data-usage-def="namedCat"]').innerText(), /얻는 곳 1 · 쓰는 곳 [4-9]/);
    await p.locator('[data-usage-def="namedCat"]').click();
    const usage = await p.locator('#modalBody').innerText();
    assert.match(usage, /골목 입구[\s\S]*기억/);
    assert.match(usage, /대사 변주/);
    assert.match(usage, /없을 때만|필요/);
    await noOverflow('쓰이는 곳');
    await p.locator('[data-usage-jump]').first().click();
    await p.waitForFunction(() => page === 'story' && selected === project.events[0].id);
    await p.click('[data-page=inventory]');
    // 기억 종류는 효과·연출 설정을 숨김
    await p.locator('[data-edit-def="namedCat"]').click();
    assert(await p.locator('#dMemoryHint').isVisible());
    assert(await p.locator('#acquisitionSettings').isHidden());
    await p.click('#closeModal');

    // 테스트 플레이: 대사·선택지가 상태대로 그려지고 기억은 가방에 없음
    await p.click('[data-page=story]');
    await p.evaluate(() => { selected = project.events[1].id; renderEditor(); });
    await p.click('#testHere');
    await p.waitForFunction(() => page === 'test' && run);
    await p.evaluate(() => finishDialogue(true));
    assert.match(await p.locator('#dialogue').innerText(), /처음 보는 얼굴의 고양이가/);
    assert.doesNotMatch(await p.locator('#answers').innerText(), /우리 집에 갈래/);
    await p.evaluate(() => { run.bag.namedCat = 1; dialogueKey = ''; renderTest(); finishDialogue(true); });
    assert.match(await p.locator('#answers').innerText(), /보리야, 우리 집에 갈래/);
    assert.match(await p.locator('#dialogue').innerText(), /"보리야\." 부르자/);
    await p.locator('#bag').click();
    assert.doesNotMatch(await p.locator('#stateItems').innerText(), /보리라고 불렀다/);
    await p.evaluate(() => document.getElementById('stateSheet').close());
    // 조건 비교에 대사 변주 조건과 기억이 포함됨
    await p.click('#quickTest');
    const compare = await p.locator('#compareConditions').innerText();
    assert.match(compare, /보리라고 불렀다/);
    assert.match(compare, /관찰력/);
    assert.match(await p.locator('#compareLine').innerText(), /고양이가/);
    await p.click('#closeModal');
    await noOverflow('테스트');

    assert.deepEqual(errors, []);
    console.log('PASS variations UI', viewport.width + 'x' + viewport.height, ': tools, preview chips, visits, hidden choice, wrap selection, help, choice form memory/not/hide, rename, reserved name, play rendering, bag hides memory, compare, no outer overflow.');
    await p.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
