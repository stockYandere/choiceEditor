/*
 * 변주 예제 · 같은 골목, 다른 밤
 *
 * 그림 없이 대사 변주만으로 "같은 사건이 조금씩 다르게" 흘러가는 구조를 보여 줍니다.
 *  - 시작 능력 3종 중 2개를 무작위로 받아 판마다 문장과 선택지가 달라집니다.
 *  - 반복 인카운터(젖은 고양이, 편의점)는 방문할 때마다 {처음|또|이제는} 문구가 바뀝니다.
 *  - 선택을 '기억'으로 남기고, 이후 사건의 한두 문장과 숨은 선택지가 그 기억을 읽습니다.
 *  - 새벽(마무리)의 대사는 지금까지의 기억·자원에 따라 문장 단위로 갈라집니다.
 */
(function (root) {
  'use strict';

  function choice(id, text, options = {}) {
    return {
      id, text, hp: 0, mental: 0, money: 0, gain: '', lose: '', requires: '',
      requiresCount: 1, gainCount: 1, loseCount: 1, next: 'random', ...options,
    };
  }

  function scene(id, title, speaker, kind, text, choices, extra = {}) {
    return { id, title, speaker, kind, text, once: true, mode: 'both', top: {}, bottom: {}, choices, ...extra };
  }

  const definitions = [
    { id: 'eye', name: '관찰력', type: 'ability', initial: 0 },
    { id: 'nerve', name: '용기', type: 'ability', initial: 0 },
    { id: 'talk', name: '말솜씨', type: 'ability', initial: 0 },
    { id: 'umbrella', name: '우산', type: 'item', initial: 1 },
    { id: 'coffee', name: '캔커피', type: 'item', initial: 0 },
    { id: 'food', name: '고양이 사료', type: 'item', initial: 0 },
    { id: 'namedCat', name: '보리라고 불렀다', type: 'memory', initial: 0 },
    { id: 'gaveUmbrella', name: '우산을 건넸다', type: 'memory', initial: 0 },
    { id: 'readNote', name: '쪽지를 읽었다', type: 'memory', initial: 0 },
    { id: 'fedCat', name: '보리에게 밥을 줬다', type: 'memory', initial: 0 },
  ];

  const events = [
    scene('alley', '골목 입구', '나', 'story',
      '{~빗소리가 굵어졌다|빗줄기가 잦아들 기미가 없다|우산 위로 빗방울이 튄다}.\n'
      + '편의점 불빛 아래, 젖은 고양이 한 마리가 {관찰력? 왼쪽 앞발을 들고 절뚝이며 |}나를 올려다본다.\n'
      + '{용기? 나는 망설임 없이 쪼그려 앉았다.|다가가도 될까. 발끝만 내려다본다.}',
      [
        choice('alley-name', "고양이에게 '보리'라고 이름을 지어 준다", { remember: 'namedCat', mental: 1 }),
        choice('alley-cover', '{용기? 우산을 기울여 씌워 준다|우산 끝으로 빗물만 막아 준다}', { requires: 'umbrella', hp: -1 }),
        choice('alley-pass', '그냥 지나친다'),
      ]),
    scene('cat', '젖은 고양이', '나', 'encounter',
      '{처음 보는 얼굴의|또 그|이제는 익숙한} 고양이가 담벼락 밑에 웅크리고 있다.\n'
      + '{보리라고 불렀다? "보리야." 부르자 귀가 쫑긋 선다.|경계하듯 꼬리를 부풀린다.}'
      + '{방문>=3?  녀석은 이제 내 발소리를 아는 것 같다.|}',
      [
        choice('cat-feed', '{보리라고 불렀다? 보리에게 사료를 덜어 준다|사료를 조금 덜어 둔다}', { requires: 'food', lose: 'food', remember: 'fedCat', mental: 1 }),
        choice('cat-follow', '{보리라고 불렀다? 보리를 따라간다|고양이를 따라간다}', { next: 'backstreet' }),
        choice('cat-home', '보리야, 우리 집에 갈래?', { requires: 'namedCat', hideLocked: true, next: 'together' }),
        choice('cat-leave', '자리를 뜬다'),
      ], { once: false }),
    scene('backstreet', '뒷골목', '나', 'branch',
      '{~깨진 화분|녹슨 자전거|젖은 박스 더미} 사이로 꼬리가 사라진다.\n'
      + '{관찰력? 가로등 아래 바닥에서 무언가 반짝인다.|발밑이 미끄럽다.}',
      [
        choice('back-search', '{관찰력? 반짝이는 동전을 줍는다|더듬더듬 길을 찾는다}', {
          hp: -1,
          branch: { when: 'eye', count: 1, hp: 0, mental: 0, money: 1, gain: '', lose: '', next: 'random', gainCount: 1, loseCount: 1 },
        }),
      ]),
    scene('store', '편의점', '점원', 'encounter',
      '{어서 오세요.|또 오셨네요.|오늘도 비가 오네요, 단골님.}\n'
      + '점원이 {우산을 건넸다? 젖은 내 어깨를 보더니 말없이 수건을 내민다.|계산대 너머로 고개만 까딱한다.}'
      + '{돈<=1?  지갑이 가볍다.|}',
      [
        choice('store-coffee', '{돈>=2? 캔커피를 산다|동전을 긁어모아 캔커피를 산다}', { money: -1, gain: 'coffee' }),
        choice('store-food', '고양이 사료를 외상으로 부탁한다', { requires: 'talk', hideLocked: true, gain: 'food' }),
        choice('store-buyfood', '고양이 사료를 산다', { requires: 'talk', requiresNot: true, money: -1, gain: 'food' }),
        choice('store-leave', '{우산을 건넸다? 수건을 돌려주고 나간다|나간다}'),
      ], { once: false }),
    scene('stop', '버스 정류장', '나', 'encounter',
      '버스 정류장에 우산 없이 선 사람이 있다.{관찰력?  손에 쥔 쪽지가 빗물에 번지고 있다.|}',
      [
        choice('stop-umbrella', '우산을 건넨다', { requires: 'umbrella', lose: 'umbrella', remember: 'gaveUmbrella', mental: 1 }),
        choice('stop-note', '번지는 쪽지를 대신 읽어 준다', { requires: 'eye', hideLocked: true, remember: 'readNote' }),
        choice('stop-coffee', '{용기? 캔커피를 건네며 말을 건다|캔커피를 슬쩍 옆에 둔다}', { requires: 'coffee', lose: 'coffee', mental: 1 }),
        choice('stop-ignore', '모른 척한다', { mental: -1 }),
      ]),
    scene('lastbus', '막차', '나', 'encounter',
      '{막차가 들어온다.|또 막차 시간이다.|막차 기사님이 나를 알아보는 눈치다.}\n'
      + '{우산을 건넸다? 정류장의 그 사람이 창밖에서 손을 흔든다. |}{쪽지를 읽었다? 쪽지에 적혀 있던 주소가 이 노선 끝이었다는 게 떠오른다.|}',
      [
        choice('bus-ride', '막차에 오른다', { next: 'sequence' }),
        choice('bus-wait', '{보리라고 불렀다? 보리가 걸려서 한 번 더 골목을 돈다|조금 더 걷는다}'),
      ], { once: false }),
    scene('dawn', '새벽', '나', 'story',
      '비가 그쳤다.\n'
      + '{보리라고 불렀다? 보리는 지금쯤 처마 밑에서 자고 있을까.|그 고양이는 어디로 갔을까.} '
      + '{우산을 건넸다? 우산이 없는데도 이상하게 춥지 않다.|{우산? 접힌 우산이 손에서 무겁다.|}}\n'
      + '{쪽지를 읽었다? 번진 글씨 하나가 자꾸 떠오른다.\n|}'
      + '{멘탈>=3? 마음이 가볍다.|{멘탈<=1? 마음이 무겁다.|그럭저럭 견딜 만한 밤이었다.}}',
      [choice('dawn-home', '집으로', { next: 'end' })]),
    scene('together', '보리와 함께', '나', 'branch',
      '보리를 품에 안았다.\n'
      + '{보리에게 밥을 줬다? 배가 부른 녀석은 금세 잠이 든다.|녀석의 배에서 꼬르륵 소리가 난다. 집에 가면 밥부터 줘야겠다.}\n'
      + '{우산? 우산을 기울여 둘이 함께 쓴다.|젖은 털에서 빗물 냄새가 난다.}',
      [choice('together-end', '함께 집으로', { next: 'end' })]),
  ];

  root.VARIATION_SAMPLE = {
    format: 'event-vn', version: 1, title: '변주 예제 · 같은 골목, 다른 밤', theme: 'noir',
    hp: 3, maxHp: 3, mental: 2, money: 2, randomStart: 2, manualSaves: true,
    defaultArt: { top: { text: '비 내리는 골목' }, bottom: { text: '젖은 보도블록 위 불빛' } },
    definitions, events,
  };
})(globalThis);
