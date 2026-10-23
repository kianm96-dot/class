# 새 레포용 Claude 기본 세트

02 · history · science 레포에서 쓰던 스킬 중 **어느 프로젝트에나 맞는 것만** 모았어요.

## 설치 (한 줄)

```bash
bash install.sh <레포 폴더> "<화면 서버 명령>" "<작업 후 확인 방법>"
```

예시
- 정적 사이트: `bash install.sh ~/my-site "python3 -m http.server 8765" "agent-browser 로 바뀐 화면 열어 보기"`
- 앱: `bash install.sh ~/my-app "npm run dev (포트 5173)" "npm test"`

뒤의 두 가지를 비우면 정적 사이트 기준으로 적히고, 나중에 CLAUDE.md 맨 위에서 고치면 돼요.
이미 있는 스킬·명령은 덮어쓰지 않아요. 설치 후 커밋·푸시하면 클라우드 세션에서도 바로 써요.

클라우드에서 하려면 Claude에게 "이 기본 세트를 OO 레포에 설치해 줘"라고 하고 이 압축 파일을 첨부하면 돼요.

## 들어 있는 것

**일하는 방식 (스킬 18개)**

| 스킬 | 하는 일 |
|---|---|
| planning-and-task-breakdown | 큰 일을 작은 순서로 쪼개 계획 |
| interview-me | 요청이 애매하면 하나씩 질문 |
| incremental-implementation | 조금씩 만들고 그때마다 확인 |
| test-driven-development | 테스트 먼저 쓰기 (테스트가 있는 프로젝트용) |
| debugging-and-error-recovery | 오류 원인 찾기 |
| code-review-and-quality | 코드 점검 |
| code-simplification | 복잡한 코드 단순하게 |
| security-and-hardening | 보안 점검 (로그인·개인정보) |
| performance-optimization | 느린 화면·용량 줄이기 |
| api-and-interface-design | 서버 주소·데이터 모양 설계 |
| doubt-driven-development | 되돌리기 어려운 변경 전에 한 번 더 의심 |
| git-workflow-and-versioning | 커밋·기록 정리 |
| frontend-ui-engineering | 화면 만들기 |
| frontend-design | 화면을 개성 있게 꾸미기 (수업 자료·소개 페이지에 좋음, 업무 앱이면 빼도 됨) |
| ponytail · ponytail-review | 군더더기 없이 최소한으로 |
| agent-browser | 실제 브라우저로 화면 열어 확인 |
| task-observer | 자주 고쳐 주는 점을 기록 → 스킬 개선안 제안 → 승인한 것만 반영 |

**명령어**: `/plan` 계획 · `/build` 만들기 · `/test` 점검 · `/review` 검토 · `/code-simplify` 단순화

**참고 문서** (`.claude/references/`): 보안·성능·접근성 체크리스트, 완료 기준 — 스킬들이 함께 읽으므로 같이 있어야 해요.

**세션 시작 훅**
- 클라우드에서 agent-browser 자동 설치
- 관찰기 켜기 + 열린 관찰 수 알려 주기
- (선택) graphify 코드 지도: `.claude/hooks/setup-tools.sh` 의 `GRAPHIFY_DIR=""` 에 폴더 이름을 적으면 켜짐

## 알아 둘 점

- task-observer 는 세션마다 약 1만 토큰을 더 써요. 끄려면 CLAUDE.md 의 관찰기 부분과 settings.json 의 `task-observer-start.sh` 줄을 지우세요.
- 관찰 기록(`.claude/observer/`)은 커밋해야 다음 세션에 남아요.
- 선생님 PC에서 모든 프로젝트에 쓰려면 `.claude/skills` 를 `~/.claude/skills` 에 복사해도 되지만, 클라우드 세션은 레포 안의 것만 읽어요.

## 출처·라이선스

- agent-skills (addyosmani/agent-skills, MIT) — `.claude/references/LICENSE-agent-skills`
- ponytail (MIT), frontend-design (Anthropic, LICENSE.txt)
- task-observer v3.7.0 (rebelytics/one-skill-to-rule-them-all, CC-BY-4.0)
- agent-browser 안내 (vercel-labs/agent-browser, Apache-2.0)
