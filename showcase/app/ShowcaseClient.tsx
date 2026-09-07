'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Theme = 'light' | 'dark';
type OutputKey = 'site' | 'saas' | 'app' | 'slides' | 'document' | 'image' | 'ad';
type RegionKey = 'sa' | 'ae';
type Pattern = { id: string; title: string; summary: string; example: string };
type PatternGroup = { id: string; label: string; description: string; patterns: Pattern[] };

const outputs: Record<OutputKey, { label: string; title: string; proof: string; adapts: string; sample: string }> = {
  site: {
    label: 'موقع',
    title: 'موقع عربي سهل القراءة والتصفح',
    proof: 'يعرف الزائر أين هو، وماذا يقرأ، وأين يذهب بعد ذلك.',
    adapts: 'ألوان موقعك وخطه وطريقته في الكلام.',
    sample: 'بعد قراءة مقال عن السفر، يظهر المقال التالي من السلسلة نفسها.',
  },
  saas: {
    label: 'نظام',
    title: 'نظام يفهم المهمة ولا يضيّع خطواتك',
    proof: 'يوضح ما تم حفظه، ويحفظ بحثك إذا فتحت صفحة ثم رجعت.',
    adapts: 'طريقة عمل الفريق، والصلاحيات، وكمية المعلومات.',
    sample: 'تبحث عن فاتورة غير مدفوعة، تفتحها، ثم ترجع إلى النتائج نفسها.',
  },
  app: {
    label: 'تطبيق',
    title: 'تطبيق عربي مريح على كل جهاز',
    proof: 'الأزرار واضحة، والاتجاه صحيح، والنص بعيد عن الحواف.',
    adapts: 'طريقة استخدام الجوال أو الجهاز اللوحي أو الكمبيوتر.',
    sample: 'اختيار بسيط يظهر من أسفل الجوال، وفي نافذة صغيرة على الكمبيوتر.',
  },
  slides: {
    label: 'عرض',
    title: 'عرض تقديمي يُفهم من أول نظرة',
    proof: 'كل شريحة تحمل فكرة واحدة، والنص واضح حتى من مسافة.',
    adapts: 'هوية الجهة، ومقاس الشاشة، ومن سيشاهد العرض.',
    sample: 'شريحة تقارن خيارين، وتضع الفرق المهم في سطر واضح.',
  },
  document: {
    label: 'PDF وملف',
    title: 'ملف عربي يبقى مرتبًا بعد الحفظ والطباعة',
    proof: 'العناوين والجداول والروابط تبقى سليمة عند تحويل الملف إلى PDF.',
    adapts: 'قالب الجهة، ومقاس الورق، وطريقة الطباعة.',
    sample: 'رابط إنجليزي داخل فقرة عربية يبقى مقروءًا وفي اتجاهه الصحيح.',
  },
  image: {
    label: 'صورة',
    title: 'صورة تقول فكرتها بوضوح',
    proof: 'العنوان مقروء، والعناصر متوازنة، ولا يلامس النص الحواف.',
    adapts: 'مقاس الصورة، وألوان الهوية، ومكان نشرها.',
    sample: 'منشور لمقهى يوضح العرض والسعر ووقت انتهائه من أول نظرة.',
  },
  ad: {
    label: 'إعلان',
    title: 'إعلان يعرف المشاهد ماذا يفعل',
    proof: 'رسالة قصيرة، وصورة مناسبة، وخطوة تالية واضحة.',
    adapts: 'الجمهور، والمنصة، ومقاس الإعلان، وطريقة التواصل.',
    sample: 'إعلان دورة يوضح موضوعها وموعدها ورابط التسجيل من دون زحام.',
  },
};

const outputOrder = Object.keys(outputs) as OutputKey[];

