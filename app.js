/* ════════════════════════════════════════════════
   FRIDAY v6 — Universal AI Assistant
   100+ commands · phones · tablets · laptops
   ════════════════════════════════════════════════ */
'use strict';

/* ── VH FIX ─────────────────────────────────────── */
function setVH() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
}
setVH();
window.addEventListener('resize', setVH);
if (window.visualViewport) window.visualViewport.addEventListener('resize', setVH);

/* ── RESPONSIVE LAYOUT ──────────────────────────── */
const BREAKPOINT = 1024;
function applyLayout() {
  const desktop = window.innerWidth >= BREAKPOINT;
  document.querySelectorAll('[data-show="desktop"]').forEach(el => {
    el.style.display = desktop ? (el.tagName==='ASIDE'||el.tagName==='SPAN' ? 'block' : 'flex') : 'none';
  });
  document.querySelectorAll('[data-show="mobile"]').forEach(el => {
    el.style.display = desktop ? 'none' : 'flex';
  });
}
window.addEventListener('resize', applyLayout);

/* ── BOOT ───────────────────────────────────────── */
const BOOT_MSGS = [
  'Initializing F.R.I.D.A.Y core systems…',
  'Neural interface calibrated…',
  'Voice recognition module online…',
  'Loading 100+ command modules…',
  'Connecting weather sensors…',
  'All systems nominal. Welcome back.'
];
(function boot() {
  const log = $('boot-log'); let i = 0;
  const iv = setInterval(() => {
    if (i < BOOT_MSGS.length) {
      const d = document.createElement('div');
      d.textContent = '› ' + BOOT_MSGS[i++]; log.appendChild(d);
    } else {
      clearInterval(iv);
      setTimeout(() => {
        const bs = $('boot-screen');
        bs.classList.add('fade-out');
        setTimeout(() => { bs.style.display = 'none'; initApp(); }, 500);
      }, 200);
    }
  }, 230);
})();

/* ── INIT ───────────────────────────────────────── */
function initApp() {
  applyLayout();
  const saved = localStorage.getItem('friday_profile');
  if (saved) { loadProfile(JSON.parse(saved)); showHud(); }
  else showSetup();
  startClock(); startBattery(); startNetwork(); setupRec(); bindEvents();
  loadPersistent();
}

/* ── PROFILE ────────────────────────────────────── */
function showSetup() { $('setup-overlay').classList.remove('hidden'); }
function showHud() {
  $('hud').classList.remove('hidden'); applyLayout();
  const p = getProfile();
  if (p.location) fetchWeather(p.location);
  setTimeout(() => speak(`Good ${tod()}, ${p.name||'sir'}. FRIDAY online with over 100 commands ready.`), 700);
}
function loadProfile(p) {
  txt('user-name', p.name||'--'); txt('user-bio', p.bio||'--');
  makeSocials('social-links', p);
  txt('mob-user-name', p.name||'--'); txt('mob-user-bio', p.bio||'--');
  makeSocials('mob-social-links', p);
}
function makeSocials(cid, p) {
  const el = $(cid); if (!el) return; el.innerHTML = '';
  [{k:'instagram',icon:'📸',url:'https://instagram.com/'},
   {k:'github',   icon:'💻',url:'https://github.com/'},
   {k:'twitter',  icon:'🐦',url:'https://twitter.com/'}]
  .forEach(s => {
    if (!p[s.k]) return;
    const a = document.createElement('a');
    a.className='social-link'; a.target='_blank'; a.rel='noopener noreferrer';
    a.href = s.url + p[s.k].replace('@','');
    a.textContent = s.icon+' '+(p[s.k][0]==='@'?p[s.k]:'@'+p[s.k]);
    el.appendChild(a);
  });
}

/* ── PERSISTENT DATA ────────────────────────────── */
let notes=[], alarms=[], shoppingList=[], todos=[];
let eggTimer=null, lastSpoken='';

function loadPersistent() {
  try { notes        = JSON.parse(localStorage.getItem('fri_notes')   ||'[]'); } catch{notes=[];}
  try { alarms       = JSON.parse(localStorage.getItem('fri_alarms')  ||'[]'); } catch{alarms=[];}
  try { shoppingList = JSON.parse(localStorage.getItem('fri_shop')    ||'[]'); } catch{shoppingList=[];}
  try { todos        = JSON.parse(localStorage.getItem('fri_todos')   ||'[]'); } catch{todos=[];}
}
const save = {
  notes:  ()=>localStorage.setItem('fri_notes',  JSON.stringify(notes)),
  alarms: ()=>localStorage.setItem('fri_alarms', JSON.stringify(alarms)),
  shop:   ()=>localStorage.setItem('fri_shop',   JSON.stringify(shoppingList)),
  todos:  ()=>localStorage.setItem('fri_todos',  JSON.stringify(todos)),
};

/* ── CLOCK ──────────────────────────────────────── */
function startClock() {
  const tick = () => {
    const n = new Date();
    txt('time-display', pad(n.getHours())+':'+pad(n.getMinutes()));
    const d = n.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    txt('date-display',d); txt('date-display-hdr',d);
    checkAlarms(n);
  };
  tick(); setInterval(tick, 1000);
}
function tod() {
  const h = new Date().getHours();
  return h<12?'morning':h<17?'afternoon':h<21?'evening':'night';
}

/* ── BATTERY ────────────────────────────────────── */
function startBattery() {
  if (!navigator.getBattery) { txt('battery-display','N/A'); return; }
  navigator.getBattery().then(b => {
    const u = () => txt('battery-display', Math.round(b.level*100)+'%'+(b.charging?' ⚡':''));
    u(); b.addEventListener('levelchange',u); b.addEventListener('chargingchange',u);
  });
}

/* ── NETWORK ────────────────────────────────────── */
function startNetwork() {
  const u = () => {
    const on = navigator.onLine;
    const ic = $('net-icon');
    if (ic) { ic.textContent=on?'◉':'○'; ic.style.color=on?'var(--cyan)':'var(--muted)'; }
    txt('net-display', on?'Online':'Offline');
  };
  u(); window.addEventListener('online',u); window.addEventListener('offline',u);
}

