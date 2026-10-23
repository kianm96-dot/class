#!/bin/bash
# 새 레포에 기본 세트를 설치한다.
# 사용: bash install.sh <레포 폴더> ["화면 서버 명령"] ["작업 후 확인 방법"]
# 예:   bash install.sh ~/my-site "python3 -m http.server 8765" "agent-browser 로 바뀐 화면 열어 보기"
#       bash install.sh ~/my-app  "npm run dev (포트 5173)" "npm test"
# 이미 있는 스킬·명령·참고 문서는 덮어쓰지 않는다(건너뛴 목록을 보여 줌).
set -e
KIT="$(cd "$(dirname "$0")" && pwd)"
T="${1:?레포 폴더를 적어 주세요: bash install.sh <레포 폴더>}"
SERVE="${2:-python3 -m http.server 8765 (정적 사이트 기준, 바꿔 적기)}"
CHECK="${3:-agent-browser 로 바뀐 화면을 열어 확인 (테스트 명령이 생기면 여기에 적기)}"
[ -d "$T/.git" ] || { echo "git 레포가 아니에요: $T"; exit 1; }
cd "$T"
mkdir -p .claude/skills .claude/references .claude/commands .claude/hooks
skipped=""
for kind in skills references commands; do
  for src in "$KIT/.claude/$kind/"*; do
    n=$(basename "$src")
    if [ -e ".claude/$kind/$n" ]; then skipped="$skipped $kind/$n"; else cp -r "$src" ".claude/$kind/"; fi
  done
done
for h in setup-tools.sh task-observer-start.sh; do
  if [ -e ".claude/hooks/$h" ]; then skipped="$skipped hooks/$h"; else cp "$KIT/.claude/hooks/$h" .claude/hooks/; fi
done
chmod +x .claude/hooks/*.sh .claude/skills/task-observer/scripts/* 2>/dev/null || true

# settings.json: 없으면 새로, 있으면 SessionStart 훅만 추가
python3 - "$KIT/.claude/settings.json" <<'EOF'
import json, os, sys
kit = json.load(open(sys.argv[1])); p = ".claude/settings.json"
if not os.path.exists(p):
    json.dump(kit, open(p, "w"), ensure_ascii=False, indent=2); print("settings.json 새로 만듦"); sys.exit()
s = json.load(open(p)); ss = s.setdefault("hooks", {}).setdefault("SessionStart", [])
if not ss: ss.append({"hooks": []})
have = {h.get("command") for g in ss for h in g.get("hooks", [])}
for h in kit["hooks"]["SessionStart"][0]["hooks"]:
    if h["command"] not in have: ss[0]["hooks"].append(h)
json.dump(s, open(p, "w"), ensure_ascii=False, indent=2); print("settings.json 에 훅 추가")
EOF

# 관찰 기록 폴더
mkdir -p .claude/observer/skill-observations/observation-log/archive .claude/observer/skill-updates
touch .claude/observer/skill-observations/observation-log/archive/.gitkeep .claude/observer/skill-updates/.gitkeep
grep -q "task-observer: 세션마다" .gitignore 2>/dev/null || printf '\n# task-observer: 세션마다 바뀌는 기록은 커밋하지 않음\n.claude/observer/skill-observations/checkpoints.log\n.claude/observer/skill-observations/observation-log/archive/.id-claims/\ngraphify-out/\n' >> .gitignore

# CLAUDE.md: 없으면 새로, 있으면 뒤에 붙임
body=$(sed -e "s|__SERVE__|$SERVE|" -e "s|__CHECK__|$CHECK|" "$KIT/CLAUDE.template.md")
if [ -e CLAUDE.md ]; then
  grep -q "task-observer" CLAUDE.md && echo "CLAUDE.md 에 이미 규칙이 있어 건드리지 않음" || { printf '\n%s\n' "$(printf '%s' "$body" | tail -n +2)" >> CLAUDE.md; echo "CLAUDE.md 뒤에 규칙 추가"; }
else
  printf '%s\n' "$body" > CLAUDE.md; echo "CLAUDE.md 새로 만듦"
fi

# 사이트로 배포되는 레포라면 .claude 가 공개되지 않게 막아야 한다(Vercel: .vercelignore, Cloudflare: .assetsignore 등)
for f in .vercelignore .assetsignore; do
  [ -e "$f" ] && ! grep -qx '.claude' "$f" && echo ".claude" >> "$f" && echo "$f 에 .claude 추가"
done

echo "설치 끝."
[ -n "$skipped" ] && echo "이미 있어서 건너뜀:$skipped"
echo "확인: python3 -I .claude/skills/task-observer/scripts/validate-skill-bundle.py .claude/skills/task-observer"