const patternGroups: PatternGroup[] = [
  {
    id: 'adopt',
    label: 'تجهيز العمل',
    description: 'خطوات بسيطة تساعدك على التأكد من النتيجة قبل تسليمها.',
    patterns: [
      { id: 'conformance', title: 'قائمة فحص', summary: 'توضح ما هو سليم، وما يحتاج إلى تعديل، وما لا ينطبق على العمل.', example: 'في إعلان عربي: العنوان واضح، والشعار غير مقصوص، ورقم التواصل مقروء.' },
      { id: 'rtl-audit', title: 'فحص اتجاه العربية', summary: 'يتأكد أن العربية تبدأ من اليمين، وأن الأرقام والروابط لا تنقلب.', example: 'في ملف PDF يبقى رقم الهاتف من اليسار من دون أن يقلب بقية السطر.' },
      { id: 'component', title: 'شرح كل عنصر', summary: 'يوضح وظيفة كل زر أو حقل، وما الذي يظهر عند النجاح أو التعذر.', example: 'زر التحميل يوضح أن الملف يُجهّز، ثم يخبرك عندما يصبح جاهزًا.' },
      { id: 'adoption', title: 'تطبيق بالتدريج', summary: 'ابدأ بجزء واحد، تأكد منه، ثم طبّق الأسلوب على بقية العمل.', example: 'حسّن صفحة واحدة من الكتيب، ثم طبّقها على باقي الصفحات.' },
      { id: 'index', title: 'دليل سريع', summary: 'يوصلك إلى القاعدة التي تحتاجها من دون قراءة كل شيء.', example: 'تحتاج تاريخًا هجريًا؟ تذهب مباشرة إلى قسم التاريخ.' },
      { id: 'tokens', title: 'أسلوب قابل للنقل', summary: 'يحفظ ألوان مشروعك وخطه ومسافاته عند الانتقال بين الأدوات.', example: 'لون زر الحفظ يبقى من هوية مشروعك في الموقع والتطبيق.' },
      { id: 'stability', title: 'فحص قبل التسليم', summary: 'لا نعتمد النتيجة حتى تكون واضحة وسهلة وتعمل كما ينبغي.', example: 'قبل تسليم العرض، نختبره على شاشة كبيرة ومن هاتف صغير.' },
    ],
  },
  {
    id: 'content',
    label: 'نص ومكان',
    description: 'تجعل الكلام والتاريخ والأرقام مناسبة للقارئ وبلده.',
    patterns: [
      { id: 'article', title: 'صفحة مقال واضحة', summary: 'ترتب العنوان والكاتب والتاريخ والمصادر وما تقرؤه بعد ذلك.', example: 'بعد وصفة الخبز تظهر الوصفة التالية من السلسلة، لا موضوع عشوائي.' },
      { id: 'locale', title: 'البلد والتاريخ', summary: 'تضبط الأرقام والتقويم وبداية الأسبوع والعملة حسب البلد.', example: 'في السعودية يبدأ الأسبوع يوم الأحد، وتظهر المواعيد بتوقيت الرياض.' },
      { id: 'adapter', title: 'شكل مناسب لكل مخرج', summary: 'تقدم الفكرة نفسها بالطريقة الأنسب للموقع أو الجوال أو الملف.', example: 'التنبيه نفسه يظهر كرسالة قصيرة في الجوال وملاحظة واضحة في PDF.' },
    ],
  },
  {
    id: 'journeys',
    label: 'تجربة الاستخدام',
    description: 'أفكار تمنع الضياع، وتحفظ مكان المستخدم، وتوضح ما يحدث.',
    patterns: [
      { id: 'lifecycle', title: 'قبل وأثناء وبعد', summary: 'تتغير المعلومات المعروضة حسب وقت الحدث.', example: 'قبل الموعد يظهر التذكير، وأثناءه زر الانضمام، وبعده الملخص.' },
      { id: 'hub', title: 'صفحة تجمع كل شيء', summary: 'تضع معلومات الموضوع وأفعاله المهمة في مكان واحد.', example: 'صفحة طلب واحدة تجمع حالته وفاتورته ورسائل التحديث.' },
      { id: 'typed-search', title: 'نتائج مرتبة', summary: 'تقسم نتائج البحث إلى مجموعات يسهل فهمها.', example: 'بحث «الرياض» يعرض المدن والملفات والمقالات كلًّا في قسمه.' },
      { id: 'return', title: 'العودة للمكان نفسه', summary: 'تحفظ البحث والاختيارات ومكان التمرير عند الرجوع.', example: 'تفتح صورة من المعرض، ثم تعود إلى الصف نفسه بدل البداية.' },
      { id: 'mode', title: 'وضع مناسب للموقف', summary: 'تُظهر ما يحتاجه المستخدم الآن، وتخفي ما يشتته.', example: 'أثناء العرض تكبر الشرائح وتختفي أدوات التعديل.' },
      { id: 'gate', title: 'من يستطيع فتحه؟', summary: 'توضح سبب منع الفتح وما الذي يمكن فعله بعد ذلك.', example: 'إذا كان الملف خاصًا، تظهر طريقة طلب الإذن بدل صفحة مغلقة.' },
      { id: 'live', title: 'هل المعلومة حديثة؟', summary: 'توضح هل الرقم مباشر أم متأخر أم تقريبي.', example: 'السعر آخر تحديث له قبل دقيقتين، فيظهر ذلك بجانبه.' },
      { id: 'handoff', title: 'أكمل على جهاز آخر', summary: 'تنقل المهمة إلى جهاز أنسب من دون أن تبدأ من جديد.', example: 'تبدأ تعبئة الطلب من الجوال، ثم تكمله على الكمبيوتر.' },
      { id: 'concealed', title: 'إخفاء معلومة خاصة', summary: 'تخفي رقمًا أو معلومة حساسة، وتكشفها فقط عندما تختار.', example: 'إخفاء الرصيد أثناء مشاركة الشاشة.' },
      { id: 'series', title: 'تابع من حيث توقفت', summary: 'تحفظ تقدمك وتعرض الخطوة التالية بوضوح.', example: 'بعد الدرس الثالث يظهر زر واضح للانتقال إلى الدرس الرابع.' },
    ],
  },
];

