# 게임 전용 APK 내보내기 — v0.1.22 (용량 개선 v0.1.26)

## 사용법
에디터의 게임 관리(⋯) → **게임 APK로 내보내기**에서 게임 이름, 메인 그림, 짧은 소개, 제작자 이름, 크레딧을 설정합니다. 이름 외에는 선택 사항이며 입력과 그림은 편집본에 자동 저장됩니다. 미리보기는 선택한 게임 테마를 사용합니다. **게임 APK로 저장**을 누르면 휴대폰 안에서 APK를 만들고 저장 위치를 고를 수 있습니다.

출력 파일은 해당 게임 하나만 포함합니다. 그림·대사·음악·효과음, 테마와 폰트를 함께 담으므로 실행할 때 서버나 에디터가 필요 없습니다. 앱 이름은 게임 이름이며, 서로 다른 게임과 에디터를 동시에 설치할 수 있습니다. 게임을 열면 메인 화면에서 시작·이어 하기·크레딧을 선택합니다. 시작한 뒤의 이전 대화, 배경 보기, 투명도, 보유 상태와 음량은 기존 플레이와 동일합니다. 플레이 중 뒤로가기는 진행을 저장하고 메인 화면으로 돌아옵니다.

내보내기는 **현재 편집본**을 캡처하며, 이전의 '플레이에 반영' 버튼을 누를 필요가 없습니다. 다른 게임, 에디터의 테스트 진행, 사용자의 보유 상태, 편집 폼 초안은 포함하지 않습니다.

## 그림·소리 용량 (v0.1.26)
게임 APK로 저장을 누르면 에디터가 먼저 그림과 소리를 줄입니다. PNG·JPG 그림은 WebP로 바꾸고(원본보다 커지면 원본 유지), WAV·FLAC 소리는 WebCodecs로 Ogg Opus로 바꿉니다(길이가 0.1초 넘게 달라지거나 기기가 지원하지 않으면 원본 유지). 결과는 한 파일씩 `stageExportMedia` 브리지로 캐시 폴더에 넘기고, `game.json`에는 `media/<원본 SHA-256 앞 32자>.<확장자>` 이름만 남깁니다. `GameApkExporter`는 game.json이 가리키는 파일이 모두 있는지 확인한 뒤 `ApkExportEngine`이 `assets/media/`에 무압축·4바이트 정렬로 넣습니다. 파일 하나 40MB, 합계 300MB까지입니다.

플레이어는 `GameCore.allowPackedMedia(true)`로 `media/` 경로를 허용하고 `<img>`·`<audio>`가 APK 안 파일을 바로 읽습니다. 이름이 원본 내용의 해시라서 업데이트 APK에서도 같은 그림은 같은 경로이며, 이전 버전에서 저장한 진행도 그림을 찾습니다. 업데이트에서 지운 그림을 가리키는 오래된 진행은 그 그림만 보이지 않습니다.

글꼴은 `exportFonts` 목록에 있는 것만 담습니다. Pretendard·고운바탕은 항상, 갈무리14는 레트로(픽셀) 테마일 때만 넣습니다.

## 업데이트와 제작자 백업
새 게임의 첫 배포는 제작자 백업을 한 번 저장하고 진행합니다. 같은 게임의 재내보내기는 동일 앱 ID와 서명을 사용합니다. 게임 관리 → 파일 가져오기·내보내기에서 암호화 제작자 백업/복원이 가능하며 게임 고유 ID·서명키·버전 기록을 함께 유지합니다. 이전 백업으로 복원할 때 최근 배포 APK를 선택하면 일치하는 앱 ID/서명을 검증하고 다음 버전의 기준을 확인합니다. APK 저장 취소/실패는 버전 번호가 건너뛸 수 있습니다.

