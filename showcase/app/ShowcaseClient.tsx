'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Theme = 'light' | 'dark';
type OutputKey = 'site' | 'saas' | 'app' | 'slides' | 'document';
type RegionKey = 'sa' | 'ae';
type Pattern = { id: string; title: string; summary: string; example: string };
type PatternGroup = { id: string; label: string; description: string; patterns: Pattern[] };

const outputs: Record<OutputKey, { label: string; title: string; proof: string; adapts: string; sample: string }> = {
  site: {
    label: 'موقع',
    title: 'قراءة واضحة ومسار لا يضيّع الزائر',
    proof: 'بنية دلالية، تنقّل مفهوم، محتوى عربي مريح، ورابط ثابت لكل صفحة مهمة.',
    adapts: 'هوية الموقع، صوته، خطه، ألوانه، ونظام مكوّناته.',
    sample: 'مقال يربط الكاتب والسلسلة والمصادر والمحتوى التالي بدل اقتراحات عشوائية.',
  },
  saas: {
    label: 'SaaS',
    title: 'مهمة مباشرة وحالات لا تخفي ما يجري',
    proof: 'بحث مصنّف، عودة تحفظ السياق، صلاحيات مفهومة، وحفظ وفشل قابلان للتعافي.',
    adapts: 'كثافة البيانات، نموذج المجال، صلاحيات الفريق، وتدفّق المنتج.',
    sample: 'يفتح المستخدم فاتورة من نتائج مفلترة، ثم يعود إلى المرشح والموضع نفسيهما.',
  },
  app: {
    label: 'تطبيق',
    title: 'سلوك عربي يحترم عرف الجهاز',
    proof: 'RTL حقيقي، مناطق آمنة، لمس مريح، خطوط ديناميكية، وتسليم بين الأجهزة عند الحاجة.',
    adapts: 'مكوّنات iOS أو Android والتنقّل والحركة الأصلية لكل منصة.',
    sample: 'قرار قصير يظهر كلوحة سفلية على الهاتف وكحوار على سطح المكتب.',
  },
  slides: {
    label: 'عرض',
    title: 'فكرة واحدة في كل شريحة',
    proof: 'اتجاه صحيح، عناوين قصيرة، دليل بصري مقروء، وأرقام لا تنقلب داخل العربية.',
    adapts: 'هوية الجهة، نسبة الشرائح، الجمهور، ومسافة المشاهدة.',
    sample: 'شريحة مقارنة تحافظ على محاذاة العناوين والأرقام والخلاصة رغم اختلاف طول النص.',
  },
  document: {
    label: 'مستند',
    title: 'عربية سليمة من المصدر إلى PDF',
    proof: 'أنماط عناوين حقيقية، جداول مستقرة، روابط معزولة، وتشكيل لا يتكسّر عند التصدير.',
    adapts: 'قالب المؤسسة، نظام المراجع، مقاس الصفحة، ومحرك التصدير.',
    sample: 'مرجع لاتيني يبقى LTR داخل فقرة عربية من دون قلب السطر أو فصل الحروف.',
  },
};

const outputOrder = Object.keys(outputs) as OutputKey[];