const arabicNames = ['أحمد', 'إبراهيم', 'آمنة', 'يحيى', 'فاطمة'];
const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
const plural = new Intl.PluralRules('ar');
const numberArabic = new Intl.NumberFormat('ar-SA-u-nu-arab');

function normalizeArabicSearch(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim()
    .toLocaleLowerCase('ar');
}

function taskLabel(count: number) {
  const value = numberArabic.format(count);
  const forms: Record<Intl.LDMLPluralRule, string> = {
    zero: 'لا توجد مهام',
    one: 'مهمة واحدة',
    two: 'مهمتان',
    few: `${value} مهام`,
    many: `${value} مهمة`,
    other: `${value} مهمة`,
  };
  return forms[plural.select(count)];
}

function DhadMark({ theme }: { theme: Theme }) {
  return (
    <img
      className="brand-mark"
      src={theme === 'dark' ? '/brand-mark-dark.png' : '/brand-mark.png'}
      alt=""
      aria-hidden="true"
    />
  );
}

export default function ShowcaseClient() {
  const [theme, setTheme] = useState<Theme>('light');
  const [output, setOutput] = useState<OutputKey>('site');
  const [groupId, setGroupId] = useState(patternGroups[0].id);
  const [patternId, setPatternId] = useState(patternGroups[0].patterns[0].id);
  const [count, setCount] = useState(11);
  const [query, setQuery] = useState('احمد');
  const [region, setRegion] = useState<RegionKey>('sa');
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [toast, setToast] = useState('');
  const outputRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const groupRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const regionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const saved = window.localStorage.getItem('dhad-showcase-theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const frame = window.requestAnimationFrame(() => {
      setTheme(saved === 'dark' || saved === 'light' ? saved : preferred);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('dhad-showcase-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const currentOutput = outputs[output];
  const currentGroup = patternGroups.find((item) => item.id === groupId) ?? patternGroups[0];
  const currentPattern = currentGroup.patterns.find((item) => item.id === patternId) ?? currentGroup.patterns[0];
  const matches = useMemo(() => {
    const normalized = normalizeArabicSearch(query);
    return [...arabicNames]
      .filter((name) => normalizeArabicSearch(name).includes(normalized))
      .sort(collator.compare);
  }, [query]);
  const date = new Date('2026-09-06T09:00:00+03:00');
  const regionData = region === 'sa'
    ? { label: 'السعودية', week: 'الأحد', weekend: 'الجمعة والسبت', locale: 'ar-SA-u-ca-islamic-umalqura' }
    : { label: 'الإمارات', week: 'الاثنين', weekend: 'السبت والأحد', locale: 'ar-AE-u-nu-arab' };
  const formattedDate = new Intl.DateTimeFormat(regionData.locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);

  function moveOutputTab(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const rtlStep = event.key === 'ArrowRight' ? -1 : 1;
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? outputOrder.length - 1
        : (index + rtlStep + outputOrder.length) % outputOrder.length;
    const next = outputOrder[nextIndex];
    setOutput(next);
    outputRefs.current[next]?.focus();
  }

  function chooseGroup(nextId: string) {
    const next = patternGroups.find((item) => item.id === nextId) ?? patternGroups[0];
    setGroupId(next.id);
    setPatternId(next.patterns[0].id);
  }

  function moveGroupTab(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const rtlStep = event.key === 'ArrowRight' ? -1 : 1;
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? patternGroups.length - 1
        : (index + rtlStep + patternGroups.length) % patternGroups.length;
    const next = patternGroups[nextIndex];
    chooseGroup(next.id);
    groupRefs.current[next.id]?.focus();
  }

  function moveRegion(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const order: RegionKey[] = ['sa', 'ae'];
    const rtlStep = event.key === 'ArrowRight' ? -1 : 1;
    const next = order[(index + rtlStep + order.length) % order.length];
    setRegion(next);
    regionRefs.current[next]?.focus();
  }

  async function copyInstall() {
    const command = '$skill-installer ثبّت dhad من https://github.com/iiAMMAR11/Dhad';
    try {
      await navigator.clipboard.writeText(command);
      setToast('نُسخ أمر التثبيت');
    } catch {
      setToast('تعذّر النسخ. انسخ الأمر يدويًا');
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">تخطَّ إلى المحتوى</a>
      <header className="site-header">
        <a className="brand" href="#main" aria-label="ضاد، البداية"><DhadMark theme={theme === 'light' ? 'dark' : 'light'} /></a>
        <nav className="main-nav" aria-label="أقسام الموقع">
          <a href="#lab">جرّب</a>
          <a href="#patterns">الأفكار</a>
          <a href="#install">التحميل</a>
        </nav>
        <div className="header-actions">
          <a href="https://github.com/iiAMMAR11/Dhad" target="_blank" rel="noreferrer">GitHub</a>
          <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? 'مظهر داكن' : 'مظهر فاتح'}
          </button>
        </div>
      </header>

      <main id="main">
        <section className="opening" aria-labelledby="opening-title">
          <div className="opening-copy">
            <p>مهارة تجعل أي عمل أوضح وأسهل</p>
            <p>تهتم بالعربية وتحافظ على هوية مشروعك.</p>
          </div>
          <h1 id="opening-title" className={`wordmark wordmark--${output}`} aria-label="ضاد">
            <span className="wordmark-mark" role="img" aria-hidden="true" />
          </h1>
          <div className="output-lab">
            <div className="output-tabs" role="tablist" aria-label="اختر نوع العمل">
              {outputOrder.map((key, index) => (
                <button
                  key={key}
                  className={`output-tab output-tab--${key}`}
                  ref={(node) => { outputRefs.current[key] = node; }}
                  type="button"
                  role="tab"
                  id={`tab-${key}`}
                  aria-selected={output === key}
                  aria-controls={`panel-${key}`}
                  tabIndex={output === key ? 0 : -1}
                  onKeyDown={(event) => moveOutputTab(event, index)}
                  onClick={() => setOutput(key)}
                >{outputs[key].label}</button>
              ))}
            </div>
            <section className="output-panel" id={`panel-${output}`} role="tabpanel" aria-labelledby={`tab-${output}`} tabIndex={0}>
              <div><span className="section-number" aria-hidden="true">01</span><h2>{currentOutput.title}</h2></div>
              <dl>
                <div><dt>النتيجة</dt><dd>{currentOutput.proof}</dd></div>
                <div><dt>يحافظ على</dt><dd>{currentOutput.adapts}</dd></div>
                <div><dt>مثال</dt><dd>{currentOutput.sample}</dd></div>
              </dl>
            </section>
          </div>
        </section>

        <section className="principle" aria-labelledby="principle-title">
          <span className="section-number" aria-hidden="true">02</span>
          <h2 id="principle-title">ضاد يحسّن عملك، ولا يغيّر هويته.</h2>
          <div className="principle-ledger">
            <article><h3>ما يحسّنه ضاد</h3><p>وضوح الفكرة، وسهولة الاستخدام، وصحة العربية، وجودة النتيجة.</p></article>
            <article><h3>ما يبقى لك</h3><p>الهوية، والخط، والألوان، وطريقة العرض، وطبيعة مشروعك.</p></article>
          </div>
          <p className="principle-note">نبدأ بما تريد من الناس أن يفهموه أو يفعلوه، ثم نضيف ما يحتاجه العمل فقط.</p>
          <ul className="semantic-key" aria-label="معاني الألوان في ضاد">
            <li className="semantic-key__action"><strong>افعل</strong><span>زر أو خطوة</span></li>
            <li className="semantic-key__success"><strong>تم</strong><span>نجاح واكتمال</span></li>
            <li className="semantic-key__warning"><strong>انتبه</strong><span>تنبيه يحتاج نظرًا</span></li>
            <li className="semantic-key__danger"><strong>مشكلة</strong><span>خطأ يحتاج إصلاحًا</span></li>
            <li className="semantic-key__assistive"><strong>مساعدة</strong><span>اقتراح أو دعم</span></li>
          </ul>
        </section>

        <section className="arabic-lab" id="lab" aria-labelledby="lab-title">
          <header className="section-intro">
            <span className="section-number" aria-hidden="true">03</span>
            <h2 id="lab-title">جرّب العربية بنفسك</h2>
            <p>غيّر الرقم أو الاسم أو البلد، وشاهد الفرق مباشرة.</p>
          </header>

          <div className="lab-grid">
            <section className="lab-cell plural-cell" aria-labelledby="plural-title">
              <div className="lab-cell__head"><span>العدد</span><h3 id="plural-title">الكلمة تتغيّر مع الرقم</h3></div>
              <output htmlFor="task-count" aria-live="polite">{taskLabel(count)}</output>
              <label htmlFor="task-count">العدد: {numberArabic.format(count)}</label>
              <input id="task-count" type="range" min="0" max="103" value={count} onChange={(event) => setCount(Number(event.target.value))} />
              <div className="number-choices" aria-label="أمثلة سريعة">
                {[0, 1, 2, 5, 11, 100, 103].map((value) => (
                  <button key={value} type="button" aria-pressed={count === value} onClick={() => setCount(value)}>{numberArabic.format(value)}</button>
                ))}
              </div>
            </section>

            <section className="lab-cell search-cell" aria-labelledby="search-title">
              <div className="lab-cell__head"><span>البحث</span><h3 id="search-title">يعمل حتى لو نسيت الهمزة</h3></div>
              <label htmlFor="arabic-search">ابحث عن اسم</label>
              <input id="arabic-search" value={query} onChange={(event) => setQuery(event.target.value)} />
              <p className="search-result" aria-live="polite"><span>النتيجة</span><strong>{matches.length ? matches.join('، ') : 'لا توجد نتيجة'}</strong></p>
              <p className="micro-note">اكتب «احمد» وسيجد «أحمد»، مع بقاء الاسم الأصلي كما هو.</p>
              <p className="diacritic-sample">مُحَمَّدٌ يَقْرَأُ الْعَرَبِيَّةَ بِوُضُوحٍ.</p>
            </section>

            <section className="lab-cell region-cell" aria-labelledby="region-title">
              <div className="lab-cell__head"><span>البلد</span><h3 id="region-title">التاريخ والأسبوع حسب مكانك</h3></div>
              <div className="region-switch" role="radiogroup" aria-label="اختر المنطقة">
                <button ref={(node) => { regionRefs.current.sa = node; }} type="button" role="radio" aria-checked={region === 'sa'} tabIndex={region === 'sa' ? 0 : -1} onKeyDown={(event) => moveRegion(event, 0)} onClick={() => setRegion('sa')}>السعودية</button>
                <button ref={(node) => { regionRefs.current.ae = node; }} type="button" role="radio" aria-checked={region === 'ae'} tabIndex={region === 'ae' ? 0 : -1} onKeyDown={(event) => moveRegion(event, 1)} onClick={() => setRegion('ae')}>الإمارات</button>
              </div>
              <dl>
                <div><dt>التاريخ</dt><dd>{formattedDate}</dd></div>
                <div><dt>بداية الأسبوع</dt><dd>{regionData.week}</dd></div>
                <div><dt>العطلة</dt><dd>{regionData.weekend}</dd></div>
              </dl>
            </section>

            <section className="lab-cell conceal-cell" aria-labelledby="conceal-title">
              <div className="lab-cell__head"><span>خصوصية</span><h3 id="conceal-title">قيمة محجوبة عند الحاجة</h3></div>
              <p className="balance" aria-live="polite" dir="ltr">{balanceVisible ? 'SAR 24,680.00' : '••••••••'}</p>
              <button type="button" aria-pressed={balanceVisible} onClick={() => setBalanceVisible((value) => !value)}>
                {balanceVisible ? 'إخفاء الرصيد' : 'إظهار الرصيد'}
              </button>
              <p className="micro-note">مفيد عند مشاركة الشاشة، ويظل القرار بيد المستخدم.</p>
            </section>
          </div>
        </section>

        <section className="pattern-browser" id="patterns" aria-labelledby="patterns-title">
          <header className="section-intro">
            <span className="section-number" aria-hidden="true">04</span>
            <h2 id="patterns-title">اختر ما يحتاجه عملك</h2>
            <p>هذه أفكار عملية. استخدم المناسب منها واترك الباقي.</p>
          </header>

          <div className="pattern-groups" role="tablist" aria-label="مجموعات الأفكار">
            {patternGroups.map((group, index) => (
              <button
                key={group.id}
                className={`pattern-group pattern-group--${group.id}`}
                ref={(node) => { groupRefs.current[group.id] = node; }}
                type="button"
                role="tab"
                id={`pattern-tab-${group.id}`}
                aria-selected={currentGroup.id === group.id}
                aria-controls="pattern-panel"
                tabIndex={currentGroup.id === group.id ? 0 : -1}
                onKeyDown={(event) => moveGroupTab(event, index)}
                onClick={() => chooseGroup(group.id)}
              >
                <strong>{group.label}</strong>
                <span>{group.patterns.length} أفكار</span>
              </button>
            ))}
          </div>

          <div className={`pattern-stage pattern-stage--${currentGroup.id}`} id="pattern-panel" role="tabpanel" aria-labelledby={`pattern-tab-${currentGroup.id}`} tabIndex={0}>
            <div className="pattern-index" aria-label={`أفكار ${currentGroup.label}`}>
              <p>{currentGroup.description}</p>
              <ol>
                {currentGroup.patterns.map((pattern, index) => (
                  <li key={pattern.id}>
                    <button type="button" aria-pressed={currentPattern.id === pattern.id} onClick={() => setPatternId(pattern.id)}>
                      <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <strong>{pattern.title}</strong>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <article className="pattern-detail" aria-live="polite">
              <p className="pattern-detail__group">{currentGroup.label}</p>
              <h3>{currentPattern.title}</h3>
              <p>{currentPattern.summary}</p>
              <div><span>مثال</span><strong>{currentPattern.example}</strong></div>
            </article>
          </div>
        </section>

        <section className="quality" aria-labelledby="quality-title">
          <div>
            <span className="section-number" aria-hidden="true">05</span>
            <h2 id="quality-title">قبل التسليم، نتأكد من خمس أشياء.</h2>
          </div>
          <ol>
            <li><span>1</span><strong>الفكرة</strong><p>تُفهم بسرعة ومن دون شرح طويل.</p></li>
            <li><span>2</span><strong>العربية</strong><p>اتجاه صحيح، وتشكيل لا يُقص، وأرقام واضحة.</p></li>
            <li><span>3</span><strong>الاستخدام</strong><p>الأزرار والروابط سهلة باللمس ولوحة المفاتيح.</p></li>
            <li><span>4</span><strong>كل الاحتمالات</strong><p>نعرف ما يظهر أثناء الانتظار أو عند حدوث مشكلة.</p></li>
            <li><span>5</span><strong>النتيجة</strong><p>نجرب الموقع أو التطبيق أو PDF أو الصورة فعليًا.</p></li>
          </ol>
        </section>

        <section className="install" id="install" aria-labelledby="install-title">
          <header>
            <span className="section-number" aria-hidden="true">06</span>
            <h2 id="install-title">حمّل ضاد</h2>
            <p>اختر الملف المناسب للأداة التي تستخدمها.</p>
          </header>
          <div className="install-row">
            <div><strong><bdi dir="ltr">ChatGPT + Codex</bdi></strong><code dir="ltr">Dhad-openai-plugin.zip</code></div>
            <div><strong><bdi dir="ltr">Claude Chat + Claude Code</bdi></strong><code dir="ltr">Dhad-agent-skill.zip</code></div>
          </div>
          <div className="install-command">
            <code dir="rtl"><bdi dir="ltr">$skill-installer</bdi> ثبّت <bdi dir="ltr">dhad</bdi> من <bdi dir="ltr">https://github.com/iiAMMAR11/Dhad</bdi></code>
            <button type="button" onClick={copyInstall}>نسخ أمر التثبيت</button>
          </div>
          <a className="repository-link" href="https://github.com/iiAMMAR11/Dhad" target="_blank" rel="noreferrer">افتح المستودع على GitHub</a>
        </section>
      </main>

      <footer className="site-footer">
        <section aria-labelledby="owner-title">
          <p>صاحبها ومطوّرها</p>
          <h2 id="owner-title">عمَّار</h2>
          <p>عمل مستقل طوّره عمَّار بعد أسابيع من الدراسة والتجربة والتحسين.</p>
        </section>
        <section aria-labelledby="thanks-title">
          <h2 id="thanks-title">شكر</h2>
          <p>شكرًا لمرصاد، وثمانية، ورياضة ثمانية، وللمهارات والمنتجات العربية التي وسّعت الدراسة. هذا تقدير فقط؛ ضاد عمل مستقل، وليس نسخة من هذه الأعمال ولا مشروعًا مشتركًا معها.</p>
        </section>
        <nav aria-label="روابط عمّار وضاد">
          <a href="https://github.com/iiAMMAR11" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://x.com/iiAMMAR11" target="_blank" rel="noreferrer">X</a>
          <a href="mailto:Hello@iiammar.com">البريد</a>
          <a href="https://iiammar.com" target="_blank" rel="noreferrer">iiammar.com</a>
        </nav>
      </footer>

      {toast && <div className={`toast ${toast.startsWith('تعذّر') ? 'toast--danger' : 'toast--success'}`} role="status" aria-live="polite">{toast}<button type="button" onClick={() => setToast('')}>إغلاق</button></div>}
    </>
  );
}
