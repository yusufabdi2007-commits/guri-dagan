// stress-contact.mjs
// Sends 100 fake submissions to /api/contact
// Every 10th request (10 total) sends a real email — rest are silent.
// Run: node scripts/stress-contact.mjs

const URL = 'https://guri-dagan.vercel.app/api/contact';
const TOTAL = 100;
const EMAIL_EVERY = 10; // requests 10, 20, 30 … 100 send real emails

const NAMES = [
  'Faadumo Warsame', 'Hodan Abdi', 'Sahra Maxamed', 'Nimo Xirsi', 'Caasha Dirie',
  'Warsan Jaamac', 'Sagal Hassan', 'Ifrah Cabdi', 'Ruqiyo Omar', 'Amina Sheekh',
  'Bile Muuse', 'Cabdi Raxman', 'Ibraahim Warsame', 'Maxamed Axmed', 'Yuusuf Cali',
  'Xasan Dhuule', 'Cumar Farah', 'Mustafe Nuur', 'Daahir Rooble', 'Abukar Xirsi',
];
const COUNTRIES = ['United Kingdom', 'United States', 'Canada', 'Sweden', 'Norway',
  'Netherlands', 'Germany', 'Australia', 'Somalia', 'Kenya', 'Ethiopia', 'UAE'];
const SOURCES = ['youtube', 'tiktok', 'whatsapp', 'friend', 'other'];
const MESSAGES = [
  'Caruurtaydu ma dhageysanayaan, sideen u tusi karaa xishoodka.',
  'Wiilkaygu wuxuu xanaaqaa markaan wax ku odhan. Maxaan samaynaa?',
  'Gabadheydii waxay ka cabsanaysaa iskuulka. Caawimaad baan u baahan ahay.',
  'Qoyskayga waxaa ku jira shan caruur, waxaan rabaa qorshaha saxda ah.',
  'Caruurtu ma raacayaan xeerarka guriga. Sideen u maaraynaa?',
  'Waxaan doonayaa in aan bartaa sida caruurta loogu hadlo si nabadeed.',
  'Wiilkaygu 13 jir buu yahay, si xun ayuu u hadlaa. Maxaan samaynaa?',
  'Coach Rahma waxaan ka dhageystay YouTube. Rabaan barnaamijka caruurta.',
  'Laba caruur baa i leh, da\' kala duwan. Barnaamij kuma habboon?',
  'Gurigayaga waa la dagaallamo. Caawimad baan u baahan nahay dhaqan.',
];

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function phone() {
  const prefixes = ['+44 7', '+1 (6', '+46 7', '+61 4', '+47 4', '+31 6'];
  return pick(prefixes) + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
}

function fakeForm(i) {
  const who = pick(['parent', 'children', 'both']);
  const addChild = who === 'parent' ? pick(['yes', 'no']) : '';
  const hasChildren = who === 'children' || who === 'both' || (who === 'parent' && addChild === 'yes');
  const sendEmail = i % EMAIL_EVERY === 0; // every 10th = real email

  return {
    who,
    addChildCoaching: addChild,
    childCount: hasChildren ? String(Math.floor(Math.random() * 4) + 1) : '',
    childAges: hasChildren ? [pick(['0–3 years','4–7 years','8–12 years','13 and older'])] : [],
    name: pick(NAMES),
    country: pick(COUNTRIES),
    phone: phone(),
    source: pick(SOURCES),
    message: pick(MESSAGES),
    _noEmail: !sendEmail,
  };
}

async function send(i) {
  const form = fakeForm(i);
  const isEmailRun = !form._noEmail;
  const t0 = Date.now();

  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const ms = Date.now() - t0;
    const data = await res.json().catch(() => ({}));

    const num = String(i).padStart(3, ' ');
    const status = res.ok ? `${GREEN}✓ ${res.status}${RESET}` : `${RED}✗ ${res.status}${RESET}`;
    const emailTag = isEmailRun
      ? `${YELLOW}📧 EMAIL SENT${RESET}`
      : `${CYAN}silent${RESET}`;
    const emailStatus = data.email === 'skipped' ? ` ${RED}(no API key!)${RESET}` : '';

    console.log(`[${num}/${TOTAL}] ${status}  ${ms}ms  ${emailTag}${emailStatus}  — ${form.name} / ${form.country}`);
    return { ok: res.ok, ms, isEmailRun };
  } catch (e) {
    const ms = Date.now() - t0;
    console.log(`[${String(i).padStart(3, ' ')}/${TOTAL}] ${RED}✗ ERROR${RESET}  ${ms}ms  — ${e.message}`);
    return { ok: false, ms, isEmailRun };
  }
}

async function run() {
  console.log(`\n${BOLD}Guri Dagan — Contact Form Stress Test${RESET}`);
  console.log(`Target: ${CYAN}${URL}${RESET}`);
  console.log(`Sending ${BOLD}${TOTAL} submissions${RESET} — ${YELLOW}10 with real email${RESET}, 90 silent\n`);

  const results = [];
  const CONCURRENCY = 5;

  for (let i = 1; i <= TOTAL; i += CONCURRENCY) {
    const batch = [];
    for (let j = i; j < Math.min(i + CONCURRENCY, TOTAL + 1); j++) {
      batch.push(send(j));
    }
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const emailRuns = results.filter(r => r.isEmailRun);
  const avgMs = Math.round(results.reduce((a, r) => a + r.ms, 0) / results.length);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${BOLD}Results${RESET}`);
  console.log(`  Total:   ${TOTAL}`);
  console.log(`  ${GREEN}Passed:  ${passed}${RESET}`);
  console.log(`  ${failed > 0 ? RED : GREEN}Failed:  ${failed}${RESET}`);
  console.log(`  Avg time: ${avgMs}ms`);
  console.log(`  ${YELLOW}Email runs: ${emailRuns.length} (check rhussein612@gmail.com + ymo441993@gmail.com)${RESET}`);
  console.log(`${'─'.repeat(60)}\n`);
}

run();
