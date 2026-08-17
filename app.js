import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient('https://gozalxkeiwyofcfhoycn.supabase.co', 'sb_publishable_vB4k_lPzs9aSxiIJ0W8Xjg_LAsT5XAu');
const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
let room = params.get('room'), isHost = false, hostToken = '', name = '', ticket = [], marked = [], called = [], gameChannel;
const key = (type) => `chapter-charm-${type}-${room}`;
const randomRoom = () => Math.random().toString(36).slice(2, 8).toUpperCase();
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }

function makeTicket() {
  let state = [...(room + name)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const values = Array.from({ length: 9 }, (_, col) => { const low = col ? col * 10 : 1, high = col === 8 ? 90 : col * 10 + 9; return Array.from({ length: high - low + 1 }, (_, i) => low + i).sort(() => rand() - .5).slice(0, 3); });
  const rows = Array.from({ length: 3 }, () => Array(9).fill(null));
  for (let r = 0; r < 3; r++) Array.from({ length: 9 }, (_, i) => i).sort(() => rand() - .5).slice(0, 5).forEach(col => { rows[r][col] = values[col].pop(); });
  return rows.flat();
}
function savePlayer() { localStorage.setItem(key('name'), name); localStorage.setItem(key('ticket'), JSON.stringify(ticket)); localStorage.setItem(key('marked'), JSON.stringify(marked)); }
function restorePlayer() { name = localStorage.getItem(key('name')) || ''; ticket = JSON.parse(localStorage.getItem(key('ticket')) || 'null') || []; marked = JSON.parse(localStorage.getItem(key('marked')) || '[]'); }
function render() {
  $('#roomName').textContent = `Room ${room}`; $('#ticketOwner').textContent = `${name}'s Tambola ticket`;
  $('#calledNumber').textContent = called[0] ?? '—'; $('#calledPhrase').textContent = called.length ? 'Mark it in your own little chapter.' : 'The story is about to begin.';
  if (!isHost) $('#calledPhrase').textContent = called.length ? 'Your host has drawn this number.' : 'Waiting for your host to begin…';
  $('#markedCount').textContent = `${marked.length} / 15 marked`; $('#historyCount').textContent = called.length;
  $('#ticket').innerHTML = ticket.map(n => n === null ? '<div class="cell empty"></div>' : `<button class="cell ${called.includes(n) ? 'called' : ''} ${marked.includes(n) ? 'marked' : ''}" data-number="${n}">${n}</button>`).join('');
  $('#historyList').innerHTML = called.map(n => `<span class="history-pill">${n}</span>`).join(''); $('#drawNumber').style.display = isHost ? '' : 'none';
}
async function loadGame() { const { data, error } = await supabase.from('games').select('called_numbers').eq('room_id', room).single(); if (error || !data) { toast('This game room could not be found. Ask your host for a new link.'); return false; } called = data.called_numbers || []; return true; }
function listenForDraws() { gameChannel?.unsubscribe(); gameChannel = supabase.channel(`chapter-charm-${room}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `room_id=eq.${room}` }, payload => { called = payload.new.called_numbers || []; render(); if (called.length) toast(`Number ${called[0]} has been drawn!`); }).subscribe(); }
async function enterRoom() {
  const enteredName = $('#playerName').value.trim() || 'Guest';
  if (!room) { room = randomRoom(); isHost = true; hostToken = crypto.randomUUID(); const { error } = await supabase.rpc('create_game', { p_room: room, p_token: hostToken }); if (error) { console.error(error); toast('The live game table is not set up yet.'); return; } history.replaceState({}, '', `${location.pathname}?room=${room}`); localStorage.setItem(key('host'), hostToken); }
  else { hostToken = localStorage.getItem(key('host')) || ''; isHost = Boolean(hostToken); if (!await loadGame()) return; }
  restorePlayer(); name ||= enteredName; if (!ticket.length) ticket = makeTicket(); savePlayer(); $('#lobby').classList.add('hidden'); $('#game').classList.remove('hidden'); render(); listenForDraws();
}
async function drawNumber() { if (!isHost) return; if (called.length === 90) return toast('Every number has been read. What a full chapter!'); let number; do { number = Math.floor(Math.random() * 90) + 1; } while (called.includes(number)); const { data, error } = await supabase.rpc('draw_number', { p_room: room, p_token: hostToken, p_number: number }); if (error) return toast('Could not share the number. Please try again.'); called = data || [number, ...called]; render(); }
$('#enterRoom').onclick = enterRoom; $('#playerName').addEventListener('keydown', e => { if (e.key === 'Enter') enterRoom(); }); $('#drawNumber').onclick = drawNumber;
$('#ticket').onclick = e => { const n = Number(e.target.dataset.number); if (!n) return; if (!called.includes(n)) return toast('That number has not been read yet.'); marked = marked.includes(n) ? marked.filter(x => x !== n) : [...marked, n]; savePlayer(); render(); };
$('.claim-grid').onclick = e => { const button = e.target.closest('button'); if (!button) return; const claim = button.dataset.claim, row = { 'Top Line': 0, 'Middle Line': 1, 'Bottom Line': 2 }[claim], required = claim === 'Early Five' ? 5 : claim === 'Full House' ? 15 : 5, count = row === undefined ? marked.length : ticket.slice(row * 9, row * 9 + 9).filter(n => n && marked.includes(n)).length; toast(count >= required ? `🎉 ${claim} claimed! Let your host know.` : `${claim} needs ${required - count} more mark${required - count === 1 ? '' : 's'}.`); };
$('#shareRoom').onclick = async () => { const url = `${location.origin}${location.pathname}?room=${room}`; try { await navigator.clipboard.writeText(url); toast('Invite link copied — send it to your book club!'); } catch { prompt('Copy this invite link:', url); } };
if (room) { restorePlayer(); if (name && ticket.length) { $('#playerName').value = name; enterRoom(); } }
