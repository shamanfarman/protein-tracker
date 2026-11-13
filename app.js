
// Persistent browser storage, with an in-memory fallback and an embedded HTML snapshot.
// The bundled data means an exported HTML copy can be moved to a different browser/device.
const TRACKER_MARKER = 'daily-protein-tracker-backup';
const TRACKER_UPDATED = 'protein-tracker-state-updated-v1';
const trackerStorage = (() => {
  const values = new Map();
  let nativeStore = null;
  try {
    const candidate = window.localStorage;
    const test = 'protein-tracker-storage-check';
    candidate.setItem(test,'1'); candidate.removeItem(test);
    nativeStore = candidate;
  } catch (e) { /* Some Android file viewers and private contexts block localStorage. */ }
  const nativeItems = new Map();
  if (nativeStore) {
    try {
      for (let i=0; i<nativeStore.length; i++) {
        const k = nativeStore.key(i);
        if (k && k.startsWith('protein-tracker-')) nativeItems.set(k,nativeStore.getItem(k));
      }
    } catch (e) { nativeStore = null; }
  }
  let embedded = null;
  try { embedded = JSON.parse(document.getElementById('tracker-embedded-data').textContent); }
  catch(e) { /* Original HTML or an empty snapshot. */ }
  const embeddedItems = (embedded?.format===TRACKER_MARKER && embedded.version===1 &&
    embedded.items && typeof embedded.items==='object' && !Array.isArray(embedded.items)) ? embedded.items : {};
  const nativeRev = Number(nativeItems.get(TRACKER_UPDATED)) || 0;
  const embeddedRev = Number(embedded?.updatedAt) || 0;
  // In case both exist, prefer the more recently edited copy, but retain dates only
  // available in the other copy. This avoids an old HTML snapshot rolling back a new log.
  if (embeddedRev > nativeRev) {
    for (const [k,v] of nativeItems) values.set(k,v);
    for (const [k,v] of Object.entries(embeddedItems))
      if (k.startsWith('protein-tracker-') && typeof v==='string') values.set(k,v);
  } else {
    for (const [k,v] of Object.entries(embeddedItems))
      if (k.startsWith('protein-tracker-') && typeof v==='string') values.set(k,v);
    for (const [k,v] of nativeItems) values.set(k,v);
  }
  if (nativeStore) {
    try { for (const [k,v] of values) nativeStore.setItem(k,v); }
    catch(e) { nativeStore = null; }
  }
  return {
    getItem(k) { return values.has(k) ? values.get(k) : null; },
    setItem(k,v) {
      v=String(v); values.set(k,v);
      if (nativeStore) try { nativeStore.setItem(k,v); } catch(e) { nativeStore=null; updateStorageNoticeSoon(); }
    },
    removeItem(k) {
      values.delete(k);
      if (nativeStore) try { nativeStore.removeItem(k); } catch(e) { nativeStore=null; updateStorageNoticeSoon(); }
    },
    key(i) { return [...values.keys()][i] ?? null; },
    get length() { return values.size; },
    exportItems() { return Object.fromEntries(values); },
    get persistent() { return !!nativeStore; }
  };
})();
function updateStorageNoticeSoon() { setTimeout(updateStorageNotice,0); }
function markTrackerChanged() {
  const previous=Number(trackerStorage.getItem(TRACKER_UPDATED))||0;
  trackerStorage.setItem(TRACKER_UPDATED,String(Math.max(Date.now(),previous+1)));
  updateStorageNotice();
}
const foods=[['Chicken breast','100 g',31,165],['Lean beef','100 g',26,190],['Lean pork loin','100 g',27,175],['Func. Lab plant protein','1 scoop (35 g)',27,135],['Milky Mist Turbo yoghurt','1 tub (140 g)',15,97],['Whole egg','1 large',6.5,72],['Low-fat cottage cheese','150 g',18,125],['Firm tofu','150 g',18,165],['Edamame','150 g shelled',18,180],['Cooked lentils','200 g',18,230],['Cooked chickpeas','150 g',13,245],['Rolled oats','50 g dry',7,190],['Paneer (retired)','100 g',18,265],['Low-fat milk','250 ml',9,120],['Unsweetened soy milk','250 ml',8,90],['Cooked kidney beans','200 g',17,250],['Cooked black beans','200 g',18,260],['Peanuts','30 g',8,170],['Pumpkin seeds','30 g',9,170],['Weet-Bix + Amul Toned Milk','1 biscuit (16.5 g) + 50 ml milk',3.55,88],['Milky Mist regular yoghurt','140 g',4.9,86.5],['California Burrito – grilled BBQ chicken (regular, estimated)','1 burrito (1.5 × mini)',58.5,1015.5]];
// Original food indices remain unchanged to preserve earlier daily logs.
const pinnedIds=[19,3,20]; // Weet-Bix, Func. Lab, regular Milky Mist yoghurt
const visibleIds=foods.map((_,i)=>i).filter(i=>i!==12);
const defaultOrder=[...pinnedIds,...visibleIds.filter(i=>!pinnedIds.includes(i)).sort((a,b)=>foods[b][2]-foods[a][2]||a-b)];
const $=id=>document.getElementById(id), key=d=>'protein-tracker-v1:'+d;
// Convert saved egg portions from the old two-egg unit to individual eggs once.
try{if(trackerStorage.getItem('protein-tracker-eggs-single-v1')!=='done'){
 for(let n=0;n<trackerStorage.length;n++){const k=trackerStorage.key(n);if(!k||!k.startsWith('protein-tracker-v1:'))continue;
 try{const a=JSON.parse(trackerStorage.getItem(k));if(Array.isArray(a)&&Number.isFinite(+a[5])&&+a[5]>0){a[5]=Math.min(99,Math.floor(+a[5])*2);trackerStorage.setItem(k,JSON.stringify(a))}}catch(e){}
 }
 trackerStorage.setItem('protein-tracker-eggs-single-v1','done');
}}catch(e){}
const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let active=localDate();$('day').value=active;
function getOrder(){try{const v=JSON.parse(trackerStorage.getItem('protein-tracker-order-v3'));if(Array.isArray(v)&&new Set(v).size===v.length&&v.every(n=>Number.isInteger(n)&&n>=0&&n<foods.length))return [...v.filter(n=>visibleIds.includes(n)),...visibleIds.filter(n=>!v.includes(n))]}catch(e){}return defaultOrder.slice()}
let order=getOrder();
function get(){try{const a=JSON.parse(trackerStorage.getItem(key(active)));if(Array.isArray(a))return foods.map((_,i)=>Number.isFinite(+a[i])?Math.max(0,Math.min(99,Math.floor(+a[i]))):0)}catch(e){}return foods.map(()=>0)}
function save(a){try{trackerStorage.setItem(key(active),JSON.stringify(a));markTrackerChanged()}catch(e){$('status').textContent='Saving unavailable in this browser.'}}
function persistOrder(){try{trackerStorage.setItem('protein-tracker-order-v3',JSON.stringify(order));markTrackerChanged()}catch(e){}}
let dragId=null, pointerY=0;
function beginDrag(e,i,row){if(get()[i]>0||pinnedIds.includes(i))return;if(e.button!==undefined&&e.button!==0)return;e.preventDefault();dragId=i;pointerY=e.clientY;row.classList.add('dragging');e.currentTarget.setPointerCapture(e.pointerId)}
function duringDrag(e){if(dragId===null)return;e.preventDefault();pointerY=e.clientY;const rows=[...document.querySelectorAll('#foods .row')];rows.forEach(r=>r.classList.remove('drag-over'));const over=rows.find(r=>{const b=r.getBoundingClientRect();return pointerY>=b.top&&pointerY<=b.bottom});if(over&&get()[Number(over.dataset.id)]===0&&Number(over.dataset.id)!==dragId)over.classList.add('drag-over')}
function endDrag(e){if(dragId===null)return;const id=dragId;dragId=null;const rows=[...document.querySelectorAll('#foods .row')];const over=rows.find(r=>{const b=r.getBoundingClientRect();return pointerY>=b.top&&pointerY<=b.bottom});if(over&&get()[Number(over.dataset.id)]===0&&!pinnedIds.includes(Number(over.dataset.id))){const target=Number(over.dataset.id),from=order.indexOf(id),to=order.indexOf(target);if(from!==-1&&to!==-1&&from!==to){order.splice(from,1);order.splice(to,0,id);persistOrder()}}render()}
function render(){const a=get();let p=0,c=0;const root=$('foods');root.replaceChildren();
const displayOrder=[...pinnedIds,...order.filter(i=>!pinnedIds.includes(i)&&a[i]>0).sort((i,j)=>(a[j]*foods[j][2])-(a[i]*foods[i][2])||order.indexOf(i)-order.indexOf(j)),...order.filter(i=>!pinnedIds.includes(i)&&!a[i])];displayOrder.forEach((i,pos)=>{const f=foods[i];p+=a[i]*f[2];c+=a[i]*f[3];const row=document.createElement('div');row.className='row';row.dataset.id=i;const mv=document.createElement('button');mv.type='button';mv.className='handle';mv.textContent='☰';mv.title=pinnedIds.includes(i)?'Pinned favourite':a[i]?'Selected foods are automatically sorted by total protein':'Hold and drag to reorder';mv.disabled=a[i]>0||pinnedIds.includes(i);mv.setAttribute('aria-label',a[i]?'Automatically sorted selected food '+f[0]:'Drag to reorder '+f[0]);mv.addEventListener('pointerdown',e=>beginDrag(e,i,row));mv.addEventListener('pointermove',duringDrag);mv.addEventListener('pointerup',endDrag);mv.addEventListener('pointercancel',endDrag);
if(a[i]>0){row.classList.add('selected');mv.textContent='✓'}const info=document.createElement('div');info.className='info';const name=document.createElement('div');name.className='name';name.textContent=f[0];const detail=document.createElement('div');detail.className='detail';detail.textContent=`${f[1]} · ${f[2]} g protein · ${f[3]} kcal`;info.append(name,detail);if(a[i]>0){const subtotal=document.createElement('div');subtotal.className='subtotal';subtotal.textContent=`Total: ${Number((a[i]*f[2]).toFixed(1))} g protein · ${Math.round(a[i]*f[3])} kcal`;info.append(subtotal)}
const controls=document.createElement('div');controls.className='counter';const minus=document.createElement('button');minus.textContent='−';minus.setAttribute('aria-label','Remove one portion of '+f[0]);minus.disabled=!a[i];const num=document.createElement('span');num.className='count';num.textContent=a[i];const plus=document.createElement('button');plus.textContent='+';plus.setAttribute('aria-label','Add one portion of '+f[0]);plus.disabled=a[i]>=99;minus.onclick=()=>change(i,-1);plus.onclick=()=>change(i,1);controls.append(minus,num,plus);row.append(mv,info,controls);root.append(row)});
$('protein').textContent=Number(p.toFixed(1));$('calories').textContent=Math.round(c);$('fill').style.width=Math.min(100,p/110*100)+'%';$('progress').setAttribute('aria-valuenow',Math.min(110,p));$('remaining').textContent=p<110?`${Number((110-p).toFixed(1))} g to protein goal`:`Protein goal reached (+${Number((p-110).toFixed(1))} g)`; $('calfill').style.width=Math.min(100,c/2100*100)+'%';$('calprogress').setAttribute('aria-valuenow',Math.min(2100,c));$('calremaining').textContent=c<=2100?`${Math.round(2100-c)} kcal remaining to 2,100 kcal target`:`${Math.round(c-2100)} kcal above 2,100 kcal target`;$('status').textContent=active===localDate()?(trackerStorage.persistent?'Today’s entries are saved in this browser.':'Use “Save updated HTML” to keep these entries.'):'Viewing saved entries for '+active}
function change(i,delta){const a=get();a[i]=Math.max(0,Math.min(99,a[i]+delta));save(a);render()}
$('day').addEventListener('change',e=>{if(e.target.value){active=e.target.value;render()}});$('today').onclick=()=>{active=localDate();$('day').value=active;render()};$('reset').onclick=()=>{if(confirm('Clear all logged foods for '+active+'?')){save(foods.map(()=>0));render()}};
let lastToday=localDate();document.addEventListener('visibilitychange',()=>{if(!document.hidden){const now=localDate();if(now!==lastToday&&active===lastToday){active=now;$('day').value=now;render()}lastToday=now;updateStorageNotice()}});render();