const patternGroups: PatternGroup[] = [
  {
    id: 'adopt',
    label: 'اعتماد',
    description: 'تحوّل الجودة من رأي إلى نتيجة قابلة للفحص.',
    patterns: [
      { id: 'conformance', title: 'حزمة المطابقة', summary: 'نتيجة واضحة لكل بند: نجح، يحتاج إصلاحًا، أو غير منطبق.', example: 'RTL نجح 14 من 16. بقي اتجاه التقدم ورسالة الخطأ.' },
      { id: 'rtl-audit', title: 'مدقّق RTL', summary: 'يرصد الاتجاه الفيزيائي والجزر المختلطة ومخاطر القص قبل المراجعة البصرية.', example: 'يستبدل margin-left بدور منطقي حين يكون المعنى اتجاهيًا.' },
      { id: 'component', title: 'دليل المكوّن', summary: 'الغرض والبنية والحالات والإدخال والخرج والوصول في عقد قصير.', example: 'البحث: اسم ظاهر، مسح، تحميل، لا نتائج، خطأ، ولوحة مفاتيح.' },
      { id: 'adoption', title: 'مسار التبنّي', summary: 'تدقيق ثم شاشة ممثلة ثم تعميم ثم بوابة جودة.', example: 'ابدأ بنتائج البحث قبل تغيير لوحة SaaS كلها.' },
      { id: 'index', title: 'فهرس ضاد', summary: 'الوصول للقواعد بحسب المهمة، لا بحسب أسماء الملفات.', example: 'أرقام وتواريخ تفتح قواعد المنطقة فورًا.' },
      { id: 'tokens', title: 'توكنز قابلة للنقل', summary: 'أدوار DTCG مستقرة تتحول إلى نظام المنصة من دون فرض لوحة.', example: 'selection.background يبقى اختيارًا في CSS وThemeData.' },
      { id: 'stability', title: 'بوابة الاستقرار', summary: 'لا يصبح الأصل مستقرًا قبل اكتمال الوصول والحالات والاختبار.', example: 'مكوّن بلا تنقل بلوحة المفاتيح يبقى تجريبيًا.' },
    ],
  },
  {
    id: 'content',
    label: 'محتوى ومنطقة',
    description: 'تجعل النص والزمن والسلوك جزءًا من التصميم.',
    patterns: [
      { id: 'article', title: 'وصفة المقال', summary: 'تربط الكاتب والسلسلة والتاريخ والمصادر والمحتوى التالي.', example: 'بعد المقال يظهر التالي من السلسلة، لا بطاقة عشوائية.' },
      { id: 'locale', title: 'بيانات المنطقة', summary: 'ملف واحد للأرقام والتقويم والأسبوع والعطلة والعملة والمنطقة الزمنية.', example: 'السعودية: الأحد بداية الأسبوع والجمعة والسبت عطلة.' },
      { id: 'adapter', title: 'محوّلات سلوكية', summary: 'المعنى ثابت، لكن المكوّن يتبع عرف المخرج.', example: 'قرار واحد يصبح sheet على الهاتف وdialog على سطح المكتب.' },
    ],
  },
  {
    id: 'journeys',
    label: 'كيانات ورحلات',
    description: 'أنماط تربط الحالة والسياق والثقة عبر المنتج.',
    patterns: [
      { id: 'lifecycle', title: 'دورة حياة الكيان', summary: 'واجهة مختلفة قبل الحدث وأثناءه وبعده.', example: 'موعد قادم يعرض التذكير، والجاري الحالة، والمنتهي السجل.' },
      { id: 'hub', title: 'مركز الكيان', summary: 'عنوان ثابت يجمع الهوية والحالة والعلاقات والأفعال.', example: 'صفحة عميل واحدة تصل إليها من البحث والفاتورة والتنبيه.' },
      { id: 'typed-search', title: 'البحث المصنّف', summary: 'نتائج مفصولة حسب النوع عندما تختلف نية المستخدم.', example: 'الهلال يظهر تحت عملاء ومشاريع وملفات ومقالات.' },
      { id: 'return', title: 'حفظ سياق العودة', summary: 'الاستعلام والمرشح والموضع تبقى بعد فتح التفاصيل.', example: 'العودة إلى غير مدفوع والربع الثالث في الموضع نفسه.' },
      { id: 'mode', title: 'وضع التجربة', summary: 'العرض يتغير لحاجة حقيقية من دون نسخة منفصلة للمنتج.', example: 'وضع الاجتماع يكبّر المحتوى ويخفي أدوات التحرير.' },
      { id: 'gate', title: 'بوابة الإتاحة', summary: 'تفحص المنطقة والاشتراك والجهاز والصلاحية قبل الفعل.', example: 'اطلب صلاحية المدير ثم عد إلى التقرير نفسه.' },
      { id: 'live', title: 'ثقة البيانات الحية', summary: 'تفرق بين مباشر ومتأخر وتقديري ومتوقف.', example: 'آخر تحديث 10:42، متأخر دقيقتين.' },
      { id: 'handoff', title: 'التسليم بين الأجهزة', summary: 'تنقل المهمة إلى جهاز أنسب مع حفظ الحالة.', example: 'يؤكد المستخدم الدخول من الهاتف ويكمل على التلفاز.' },
      { id: 'concealed', title: 'القيمة المحجوبة', summary: 'تخفي قيمة حساسة أو مفسدة للتجربة بكشف متعمد قابل للعكس.', example: 'إخفاء الرصيد أثناء مشاركة الشاشة.' },
      { id: 'series', title: 'متابعة السلسلة', summary: 'تربط العناصر المتتابعة وتحفظ التقدم وتقدم التالي.', example: 'بعد الدرس الثالث يظهر تابع الدرس الرابع.' },
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

function DhadMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 29h24c10 0 17 7 17 16v8H22c-8 0-12-5-12-13V29Z" />
      <circle cx="39" cy="16" r="5" />
    </svg>
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
        <a className="brand" href="#main" aria-label="ضاد، البداية"><DhadMark /><span>ضاد</span></a>
        <nav className="main-nav" aria-label="أقسام الموقع">
          <a href="#lab">جرّب</a>
          <a href="#patterns">الأنماط</a>
          <a href="#install">التثبيت</a>
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
            <p>مهارة وايت ليبل لتجربة أفضل</p>
            <p>العربية جزء أصيل، وهوية مشروعك هي الأصل.</p>
          </div>
          <h1 id="opening-title" className="wordmark" aria-label="ضاد">ضاد</h1>
          <div className="output-lab">
            <div className="output-tabs" role="tablist" aria-label="اختر نوع المخرج">
              {outputOrder.map((key, index) => (
                <button
                  key={key}
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
                <div><dt>يثبت</dt><dd>{currentOutput.proof}</dd></div>
                <div><dt>يتكيّف</dt><dd>{currentOutput.adapts}</dd></div>
                <div><dt>مثال</dt><dd>{currentOutput.sample}</dd></div>
              </dl>
            </section>
          </div>
        </section>

        <section className="principle" aria-labelledby="principle-title">
          <span className="section-number" aria-hidden="true">02</span>
          <h2 id="principle-title">ضاد لا تلبّس المشاريع شكلًا واحدًا.</h2>
          <div className="principle-ledger">
            <article><h3>ما يثبت</h3><p>وضوح المهمة، الوصول، الثقة، صحة العربية، وجودة التسليم.</p></article>
            <article><h3>ما يتبع مشروعك</h3><p>الهوية، الخط، اللون، الكثافة، التقنية، المجال، وعرف المنصة.</p></article>
          </div>
          <p className="principle-note">تبدأ من هدف المستخدم، ثم تضيف العربية والمنطقة والمخرج والوصفة التي يحتاجها العمل فقط.</p>
        </section>

        <section className="arabic-lab" id="lab" aria-labelledby="lab-title">
          <header className="section-intro">
            <span className="section-number" aria-hidden="true">03</span>
            <h2 id="lab-title">جرّب السلوك العربي</h2>
            <p>غيّر القيم. النتيجة ليست صورة ثابتة.</p>
          </header>

          <div className="lab-grid">
            <section className="lab-cell plural-cell" aria-labelledby="plural-title">
              <div className="lab-cell__head"><span>جمع</span><h3 id="plural-title">ست حالات</h3></div>
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
              <div className="lab-cell__head"><span>بحث</span><h3 id="search-title">متسامح، لا يدمج السجلات</h3></div>
              <label htmlFor="arabic-search">ابحث عن اسم</label>
              <input id="arabic-search" value={query} onChange={(event) => setQuery(event.target.value)} />
              <p className="search-result" aria-live="polite"><span>النتيجة</span><strong>{matches.length ? matches.join('، ') : 'لا توجد نتيجة'}</strong></p>
              <p className="micro-note">«احمد» يجد «أحمد». التطبيع للعثور فقط، وليس لدمج شخصين.</p>
            </section>

            <section className="lab-cell region-cell" aria-labelledby="region-title">
              <div className="lab-cell__head"><span>منطقة</span><h3 id="region-title">الوقت يتبع الناس</h3></div>
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
            <h2 id="patterns-title">عشرون إضافة، في مكانها الصحيح</h2>
            <p>اختر المجموعة ثم النمط. لن تُحمّل كلها على كل مشروع.</p>
          </header>

          <div className="pattern-groups" role="tablist" aria-label="مجموعات الأنماط">
            {patternGroups.map((group, index) => (
              <button
                key={group.id}
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
                <span>{group.patterns.length} أنماط</span>
              </button>
            ))}
          </div>

          <div className="pattern-stage" id="pattern-panel" role="tabpanel" aria-labelledby={`pattern-tab-${currentGroup.id}`} tabIndex={0}>
            <div className="pattern-index" aria-label={`أنماط ${currentGroup.label}`}>
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
            <h2 id="quality-title">لا يكفي أن تبدو صحيحة.</h2>
          </div>
          <ol>
            <li><span>1</span><strong>المهمة</strong><p>المسار الأقصر واضح.</p></li>
            <li><span>2</span><strong>العربية</strong><p>اتجاه وجمع وبحث ومنطقة.</p></li>
            <li><span>3</span><strong>الوصول</strong><p>لوحة مفاتيح ولمس وقارئ شاشة.</p></li>
            <li><span>4</span><strong>الحالات</strong><p>تحميل وفراغ وخطأ وتعافٍ.</p></li>
            <li><span>5</span><strong>المخرج</strong><p>اختبار في المتصفح أو الجهاز أو PDF.</p></li>
          </ol>
        </section>

        <section className="install" id="install" aria-labelledby="install-title">
          <header>
            <span className="section-number" aria-hidden="true">06</span>
            <h2 id="install-title">ضاد 3.0</h2>
            <p>مصدر واحد وحزمتان متطابقتان.</p>
          </header>
          <div className="install-row">
            <div><strong>ChatGPT + Codex</strong><code dir="ltr">Dhad-openai-plugin.zip</code></div>
            <div><strong>Claude Chat + Claude Code</strong><code dir="ltr">Dhad-agent-skill.zip</code></div>
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
          <p>صاحب ضاد ومطوّرها</p>
          <h2 id="owner-title">عمَّار</h2>
          <p>عمل مستقل تطوّر عبر أسابيع من الدراسة والتجريب والتدريب والتحسين.</p>
        </section>
        <section aria-labelledby="thanks-title">
          <h2 id="thanks-title">شكر</h2>
          <p>شكرًا لمرصاد، وثمانية، ورياضة ثمانية، وللمهارات والمنتجات العربية التي وسّعت زاوية الدراسة. هذا الشكر لا يعني نقلًا أو اشتقاقًا أو شراكة أو ملكية مشتركة في ضاد.</p>
        </section>
        <nav aria-label="روابط عمّار وضاد">
          <a href="https://github.com/iiAMMAR11" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://x.com/iiAMMAR11" target="_blank" rel="noreferrer">X</a>
          <a href="mailto:Hello@iiammar.com">البريد</a>
          <a href="https://iiammar.com" target="_blank" rel="noreferrer">iiammar.com</a>
        </nav>
      </footer>

      {toast && <div className="toast" role="status" aria-live="polite">{toast}<button type="button" onClick={() => setToast('')}>إغلاق</button></div>}
    </>
  );
}
