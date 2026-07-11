'use client';

import { useState } from 'react';
import { COUNTRIES } from '@/lib/countries';
import { ChevronRight, ChevronLeft, CheckCircle2, Send } from 'lucide-react';

type Step = 'intro' | 'who' | 'upsell' | 'children' | 'details' | 'source' | 'message' | 'done' | 'error';
type Who = 'parent' | 'children' | 'both' | '';

interface FormState {
  who: Who;
  addChildCoaching: 'yes' | 'no' | '';
  childCount: string;
  childAges: string[];
  name: string;
  country: string;
  phone: string;
  source: string;
  message: string;
}

const T = {
  en: {
    langToggle: 'Somali',
    subtitle: 'Parenting & Child Coaching',
    step1Title: 'Who needs coaching?',
    whoParent: 'I need parent coaching',
    whoChildren: 'My child / children need coaching',
    whoBoth: 'Both me and my children',
    upsellTitle: 'Would you also like coaching for your child?',
    addChildYes: 'Yes — add child coaching too',
    addChildNo: 'No — parent coaching only for now',
    childrenTitle: 'About the children',
    howMany: 'How many children?',
    agesLabel: 'What are their ages? (select all that apply)',
    age03: '0–3 years',
    age47: '4–7 years',
    age812: '8–12 years',
    age13: '13 and older',
    detailsTitle: 'Your contact details',
    namePlaceholder: 'Your full name',
    countryPlaceholder: 'Select your country',
    phonePlaceholder: 'Phone number (e.g. +44 7700 900000)',
    sourceTitle: 'How did you find us?',
    srcYT: 'YouTube',
    srcTT: 'TikTok',
    srcWA: 'WhatsApp',
    srcFriend: 'A friend told me',
    srcOther: 'Other',
    messageTitle: "Tell us what's going on",
    messagePlaceholder: 'Describe your situation — what are you struggling with, what help do you need?',
    next: 'Next',
    back: 'Back',
    send: 'Send Message',
    sending: 'Sending...',
    stepOf: (n: number, t: number) => `Step ${n} of ${t}`,
    introGreeting: 'As-salamu alaykum wa rahmatullahi wa barakatuh',
    introWelcome: 'Welcome to Guri Dagan',
    introParentLabel: 'For parents:',
    introParentDesc: 'We give parents lessons on how to deal with their children — based on each child\'s age and personality.',
    introChildLabel: 'For children:',
    introChildPrograms: [
      'Responsibility — taking ownership of their actions',
      'Self-confidence — believing in themselves',
      'Respect — honouring parents and family',
      'Getting along with siblings and others',
    ],
    introClosing: 'Every family is different. Coach Rahma listens first, then builds a plan around you.',
    introStart: 'Get in touch',
    doneTitle: 'Message received!',
    doneText: 'Coach Rahma has received your inquiry and will be in touch with you personally within 24 hours.',
    errorTitle: 'Something went wrong',
    errorText: 'Your message could not be sent. Please try again.',
    tryAgain: 'Try again',
  },
  so: {
    langToggle: 'English',
    subtitle: 'Tababarka Waalidka iyo Caruurta',
    step1Title: 'Cidda u baahan tababarka?',
    whoParent: 'Aniga — waxaan u baahnahay tababarka waalidka',
    whoChildren: 'Ilmahayga / Carruurtayda ayaa u baahan',
    whoBoth: 'Aniga iyo carruurtayda labadaba',
    upsellTitle: 'Ma jeclaan lahayd in carruurtaadana la tababaro?',
    addChildYes: 'Haa — ku dar tababarka caruurta',
    addChildNo: 'Maya — tababarka waalidka kaliya',
    childrenTitle: 'Ku saabsan caruurta',
    howMany: 'Imisa carruur?',
    agesLabel: "Waa maxay da'dooda? (xulo dhammaan)",
    age03: '0–3 sano',
    age47: '4–7 sano',
    age812: '8–12 sano',
    age13: '13 iyo wixii ka weyn',
    detailsTitle: 'Macluumaadkaaga',
    namePlaceholder: 'Magacaaga oo buuxa',
    countryPlaceholder: 'Dooro wadankaaga',
    phonePlaceholder: 'Lambarka taleefanka (tusaale: +44 7700 900000)',
    sourceTitle: 'Sidee noogu heshay?',
    srcYT: 'YouTube',
    srcTT: 'TikTok',
    srcWA: 'WhatsApp',
    srcFriend: 'Saaxiib baa ii sheegay',
    srcOther: 'Kale',
    messageTitle: 'Noo sheeg waxa dhacaya',
    messagePlaceholder: 'Sharax xaaladaada — maxaad ku hiigsanaysaa, maxaad u baahan tahay?',
    next: 'Xiga',
    back: 'Dib',
    send: 'Dir Fariinta',
    sending: 'Waa la diraya...',
    stepOf: (n: number, t: number) => `Tallaabo ${n} / ${t}`,
    introGreeting: 'As-salamu alaykum wa rahmatullahi wa barakatuh',
    introWelcome: 'Soo dhawow Guri Dagan',
    introParentLabel: 'Waalidka:',
    introParentDesc: 'Waalidiinta cashiro waan siina sida ay caruurta ula dhaqmilaahaayeen.',
    introChildLabel: 'Caruurta:',
    introChildPrograms: [
      'Sida ayaga masuuliyad isku saari lahaayeen',
      'Sida naftooda ay ku kalsoonaadi lahaayeen',
      'Sida ay waalidkooda u ixtraami lahaayeen',
      'Sida ay walaalohood uladhaqmilaahaayeen iyo i.w.m',
    ],
    introClosing: 'Qoys walba wuu ka duwan yahay. Coach Rahma marka hore ayay dhageysataa, ka dibna qorshaha kuu samaynaysaa.',
    introStart: 'La xiriir',
    doneTitle: 'Fariinta waa la helay!',
    doneText: 'Coach Rahma waxay heshay su\'aashaada waxayna kula xiriiri doontaa 24 saacadood gudahood.',
    errorTitle: 'Wax khalad ah ayaa dhacay',
    errorText: 'Fariintaada lama dirin. Fadlan isku day mar kale.',
    tryAgain: 'Isku day mar kale',
  },
};