// Exercise tracking uses a separate storage key, leaving all existing protein logs untouched.
const exerciseKey = d => 'protein-tracker-exercise-v1:' + d;
const exerciseDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const dayStamp = d => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
const dayFromStamp = v => { const [y,m,d] = v.split('-').map(Number); return new Date(y,m-1,d,12); };
const mondayOf = d => { const v = new Date(d.getFullYear(),d.getMonth(),d.getDate(),12); v.setDate(v.getDate()-(v.getDay()+6)%7); return v; };
let exerciseWeek = mondayOf(new Date());
function exerciseStatus(d){try{const v=trackerStorage.getItem(exerciseKey(d));return v==='yes'||v==='no'?v:null}catch(e){return null}}
function renderExercise(){
  const end = new Date(exerciseWeek); end.setDate(end.getDate()+6);
  const options={day:'numeric',month:'short'};
  $('week-label').textContent=exerciseWeek.toLocaleDateString(undefined,options)+' – '+end.toLocaleDateString(undefined,options);
  const root=$('exercise-days');root.replaceChildren();let yes=0,no=0;
  for(let i=0;i<7;i++){
    const d=new Date(exerciseWeek);d.setDate(d.getDate()+i);
    const stamp=dayStamp(d),value=exerciseStatus(stamp);if(value==='yes')yes++;if(value==='no')no++;
    const cell=document.createElement('div');cell.className='exercise-day'+(stamp===localDate()?' today':'');
    const dow=document.createElement('div');dow.className='exercise-dow';dow.textContent=exerciseDays[i];
    const date=document.createElement('div');date.className='exercise-date';date.textContent=d.getDate();
    const choices=document.createElement('div');choices.className='exercise-choice';
    for(const [type,symbol,label] of [['yes','✅','Exercised'],['no','❌','No exercise']]){
      const b=document.createElement('button');b.type='button';b.className=type+(value===type?' active':'');b.textContent=symbol;
      b.setAttribute('aria-label',label+' on '+d.toDateString());b.setAttribute('aria-pressed',String(value===type));
      b.onclick=()=>{const next=value===type?null:type;try{if(next)trackerStorage.setItem(exerciseKey(stamp),next);else trackerStorage.removeItem(exerciseKey(stamp));markTrackerChanged()}catch(e){alert('Saving is unavailable in this browser.')}renderExercise();if(next)showCheer(next)};
      choices.append(b);
    }
    cell.append(dow,date,choices);root.append(cell);
  }
  $('exercise-summary').innerHTML='<strong>'+yes+' exercised</strong> · '+no+' rest/no-exercise · '+(7-yes-no)+' unmarked';
}
const cheers=["You absolute specimen. Even the dumbbells are blushing.", "The gym should put your silhouette on its logo.", "That workout was so glorious I nearly filed a fan-club application.", "Look at you, making discipline look offensively attractive.", "Your future self just sent a thank-you note in gold ink.", "Somewhere, a personal trainer is weeping with pride.", "You magnificent machine. The laws of laziness fear you.", "Your consistency is hotter than a sauna full of champions.", "A workout AND excellent taste in being you? Unfair advantage.", "Those muscles have a five-year business plan and it's thriving.", "I would applaud, but these enormous cartoon biceps are busy saluting.", "Your trainers should be preserved in a museum of excellence.", "The treadmill talks about you to the other treadmills.", "The mirror has started dressing up for your arrival.", "Peak main-character energy. The credits roll to thunderous applause.", "A mere mortal exercised today. Correction: a living legend.", "If effort were currency, you'd own the entire gym.", "You're the reason protein shakes get out of bed in the morning.", "That discipline? Absolutely scandalous. Keep flaunting it.", "Scientists are baffled by how much excellence fits in one person.", "The weights just asked if they could take a selfie with you.", "Your motivation has its own gravitational field.", "I'm engraving today's date on the Hall of Gains.", "The universe briefly paused to admire your form.", "Your muscles are writing poetry about your dedication.", "You crushed it so hard the gym floor deserves compensation.", "Even your excuses have resigned in defeat.", "A round of applause from every kettlebell in the building.", "If champions had a champion, they'd ask for your autograph.", "You're making hard work look suspiciously glamorous.", "Today's workout: completed. Your legend: expanding.", "You walked in a human and walked out a motivational poster.", "The barbell has requested a rematch. It's terrified.", "Your commitment deserves its own national holiday.", "Athletic excellence called. It wants your skincare routine.", "That wasn't exercise. That was a public demonstration of greatness.", "Your dedication is so good it ought to be illegal.", "You've got more drive than a garage full of sports cars.", "The gym lights got brighter when you showed up.", "Your body just gave you a standing ovation.", "Someone inform the Olympics: their new icon has arrived.", "Your work ethic is an absolute heartthrob.", "Even gravity looks nervous when you get moving.", "You incredible overachiever. Leave some greatness for the rest of us.", "Today's performance: ten out of ten, plus a dramatic slow clap.", "The sweat was temporary. The sheer magnificence is permanent.", "Every rep was another love letter to your future self.", "You didn't just show up. You elevated the postcode.", "That's the sort of consistency that makes legends nervous.", "Certified gym royalty. Your imaginary crown is made of dumbbells."];
const scolds=["Did your gym shoes file a missing-person report, or are they still waiting?", "That couch has seen more action than your muscles. Embarrassing.", "I've seen more movement from a loading screen. Sort it out.", "Your dumbbells are considering adoption by someone who uses them.", "The only thing getting shredded today is your credibility.", "Your trainers have become decorative household ornaments. Tragic.", "Even a houseplant managed more reps than you today. It grew.", "Did you mistake a Netflix marathon for actual cardio? Bold.", "Your fitness goals are standing outside in the rain waiting for you.", "The gym sent flowers. It assumes you've passed away.", "You skipped exercise so thoroughly it deserves its own medal. A rubbish one.", "Your sofa just listed you as a dependent on its tax return.", "Those biceps are currently on an unpaid sabbatical.", "I asked your running shoes about you. They said, 'Who?'", "Your step count is a rounding error. Spectacularly pathetic.", "You had one job: move your limbs. An ambitious brief, apparently.", "The dust on your gym bag is developing a personality.", "Your motivation has left the chat and blocked your number.", "Even your reflection is pretending not to know you.", "The treadmill has forgotten your face. It's moved on.", "Congratulations on setting a personal best in doing absolutely nothing.", "You could have exercised, but chose to become furniture. Interesting.", "Your workout plan is now officially classified as historical fiction.", "The weights aren't heavy. Your excuses are.", "A potato saw your activity level and called you unambitious.", "Your sweat glands have applied for redundancy.", "At this point, your gym membership is a charitable donation.", "You spent more energy avoiding exercise than exercise would've taken.", "Your muscles are checking property listings for a better owner.", "The only six-pack you lifted today had drinks in it, didn't it?", "Your fitness watch thinks you've been kidnapped by a sofa.", "Your future self has lodged a formal complaint. With evidence.", "I've seen statues with stronger training schedules.", "The gym equipment is holding a farewell party for you.", "Your excuses are ripped. Shame the rest of your workout isn't.", "Not a single rep? Even the cartoon gym bro is disappointed.", "You're treating exercise like an ex you owe money to.", "Your workout streak tripped over your outstanding commitment to sitting.", "Those workout clothes are basically cosplay at this point.", "Your muscles have put up an out-of-office reply.", "The hardest thing you lifted today was your phone. Grim.", "Your fitness ambitions are working overtime. You aren't.", "Even a sloth would ask you to pick up the pace.", "That was a masterclass in dodging personal growth. Bravo, I suppose.", "Your gym bag is starting to look like an archaeological site.", "You've trained your thumb scrolling. The rest of you wants a word.", "The only burn today is the shame of this check-in.", "Your personal best today was avoiding your personal best.", "Your cardio routine appears to be walking away from responsibility.", "I'm not angry. I'm professionally appalled. Get moving tomorrow."];
let lastLine={yes:-1,no:-1};
function pickLine(lines,kind){let i=Math.floor(Math.random()*lines.length);if(i===lastLine[kind])i=(i+1)%lines.length;lastLine[kind]=i;return lines[i]}
let lastCheerFocus=null;
function showCheer(kind){
 const overlay=$('cheer-overlay');lastCheerFocus=document.activeElement;
 overlay.classList.toggle('sad',kind==='no');$('cheer-title').textContent=kind==='yes'?'ABSOLUTE UNIT! 💪':'PATHETIC EFFORT, BRO. 🥔';
 const options=kind==='yes'?cheers:scolds;$('cheer-message').textContent=pickLine(options,kind);
 $('spark1').textContent=kind==='yes'?'✨':'💤';$('spark2').textContent=kind==='yes'?'⭐':'👀';
 const confetti=$('cheer-confetti');confetti.replaceChildren();if(kind==='yes')for(let i=0;i<22;i++){const bit=document.createElement('span');bit.style.setProperty('--x',(Math.random()*100)+'%');bit.style.setProperty('--c',['#0c766e','#fabd53','#f28fa9','#7ca8ee'][i%4]);bit.style.setProperty('--delay',(Math.random()*1.4)+'s');confetti.append(bit)}
 $('cheer-done').textContent=kind==='yes'?'Keep it up! 💪':'I’ll do better!';overlay.hidden=false;$('cheer-close').focus();
}
function closeCheer(){$('cheer-overlay').hidden=true;if(lastCheerFocus?.focus)lastCheerFocus.focus()}
$('cheer-close').onclick=closeCheer;$('cheer-done').onclick=closeCheer;
$('cheer-overlay').addEventListener('click',e=>{if(e.target===$('cheer-overlay'))closeCheer()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('cheer-overlay').hidden)closeCheer()});
$('week-prev').onclick=()=>{exerciseWeek.setDate(exerciseWeek.getDate()-7);renderExercise()};
$('week-next').onclick=()=>{exerciseWeek.setDate(exerciseWeek.getDate()+7);renderExercise()};
renderExercise();

