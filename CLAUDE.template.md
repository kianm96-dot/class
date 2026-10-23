# 작업 규칙

## 이 프로젝트

- 화면 서버: __SERVE__
- 작업 후 확인 방법: __CHECK__
  (incremental-implementation · debugging-and-error-recovery 스킬이 말하는 "저장소 자체 확인 명령"은 이것이다)


## 스킬 관찰기 (task-observer)

이 저장소에는 `task-observer` 스킬이 설치돼 있다 (`.claude/skills/task-observer/`).
작업 중 선생님이 반복해서 고쳐 주는 점, 스킬이 부족했던 점, 다시 쓸 만한 작업 방식을
`.claude/observer/skill-observations/observation-log/` 에 하나씩 기록하고,
모인 기록으로 스킬 개선안을 `.claude/observer/skill-updates/` 에 **제안만** 한다.
기존 스킬(`.claude/skills/`)은 선생님이 승인한 내용만 고친다.

클라우드 세션은 끝나면 사라지므로, `.claude/observer/` 의 변경은 그 세션의 작업과
함께 커밋해야 다음 세션에 남는다 (`checkpoints.log` 와 `.id-claims/` 는 .gitignore 로 제외).

Before the first tool call of any session — and before writing or
proposing a plan, not merely before executing one — invoke the
task-observer skill AND execute its Session Start Protocol (storage
check, frontmatter scan, review trigger). Loading the skill and running
the protocol are separate steps; a session that loads the file and stops
has activated nothing. Any turn that will involve a tool call counts; do
not classify the session as "too simple" from its opening message.
A step you did not run is reported before the answer, in one line — never
after it, where it reads as a suggestion. If the skill does not resolve on
this turn, say which probe told you so (the skill listing, or the skill
directory on disk), re-check the listing on every later turn that makes a
tool call, and run the protocol the first time it resolves — a "not
installed" verdict holds for one turn.

Select skills on the DECISION the request is about, not on the artefact it
arrived as. Name what the user is deciding, then match the installed skill
descriptions against that — a request handed over as a file to review
still needs the skill whose description names its subject.

After completing each task, list the observation records written this
session in the same turn and report a one-line summary from that listing
(ids and titles, or "none logged and why") — never from memory of
writing them. This is the activation backstop: it forces a look at the log,
so a session that silently skipped the protocol is discovered at the
first task boundary instead of never.

Loading a skill is not complete until you have queried the observation
log for OPEN observations naming it and read their bodies. Where scripts
run, the lookup and its checkpoint line are one command:
  bash "$CLAUDE_PROJECT_DIR/.claude/skills/task-observer/scripts/skill-load.sh" "$CLAUDE_PROJECT_DIR/.claude/observer" <skill-name>
The Skill invocation and that call are ONE batch — emit them together,
one call per skill loaded, never the call in a later batch.
Apply their insights to the current work — meaning: let them change what
you do in THIS task. Editing the skill file, or writing the rule into any
other file a later session reads, is acting on the observation and waits
for the review (and the user's approval).

The task-observer workspace for this project is:
  $CLAUDE_PROJECT_DIR/.claude/observer
(the SessionStart hook prints it resolved to an absolute path, and exports
it as TASK_OBSERVER_WORKSPACE). Every path the skill uses derives from that
root and nothing else:
  <workspace>/skill-observations/observation-log/   (the log)
  <workspace>/skill-observations/cross-cutting-principles.md
  <workspace>/skill-updates/                        (staging root)
  <workspace>/skill-updates/PENDING.md              (staging manifest)
The skills it observes are this repository's own (.claude/skills/), so the
anchor is per-project by design. This checkout is disposable: the log
survives only through git, so commit .claude/observer/ with the work.

A subagent dispatched by a session that already runs this protocol does
not run it again and does not write to the log. The controller observes;
a subagent that notices something worth logging says so in its final
report, and the controller writes it.

An observation file comes into being only through
  bash "$CLAUDE_PROJECT_DIR/.claude/skills/task-observer/scripts/new-observation.sh" <slug> "$CLAUDE_PROJECT_DIR/.claude/observer"
which prints the path to write into. Never by copying another file's
header or counting a listing — including on the turn after a
compaction, when the skill body is out of context.

## 화면 확인 (agent-browser)

고친 화면을 실제 브라우저로 열어 보거나 클릭해 확인할 때는 `agent-browser` 스킬을 쓴다
(사용법: `.claude/skills/agent-browser/SKILL.md`). 반복 회귀 테스트는 기존 방식대로 둔다.