/* ── WEATHER ────────────────────────────────────── */
const WX_KEY = '48ddfe8c9cf29f95b7d0e54d6e171008';
function fetchWeather(loc) {
  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(loc)}&appid=${WX_KEY}`)
    .then(r=>r.json()).then(d=>{
      if (d.cod!==200) { addMsg('friday',"Couldn't find weather for that location."); return; }
      const t=ktc(d.main.temp), fl=ktc(d.main.feels_like),
            mn=ktc(d.main.temp_min), mx=ktc(d.main.temp_max),
            hu=d.main.humidity, ws=d.wind.speed,
            desc=d.weather[0].description,
            ico=`https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`;
      txt('weather-city',d.name); txt('weather-country',d.sys.country);
      txt('weather-type',desc);   txt('weather-temp',t+'°');
      txt('weather-feels',fl+'°'); txt('weather-min',mn+'°');
      txt('weather-max',mx+'°');   txt('weather-hum',hu+'%');
      src('weather-icon',ico);
      txt('ws-city',d.name); txt('ws-temp',t+'°'); txt('ws-desc',desc); src('ws-icon',ico);
      txt('mob-city',d.name); txt('mob-temp',t+'°'); txt('mob-feels',fl+'°'); txt('mob-hum',hu+'%');
      speak(`In ${d.name}: ${desc}. Temperature ${t}°C, feels like ${fl}°C. Humidity ${hu}%, wind ${ws} m/s.`);
    }).catch(()=>addMsg('friday','Weather unavailable — check connection.'));
}
function ktc(k) { return (k-273.15).toFixed(1); }

/* ── SPEECH ─────────────────────────────────────── */
function speak(msg) {
  lastSpoken = msg;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(msg);
  u.volume=1; u.rate=1.05; u.pitch=.95;
  function go() {
    const vs = window.speechSynthesis.getVoices();
    const v = vs.find(x=>/google.*en/i.test(x.name))||vs.find(x=>x.lang==='en-US')||vs.find(x=>x.lang.startsWith('en'));
    if (v) u.voice=v;
    u.onstart = ()=>setOrb('speaking');
    u.onend   = ()=>setOrb('idle');
    window.speechSynthesis.speak(u);
    setTimeout(()=>{ if(!recogActive) setOrb('idle'); }, Math.max(2500, msg.length*68));
  }
  window.speechSynthesis.getVoices().length ? go() : (window.speechSynthesis.onvoiceschanged=go);
  addMsg('friday', msg);
}

/* ── RECOGNITION ────────────────────────────────── */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec=null, recogActive=false;
function setupRec() {
  if (!SR) return;
  rec = new SR(); rec.continuous=false; rec.interimResults=false; rec.lang='en-IN';
  rec.onstart = () => {
    recogActive=true; setOrb('listening'); setStatus('LISTENING…');
    $('visualizer').classList.remove('hidden');
    ['mic-btn','speak-btn'].forEach(id=>{const e=$(id);if(e)e.classList.add('active');});
  };
  rec.onresult = e => {
    const t = e.results[e.resultIndex][0].transcript.toLowerCase().trim();
    addMsg('user',t); handleCmd(t);
  };
  rec.onerror = e => {
    if (e.error==='no-speech')   speak("I didn't catch that, sir.");
    if (e.error==='not-allowed') speak("Microphone access denied.");
    stopRec();
  };
  rec.onend = stopRec;
}
function startRec() {
  if (!rec) { speak("Speech recognition not supported in this browser."); return; }
  if (recogActive) return;
  window.speechSynthesis.cancel();
  try { rec.start(); } catch(e){}
}
function stopRec() {
  recogActive=false;
  $('visualizer').classList.add('hidden');
  ['mic-btn','speak-btn'].forEach(id=>{const e=$(id);if(e)e.classList.remove('active');});
  setOrb('idle'); setStatus('STANDBY');
}
function toggleRec() { recogActive ? rec.stop() : startRec(); }

/* ════════════════════════════════════════════════
   ██  DATA BANKS  ██
   ════════════════════════════════════════════════ */
const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "I told my computer I needed a break. Now it won't stop sending Kit-Kat ads.",
  "Why was the JavaScript dev sad? He didn't know how to null his feelings.",
  "A SQL query walks into a bar and asks two tables: Can I join you?",
  "Why do Java devs wear glasses? Because they don't C#.",
  "How many programmers to change a lightbulb? None — that's a hardware problem.",
  "I would tell you a UDP joke but you might not get it.",
  "Why did the developer go broke? Because he used up all his cache.",
  "What do you call a fake noodle? An impasta.",
  "I'm reading a book about anti-gravity. It's impossible to put down.",
  "Did you hear about the mathematician afraid of negative numbers? He'll stop at nothing to avoid them.",
  "Why don't scientists trust atoms? Because they make up everything.",
];

const QUOTES = [
  "The only way to do great work is to love what you do. — Steve Jobs",
  "It does not matter how slowly you go, as long as you do not stop. — Confucius",
  "Success is not final; failure is not fatal. Courage to continue is what counts. — Churchill",
  "The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt",
  "Believe you can and you're halfway there. — Theodore Roosevelt",
  "The secret of getting ahead is getting started. — Mark Twain",
  "Hard work beats talent when talent doesn't work hard. — Tim Notke",
  "Don't count the days; make the days count. — Muhammad Ali",
  "You are never too old to set another goal or dream a new dream. — C.S. Lewis",
  "Do what you can, with what you have, where you are. — Theodore Roosevelt",
  "The best time to plant a tree was 20 years ago. The second best time is now. — Chinese Proverb",
  "It always seems impossible until it's done. — Nelson Mandela",
];

const FACTS = [
  "A group of flamingos is called a 'flamboyance.'",
  "Honey never spoils. Archaeologists found 3000-year-old honey still edible.",
  "The shortest war in history lasted 38 minutes — Britain vs Zanzibar, 1896.",
  "A day on Venus is longer than a year on Venus.",
  "Bananas are berries, but strawberries are not.",
  "The human brain uses 20% of the body's total energy.",
  "Octopuses have three hearts and blue blood.",
  "There are more possible chess games than atoms in the observable universe.",
  "A bolt of lightning is five times hotter than the surface of the sun.",
  "The average person walks about 100,000 miles in their lifetime.",
  "Sharks are older than trees. They have existed for over 400 million years.",
  "A snail can sleep for 3 years.",
  "The Eiffel Tower can grow 15 cm taller in summer due to thermal expansion.",
  "Cleopatra lived closer in time to the Moon landing than to the pyramids.",
  "Oxford University is older than the Aztec Empire.",
];

const RIDDLES = [
  {q:"I speak without a mouth and hear without ears. I come alive with the wind. What am I?", a:"An echo."},
  {q:"The more you take, the more you leave behind. What am I?", a:"Footsteps."},
  {q:"I have cities but no houses, mountains but no trees, water but no fish. What am I?", a:"A map."},
  {q:"What has hands but can't clap?", a:"A clock."},
  {q:"What gets wetter as it dries?", a:"A towel."},
  {q:"I have keys but no locks. I have space but no room. You can enter but can't go inside. What am I?", a:"A keyboard."},
  {q:"What can travel around the world while staying in a corner?", a:"A stamp."},
];

const TONGUE_TWISTERS = [
  "She sells seashells by the seashore.",
  "Peter Piper picked a peck of pickled peppers.",
  "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
  "Red lorry, yellow lorry.",
  "Unique New York, unique New York, you know you need unique New York.",
  "Fuzzy Wuzzy was a bear. Fuzzy Wuzzy had no hair. Fuzzy Wuzzy wasn't very fuzzy, was he?",
];

const AFFIRMATIONS = [
  "You are capable of amazing things, sir.",
  "Every day you are growing stronger and wiser.",
  "Your potential is limitless. Keep pushing.",
  "You have everything you need to succeed today.",
  "Believe in yourself — I certainly do.",
  "Challenges are just opportunities in disguise. You've got this.",
];

const WOULD_YOU_RATHER = [
  "Would you rather be able to fly or be invisible?",
  "Would you rather live in the past or the future?",
  "Would you rather have super strength or super speed?",
  "Would you rather explore the ocean or outer space?",
  "Would you rather know every language or play every instrument?",
];

const SITES = {
  youtube:'https://youtube.com/',     google:'https://google.com/',
  chatgpt:'https://chatgpt.com/',     github:'https://github.com/',
  instagram:'https://instagram.com/', twitter:'https://twitter.com/',
  netflix:'https://netflix.com/',     spotify:'https://open.spotify.com/',
  whatsapp:'https://web.whatsapp.com/', gmail:'https://mail.google.com/',
  maps:'https://maps.google.com/',    amazon:'https://amazon.in/',
  flipkart:'https://flipkart.com/',   reddit:'https://reddit.com/',
  linkedin:'https://linkedin.com/',   pinterest:'https://pinterest.com/',
  telegram:'https://web.telegram.org/', discord:'https://discord.com/app',
  stackoverflow:'https://stackoverflow.com/', codepen:'https://codepen.io/',
  hackerrank:'https://hackerrank.com/', leetcode:'https://leetcode.com/',
  drive:'https://drive.google.com/', docs:'https://docs.google.com/',
  translate:'https://translate.google.com/', news:'https://news.google.com/',
  twitch:'https://twitch.tv/',        canva:'https://canva.com/',
  notion:'https://notion.so/',        figma:'https://figma.com/',
  medium:'https://medium.com/',       x:'https://x.com/',
};

/* ── UNIT CONVERSION ────────────────────────────── */
function convertUnit(c) {
  const numPat = '(\\d+\\.?\\d*)';
  // Length
  const lenRx = new RegExp(numPat+'\\s*(km|kilometer|kilometre|mile|meter|metre|cm|centimeter|centimetre|inch|inches|foot|feet|yard)\\s*(?:to|in|into)\\s*(km|kilometer|kilometre|mile|meter|metre|cm|centimeter|centimetre|inch|inches|foot|feet|yard)','i');
  const lm = c.match(lenRx);
  if (lm) {
    const toM={km:1000,kilometer:1000,kilometre:1000,mile:1609.34,meter:1,metre:1,cm:.01,centimeter:.01,centimetre:.01,inch:.0254,inches:.0254,foot:.3048,feet:.3048,yard:.9144};
    const r=(parseFloat(lm[1])*(toM[lm[2].toLowerCase()]||1))/(toM[lm[3].toLowerCase()]||1);
    return speak(`${lm[1]} ${lm[2]} = ${r.toFixed(4)} ${lm[3]}.`);
  }
  // Temperature
  const tmpRx = new RegExp(numPat+'\\s*(celsius|centigrade|fahrenheit|kelvin)\\s*(?:to|in|into)\\s*(celsius|centigrade|fahrenheit|kelvin)','i');
  const tm = c.match(tmpRx);
  if (tm) {
    let v=parseFloat(tm[1]), f=tm[2].toLowerCase(), t=tm[3].toLowerCase();
    let cel = f.startsWith('f')?(v-32)*5/9:f.startsWith('k')?v-273.15:v;
    let res = t.startsWith('f')?cel*9/5+32:t.startsWith('k')?cel+273.15:cel;
    return speak(`${v} ${tm[2]} = ${res.toFixed(2)} ${tm[3]}.`);
  }
  // Weight
  const wRx = new RegExp(numPat+'\\s*(kg|kilogram|gram|grams|pound|lb|ounce|oz|ton|tonne)\\s*(?:to|in|into)\\s*(kg|kilogram|gram|grams|pound|lb|ounce|oz|ton|tonne)','i');
  const wm = c.match(wRx);
  if (wm) {
    const toKg={kg:1,kilogram:1,gram:.001,grams:.001,pound:.453592,lb:.453592,ounce:.0283495,oz:.0283495,ton:1000,tonne:1000};
    const r=(parseFloat(wm[1])*(toKg[wm[2].toLowerCase()]||1))/(toKg[wm[3].toLowerCase()]||1);
    return speak(`${wm[1]} ${wm[2]} = ${r.toFixed(4)} ${wm[3]}.`);
  }
  // Speed
  const sRx = new RegExp(numPat+'\\s*(kmh|km\\/h|kph|mph|m\\/s|mps)\\s*(?:to|in|into)\\s*(kmh|km\\/h|kph|mph|m\\/s|mps)','i');
  const sm = c.match(sRx);
  if (sm) {
    const toMs={kmh:1/3.6,'km/h':1/3.6,kph:1/3.6,mph:0.44704,'m/s':1,mps:1};
    const r=(parseFloat(sm[1])*(toMs[sm[2].toLowerCase()]||1))/(toMs[sm[3].toLowerCase()]||1);
    return speak(`${sm[1]} ${sm[2]} = ${r.toFixed(4)} ${sm[3]}.`);
  }
  // Currency hint (no live rate)
  if (/(?:usd|inr|eur|gbp|jpy).*to.*(?:usd|inr|eur|gbp|jpy)/i.test(c))
    return speak("For live currency conversion, I'm opening Google Finance.");
  window.open('https://www.google.com/finance/','_blank');
  return;
}

/* ── PASSWORD GENERATOR ─────────────────────────── */
function genPassword(len, type='mixed') {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  if (type==='numbers') chars='0123456789';
  if (type==='letters') chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let pwd='';
  for(let i=0;i<len;i++) pwd+=chars[Math.floor(Math.random()*chars.length)];
  addMsg('friday',`🔐 Generated password: ${pwd}`);
  speak(`Your ${len}-character password is ready on screen.`);
  if (navigator.clipboard) navigator.clipboard.writeText(pwd).then(()=>addMsg('friday','✓ Copied to clipboard'));
}

/* ── ALARM CHECKER ──────────────────────────────── */
function checkAlarms(now) {
  const hh=pad(now.getHours()), mm=pad(now.getMinutes()), ss=pad(now.getSeconds());
  if (ss!=='00') return;
  alarms.forEach((a,i)=>{
    if (a.active && a.time===hh+':'+mm) {
      speak(`Alarm! ${a.label||'Your alarm'} is ringing.`);
      const toast=$('timer-toast');
      toast.querySelector('span').textContent=`⏰ Alarm: ${a.label||a.time}`;
      toast.classList.remove('hidden');
      alarms[i].active=false; save.alarms();
    }
  });
}

/* ── MATHS HELPERS ──────────────────────────────── */
function safeMath(expr) {
  const clean = expr
    .replace(/\bplus\b/g,'+').replace(/\bminus\b/g,'-')
    .replace(/\b(times|multiplied by|x)\b/g,'*').replace(/\bdivided by\b/g,'/')
    .replace(/\bsquared\b/g,'**2').replace(/\bcubed\b/g,'**3')
    .replace(/\bmod\b/g,'%').replace(/\bpower\b/g,'**')
    .replace(/[^0-9+\-*/.()%\s**]/g,'').trim();
  if (!clean) return null;
  try { return Function('"use strict";return('+clean+')')(); } catch{ return null; }
}

/* ═══════════════════════════════════════════════════
   ██  COMMAND HANDLER  ██
   100+ commands organised by category
   ═══════════════════════════════════════════════════ */
let pendingRiddle=null, pendingWyr=null;

function handleCmd(cmd) {
  const c = cmd.toLowerCase().trim();
  const p = getProfile();
  const rand = arr => arr[Math.floor(Math.random()*arr.length)];

  /* ─ RIDDLE ANSWER ─ */
  if (pendingRiddle) { const r=pendingRiddle; pendingRiddle=null; return speak(`The answer is: ${r.a}`); }

  /* ════ 1. GREETINGS ════ */
  if (/(hello|hey|hi|howdy|greetings|sup|what.?s up)\s*(friday|assistant|there)?/.test(c))
    return speak(`Hello, ${p.name||'sir'}. All systems nominal. 100+ commands are ready. How can I assist?`);

  if (/good (morning|afternoon|evening|night)/.test(c)) {
    const t=c.match(/good (\w+)/)[1];
    return speak(`Good ${t} to you too, ${p.name||'sir'}. ${t==='morning'?'Ready to make today great!':t==='night'?'Rest well, sir.':'Have a wonderful '+t+'.'}`);
  }

  if (/how are you|are you ok|you good/.test(c))
    return speak("I am operating at peak efficiency, sir. All circuits green. Thank you for asking!");

  if (/thank(s| you)|cheers|appreciate|well done|good job/.test(c))
    return speak(`Anytime, ${p.name||'sir'}. That is precisely what I am here for.`);

  if (/bye|goodbye|see you|later|sign off|shut down/.test(c))
    return speak(`Goodbye, ${p.name||'sir'}. Have a wonderful ${tod()}. FRIDAY signing off.`);

  if (/good night|sleep well|going to (sleep|bed)/.test(c))
    return speak(`Good night, ${p.name||'sir'}. Sleep well and recharge. FRIDAY will be here when you wake.`);

  /* ════ 2. IDENTITY ════ */
  if (/who are you|what are you|introduce yourself|tell me about yourself/.test(c))
    return speak("I am FRIDAY — Female Replacement Intelligent Digital Assistant Youth. Modelled after the AI from Iron Man. I can open websites, search, do maths, set timers and alarms, take notes, manage shopping lists, convert units, tell jokes, give quotes, ask riddles, and over 100 more things.");

  if (/who (made|built|created|developed) you/.test(c))
    return speak("I was crafted by your developer using pure web technologies — HTML, CSS, and JavaScript. No external servers required.");

  if (/what can you do|your (abilities|skills|features)|list commands|help me/.test(c))
    return speak("I can handle: time and dates, weather, opening 30+ websites, Google and YouTube search, music, news, maps, navigation, maths, unit conversion, timers, alarms, notes, shopping lists, to-do lists, coin flips, dice rolls, random numbers, passwords, jokes, quotes, facts, riddles, trivia, tongue twisters, affirmations, age calculator, countdown to events, BMI, tip calculator, and much more. Just ask!");

  if (/version|what version/.test(c))
    return speak("I am FRIDAY version 6. Running in your browser with over 100 commands.");

  /* ════ 3. TIME & DATE ════ */
  if (/\btime\b/.test(c) && !/weather/.test(c))
    return speak(`The current time is ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}.`);

  if (/\b(date|today)\b/.test(c) && !/weather/.test(c) && !/update/.test(c))
    return speak(`Today is ${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}.`);

  if (/what (day|weekday) is (it|today)/.test(c))
    return speak(`Today is ${new Date().toLocaleDateString('en-IN',{weekday:'long'})}.`);

  if (/what year/.test(c))
    return speak(`The current year is ${new Date().getFullYear()}.`);

  if (/what month/.test(c))
    return speak(`The current month is ${new Date().toLocaleString('en-IN',{month:'long'})}.`);

  if (/what season/.test(c)) {
    const m=new Date().getMonth();
    const season=m>=2&&m<=4?'Spring':m>=5&&m<=7?'Summer':m>=8&&m<=10?'Autumn':'Winter';
    return speak(`It is currently ${season}.`);
  }

  if (/how many (days|weeks|hours) (left |in |until )?this (year|month|week)/.test(c)) {
    const n=new Date(), y=n.getFullYear();
    const end=new Date(y,11,31);
    const diff=Math.ceil((end-n)/(1000*60*60*24));
    return speak(`There are approximately ${diff} days left in ${y}.`);
  }

  /* ════ 4. WEATHER ════ */
  if (/weather in (.+)/.test(c)) {
    const city=c.match(/weather in (.+)/)[1];
    speak(`Fetching weather for ${city}…`); return fetchWeather(city);
  }
  if (/\bweather\b/.test(c)) {
    if (p.location) { speak(`Fetching weather for ${p.location}…`); return fetchWeather(p.location); }
    return speak("Say 'weather in [city]' to get weather.");
  }
  if (/will it rain|should i carry (an )?umbrella/.test(c)) {
    if (p.location) { speak(`Checking rain forecast for ${p.location}…`); return fetchWeather(p.location); }
    return speak("Tell me your city: say 'weather in [city]'.");
  }

  /* ════ 5. OPEN WEBSITES ════ */
  for (const [name,url] of Object.entries(SITES)) {
    if (c.includes('open '+name)||c.includes('launch '+name)||c.includes('go to '+name)||c.includes('take me to '+name)) {
      speak(`Opening ${name}.`); window.open(url,'_blank'); return;
    }
  }

  /* ════ 6. SEARCH ════ */
  if (/search (on |for )?google (.+)|google search (.+)/.test(c)) {
    const m=c.match(/search (?:on |for )?google (.+)|google search (.+)/);
    const q=(m[1]||m[2]).trim();
    speak(`Searching Google for ${q}.`); window.open('https://google.com/search?q='+encodeURIComponent(q),'_blank'); return;
  }
  if (/\bsearch\b/.test(c)&&!/youtube|amazon|wikipedia/.test(c)) {
    const q=c.replace(/^(search for|search)\s*/i,'').trim();
    if(q){speak(`Searching for ${q}.`);window.open('https://google.com/search?q='+encodeURIComponent(q),'_blank');return;}
  }
  if (/search (on |for )?youtube (.+)|youtube search (.+)/.test(c)) {
    const m=c.match(/search (?:on |for )?youtube (.+)|youtube search (.+)/);
    const q=(m[1]||m[2]).trim();
    speak(`Searching YouTube for ${q}.`); window.open('https://youtube.com/results?search_query='+encodeURIComponent(q),'_blank'); return;
  }
  if (/search (on |for )?amazon (.+)|amazon search (.+)/.test(c)) {
    const m=c.match(/search (?:on |for )?amazon (.+)|amazon search (.+)/);
    const q=(m[1]||m[2]).trim();
    speak(`Searching Amazon for ${q}.`); window.open('https://amazon.in/s?k='+encodeURIComponent(q),'_blank'); return;
  }
  if (/search (on |for )?reddit (.+)|reddit search (.+)/.test(c)) {
    const m=c.match(/search (?:on |for )?reddit (.+)|reddit search (.+)/);
    const q=(m[1]||m[2]).trim();
    speak(`Searching Reddit for ${q}.`); window.open('https://reddit.com/search/?q='+encodeURIComponent(q),'_blank'); return;
  }
  if (/define (.+)|what (is |does )(.+) mean|definition of (.+)/.test(c)) {
    const m=c.match(/define (.+)|what (?:is |does )(.+) mean|definition of (.+)/);
    const q=(m[1]||m[2]||m[3]).trim();
    speak(`Looking up the definition of ${q}.`); window.open('https://google.com/search?q=define+'+encodeURIComponent(q),'_blank'); return;
  }

  /* ════ 7. PLAY & MEDIA ════ */
  if (/^play\s+(.+)/.test(c)) {
    const q=c.match(/^play\s+(.+)/)[1];
    speak(`Playing ${q} on YouTube.`); window.open('https://youtube.com/results?search_query='+encodeURIComponent(q),'_blank'); return;
  }
  if (/play (music|songs?|playlist)/.test(c))
    { speak("Opening Spotify."); window.open('https://open.spotify.com/','_blank'); return; }

  /* ════ 8. WIKIPEDIA ════ */
  if (/wikipedia (.+)|wiki (.+)/.test(c)) {
    const m=c.match(/wikipedia (.+)|wiki (.+)/);
    const q=(m[1]||m[2]).trim();
    speak(`Looking up ${q} on Wikipedia.`); window.open('https://en.wikipedia.org/wiki/'+encodeURIComponent(q),'_blank'); return;
  }

  /* ════ 9. NEWS ════ */
  if (/latest news|today.?s news|show news|read news|headlines/.test(c))
    { speak("Opening Google News."); window.open('https://news.google.com/','_blank'); return; }
  if (/news about (.+)/.test(c)) {
    const q=c.match(/news about (.+)/)[1];
    speak(`Searching news about ${q}.`); window.open('https://news.google.com/search?q='+encodeURIComponent(q),'_blank'); return;
  }

  /* ════ 10. MAPS & NAVIGATION ════ */
  if (/direction(s)? to (.+)|navigate to (.+)|take me to (.+)|get me to (.+)/.test(c)) {
    const m=c.match(/directions? to (.+)|navigate to (.+)|take me to (.+)|get me to (.+)/);
    const dest=(m[1]||m[2]||m[3]||m[4]).trim();
    speak(`Opening directions to ${dest}.`); window.open('https://maps.google.com/?q='+encodeURIComponent(dest),'_blank'); return;
  }
  if (/find (.+) near me|(.+) nearby|nearest (.+)/.test(c)) {
    const m=c.match(/find (.+) near me|(.+) nearby|nearest (.+)/);
    const place=(m[1]||m[2]||m[3]).trim();
    speak(`Searching for ${place} near you.`); window.open('https://maps.google.com/?q='+encodeURIComponent(place)+'+near+me','_blank'); return;
  }
  if (/show (me )?(the )?map of (.+)|map of (.+)/.test(c)) {
    const m=c.match(/map of (.+)/);
    if(m){speak(`Showing map of ${m[1]}.`);window.open('https://maps.google.com/?q='+encodeURIComponent(m[1]),'_blank');return;}
  }

  /* ════ 11. TRANSLATE ════ */
  if (/translate (.+) to (.+)/.test(c)) {
    const m=c.match(/translate (.+) to (.+)/);
    speak(`Opening Google Translate for ${m[1]} to ${m[2]}.`);
    window.open(`https://translate.google.com/?text=${encodeURIComponent(m[1])}&tl=${encodeURIComponent(m[2])}`,'_blank'); return;
  }
  if (/open (google )?translate/.test(c))
    { speak("Opening Google Translate."); window.open('https://translate.google.com/','_blank'); return; }

  /* ════ 12. CALCULATE ════ */
  if (/\bcalculat|\bcompute\b/.test(c)) {
    const raw=c.replace(/\b(calculate|compute|what is|what's)\b/g,'');
    const res=safeMath(raw);
    return res!==null ? speak(`The answer is ${res}.`) : speak("I couldn't evaluate that. Try: calculate 25 times 4.");
  }
  if (/what('s| is) \d+[\d\s+\-*/().]*/.test(c)) {
    const raw=c.replace(/^what('s| is)\s*/,'');
    const res=safeMath(raw);
    if (res!==null) return speak(`That equals ${res}.`);
  }

  /* ── MATHS SHORTCUTS ── */
  if (/square root of (\d+\.?\d*)/.test(c)) {
    const n=parseFloat(c.match(/square root of (\d+\.?\d*)/)[1]);
    return speak(`Square root of ${n} is ${Math.sqrt(n).toFixed(4)}.`);
  }
  if (/(\d+\.?\d*) ?(to the power of|raised to|power|pow) ?(\d+\.?\d*)/.test(c)) {
    const m=c.match(/(\d+\.?\d*) ?(?:to the power of|raised to|power|pow) ?(\d+\.?\d*)/);
    return speak(`${m[1]} to the power of ${m[2]} is ${Math.pow(parseFloat(m[1]),parseFloat(m[2]))}.`);
  }
  if (/(\d+\.?\d*)%\s*of\s*(\d+\.?\d*)|(\d+\.?\d*)\s*percent of\s*(\d+\.?\d*)/.test(c)) {
    const m=c.match(/(\d+\.?\d*)(?:%|\s*percent)\s*of\s*(\d+\.?\d*)/);
    return speak(`${m[1]}% of ${m[2]} is ${(parseFloat(m[1])*parseFloat(m[2])/100).toFixed(2)}.`);
  }
  if (/is (\d+) (prime|a prime)/.test(c)) {
    const n=parseInt(c.match(/is (\d+) prime/)[1]);
    const isPrime=(x)=>{if(x<2)return false;for(let i=2;i<=Math.sqrt(x);i++)if(x%i===0)return false;return true;};
    return speak(`${n} is ${isPrime(n)?'':'not '}a prime number.`);
  }
  if (/factorial of (\d+)|(\d+) factorial/.test(c)) {
    const m=c.match(/factorial of (\d+)|(\d+) factorial/);
    const n=parseInt(m[1]||m[2]);
    if(n>20) return speak("That number is too large to compute factorially.");
    let f=1; for(let i=2;i<=n;i++) f*=i;
    return speak(`${n} factorial is ${f}.`);
  }
  if (/lcm of (\d+) and (\d+)|lcm (\d+) (\d+)/.test(c)) {
    const m=c.match(/(\d+)\D+(\d+)/);
    const a=parseInt(m[1]),b=parseInt(m[2]);
    const gcd=(x,y)=>y===0?x:gcd(y,x%y);
    return speak(`LCM of ${a} and ${b} is ${(a*b)/gcd(a,b)}.`);
  }
  if (/gcd of (\d+) and (\d+)|gcd (\d+) (\d+)|hcf/.test(c)) {
    const m=c.match(/(\d+)\D+(\d+)/);
    if(m){const a=parseInt(m[1]),b=parseInt(m[2]);const gcd=(x,y)=>y===0?x:gcd(y,x%y);return speak(`GCD of ${a} and ${b} is ${gcd(a,b)}.`);}
  }

  /* ════ 13. UNIT CONVERSION ════ */
  if (/convert|in km\b|in mile|in celsius|in fahrenheit|in kg\b|in pound|in mph|in kmh/.test(c))
    return convertUnit(c);

  /* ════ 14. HEALTH & FITNESS ════ */
  if (/bmi|body mass index/.test(c)) {
    const m=c.match(/(\d+\.?\d*)\s*kg.*?(\d+\.?\d*)\s*(cm|meter|m)|(\d+\.?\d*)\s*(cm|meter|m).*?(\d+\.?\d*)\s*kg/);
    if(m){
      const kg=parseFloat(m[1]||m[6]),cm=parseFloat(m[3]?m[2]:m[5]);
      const h=cm>10?cm/100:cm; const bmi=kg/(h*h);
      const cat=bmi<18.5?'Underweight':bmi<25?'Normal weight':bmi<30?'Overweight':'Obese';
      return speak(`Your BMI is ${bmi.toFixed(1)}, which is categorized as ${cat}.`);
    }
    return speak("Say: calculate BMI, 70 kg, 175 cm.");
  }
  if (/tip (calculator|on)|how much (is )?(\d+)% tip on/.test(c)) {
    const m=c.match(/(\d+\.?\d*)%?\s*tip\s*on\s*(\d+\.?\d*)|(\d+\.?\d*)\s*(\d+\.?\d*)%/);
    if(m){const bill=parseFloat(m[2]),pct=parseFloat(m[1]);const tip=bill*pct/100;return speak(`A ${pct}% tip on ${bill} is ${tip.toFixed(2)}. Total: ${(bill+tip).toFixed(2)}.`);}
    return speak("Say: 15% tip on 500.");
  }
  if (/calorie(s)? in (.+)|how many calories/.test(c)) {
    const m=c.match(/calories? in (.+)/);
    if(m){speak(`Searching calorie info for ${m[1]}.`);window.open('https://google.com/search?q=calories+in+'+encodeURIComponent(m[1]),'_blank');return;}
  }
  if (/water (intake|should i drink)|how much water/.test(c))
    return speak("The general recommendation is 8 glasses, or about 2 litres of water per day. Adjust based on activity and climate, sir.");

  /* ════ 15. TIMERS & ALARMS ════ */
  if (/\btimer\b/.test(c)) {
    const m=c.match(/(\d+)\s*(hour?s?|min(?:ute)?s?|sec(?:ond)?s?)/i);
    if(m){
      const val=parseInt(m[1]), u=m[2].toLowerCase();
      const ms=u.startsWith('h')?val*3600000:u.startsWith('m')?val*60000:val*1000;
      const label=u.startsWith('h')?'hour':u.startsWith('m')?'minute':'second';
      speak(`Timer set for ${val} ${label}${val>1?'s':''}.`);
      setTimeout(()=>{
        speak(`Sir, your ${val} ${label} timer has ended.`);
        const t=$('timer-toast'); t.querySelector('span').textContent='⏱ Timer complete!'; t.classList.remove('hidden');
      },ms); return;
    }
    return speak("Say: set timer 5 minutes.");
  }
  if (/set (an? )?alarm (for|at) (\d{1,2}):?(\d{2})?\s*(am|pm)?/.test(c)) {
    const m=c.match(/set (?:an? )?alarm (?:for|at) (\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    let h=parseInt(m[1]),min=parseInt(m[2]||0),ap=m[3];
    if(ap){if(ap.toLowerCase()==='pm'&&h!==12)h+=12;if(ap.toLowerCase()==='am'&&h===12)h=0;}
    const ts=pad(h)+':'+pad(min);
    alarms.push({time:ts,label:'Alarm '+ts,active:true}); save.alarms();
    return speak(`Alarm set for ${ts}.`);
  }
  if (/show alarms|list alarms|my alarms/.test(c)) {
    const active=alarms.filter(a=>a.active);
    return active.length ? speak(`${active.length} active alarm${active.length>1?'s':''}: ${active.map(a=>a.time).join(', ')}.`) : speak("No active alarms.");
  }
  if (/cancel alarms?|delete alarms?|clear alarms?/.test(c))
    { alarms=[]; save.alarms(); return speak("All alarms cleared."); }

  /* ════ 16. NOTES ════ */
  if (/take a note|add a note|note (that|down )?(.+)|remember that (.+)|write down (.+)/.test(c)) {
    const m=c.match(/note (?:that |down )?(.+)|remember that (.+)|write down (.+)/);
    const note=m?(m[1]||m[2]||m[3]).trim():c.replace(/take a note|add a note/,'').trim();
    if(note){notes.push({text:note,time:new Date().toLocaleString('en-IN')});save.notes();return speak(`Noted: "${note}"`);}
    return speak("What would you like me to note?");
  }
  if (/show (my )?notes|read (my )?notes|list (my )?notes|my notes/.test(c)) {
    if(!notes.length) return speak("No notes yet, sir.");
    speak(`You have ${notes.length} note${notes.length>1?'s':''}.`);
    addMsg('friday',notes.map((n,i)=>`${i+1}. ${n.text}`).join('\n')); return;
  }
  if (/delete (last )?note|remove (last )?note/.test(c)) {
    if(!notes.length) return speak("No notes to delete.");
    const n=notes.pop(); save.notes(); return speak(`Deleted note: "${n.text}".`);
  }
  if (/clear (all )?notes|delete all notes/.test(c))
    { notes=[]; save.notes(); return speak("All notes cleared."); }

  /* ════ 17. SHOPPING LIST ════ */
  if (/add (.+) to (my )?(shopping|grocery) list|buy (.+)/.test(c)) {
    const m=c.match(/add (.+) to (?:my )?(?:shopping|grocery) list|buy (.+)/);
    const item=(m[1]||m[2]).trim();
    shoppingList.push(item); save.shop();
    return speak(`Added ${item} to your shopping list. You now have ${shoppingList.length} items.`);
  }
  if (/show (my )?(shopping|grocery) list|read (my )?(shopping|grocery) list/.test(c)) {
    if(!shoppingList.length) return speak("Your shopping list is empty.");
    speak(`Shopping list has ${shoppingList.length} items.`);
    addMsg('friday',shoppingList.map((i,n)=>`${n+1}. ${i}`).join('\n')); return;
  }
  if (/clear (my )?(shopping|grocery) list/.test(c))
    { shoppingList=[]; save.shop(); return speak("Shopping list cleared."); }
  if (/remove (.+) from (my )?(shopping|grocery) list/.test(c)) {
    const m=c.match(/remove (.+) from/); const item=m[1].trim();
    const idx=shoppingList.findIndex(i=>i.toLowerCase().includes(item));
    if(idx>-1){const removed=shoppingList.splice(idx,1)[0];save.shop();return speak(`Removed ${removed} from your list.`);}
    return speak(`Couldn't find ${item} in your list.`);
  }

  /* ════ 18. TO-DO LIST ════ */
  if (/add (.+) to (my )?(to.?do|task) list|todo (.+)/.test(c)) {
    const m=c.match(/add (.+) to (?:my )?(?:to.?do|task) list|todo (.+)/);
    const task=(m[1]||m[2]).trim();
    todos.push({task,done:false,time:new Date().toLocaleString('en-IN')}); save.todos();
    return speak(`Added "${task}" to your to-do list.`);
  }
  if (/show (my )?(to.?do|tasks?)|my tasks?|pending tasks?/.test(c)) {
    const pending=todos.filter(t=>!t.done);
    if(!pending.length) return speak("No pending tasks. Well done, sir!");
    speak(`You have ${pending.length} pending task${pending.length>1?'s':''}.`);
    addMsg('friday',pending.map((t,i)=>`${i+1}. ${t.task}`).join('\n')); return;
  }
  if (/clear (all )?(to.?do|tasks?)/.test(c))
    { todos=[]; save.todos(); return speak("All tasks cleared."); }

  /* ════ 19. FUN & GAMES ════ */
  if (/\b(joke|make me laugh|say something funny)\b/.test(c))
    return speak(rand(JOKES));

  if (/motivat|inspir|quote|wise words|wisdom|lift me up/.test(c))
    return speak(rand(QUOTES));

  if (/fun fact|random fact|interesting fact|tell me a fact|did you know|amaze me/.test(c))
    return speak(rand(FACTS));

  if (/riddle|puzzle|brain teaser/.test(c)) {
    const r=rand(RIDDLES); pendingRiddle=r;
    return speak(`Here is a riddle: ${r.q} Say anything when ready for the answer.`);
  }

  if (/tongue twister/.test(c))
    return speak(rand(TONGUE_TWISTERS));

  if (/affirm|pep talk|encourage me|cheer me up|feel better|sad/.test(c))
    return speak(rand(AFFIRMATIONS));

  if (/would you rather/.test(c))
    return speak(rand(WOULD_YOU_RATHER));

  if (/trivia|quiz me|ask me a question/.test(c))
    return speak("Here is a trivia question: Which planet in our solar system has the most moons? Say anything for the answer. The answer is Saturn, with 146 confirmed moons.");

  if (/guess (a )?number|number (game|guessing)/.test(c)) {
    const n=Math.floor(Math.random()*10)+1;
    speak(`I'm thinking of a number between 1 and 10. The number is… ${n}! Did you guess it?`); return;
  }

  /* ════ 20. RANDOM ════ */
  if (/flip (a )?coin|heads or tails|toss (a )?coin/.test(c))
    return speak(`Flipped! It's ${Math.random()<.5?'Heads':'Tails'}!`);

  if (/roll (a |the )?d(\d+)|roll (\d+)d(\d+)/.test(c)) {
    const m=c.match(/roll (\d+)d(\d+)|roll (?:a )?d(\d+)/i);
    const sides=parseInt(m[2]||m[3]||6), count=parseInt(m[1]||1);
    const results=Array.from({length:count},()=>Math.floor(Math.random()*sides)+1);
    return speak(`Rolled ${count}d${sides}: ${results.join(', ')}. Total: ${results.reduce((a,b)=>a+b,0)}.`);
  }
  if (/roll (a |the )?dice?/.test(c)) {
    const m=c.match(/roll (\d+) dice?/);
    const count=m?parseInt(m[1]):1;
    const results=Array.from({length:count},()=>Math.floor(Math.random()*6)+1);
    return speak(`Rolled: ${results.join(', ')}. Total: ${results.reduce((a,b)=>a+b,0)}.`);
  }

  if (/random number between (\d+) and (\d+)/.test(c)) {
    const m=c.match(/(\d+) and (\d+)/);
    return speak(`Random number: ${Math.floor(Math.random()*(parseInt(m[2])-parseInt(m[1])+1))+parseInt(m[1])}.`);
  }
  if (/random number|pick a number/.test(c))
    return speak(`Your random number is ${Math.floor(Math.random()*100)+1}.`);

  if (/rock paper scissors/.test(c)) {
    const choices=['Rock','Paper','Scissors'];
    return speak(`I choose ${rand(choices)}! What did you pick?`);
  }

  if (/magic 8 ball|8-?ball|answer me/.test(c)) {
    const answers=['It is certain.','Without a doubt.','Yes, definitely.','You may rely on it.','Outlook is good.','Signs point to yes.','Reply hazy, try again.','Ask again later.','Cannot predict now.','Dont count on it.','My reply is no.','Outlook not so good.','Very doubtful.'];
    return speak(rand(answers));
  }

  if (/pick (a |one )?random (color|colour)/.test(c)) {
    const colors=['Red','Blue','Green','Purple','Orange','Yellow','Pink','Cyan','Magenta','Teal','Indigo','Crimson'];
    return speak(`I pick ${rand(colors)}!`);
  }

  if (/choose (between )?(.+) or (.+)/.test(c)) {
    const m=c.match(/choose (?:between )?(.+?) or (.+)/);
    const choice=Math.random()<.5?m[1]:m[2];
    return speak(`I'd go with ${choice.trim()}, sir.`);
  }

  /* ════ 21. UTILITIES ════ */
  if (/generate (a |some )?password|create (a |some )?password|random password/.test(c)) {
    const m=c.match(/(\d+)\s*(?:character|char|digit|letter)/);
    const type=c.includes('number')?'numbers':c.includes('letter')?'letters':'mixed';
    return genPassword(m?parseInt(m[1]):16, type);
  }

  if (/generate (a |some )?username/.test(c)) {
    const adj=['Cool','Dark','Swift','Iron','Hyper','Neon','Cyber','Ghost','Storm','Pixel'];
    const noun=['Warrior','Ranger','Hacker','Ninja','Phoenix','Dragon','Wolf','Viper','Tiger'];
    const user=rand(adj)+rand(noun)+Math.floor(Math.random()*999);
    addMsg('friday',`Username: ${user}`);
    return speak(`Generated username: ${user}. It's displayed on screen.`);
  }

  /* ════ 22. COUNTDOWN ════ */
  if (/days? (?:until|to|till|before|left for) (.+)/.test(c)) {
    const target=c.match(/days? (?:until|to|till|before|left for) (.+)/)[1].trim();
    const y=new Date().getFullYear();
    const dates={'new year':new Date(y+1,0,1),'christmas':new Date(y,11,25),'diwali':new Date(y,10,20),'holi':new Date(y,1,25),'independence day':new Date(y,7,15),'republic day':new Date(y,0,26),'halloween':new Date(y,9,31),'valentine':new Date(y,1,14),'new year\'s':new Date(y+1,0,1)};
    const d=dates[target];
    if(d){const diff=Math.ceil((d-new Date())/(86400000));return speak(`There are ${diff} days until ${target}.`);}
    return speak(`I don't have a date stored for ${target}. Try: Christmas, New Year, Diwali, Holi, Halloween, Republic Day, or Independence Day.`);
  }

  /* ════ 23. AGE & DATES ════ */
  if (/born in (\d{4})|age.*born.*(\d{4})|(\d{4}).*how old/.test(c)) {
    const m=c.match(/(\d{4})/);
    if(m){return speak(`Someone born in ${m[1]} is ${new Date().getFullYear()-parseInt(m[1])} years old.`);}
  }
  if (/my age|how old am i/.test(c))
    return speak("I don't have your date of birth. Say 'born in [year]' and I'll calculate.");

  if (/how many days? (?:since|ago) (.+)/.test(c)) {
    const m=c.match(/how many days? (?:since|ago) (.+)/);
    speak(`Searching: days since ${m[1]}.`); window.open('https://google.com/search?q=days+since+'+encodeURIComponent(m[1]),'_blank'); return;
  }

  /* ════ 24. SYSTEM & DEVICE ════ */
  if (/\bbattery\b/.test(c))
    return speak(`Battery level is ${$('battery-display').textContent}.`);

  if (/am i online|internet connection|network status|connected/.test(c))
    return speak(navigator.onLine?`You are connected to the internet, sir.`:`You appear to be offline, sir.`);

  if (/screen (size|resolution)|window size/.test(c))
    return speak(`Screen: ${window.screen.width}×${window.screen.height}px. Browser window: ${window.innerWidth}×${window.innerHeight}px.`);

  if (/what (browser|device) am i/.test(c)) {
    const ua=navigator.userAgent;
    const br=ua.includes('Chrome')?'Chrome':ua.includes('Firefox')?'Firefox':ua.includes('Safari')?'Safari':'your browser';
    const mob=/Mobi|Android/i.test(ua)?'a mobile device':'a desktop or laptop';
    return speak(`You are using ${br} on ${mob}.`);
  }

  if (/what (os|operating system)/.test(c)) {
    const p2=navigator.platform||navigator.userAgentData?.platform||'Unknown';
    return speak(`Your operating system appears to be ${p2}.`);
  }

  /* ════ 25. CONTROLS ════ */
  if (/^stop$|stop (talking|speaking|friday|listening)/.test(c)) {
    window.speechSynthesis.cancel(); if(rec) rec.stop();
    addMsg('friday','Standby mode.'); setOrb('idle'); return;
  }
  if (/repeat (that|again)|say (that |it )?again/.test(c))
    return speak(lastSpoken||"Nothing to repeat yet.");

  if (/clear (chat|transcript|screen|history)/.test(c)) {
    $('transcript-log').innerHTML=''; return speak("Chat cleared.");
  }
  if (/reset profile|start over|forget (me|my profile)/.test(c)) {
    if(confirm('Reset all FRIDAY data?')){ localStorage.clear(); location.reload(); } return;
  }

  /* ════ 26. GENERAL KNOWLEDGE ════ */
  if (/what is the capital of (.+)/.test(c)) {
    const country=c.match(/capital of (.+)/)[1].trim();
    speak(`Searching for the capital of ${country}.`); window.open('https://google.com/search?q=capital+of+'+encodeURIComponent(country),'_blank'); return;
  }
  if (/who is (.+)|what is (.+)|tell me about (.+)/.test(c)&&!/the weather|the time|the date/.test(c)) {
    const m=c.match(/who is (.+)|what is (.+)|tell me about (.+)/);
    const q=(m[1]||m[2]||m[3]).trim();
    if(q.length>2){speak(`Searching for ${q}.`);window.open('https://google.com/search?q='+encodeURIComponent(q),'_blank');return;}
  }

  /* ════ FALLBACK ════ */
  speak(`I didn't catch that, sir. Say 'help' to hear my capabilities, or try: open YouTube, calculate 5 times 8, flip a coin, or tell me a joke.`);
}

/* ── ORB / STATUS ───────────────────────────────── */
function setOrb(s){$('orb').className=s;setStatus({idle:'STANDBY',listening:'LISTENING',speaking:'SPEAKING'}[s]||'STANDBY');}
function setStatus(s){txt('orb-status',s);}

/* ── TRANSCRIPT ─────────────────────────────────── */
function addMsg(role,text){
  const log=$('transcript-log');
  const div=document.createElement('div');div.className='msg '+role;
  const lbl=document.createElement('span');lbl.className='label';
  lbl.textContent=role==='user'?'YOU':'FRIDAY';
  div.appendChild(lbl);div.appendChild(document.createTextNode(text));
  log.appendChild(div);
  const box=$('transcript-box');box.scrollTop=box.scrollHeight;
}

/* ── MOBILE MENU ────────────────────────────────── */
function openMenu(){
  const mm=$('mobile-menu'),bd=$('menu-backdrop');
  mm.classList.remove('hidden');bd.classList.remove('hidden');
  requestAnimationFrame(()=>requestAnimationFrame(()=>mm.classList.add('open')));
}
function closeMenu(){
  $('mobile-menu').classList.remove('open');
  setTimeout(()=>{$('mobile-menu').classList.add('hidden');$('menu-backdrop').classList.add('hidden');},310);
}

/* ── BIND EVENTS ────────────────────────────────── */
function bindEvents(){
  on('mic-btn','click',toggleRec); on('speak-btn','click',toggleRec);
  const orb=$('orb');
  orb.addEventListener('click',toggleRec);
  orb.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')toggleRec();});
  on('text-send','click',sendText);
  $('text-input').addEventListener('keydown',e=>{if(e.key==='Enter')sendText();});
  document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{addMsg('user',c.dataset.cmd);handleCmd(c.dataset.cmd);}));
  $('setup-form').addEventListener('submit',e=>{
    e.preventDefault();
    const vals={};e.target.querySelectorAll('input').forEach(i=>{if(i.name)vals[i.name]=i.value.trim();});
    if(!vals.name||!vals.location)return;
    localStorage.setItem('friday_profile',JSON.stringify(vals));
    $('setup-overlay').classList.add('hidden');loadProfile(vals);showHud();
  });
  on('skip-setup','click',()=>{$('setup-overlay').classList.add('hidden');showHud();});
  on('settings-btn','click',()=>{
    const p=getProfile(),f=$('setup-form');
    Object.keys(p).forEach(k=>{const i=f.querySelector('[name="'+k+'"]');if(i)i.value=p[k];});
    $('setup-overlay').classList.remove('hidden');
  });
  ['reset-btn','reset-btn-d','mob-reset'].forEach(id=>on(id,'click',doReset));
  on('nav-menu','click',openMenu); on('menu-backdrop','click',closeMenu);
  let ty=0;
  const mm=$('mobile-menu');
  mm.addEventListener('touchstart',e=>{ty=e.touches[0].clientY;},{passive:true});
  mm.addEventListener('touchend',e=>{if(e.changedTouches[0].clientY-ty>60)closeMenu();},{passive:true});
}

function sendText(){
  const inp=$('text-input'),val=inp.value.trim();
  if(!val)return;addMsg('user',val);handleCmd(val);inp.value='';
}
function doReset(){
  if(confirm('Reset all FRIDAY data? This clears profile, notes, alarms, and lists.'))
    {localStorage.clear();location.reload();}
}

/* ── HELPERS ────────────────────────────────────── */
function $(id)       {return document.getElementById(id);}
function txt(id,t)   {const e=$(id);if(e)e.textContent=t;}
function src(id,s)   {const e=$(id);if(e)e.src=s;}
function on(id,ev,fn){const e=$(id);if(e)e.addEventListener(ev,fn);}
function pad(n)      {return String(n).padStart(2,'0');}
function getProfile(){return JSON.parse(localStorage.getItem('friday_profile')||'{}');}