// Portable HTML backup: the whole tracker + all food, exercise and sorting history.
let portableExportedRevision=Number(trackerStorage.getItem(TRACKER_UPDATED))||0;
function backupPayload() {
  return {format:TRACKER_MARKER,version:1,updatedAt:Number(trackerStorage.getItem(TRACKER_UPDATED))||0,
    exportedAt:new Date().toISOString(),items:trackerStorage.exportItems()};
}
function downloadTrackerBlob(blob,name) {
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
}
function backupFileStem() {
  const t=new Date(), hh=String(t.getHours()).padStart(2,'0'), mm=String(t.getMinutes()).padStart(2,'0');
  return 'daily_protein_tracker_'+localDate()+'_'+hh+mm;
}
function exportJSON() {
  downloadTrackerBlob(new Blob([JSON.stringify(backupPayload(),null,2)],{type:'application/json'}),backupFileStem()+'.json');
  trackerStorage.setItem('protein-tracker-last-backup-v1', new Date().toISOString());
  portableExportedRevision=Number(trackerStorage.getItem(TRACKER_UPDATED))||0;
  updateStorageNotice();
  $('save-feedback').textContent='Backup downloaded. Keep the JSON somewhere safe; you can restore it any time.';
}
async function importTrackerFile(file) {
  if(!file)return;
  try {
    const raw=await file.text();
    let payload;
    if(/\.html?$/i.test(file.name)) {
      const doc=new DOMParser().parseFromString(raw,'text/html');
      const node=doc.getElementById('tracker-embedded-data');
      if(!node)throw new Error('This HTML does not contain a tracker backup.');
      payload=JSON.parse(node.textContent);
    } else payload=JSON.parse(raw);
    if(payload?.format!==TRACKER_MARKER || payload.version!==1 ||
       !payload.items || typeof payload.items!=='object' || Array.isArray(payload.items))
      throw new Error('Not a recognised tracker backup.');
    const allowed=/^(?:protein-tracker-v1:\d{4}-\d{2}-\d{2}|protein-tracker-exercise-v1:\d{4}-\d{2}-\d{2}|protein-tracker-order-v3|protein-tracker-eggs-single-v1|protein-tracker-state-updated-v1)$/;
    const pairs=Object.entries(payload.items).filter(([k,v])=>allowed.test(k)&&typeof v==='string');
    if(!pairs.length)throw new Error('This backup contains no saved entries.');
    if(!confirm('Import '+pairs.length+' saved records/settings? Dates included in the backup will replace the same dates here. Other dates are retained.'))return;
    for(const [k,v] of pairs)trackerStorage.setItem(k,v);
    markTrackerChanged();
    order=getOrder();render();renderExercise();updateStorageNotice();
    $('save-feedback').textContent='History imported and saved automatically on this device.';
  } catch(e) { alert('Could not import backup: '+e.message); }
  finally { $('backup-file').value=''; }
}
function updateStorageNotice() {
  const el=$('storage-notice'); if(!el)return;
  if(trackerStorage.persistent) {
    const last=trackerStorage.getItem('protein-tracker-last-backup-v1');
    const backupDate=last && !Number.isNaN(Date.parse(last)) ? new Date(last).toLocaleDateString() : null;
    el.textContent='Automatic saving is on. Your changes are kept on this device, including when you close the app.' +
      (backupDate ? ' Last backup: '+backupDate+'.' : ' You have not downloaded a backup yet.');
  } else {
    el.textContent='⚠️ This browser is blocking device storage. Use a normal Chrome tab at the HTTPS app address, and download a backup before closing.';
  }
}
window.addEventListener('beforeunload', e => {
  if(!trackerStorage.persistent && (Number(trackerStorage.getItem(TRACKER_UPDATED))||0)>portableExportedRevision) {
    e.preventDefault(); e.returnValue='';
  }
});
$('export-backup').onclick=exportJSON;
$('import-backup').onclick=()=>$('backup-file').click();
$('backup-file').addEventListener('change',e=>importTrackerFile(e.target.files?.[0]));

