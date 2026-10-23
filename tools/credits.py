"""assets/photo/credits.json → assets/photo/CREDITS.md 를 다시 만듭니다."""
import json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import photo as PH
c = PH.load()
rows = ['# 사진 출처', '', '모든 사진은 위키미디어 공용(Wikimedia Commons)의 자료입니다. 퍼블릭 도메인을 우선 썼고, 장마다 출처를 적었습니다.',
        '‘원격’은 아직 저장소에 내려받지 않아 공용에서 바로 불러오는 사진입니다(`python3 tools/photo.py fetch` 로 내려받으면 이용 조건도 원본에서 다시 읽어 적습니다).', '',
        '| 이름 | 상태 | 이용 조건 | 출처 표기 | 원본 페이지 |', '|---|---|---|---|---|']
for k in sorted(c):
    v = c[k]
    rows.append(f"| {k} | {'저장됨' if PH.local(k) else '원격'} | {v.get('license') or '원본 페이지 확인'} | {v['credit']} | [{v['commons'][5:]}]({v['page']}) |")
(ROOT / 'assets/photo/CREDITS.md').write_text('\n'.join(rows) + '\n', encoding='utf-8')
print(len(c), 'entries')