const SOURCE_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  friend: 'A friend told me',
  other: 'Other',
};

function getFlow(form: FormState): Step[] {
  if (form.who === 'parent') {
    return form.addChildCoaching === 'yes'
      ? ['who', 'upsell', 'children', 'details', 'source', 'message']
      : ['who', 'upsell', 'details', 'source', 'message'];
  }
  return ['who', 'children', 'details', 'source', 'message'];
}

export default function ContactForm() {
  const [lang, setLang] = useState<'en' | 'so'>('en');
  const [step, setStep] = useState<Step>('intro');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    who: '',
    addChildCoaching: '',
    childCount: '',
    childAges: [],
    name: '',
    country: '',
    phone: '',
    source: '',
    message: '',
  });

  const t = T[lang];
  const flow = getFlow(form);
  const stepIdx = flow.indexOf(step as Exclude<Step, 'done' | 'error'>);
  const stepNum = stepIdx + 1;
  const stepTotal = flow.length;
  const progress = stepTotal > 0 ? (stepNum / stepTotal) * 100 : 100;

  const canNext = (): boolean => {
    if (step === 'who') return form.who !== '';
    if (step === 'upsell') return form.addChildCoaching !== '';
    if (step === 'children') return form.childCount !== '' && form.childAges.length > 0;
    if (step === 'details') return form.name.trim() !== '' && form.country !== '' && form.phone.trim() !== '';
    if (step === 'source') return form.source !== '';
    if (step === 'message') return form.message.trim().length >= 10;
    return false;
  };

  const goNext = () => {
    const next = flow[stepIdx + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = flow[stepIdx - 1];
    if (prev) setStep(prev);
  };

  const toggleAge = (age: string) => {
    setForm(f => ({
      ...f,
      childAges: f.childAges.includes(age)
        ? f.childAges.filter(a => a !== age)
        : [...f.childAges, age],
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      setStep('done');
    } catch {
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const optionBtn = (selected: boolean, onClick: () => void, label: string) => (
    <button
      key={label}
      onClick={onClick}
      className={`text-left w-full px-4 py-3.5 rounded-xl border-2 font-medium text-sm transition-all ${
        selected
          ? 'border-purple-600 bg-purple-50 text-purple-900'
          : 'border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50/30'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-white flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-2xl font-black text-purple-900 tracking-widest uppercase leading-none">
              Guri Dagan
            </div>
            <div className="text-xs text-purple-400 font-semibold mt-0.5 tracking-wide">
              {t.subtitle}
            </div>
          </div>
          <button
            onClick={() => setLang(l => l === 'en' ? 'so' : 'en')}
            className="text-xs font-semibold text-purple-600 border border-purple-200 rounded-full px-3 py-1.5 hover:bg-purple-50 transition"
          >
            {t.langToggle}
          </button>
        </div>

        {/* Progress bar */}
        {step !== 'intro' && step !== 'done' && step !== 'error' && (
          <div className="mb-5">
            <div className="text-xs text-gray-400 mb-1.5">{t.stepOf(stepNum, stepTotal)}</div>
            <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6">

          {/* INTRO */}
          {step === 'intro' && (
            <div>
              <p className="text-xs text-purple-400 font-semibold tracking-wide mb-1 text-center">{t.introGreeting}</p>
              <h2 className="text-xl font-black text-purple-900 text-center mb-5">{t.introWelcome}</h2>

              <div className="mb-4">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">{t.introParentLabel}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{t.introParentDesc}</p>
              </div>

              <div className="mb-5">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">{t.introChildLabel}</p>
                <ul className="flex flex-col gap-2">
                  {t.introChildPrograms.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-gray-400 italic text-center leading-relaxed mb-5">{t.introClosing}</p>

              <button
                onClick={() => setStep('who')}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition"
              >
                {t.introStart} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* WHO */}
          {step === 'who' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t.step1Title}</h2>
              <div className="flex flex-col gap-3">
                {optionBtn(form.who === 'parent', () => setForm(f => ({ ...f, who: 'parent' })), t.whoParent)}
                {optionBtn(form.who === 'children', () => setForm(f => ({ ...f, who: 'children', addChildCoaching: '' })), t.whoChildren)}
                {optionBtn(form.who === 'both', () => setForm(f => ({ ...f, who: 'both', addChildCoaching: '' })), t.whoBoth)}
              </div>
            </div>
          )}

          {/* UPSELL */}
          {step === 'upsell' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t.upsellTitle}</h2>
              <div className="flex flex-col gap-3">
                {optionBtn(form.addChildCoaching === 'yes', () => setForm(f => ({ ...f, addChildCoaching: 'yes' })), t.addChildYes)}
                {optionBtn(form.addChildCoaching === 'no', () => setForm(f => ({ ...f, addChildCoaching: 'no', childCount: '', childAges: [] })), t.addChildNo)}
              </div>
            </div>
          )}

          {/* CHILDREN */}
          {step === 'children' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t.childrenTitle}</h2>
              <p className="text-sm font-semibold text-gray-700 mb-2">{t.howMany}</p>
              <div className="grid grid-cols-4 gap-2 mb-5">
                {['1', '2', '3', '4+'].map(n => (
                  <button
                    key={n}
                    onClick={() => setForm(f => ({ ...f, childCount: n }))}
                    className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                      form.childCount === n
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-gray-200 text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{t.agesLabel}</p>
              <div className="flex flex-col gap-2">
                {[
                  { value: '0-3', label: t.age03 },
                  { value: '4-7', label: t.age47 },
                  { value: '8-12', label: t.age812 },
                  { value: '13+', label: t.age13 },
                ].map(({ value, label }) => {
                  const sel = form.childAges.includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleAge(value)}
                      className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                        sel ? 'border-purple-600 bg-purple-50 text-purple-900' : 'border-gray-200 text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        sel ? 'border-purple-600 bg-purple-600' : 'border-gray-300'
                      }`}>
                        {sel && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DETAILS */}
          {step === 'details' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t.detailsTitle}</h2>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder={t.namePlaceholder}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:border-purple-500 focus:outline-none transition bg-white"
                />
                <select
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 text-sm focus:border-purple-500 focus:outline-none transition bg-white"
                >
                  <option value="">{t.countryPlaceholder}</option>
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder={t.phonePlaceholder}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:border-purple-500 focus:outline-none transition bg-white"
                />
              </div>
            </div>
          )}

          {/* SOURCE */}
          {step === 'source' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t.sourceTitle}</h2>
              <div className="flex flex-col gap-3">
                {[
                  { value: 'youtube', label: t.srcYT },
                  { value: 'tiktok', label: t.srcTT },
                  { value: 'whatsapp', label: t.srcWA },
                  { value: 'friend', label: t.srcFriend },
                  { value: 'other', label: t.srcOther },
                ].map(({ value, label }) =>
                  optionBtn(form.source === value, () => setForm(f => ({ ...f, source: value })), label)
                )}
              </div>
            </div>
          )}

          {/* MESSAGE */}
          {step === 'message' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t.messageTitle}</h2>
              <textarea
                placeholder={t.messagePlaceholder}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={6}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:border-purple-500 focus:outline-none transition resize-none bg-white"
              />
            </div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{t.doneTitle}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{t.doneText}</p>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{t.errorTitle}</h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">{t.errorText}</p>
              <button
                onClick={() => setStep('message')}
                className="px-6 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition"
              >
                {t.tryAgain}
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        {step !== 'intro' && step !== 'done' && step !== 'error' && (
          <div className="mt-4 flex gap-3">
            {stepIdx > 0 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                {t.back}
              </button>
            )}
            {step !== 'message' ? (
              <button
                onClick={goNext}
                disabled={!canNext()}
                className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {t.next} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canNext() || submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {submitting ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t.sending}</>
                ) : (
                  <><Send className="w-4 h-4" />{t.send}</>
                )}
              </button>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">Guri Dagan</p>
      </div>
    </div>
  );
}
