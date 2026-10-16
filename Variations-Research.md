# 대사 변주 조사와 결정 · 2026-10-16

목표: 적은 버튼과 적은 과정으로, 같은 사건이 지난 선택·상태에 따라 조금씩 다른 대사와 다른 길로 갈라지는 게임을 만들 수 있게 한다.

## 참고한 성공 사례

| 도구·작품 | 핵심 방식 | 이 에디터에 가져온 것 |
| --- | --- | --- |
| inkle **ink** (80 Days, Heaven's Vault) | 문장 안의 조건부 텍스트, 순서/순환/무작위 대안, 방문 횟수 조건. 장면을 쪼개지 않고 문장 단위로 변주 | `{조건? A\|B}`, `{A\|B\|C}`(방문마다, 마지막에서 멈춤), `{&…}`(순환), `{~…}`(무작위), `방문` 조건 |
| Failbetter **StoryNexus / Fallen London** (품질 기반 서사, storylet) | 모든 상태를 숫자 "품질"로 두고 내용의 조건·효과로 읽고 씀 | 기억을 보유 항목의 한 종류(숫자)로 두어 조건·소모·변주에서 같은 방식으로 읽음 |
| **Yarn Spinner** (line groups, `visited()`) | 같은 자리에 여러 줄 후보를 두고 조건과 방문 기록으로 하나를 고름 | `{@사건 이름? …}` 지나온 사건 조건, 반복 인카운터의 방문별 대사 |
| 서울 2033 이야기 작성 문법 (기존 UI-Research.md) | 페이지·선택지·조건별 결과 | 기존 규칙 유지. 사용자 규칙대로 보유 상태는 랜덤 사건 추첨에 관여하지 않음 |

출처:
- ink: [inkle ink 문서](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md), [Stories with Memory (ink 교재)](https://pressbooks.library.torontomu.ca/playablestoriesink/chapter/chapter-4-labels-and-conditionals/)
- 품질 기반 서사: [Emily Short, Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/), [StoryNexus is Open](https://emshort.blog/2012/10/16/storynexus-is-open/)
- Yarn Spinner: [Saliency](https://docs.yarnspinner.dev/write-yarn-scripts/advanced-scripting/saliency), [Yarn 언어](https://yarnspinner.dev/docs/yarn/)

## 왜 문장 변주인가

갈래마다 장면을 복사하면 장면 수가 곱으로 늘고, 공통 문장을 고칠 때 모든 복사본을 고쳐야 한다. ink·Fallen London이 보여 주듯 큰 줄기는 같은 장면을 쓰고, 상태가 닿는 몇 문장과 선택지만 바꾸면 적은 작업으로 "같은데 조금 다른" 경험을 만든다. 이 에디터의 장면·선택지·보유 항목 구조는 그대로 두고, 문장 안의 작은 문법과 숨은 표시(기억) 하나만 더했다.

## 적은 버튼으로 쓰기 위한 결정

- 문법을 외우지 않아도 되도록 문구를 선택 → 버튼 → 항목 고르기 2번 터치로 감싼다. 문법은 `?` 한 곳에 모은다.
- 결과를 머리로 계산하지 않도록 상태 칩 미리보기를 대사 바로 아래 둔다(인지보다 기억에 의존하지 않게: NN/G 원칙).
- 선택지를 쓰려고 탭을 옮기지 않도록 내용 탭에 선택지 목록을 함께 둔다.
- 기억 만들기는 선택지 폼의 버튼 한 번. 이름은 선택지 문구를 그대로 쓴다.
- 이름을 바꾸면 대사 속 참조도 함께 바뀌어, 변주가 조용히 깨지지 않게 한다. 깨진 참조는 점검이 알려 준다.

## 코드 언어: Rust로 바꾸지 않음

현재 JavaScript 구조를 유지했다.

- 이 앱은 Android WebView에서 HTML/JS로 화면을 그리고, 게임 APK 내보내기도 같은 JS 파일을 플레이어 셸에 넣는다. Rust로 바꾸면 WebAssembly 또는 JNI 빌드가 추가되고, APK 안에서 APK를 만드는 현재 파이프라인(ecj·d8·aapt, 앱 내부 서명)에 Rust 툴체인을 넣어야 한다.
- 코드의 대부분은 UI·저장·미디어 처리라 Rust의 성능·메모리 안전 이점이 드러나지 않는다. 게임 데이터는 최대 1,000장면 규모로 JS로 충분히 빠르다.
- 전면 재작성은 0.1.x까지 쌓인 검사(브라우저 3개 화면 크기, 저장 복구, 서명)를 다시 맞춰야 하는 위험이 크다.
- 앞으로 고치기 쉽도록 새 기능은 압축된 한 줄 코드 대신 주석이 있는 별도 파일(`variations.js`, `editor-variations.js`, `variation-sample.js`)로 작성했다. 같은 방식으로 기존 파일도 기능 단위로 하나씩 나누어 가는 것을 권장한다.
