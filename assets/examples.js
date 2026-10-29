(function(root){'use strict';
// Built-in examples, installed once each. Order matters: older releases first.
const releases=[
 // 랜덤 보상 예제 · 비가 그치기 전: no longer bundled since v0.1.50 (its data now lives in test-fixtures/ for tests), so the app skips it.
 {release:'rain-before-dawn-v2',data:()=>root.ADVANCED_SAMPLE,full:'확장 예제를 추가할 게임 공간이 없습니다.',size:'저장 용량 때문에 확장 예제를 추가하지 못했습니다.'},
 {release:'same-alley-variations-v1',data:()=>root.VARIATION_SAMPLE,full:'변주 예제를 추가할 게임 공간이 없습니다.',size:'저장 용량 때문에 변주 예제를 추가하지 못했습니다.'},
 // 기능 둘러보기: every feature with the built-in pictures and sounds (make-showcase.py).
 {release:'showcase-rainy-school-v1',data:()=>root.SHOWCASE_SAMPLE,full:'기능 둘러보기 예제를 추가할 게임 공간이 없습니다.',size:'저장 용량 때문에 기능 둘러보기 예제를 추가하지 못했습니다.'},
 // 축제 전날 밤: the v0.1.57~v0.1.63 features (호감도, 여러 조건, 랜덤 무게·등장 조건, 시간 제한, 엔딩 모음) in one story (make-festival.py).
 {release:'festival-night-v1',data:()=>root.FESTIVAL_SAMPLE,full:'축제 전날 밤 예제를 추가할 게임 공간이 없습니다.',size:'저장 용량 때문에 축제 전날 밤 예제를 추가하지 못했습니다.'}
];
const release=releases[0].release;
// Never replace a user's drafts, releases, active game, progress or preferences.
// A persisted marker means a removed built-in sample is not silently recreated.
function installOne(store,item){
 if(store.exampleReleases?.includes(item.release))return '';
 const data=item.data();if(!data)return '';
 if(store.games.some(g=>g.builtinExample===item.release)){store.exampleReleases=[...(store.exampleReleases||[]),item.release];return '';}
 if(store.games.length>=100)return item.full;
 const p=root.GameCore.validate(JSON.parse(JSON.stringify(data))),g=root.GameVault.game(p,true);
 g.builtinExample=item.release;
 const candidate={...store,games:[...store.games,g],exampleReleases:[...(store.exampleReleases||[]),item.release]};
 if(root.GameVault.encode(candidate).length>100000000)return item.size;
 store.games.push(g);store.exampleReleases=candidate.exampleReleases;
 return '';
}
function install(store){
 let notice='';
 for(const item of releases){const message=installOne(store,item);if(message&&!notice)notice=message;}
 return notice;
}
root.ExampleGames={install,release,releases:releases.map(r=>r.release)};
})(globalThis);
