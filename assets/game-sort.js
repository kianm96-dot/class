/* 분류 게임 엔진: 페이지에서 window.R = {판키:{name,q,bins:[[이름,설명]...],cards:[[문장,답번호,해설]...]}} 을 먼저 정의합니다. */
const $=id=>document.getElementById(id);let key=Object.keys(R)[0],deck=[],score=0,streak=0,wrong=[],busy=false;
$('rounds').innerHTML=Object.entries(R).map(([k,r])=>`<button type="button" data-k="${k}">${r.name}</button>`).join('');
$('rounds').onclick=e=>{const b=e.target.closest('button');if(b){key=b.dataset.k;start();}};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function start(){
  const r=R[key];deck=shuffle(r.cards.slice());score=0;streak=0;wrong=[];busy=false;
  [...$('rounds').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.k===key));
  $('q').textContent=r.q;$('bins').innerHTML=r.bins.map((b,i)=>`<button class="bin" type="button" data-i="${i}">${b[0]}<small>${b[1]}</small></button>`).join('');
  $('review').hidden=true;$('flash').textContent='';$('flash').className='flash';show();
}
function show(){
  $('score').textContent=score;$('streak').textContent=streak;$('left').textContent=deck.length;
  const c=$('card');c.className='card';
  if(!deck.length){c.innerHTML=`${score} / ${R[key].cards.length}<small>${wrong.length?'아래에서 틀린 카드를 다시 보세요.':'모두 맞혔습니다!'}</small>`;
    $('bins').querySelectorAll('button').forEach(b=>b.disabled=true);
    $('review').hidden=false;$('review').innerHTML=(wrong.length?'<ul>'+wrong.map(w=>`<li><b>${w[0]}</b> → ${R[key].bins[w[1]][0]} · ${w[2]}</li>`).join('')+'</ul>':'')+'<button class="go" type="button" onclick="start()">다시 하기</button>';return;}
  c.textContent=deck[0][0];
}
function pick(i){
  if(busy||!deck.length)return;busy=true;const c=deck[0],ok=c[1]===i;
  if(ok){score++;streak++;}else{streak=0;wrong.push(c);}
  $('flash').className='flash '+(ok?'ok':'no');$('flash').textContent=(ok?'맞아요. ':'아니에요 — '+R[key].bins[c[1]][0]+'. ')+c[2];
  $('card').classList.add(i===0?'out-l':'out-r');
  setTimeout(()=>{deck.shift();busy=false;show();},ok?500:1100);
}
$('bins').onclick=e=>{const b=e.target.closest('.bin');if(b)pick(+b.dataset.i);};
addEventListener('keydown',e=>{const n=R[key].bins.length;
  if(n===2&&e.key==='ArrowLeft')pick(0);else if(n===2&&e.key==='ArrowRight')pick(1);
  else if(/^[1-9]$/.test(e.key)&&+e.key<=n)pick(+e.key-1);});
start();
