// 배포할 때(빌드 단계) 실행됩니다. Cloudflare Build의 Variables and secrets에 넣은 TEACHER_PASSWORD를 읽어
// 비밀번호 대신 '확인용 지문(해시)'만 .teacher.js에 적어 둡니다. 비밀번호 자체는 어디에도 저장되지 않습니다.
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const pw = process.env.TEACHER_PASSWORD || '';
const token = pw ? createHash('sha256').update(pw + '|moral-teacher-v1').digest('hex') : '';
writeFileSync(new URL('./.teacher.js', import.meta.url), `export const TEACHER_TOKEN = ${JSON.stringify(token)};\n`);
console.log(pw ? '교사 비밀번호 확인용 지문을 만들었습니다.' : '경고: TEACHER_PASSWORD가 없어 교사 로그인이 꺼진 상태로 배포됩니다.');