새 게임의 개인키는 앱 내부에서 Keystore AES-GCM으로 암호화하고, 제작자 백업 안에는 암호로 보호하여 포함합니다. 게임 APK에는 넣지 않습니다. 기존 v0.1.20/21의 이미 배포한 게임은 비추출형 Keystore 키를 유지하므로 원래 설치에서만 업데이트할 수 있습니다. 그 게임을 다른 기기로 복원하면 기존 키가 없음을 안내하며 다른 서명으로 같은 앱을 몰래 생성하지 않습니다.

업데이트 후 진행은 시작한 버전을 유지하고 처음부터를 선택하면 새 버전으로 시작합니다. 상세 사용법과 저장/백업 한계는 RELEASE-v0.1.22.md를 보세요.

## 구현 및 검증
`ApkExportEngine.java`는 플레이어 전용 DEX가 들어 있는 작은 셸에 현재 편집본과 플레이 런타임을 붙입니다. 메인 그림 또는 별도 그림에서 생성한 PNG 아이콘도 APK 리소스에 포함합니다. AndroidManifest 문자열 풀의 앱 ID/이름/버전을 갱신하고, resources.arsc를 STORED/4바이트 정렬로 기록합니다. v2 서명은 AOSP apksig가 생성·검증합니다. 네트워크, 외부 컴파일러 또는 빌드 서버를 호출하지 않습니다.

템플릿에는 PlayerActivity만 있고, 프로젝트 가져오기·APK 내보내기 브리지가 없습니다. 공통 HTML/JS에 편집용 코드 일부가 함께 들어 있지만 게임 APK에서는 에디터 UI와 편집 경로를 사용할 수 없으며, 다른 게임 데이터는 없습니다. 모든 게임 콘텐츠를 읽기 전용으로 숨기거나 암호화하는 기능은 아닙니다.

검증 결과:
- 실제 APK 4개를 Java의 동일 포장 엔진으로 생성: 공식 apksigner 서명 검증, aapt 앱 ID·이름·버전 확인, zipalign 정렬 검증.
- 같은 게임의 두 버전은 동일 ID, 다른 게임은 다른 ID, 에디터 ID와도 분리.
- 메인 화면/크레딧의 자동 저장, 그림 가져오기, 불필요한 다른 게임·진행 데이터 제외, 내보내기 중 중복 클릭 차단, 취소 후 재시도.
- 실제 생성 APK에서 추출한 런타임으로 세 가지 모바일 화면 크기에서 메인 화면, 실제 선택지, 이어 하기, 히스토리, 배경 보기, 투명도, 크레딧 내부 스크롤 확인.
- 기존 Android 저장 브리지와 10종 테마의 회귀 검사 통과.

실제 휴대폰에서 Android Keystore 생성, 파일 선택기 저장, APK 설치까지의 통합 검사는 이 환경에서 실행하지 못했습니다. Google Play 배포용 AAB나 배포 등록은 제공하지 않습니다.

## 재현
`build.sh`는 PlayerActivity를 먼저 컴파일해 `assets/player-shell.apk`를 만들고, 플레이 전용 진입 HTML을 갱신한 뒤 에디터 APK를 빌드합니다. SDK 경로는 ANDROID_TOOLS와 ANDROID_JAR 환경 변수로 지정합니다. `vendor/apksig.jar`의 Apache-2.0 라이선스는 assets/licenses에 있습니다.

주요 검사: test-apk-metadata.cjs, test-apk-export-browser.cjs. export-qa/NativeExportHost.java는 데스크톱에서 동일 포장 엔진을 검증하기 위한 도구이며, 실제 출력 게임 APK에는 포함하지 않습니다.

자료:
- https://source.android.com/docs/security/features/apksigning/v2
- https://android.googlesource.com/platform/tools/apksig/+/refs/heads/main/src/main/java/com/android/apksig/ApkSigner.java
- https://developer.android.com/reference/android/security/keystore/KeyGenParameterSpec.Builder
- https://developer.android.com/build/configure-app-module
