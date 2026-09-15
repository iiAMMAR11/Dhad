'use client';

import { useEffect, useState, type ReactNode } from 'react';

const installCommand = '$skill-installer ثبّت dhad من https://github.com/iiAMMAR11/Dhad';
const examplePrompt = 'صمّم لي عرضًا تقديميًا بالعربية عن خطة المبيعات، باستخدام ضاد.';

/* A fixed instant keeps the server and the browser rendering the same date. */
const sampleDate = new Date(Date.UTC(2026, 8, 15));
const arabicDigits = new Intl.NumberFormat('ar-SA-u-nu-arab');
const hijri = new Intl.DateTimeFormat('ar-SA-u-nu-arab', { calendar: 'islamic-umalqura', dateStyle: 'long' });
const riyal = new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' });
const plural = new Intl.PluralRules('ar');
const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
const relative = new Intl.RelativeTimeFormat('ar-SA-u-nu-arab', { numeric: 'auto' });
const listFormat = new Intl.ListFormat('ar', { style: 'long', type: 'conjunction' });
const percent = new Intl.NumberFormat('ar-SA-u-nu-arab', { style: 'percent', maximumFractionDigits: 1 });
const workKinds = ['موقع', 'تطبيق', 'عرض', 'إعلان'];
const directory = ['أحمد الغامدي', 'آدم السالم', 'إبراهيم العتيبي', 'عائشة النصر', 'بدر الحربي'];
const grammarRules = [
  { id: 'gender', title: 'جنس المعدود', wrong: '٣ رسالات', right: '٣ رسائل',
    why: 'لكل اسم صيغه. لا توجد دالة جمع واحدة تصلح لكل الكلمات.' },
  { id: 'definite', title: 'المعدود نكرة', wrong: '٣ الملفات', right: '٣ ملفات',
    why: 'دمج العدد مع اسم معرّف يكسر التركيب، وهو أشيع خطأ في الواجهات.' },
  { id: 'address', title: 'المخاطبة', wrong: 'احفظ ملفك', right: 'حفظ الملف',
    why: 'المصدر يخاطب الجميع. وفعل الأمر يخاطب مذكرًا وحده.' },
  { id: 'punctuation', title: 'الترقيم', wrong: 'نعم, لماذا?', right: 'نعم، لماذا؟',
    why: 'للعربية فاصلتها وعلامة استفهامها، وشكلهما مختلف.' },
  { id: 'ordinal', title: 'الترتيب', wrong: 'الخطوة الثالث', right: 'الخطوة الثالثة',
    why: 'الترتيب يتبع جنس المعدود، ولا يعطيك إياه المتصفح.' },
  { id: 'tanween', title: 'التنوين', wrong: 'شكراً', right: 'شكرًا',
    why: 'تنوين الفتح يوضع على الحرف قبل الألف لا عليها.' },
] as const;

const listStates = [
  { id: 'loading', tab: 'يحمّل', title: 'جارٍ التحميل', body: 'ننتظر النتائج. لا تغلق الصفحة.' },
  { id: 'empty', tab: 'لا نتائج', title: 'لا توجد نتائج', body: 'غيّر كلمة البحث أو امسح التصفية.' },
  { id: 'error', tab: 'تعذّر', title: 'تعذّر جلب النتائج', body: 'تحقّق من اتصالك ثم أعد المحاولة.' },
  { id: 'ready', tab: 'جاهزة', title: 'ثلاث نتائج', body: 'أحمد الغامدي · آدم السالم · بدر الحربي' },
] as const;

const pluralForms: Record<string, string> = {
  zero: 'لا توجد ملفات',
  one: 'ملف واحد',
  two: 'ملفان',
  few: '# ملفات',
  many: '# ملفًا',
  other: '# ملف',
};

const counts = [0, 1, 2, 3, 11];
const names = ['إبراهيم', 'آدم', 'أحمد', 'بدر', 'عائشة'];

const resultForms: Record<string, string> = {
  zero: 'لا نتائج',
  one: 'نتيجة واحدة',
  two: 'نتيجتان',
  few: '# نتائج',
  many: '# نتيجة',
  other: '# نتيجة',
};

