const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const room = params.get('room') || Math.random().toString(36).slice(2, 8).toUpperCase();
let name = localStorage.getItem(`charm-name-${room}`) || '';
let ticket = JSON.parse(localStorage.getItem(`charm-ticket-${room}`) || 'null');
let called = JSON.parse(localStorage.getItem(`charm-called-${room}`) || '[]');
let marked = JSON.parse(localStorage.getItem(`charm-marked-${room}`) || '[]');

function makeTicket() {
  const seed = [...(room + name)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  let state = seed; const rand = () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const cols = Array.from({length:9}, (_, col) => {
    const low = col === 0 ? 1 : col * 10, high = col === 8 ? 90 : col * 10 + 9;
    const pool = Array.from({length:high-low+1}, (_, i) => i + low).sort(() => rand() - .5);
    return pool.slice(0, 2 + (rand() > .55 ? 1 : 0)).sort((a,b)=>a-b);
  });
  const rows = Array.from({length:3}, () => Array(9).fill(null));
  cols.forEach((values, col) => values.forEach((n, i) => { let r = (i + Math.floor(rand()*3)) % 3; while(rows[r][col] !== null) r = (r+1)%3; rows[r][col] = n; }));
  // Keep exactly five numbers per row, a familiar Tambola ticket format.
  for (let r=0;r<3;r++) { while(rows[r].filter(Boolean).length > 5) { const choices = rows[r].map((v,i)=>v?i:-1).filter(i=>i>=0); rows[r][choices[Math.floor(rand()*choices.length)]] = null; } }
  for (let r=0;r<3;r++) { while(rows[r].filter(Boolean).length < 5) { const choices = cols.map((v,i)=>rows[r][i]===null && v.length ? i:-1).filter(i=>i>=0); const col=choices[Math.floor(rand()*choices.length)]; const used=rows.flat().filter(Boolean); const options=cols[col].filter(n=>!used.includes(n)); if(options.length) rows[r][col]=options[0]; else break; } }
  return rows.flat();
}
function save(){localStorage.setItem(`charm-name-${room}`, name);localStorage.setItem(`charm-ticket-${room}`, JSON.stringify(ticket));localStorage.setItem(`charm-called-${room}`, JSON.stringify(called));localStorage.setItem(`charm-marked-${room}`, JSON.stringify(marked));}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
function render(){
  $('#roomName').textContent = `Room ${room}`; $('#ticketOwner').textContent = `${name}'s Tambola ticket`;
  $('#calledNumber').textContent = called[0] ?? '—'; $('#calledPhrase').textContent = called.length ? 'Mark it in your own little chapter.' : 'The story is about to begin.';
  $('#markedCount').textContent = `${marked.length} / 15 marked`; $('#historyCount').textContent=called.length;
  $('#ticket').innerHTML = ticket.map(n => n === null ? '<div class="cell empty"></div>' : `<button class="cell ${called.includes(n)?'called':''} ${marked.includes(n)?'marked':''}" data-number="${n}">${n}</button>`).join('');
  $('#historyList').innerHTML = called.map(n=>`<span class="history-pill">${n}</span>`).join('');
}
function enter(){name=$('#playerName').value.trim() || 'Guest';ticket ||= makeTicket();save();$('#lobby').classList.add('hidden');$('#game').classList.remove('hidden');render()}
$('#playerName').value=name; $('#enterRoom').onclick=enter; $('#playerName').addEventListener('keydown',e=>{if(e.key==='Enter')enter()});
$('#drawNumber').onclick=()=>{if(called.length===90)return toast('Every number has been read. What a full chapter!');let n;do n=Math.floor(Math.random()*90)+1;while(called.includes(n));called.unshift(n);save();render()};
$('#ticket').onclick=(e)=>{const n=Number(e.target.dataset.number);if(!n)return;if(!called.includes(n))return toast('That number has not been read yet.');marked=marked.includes(n)?marked.filter(x=>x!==n):[...marked,n];save();render()};
document.querySelector('.claim-grid').onclick=(e)=>{const b=e.target.closest('button');if(!b)return;const claim=b.dataset.claim;const required=claim==='Early Five'?5:claim==='Full House'?15:5;const row=claim==='Top Line'?0:claim==='Middle Line'?1:claim==='Bottom Line'?2:null;const count=row===null?marked.length:ticket.slice(row*9,row*9+9).filter(n=>n&&marked.includes(n)).length;if(count>=required)toast(`🎉 ${claim} claimed! Let the host know.`);else toast(`${claim} needs ${required-count} more mark${required-count===1?'':'s'}.`)};
$('#shareRoom').onclick=async()=>{const url=`${location.origin}${location.pathname}?room=${room}`;try{await navigator.clipboard.writeText(url);toast('Invite link copied — send it to your book club!')}catch{prompt('Copy this invite link:',url)}};
if(params.get('room') && name && ticket){$('#lobby').classList.add('hidden');$('#game').classList.remove('hidden');render()}