// Optional StorageManager persistence request, only made on the user's button click.
$('protect-data').addEventListener('click', async () => {
  const feedback=$('save-feedback');
  if(!navigator.storage?.persist) {
    feedback.textContent='This browser does not offer protected storage. Automatic saving still works; keep a backup.';
    return;
  }
  try {
    const granted=await navigator.storage.persist();
    feedback.textContent=granted
      ? 'Protected storage granted. The browser should avoid automatic data eviction; backups are still wise.'
      : 'Protected storage was not granted. The app still saves changes automatically; keep a backup.';
  } catch(e) {feedback.textContent='Storage protection could not be requested. Keep a backup.';}
});

// Install UI: on supported Android browsers a proper install prompt appears.
let installPrompt=null;
const installed=()=>window.matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
function updateInstallStatus() {
  const p=$('pwa-status');
  if(installed()) {
    p.textContent='Installed! Open this icon from your home screen. Everything works offline after the first visit.';
    $('install-app').hidden=true;
  } else if(installPrompt) {
    p.textContent='Ready to install. Tap Install app to add it to your home screen.';
    $('install-app').hidden=false;
  } else {
    p.textContent='On Android, open this site in Chrome, then choose Install app (or Add to Home screen) from the browser menu. An HTTPS address is required.';
    $('install-app').hidden=true;
  }
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt=event; updateInstallStatus();
});
$('install-app').addEventListener('click', async () => {
  if(!installPrompt)return;
  const prompt=installPrompt; installPrompt=null; $('install-app').hidden=true;
  try { await prompt.prompt(); await prompt.userChoice; }
  catch(e) { /* User may dismiss the install prompt. */ }
  updateInstallStatus();
});
window.addEventListener('appinstalled',()=>{installPrompt=null;updateInstallStatus();});
if('serviceWorker' in navigator && window.isSecureContext && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {
    $('pwa-status').textContent='Offline setup was blocked. Reload in Chrome from the HTTPS app address.';
  });
}
updateInstallStatus();
updateStorageNotice();