function countedResults(value: number) {
  return resultForms[plural.select(value)].replace('#', arabicDigits.format(value));
}

/* The category settles the count. The position in the sentence settles the dual. */
const caseAwareForms: Record<string, string | { raf: string; nasbJarr: string }> = {
  ...pluralForms,
  two: { raf: 'ملفان', nasbJarr: 'ملفين' },
};

const positions = [
  { prefix: 'لديك', grammaticalCase: 'raf' as const },
  { prefix: 'في', grammaticalCase: 'nasbJarr' as const },
  { prefix: 'حذفتُ', grammaticalCase: 'nasbJarr' as const },
];

function countedByCase(value: number, grammaticalCase: 'raf' | 'nasbJarr') {
  const form = caseAwareForms[plural.select(value)];
  const text = typeof form === 'string' ? form : form[grammaticalCase];
  return text.replace('#', arabicDigits.format(value));
}

function countedRight(value: number) {
  return pluralForms[plural.select(value)].replace('#', arabicDigits.format(value));
}

const normalize = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim()
    .toLocaleLowerCase('ar');

const query = 'احمد';
const naiveHits = names.filter((name) => name.includes(query));
const smartHits = names.filter((name) => normalize(name).includes(normalize(query)));

function Stage({
  number,
  title,
  lead,
  without,
  withDhad,
}: {
  number: string;
  title: string;
  lead: string;
  without: ReactNode;
  withDhad: ReactNode;
}) {
  return (
    <li className="stage">
      <div className="stage-copy">
        <span className="stage-number" aria-hidden="true">{number}</span>
        <h3>{title}</h3>
        <p>{lead}</p>
      </div>
      <div className="compare">
        <div className="pane pane--without">
          <b className="pane-label">بدون ضاد</b>
          <div className="pane-body">{without}</div>
        </div>
        <div className="pane pane--with">
          <b className="pane-label">مع ضاد</b>
          <div className="pane-body">{withDhad}</div>
        </div>
      </div>
    </li>
  );
}

