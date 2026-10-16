(function(root){'use strict';
const release='rain-before-dawn-v2';
// Never replace a user's drafts, releases, active game, progress or preferences.
// A persisted marker means a removed built-in sample is not silently recreated.
function install(store){
 if(store.exampleReleases?.includes(release))return '';
 if(store.games.some(g=>g.builtinExample===release)){store.exampleReleases=[...(store.exampleReleases||[]),release];return '';}
 if(store.games.length>=100)return '확장 예제를 추가할 게임 공간이 없습니다.';
 const p=root.GameCore.validate(root.ADVANCED_SAMPLE),g=root.GameVault.game(p,true);
 g.builtinExample=release;
 const candidate={...store,games:[...store.games,g],exampleReleases:[...(store.exampleReleases||[]),release]};
 if(root.GameVault.encode(candidate).length>100000000)return '저장 용량 때문에 확장 예제를 추가하지 못했습니다.';
 store.games.push(g);store.exampleReleases=candidate.exampleReleases;
 return '';
}
root.ExampleGames={install,release};
})(globalThis);