export default function ShowcaseClient() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [copied, setCopied] = useState<'command' | 'prompt' | null>(null);
  const [term, setTerm] = useState('احمد');
  const [saveState, setSaveState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle');
  const [attempt, setAttempt] = useState(0);
  const [listState, setListState] = useState<string>('loading');

  const hits = directory.filter((name) => normalize(name).includes(normalize(term)));
  const shownList = listStates.find((state) => state.id === listState) ?? listStates[0];

  function save() {
    /* The first press succeeds and the next one fails, so both endings are visible. */
    const willFail = attempt % 2 === 1;
    setAttempt(attempt + 1);
    setSaveState('working');
    window.setTimeout(() => setSaveState(willFail ? 'failed' : 'done'), 700);
  }

  const saveLabel = {
    idle: 'احفظ الملف',
    working: 'جارٍ الحفظ…',
    done: 'تم الحفظ',
    failed: 'أعد المحاولة',
  }[saveState];

  async function copy(text: string, target: 'command' | 'prompt') {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    setCopied(target);
  }

  useEffect(() => {
    if (copyState === 'idle') return;
    /* Let the control rest again so it never reads as a stuck state. */
    const timer = window.setTimeout(() => {
      setCopyState('idle');
      setCopied(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [copyState, copied]);

  return (
    <>
      <a className="skip-link" href="#main">تخطَّ إلى المحتوى</a>

      <header className="masthead">
        <a className="brand" href="#main" aria-label="ضاد، البداية">ضاد</a>
        <p>مهارة عربية لكل نوع من العمل</p>
        <nav aria-label="روابط الصفحة">
          <a href="#journey">الفرق</a>
          <a href="#abilities">جرّبه</a>
          <a href="#install">التثبيت</a>
          <a className="nav-action" href="https://github.com/iiAMMAR11/Dhad">GitHub</a>
        </nav>
      </header>

      <main id="main">
        <section className="story" aria-labelledby="story-title">
          <div className="hero">
            <div className="hero-copy">
              <p className="plain-intro">مصمَّم للعربية من البداية</p>
              <h1 id="story-title">
                <span>عملك يستحق </span>
                <span>عربية تليق به.</span>
              </h1>
              <p className="hero-lead">
                ضاد مهارة تساعد أدوات الذكاء الاصطناعي على صنع مواقع وملفات وعروض وصور
                أوضح، مع عربية صحيحة وهوية تبقى كما اخترتها.
              </p>
              <a className="primary-action" href="#install">ثبّت ضاد</a>
              <p className="work-types">موقع · تطبيق · عرض · PDF · صورة · إعلان</p>
            </div>
          </div>

          <div className="how" id="how">
            <div className="how-heading">
              <h2>من الطلب إلى نتيجة جاهزة.</h2>
              <p>لا تحتاج أن تعرف مصطلحات التصميم. قل ما تريده، وضاد يهتم بالتفاصيل.</p>
            </div>

            <ol className="steps">
              <li>
                <span>١</span>
                <div><h3>يفهم المطلوب</h3><p>من سيستخدم العمل؟ وما الذي يجب أن يفهمه؟</p></div>
              </li>
              <li>
                <span>٢</span>
                <div><h3>يضبطه</h3><p>العربية، والاتجاه، والمسافات، والألوان، والأرقام.</p></div>
              </li>
              <li>
                <span>٣</span>
                <div><h3>يفحص النتيجة</h3><p>على الهاتف، وفي المتصفح، وداخل الملف النهائي.</p></div>
              </li>
            </ol>
          </div>

          <div className="quality-report" id="features">
            <div className="report-heading">
              <h2>ما الذي يميّز ضاد؟</h2>
            </div>
            <div className="report-rows">
              <div>
                <strong>العربية أولًا</strong>
                <span>يبني العمل بالعربية ويحفظ الرابط والرقم في اتجاههما.</span>
                <b className="status status--success">من البداية</b>
              </div>
              <div>
                <strong>هويتك تبقى لك</strong>
                <span>يحسّن مشروعك من دون تغيير ألوانه وخطه وشكله.</span>
                <b className="status status--assistive">محفوظة</b>
              </div>
              <div>
                <strong>كل أنواع العمل</strong>
                <span>موقع أو تطبيق أو عرض أو PDF أو صورة أو إعلان.</span>
                <b className="status status--action">بمهارة واحدة</b>
              </div>
              <div>
                <strong>يفهم جمهورك</strong>
                <span>يضبط التاريخ والوقت والعملة والأرقام حسب البلد.</span>
                <b className="status status--warning">محلي</b>
              </div>
              <div>
                <strong>يفحص النتيجة</strong>
                <span>يراجعها بعد التصدير وعلى الهاتف، لا داخل المحرر فقط.</span>
                <b className="status status--success">فحص فعلي</b>
              </div>
              <div>
                <strong>نحو عربي سليم</strong>
                <span>يراعي جنس المعدود، والتعريف، والترقيم، والمخاطبة المحايدة.</span>
                <b className="status status--action">مضبوط</b>
              </div>
              <div>
                <strong>لا ينسى الحالات الصعبة</strong>
                <span>يجهّز التحميل والفراغ والخطأ وانقطاع الاتصال.</span>
                <b className="status status--assistive">تجربة مكتملة</b>
              </div>
            </div>
          </div>
        </section>

        <section className="journey" id="journey" aria-labelledby="journey-title">
          <div className="journey-heading">
            <h2 id="journey-title">شوف الفرق بنفسك.</h2>
            <p>
              كل مثال هنا يعمل أمامك الآن، لا صورة ولا كلام.
              انزل بهدوء، وقارن بين الحالتين في كل خطوة.
            </p>
          </div>

          <ol className="stages">
            <Stage
              number="١"
              title="المسافة والتشكيل"
              lead="إذا ضاق السطر، تلاصقت الحركات وصعبت القراءة."
              without={
                <p className="demo demo--cramped" lang="ar">
                  الْعَرَبِيَّةُ لُغَةٌ مُشَكَّلَةٌ، وَالسَّطْرُ الضَّيِّقُ يَجْعَلُ الْحَرَكَاتِ وَالْهَمَزَاتِ تَتَلَامَسُ مَعَ السَّطْرِ الَّذِي فَوْقَهَا، فَيَصْعُبُ عَلَى الْقَارِئِ أَنْ يُتَابِعَ الْكَلِمَاتِ.
                </p>
              }
              withDhad={
                <p className="demo demo--roomy" lang="ar">
                  الْعَرَبِيَّةُ لُغَةٌ مُشَكَّلَةٌ، وَالسَّطْرُ الْمُرِيحُ يَتْرُكُ لِلْحَرَكَاتِ وَالْهَمَزَاتِ مَكَانَهَا، فَتَبْقَى كُلُّ كَلِمَةٍ وَاضِحَةً وَالْقِرَاءَةُ مُتَّصِلَةً.
                </p>
              }
            />

            <Stage
              number="٢"
              title="الاتجاه"
              lead="إذا نسيت الأداة أن العربية تبدأ من اليمين، انقلبت الجملة وتاهت النقطة."
              without={
                <p className="demo demo--ltr" dir="ltr">
                  حمّل ضاد من iiammar.com، ثم ابدأ العمل.
                </p>
              }
              withDhad={
                <p className="demo" dir="rtl">
                  حمّل ضاد من <bdi dir="ltr">iiammar.com</bdi>، ثم ابدأ العمل.
                </p>
              }
            />

            <Stage
              number="٣"
              title="الجمع العربي"
              lead="نقول: ملف، وملفان، وملفات. ولا نقول: ١١ ملف."
              without={
                <ul className="demo demo--list">
                  {counts.map((value) => (
                    <li key={value}>{value} ملف</li>
                  ))}
                </ul>
              }
              withDhad={
                <ul className="demo demo--list">
                  {counts.map((value) => (
                    <li key={value}>{countedRight(value)}</li>
                  ))}
                </ul>
              }
            />

            <Stage
              number="٤"
              title="التاريخ والمبلغ"
              lead="يظهران بالشكل الذي يعرفه القارئ في بلده."
              without={
                <dl className="demo demo--pairs">
                  <dt>التاريخ</dt><dd>15/9/2026</dd>
                  <dt>المبلغ</dt><dd>1250.5 ر.س</dd>
                </dl>
              }
              withDhad={
                <dl className="demo demo--pairs">
                  <dt>التاريخ</dt><dd>{hijri.format(sampleDate)}</dd>
                  <dt>المبلغ</dt><dd>{riyal.format(1250.5)}</dd>
                </dl>
              }
            />

            <Stage
              number="٥"
              title="الترتيب والبحث"
              lead="الترتيب المعتاد يخلط الألف والهمزة، والبحث عن «احمد» لا يجد «أحمد»."
              without={
                <div className="demo">
                  <p className="demo-caption">الترتيب</p>
                  <p className="demo-line">{[...names].sort().join(' · ')}</p>
                  <p className="demo-caption">البحث عن «احمد»</p>
                  <p className="demo-line demo-line--empty">
                    {naiveHits.length ? naiveHits.join(' · ') : 'لا توجد نتائج'}
                  </p>
                </div>
              }
              withDhad={
                <div className="demo">
                  <p className="demo-caption">الترتيب</p>
                  <p className="demo-line">{[...names].sort(collator.compare).join(' · ')}</p>
                  <p className="demo-caption">البحث عن «احمد»</p>
                  <p className="demo-line demo-line--found">
                    {smartHits.length ? smartHits.join(' · ') : 'لا توجد نتائج'}
                  </p>
                </div>
              }
            />
            <Stage
              number="٦"
              title="الوقت"
              lead="«قبل ثلاثة أيام» أقرب للقارئ من تاريخ كامل، ولها صيغة عربية صحيحة."
              without={
                <ul className="demo demo--list">
                  <li>آخر تحديث: منذ 3 يوم</li>
                  <li>الرسالة: منذ 2 ساعة</li>
                  <li>الملف: منذ 1 يوم</li>
                </ul>
              }
              withDhad={
                <ul className="demo demo--list">
                  <li>آخر تحديث: {relative.format(-3, 'day')}</li>
                  <li>الرسالة: {relative.format(-2, 'hour')}</li>
                  <li>الملف: {relative.format(-1, 'day')}</li>
                </ul>
              }
            />

            <Stage
              number="٧"
              title="الأرقام والقوائم"
              lead="الرقم الكبير يحتاج فواصل، والقائمة تحتاج واوًا لا فاصلة."
              without={
                <dl className="demo demo--pairs">
                  <dt>المشتركون</dt><dd>1234567</dd>
                  <dt>نسبة الإنجاز</dt><dd>87.5%</dd>
                  <dt>يدعم</dt><dd>موقع, تطبيق, عرض, إعلان</dd>
                </dl>
              }
              withDhad={
                <dl className="demo demo--pairs">
                  <dt>المشتركون</dt><dd>{arabicDigits.format(1234567)}</dd>
                  <dt>نسبة الإنجاز</dt><dd>{percent.format(0.875)}</dd>
                  <dt>يدعم</dt><dd>{listFormat.format(workKinds)}</dd>
                </dl>
              }
            />
            <Stage
              number="٨"
              title="إعراب المثنى"
              lead="«ملفان» في الرفع، و«ملفين» بعد حرف جر أو ناصب. صيغة واحدة لا تكفي."
              without={
                <ul className="demo demo--list">
                  {positions.map((position) => (
                    <li key={position.prefix}>
                      {position.prefix} {countedRight(2)}
                    </li>
                  ))}
                </ul>
              }
              withDhad={
                <ul className="demo demo--list">
                  {positions.map((position) => (
                    <li key={position.prefix}>
                      {position.prefix} {countedByCase(2, position.grammaticalCase)}
                    </li>
                  ))}
                </ul>
              }
            />
          </ol>

          <div className="rules">
            <h3 className="rules-title">وتفاصيل أدقّ يلتقطها ضاد</h3>
            <ul className="rule-grid">
              {grammarRules.map((rule) => (
                <li key={rule.id} className="rule">
                  <b className="rule-name">{rule.title}</b>
                  <p className="rule-pair">
                    <span className="rule-wrong"><i>الشائع</i>{rule.wrong}</span>
                    <span className="rule-right"><i>الصحيح</i>{rule.right}</span>
                  </p>
                  <span className="rule-why">{rule.why}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="journey-close" id="journey-close">
            هذه أمثلة قليلة. ويفحص ضاد غيرها كثيرًا في كل عمل: الشاشة الفارغة،
            ورسالة الخطأ، وانقطاع النت، ولوحة المفاتيح، والهاتف، والملف بعد حفظه.
          </p>
          <a className="primary-action journey-action" href="#install">ثبّت ضاد</a>
        </section>

        <section className="abilities" id="abilities" aria-labelledby="abilities-title">
          <div className="abilities-heading">
            <h2 id="abilities-title">وهذا ما يصنعه لك.</h2>
            <p>ثلاثة أمثلة تعمل الآن. جرّبها بنفسك.</p>
          </div>

          <div className="ability-grid">
            <article className="ability">
              <h3>بحث يسامح في الهمزة</h3>
              <p className="ability-lead">اكتب الاسم كما تنطقه، ويجده ضاد كما هو مكتوب.</p>
              <label className="ability-field" htmlFor="ability-search">ابحث عن اسم</label>
              <input
                id="ability-search"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="احمد"
              />
              <p className="ability-note" aria-live="polite">
                {term.trim() === ''
                  ? 'اكتب حرفًا لتبدأ.'
                  : hits.length === 0
                    ? 'لا يوجد اسم بهذا الحرف.'
                    : `${countedResults(hits.length)}`}
              </p>
              <ul className="ability-results">
                {hits.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </article>

            <article className="ability">
              <h3>زر يقول ما يفعل</h3>
              <p className="ability-lead">لا يتركك تنتظر بلا خبر، ويشرح لك إن تعذّر.</p>
              <button
                type="button"
                className={`ability-button ability-button--${saveState}`}
                onClick={save}
                disabled={saveState === 'working'}
                aria-busy={saveState === 'working'}
              >
                {saveLabel}
              </button>
              <p className="ability-note" aria-live="polite">
                {saveState === 'working'
                  ? 'ننتظر انتهاء الحفظ.'
                  : saveState === 'done'
                    ? 'حُفظ الملف. اضغط مرة أخرى لترى حالة التعذّر.'
                    : saveState === 'failed'
                      ? 'تعذّر الحفظ. الزر ما زال يعمل، جرّب مرة أخرى.'
                      : 'اضغط الزر وتابع ما يقوله.'}
              </p>
            </article>

            <article className="ability">
              <h3>قائمة بكل حالاتها</h3>
              <p className="ability-lead">لا تُترك الشاشة فارغة بلا تفسير في أي حالة.</p>
              <div className="ability-tabs">
                {listStates.map((state) => (
                  <button
                    key={state.id}
                    type="button"
                    onClick={() => setListState(state.id)}
                    aria-pressed={listState === state.id}
                  >
                    {state.tab}
                  </button>
                ))}
              </div>
              <div className="ability-panel" aria-live="polite">
                <strong>{shownList.title}</strong>
                <span>{shownList.body}</span>
              </div>
            </article>
          </div>
        </section>

        <section className="install" id="install" aria-labelledby="install-title">
          <div className="install-copy">
            <h2 id="install-title">ثبّت ضاد. <br />وابدأ بالطلب.</h2>
            <p>اختر الملف المناسب، أضفه إلى أداتك، ثم اطلب منها العمل. هكذا يبدو الطلب:</p>
            <div className="command command--prompt">
              <code>صمّم لي عرضًا تقديميًا بالعربية عن خطة المبيعات، باستخدام ضاد.</code>
              <button type="button" onClick={() => copy(examplePrompt, 'prompt')}>
                {copied === 'prompt' && copyState === 'copied' ? 'نُسخ' : 'نسخ الطلب'}
              </button>
            </div>
          </div>

          <div className="install-actions">
            <div className="downloads">
              <a href="https://github.com/iiAMMAR11/Dhad/releases/latest/download/Dhad-openai-plugin.zip">
                <span><strong>ChatGPT وCodex</strong><small>Dhad-openai-plugin.zip</small></span>
                <b>تحميل</b>
              </a>
              <a href="https://github.com/iiAMMAR11/Dhad/releases/latest/download/Dhad-agent-skill.zip">
                <span><strong>Claude</strong><small>Dhad-agent-skill.zip</small></span>
                <b>تحميل</b>
              </a>
            </div>

            <div className="command">
              <code><bdi dir="ltr">$skill-installer</bdi> ثبّت <bdi dir="ltr">dhad</bdi> من <bdi dir="ltr">github.com/iiAMMAR11/Dhad</bdi></code>
              <button type="button" onClick={() => copy(installCommand, 'command')}>
                {copied === 'command' && copyState === 'copied' ? 'نُسخ' : 'نسخ الأمر'}
              </button>
            </div>
            <p className={`copy-status copy-status--${copyState}`} aria-live="polite">
              {copyState === 'failed'
                ? 'تعذّر النسخ. انسخ الأمر يدويًا.'
                : copyState === 'copied'
                  ? 'الأمر جاهز للصق.'
                  : ''}
            </p>
          </div>
        </section>
      </main>

      <footer className="owner">
        <div>
          <p>صاحبها ومطوّرها</p>
          <h2>عمَّار</h2>
        </div>
        <p>
          ضاد عمل مستقل طوّره عمَّار بعد أسابيع من الدراسة والتجربة والتحسين.
          شكرًا لمرصاد، وثمانية، ورياضة ثمانية، وللمهارات والمنتجات العربية التي وسّعت الدراسة.
        </p>
        <nav aria-label="روابط عمّار وضاد">
          <a href="https://github.com/iiAMMAR11">GitHub</a>
          <a href="https://x.com/iiAMMAR11">X</a>
          <a href="mailto:Hello@iiammar.com">البريد</a>
          <a href="https://iiammar.com">iiammar.com</a>
        </nav>
      </footer>
    </>
  );
}
