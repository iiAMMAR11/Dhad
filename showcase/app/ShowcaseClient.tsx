'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Theme = 'dark' | 'light';
type View = 'cards' | 'table' | 'board';
type SymbolContext = 'operations' | 'commerce' | 'learning' | 'none';
type SyncState = 'saving' | 'synced' | 'offline' | 'failed';
type Toast = { message: string; tone: 'success' | 'danger' | 'neutral' };

const symbolSets = {
  operations: {
    label: 'إدارة عمل',
    workspace: '🧭',
    collection: '🗂️',
    item: '📄',
    complete: '✅',
  },
  commerce: {
    label: 'متجر',
    workspace: '🛍️',
    collection: '📦',
    item: '🧾',
    complete: '✅',
  },
  learning: {
    label: 'تعليم',
    workspace: '🎓',
    collection: '📚',
    item: '📝',
    complete: '✅',
  },
  none: {
    label: 'بدون إيموجي',
    workspace: '',
    collection: '',
    item: '',
    complete: '',
  },
} satisfies Record<SymbolContext, Record<string, string>>;

const projectSets: Record<SymbolContext, { name: string; meta: string; state: string }[]> = {
  operations: [
    { name: 'إطلاق بوابة العملاء', meta: '17 / 25', state: 'قيد التنفيذ' },
    { name: 'تحسين رحلة التسجيل', meta: '8 / 8', state: 'مكتمل' },
    { name: 'تحديث مركز المساعدة', meta: '4 / 12', state: 'مراجعة' },
  ],
  commerce: [
    { name: 'إطلاق متجر الشتاء', meta: '17 / 25', state: 'قيد التنفيذ' },
    { name: 'طلبات هذا الأسبوع', meta: '8 / 8', state: 'مكتمل' },
    { name: 'مراجعة المخزون', meta: '4 / 12', state: 'مراجعة' },
  ],
  learning: [
    { name: 'إطلاق مساق العربية', meta: '17 / 25', state: 'قيد التنفيذ' },
    { name: 'تقييم الوحدة الثانية', meta: '8 / 8', state: 'مكتمل' },
    { name: 'مراجعة بنك الأسئلة', meta: '4 / 12', state: 'مراجعة' },
  ],
  none: [
    { name: 'إعداد بوابة الدعم', meta: '17 / 25', state: 'قيد التنفيذ' },
    { name: 'توحيد ملفات العملاء', meta: '8 / 8', state: 'مكتمل' },
    { name: 'مراجعة خطة الإطلاق', meta: '4 / 12', state: 'مراجعة' },
  ],
};

const installers = [
  {
    name: 'OpenAI Plugin',
    archive: 'Dhad-openai-plugin.zip',
    platforms: 'ChatGPT + Codex',
    context: 'ملف واحد يعمل مع ChatGPT وCodex.',
    targets: [
      { platform: 'ChatGPT', invoke: '@dhad', copyable: true },
      { platform: 'Codex', invoke: '$dhad', copyable: true },
    ],
  },
  {
    name: 'Agent Skill',
    archive: 'Dhad-agent-skill.zip',
    platforms: 'Claude Chat + Claude Code',
    context: 'ارفع الملف في Claude Chat أو ثبّته في Claude Code.',
    targets: [
      { platform: 'Claude Chat', invoke: 'يعمل بعد رفع الملف', copyable: false },
      { platform: 'Claude Code', invoke: '/dhad', copyable: true },
    ],
  },
] as const;

const syncLabels: Record<SyncState, string> = {
  saving: 'جارٍ الحفظ',
  synced: 'تم الحفظ',
  offline: 'بدون إنترنت',
  failed: 'تعذّر الحفظ',
};

const arabicNames = ['أحمد', 'إبراهيم', 'آدم', 'يوسف'];
const arabicNumber = new Intl.NumberFormat('ar-SA-u-nu-arab');
const arabicPlural = new Intl.PluralRules('ar');
const arabicCollator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });

function normalizeArabic(value: string) {
  return value
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

function formatTasks(count: number) {
  const formatted = arabicNumber.format(count);
  const forms: Record<Intl.LDMLPluralRule, string> = {
    zero: 'لا توجد مهام',
    one: 'مهمة واحدة',
    two: 'مهمتان',
    few: `${formatted} مهام`,
    many: `${formatted} مهمة`,
    other: `${formatted} مهمة`,
  };
  return forms[arabicPlural.select(count)];
}

function ArabicCorrectnessLab() {
  const [count, setCount] = useState(11);
  const [query, setQuery] = useState('احمد');
  const matches = useMemo(() => {
    const normalizedQuery = normalizeArabic(query);
    return arabicNames
      .filter((name) => normalizeArabic(name).includes(normalizedQuery))
      .sort(arabicCollator.compare);
  }, [query]);
  const sortedNames = useMemo(() => [...arabicNames].sort(arabicCollator.compare), []);

  return (
    <div className="arabic-lab" aria-labelledby="arabic-lab-title">
      <header className="arabic-lab__intro">
        <h3 id="arabic-lab-title">جرّب السلوك العربي، لا شكله فقط</h3>
        <p>هذه أمثلة حقيقية من طبقة الصحة العربية في ضاد. غيّر العدد أو عبارة البحث وشاهد القرار يتبدّل.</p>
      </header>

      <section className="arabic-lab__row" aria-labelledby="plural-title">
        <div className="arabic-lab__explain">
          <span>جمع</span>
          <h4 id="plural-title">ست حالات بدل مفرد وجمع</h4>
          <p>صفر، واحد، اثنان، قليل، كثير، وبقية الأعداد.</p>
        </div>
        <div className="arabic-lab__demo plural-demo">
          <output htmlFor="task-count" aria-live="polite">{formatTasks(count)}</output>
          <label htmlFor="task-count"><span>العدد: {arabicNumber.format(count)}</span></label>
          <input id="task-count" type="range" min="0" max="102" value={count} onChange={(event) => setCount(Number(event.target.value))} />
          <div className="plural-demo__samples" aria-label="أمثلة سريعة">
            {[0, 1, 2, 3, 11, 102].map((value) => <button key={value} type="button" aria-pressed={count === value} onClick={() => setCount(value)}>{arabicNumber.format(value)}</button>)}
          </div>
        </div>
      </section>

      <section className="arabic-lab__row" aria-labelledby="search-title">
        <div className="arabic-lab__explain">
          <span>بحث وترتيب</span>
          <h4 id="search-title">«احمد» يجد «أحمد»</h4>
          <p>تطبيع مدروس للبحث، مع ترتيب عربي عبر Intl.Collator.</p>
        </div>
        <div className="arabic-lab__demo search-demo">
          <label className="dhad-field" htmlFor="arabic-search">
            <span className="dhad-label">ابحث عن اسم</span>
            <input id="arabic-search" className="dhad-input" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <p className="search-demo__result" aria-live="polite">
            <span>النتيجة</span>
            <strong>{matches.length ? matches.join('، ') : 'لا توجد نتيجة'}</strong>
          </p>
          <p className="search-demo__sort"><span>الترتيب العربي</span><bdi>{sortedNames.join(' ← ')}</bdi></p>
        </div>
      </section>

      <section className="arabic-lab__row" aria-labelledby="time-title">
        <div className="arabic-lab__explain">
          <span>وقت ومنطقة</span>
          <h4 id="time-title">التاريخ نفسه، عرضان صحيحان</h4>
          <p>تُحفظ القيمة الميلادية، ويُعرض الهجري عند الحاجة مع أسبوع المنطقة.</p>
        </div>
        <div className="arabic-lab__demo time-demo">
          <div><span>ميلادي</span><time dateTime="2026-08-31">٣١ أغسطس ٢٠٢٦</time></div>
          <div><span>هجري</span><time dateTime="2026-08-31">١٨ ربيع الأول ١٤٤٨ هـ</time></div>
          <ol aria-label="أيام الأسبوع في السعودية">
            <li>الأحد</li><li>الاثنين</li><li>الثلاثاء</li><li>الأربعاء</li><li>الخميس</li><li data-weekend>الجمعة</li><li data-weekend>السبت</li>
          </ol>
          <p>بداية الأسبوع: الأحد · العطلة: الجمعة والسبت</p>
        </div>
      </section>
    </div>
  );
}

function DecorativeSymbol({ value }: { value: string }) {
  if (!value) return null;
  return <span className="symbol" aria-hidden="true">{value}</span>;
}

function useDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const shell = document.querySelector<HTMLElement>('[data-site-shell]');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (shell) shell.inert = true;

    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []);
    window.setTimeout(() => focusable()[0]?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (shell) shell.inert = false;
      restoreFocus.current?.focus();
    };
  }, [open, onClose]);

  return dialogRef;
}

export default function ShowcaseClient() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [view, setView] = useState<View>('cards');
  const [symbols, setSymbols] = useState<SymbolContext>('operations');
  const [sync, setSync] = useState<SyncState>('synced');
  const [toast, setToast] = useState<Toast | null>(null);
  const [toastPaused, setToastPaused] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showFieldError, setShowFieldError] = useState(false);
  const [publicUrl, setPublicUrl] = useState('https://example.com');
  const [saving, setSaving] = useState(false);
  const closeDialog = useCallback(() => setDialogOpen(false), []);
  const dialogRef = useDialog(dialogOpen, closeDialog);
  const symbolMap = symbolSets[symbols];

  useEffect(() => {
    let timer: number | undefined;
    try {
      const stored = window.localStorage.getItem('dhad-showcase-theme');
      if (stored === 'light' || stored === 'dark') {
        timer = window.setTimeout(() => setTheme(stored), 0);
      }
    } catch {
      // The theme still works when storage is unavailable.
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.dhadTheme = theme;
    try {
      window.localStorage.setItem('dhad-showcase-theme', theme);
    } catch {
      // Storage is optional.
    }
  }, [theme]);

  useEffect(() => {
    if (!toast || toastPaused) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast, toastPaused]);

  const projects = useMemo(() => projectSets[symbols], [symbols]);

  const notify = (message: string, tone: Toast['tone'] = 'neutral') => setToast({ message, tone });

  const saveExample = () => {
    setSaving(true);
    setSync('saving');
    window.setTimeout(() => {
      setSaving(false);
      setSync('synced');
      notify('تم حفظ التغييرات ومزامنتها.', 'success');
    }, 800);
  };

  const copyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      notify('تم نسخ الأمر.', 'success');
    } catch {
      notify('تعذّر النسخ. انسخ الأمر يدويًا.', 'danger');
    }
  };

  return (
    <>
      <div data-site-shell>
        <a className="dhad-skip-link" href="#main">تخطَّ إلى المحتوى</a>
        <header className="site-nav">
          <a className="site-brand" href="#main" aria-label="Dhad، البداية">
            <svg className="site-brand__mark" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M6.5 14.5h11.2c4.6 0 7.8 3.1 7.8 7.1V25H12c-3.5 0-5.5-2-5.5-5.3v-5.2Z" />
              <circle className="site-brand__mark-accent" cx="19.5" cy="8.5" r="2.4" />
            </svg>
            <span>ضاد</span>
          </a>
          <nav className="site-nav__links" aria-label="أقسام الموقع">
            <a href="#concept">فكرة ضاد</a>
            <a href="#foundation">الألوان والخطوط</a>
            <a href="#components">الأزرار والحقول</a>
            <a href="#patterns">طريقة الاستخدام</a>
            <a href="#install">التثبيت</a>
            <a href="#creator">عن مطوّر الـ Skill</a>
          </nav>
          <button className="dhad-btn dhad-btn--secondary site-theme" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'عرض فاتح' : 'عرض داكن'}
          </button>
        </header>

        <main id="main">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero__title-row">
              <p>سكيل عربي بطبقتين</p>
              <span>تصميم RTL · صحة عربية · أربع منصات</span>
            </div>
            <h1 id="hero-title" dir="ltr">Dhad</h1>
            <div className="hero__lower">
              <div className="hero__statement">العربية ليست اتجاهًا فقط.</div>
              <p>ضاد يجعل الواجهة تبدو عربية وتتصرف بالعربية: من توزيع العناصر وحالاتها إلى الجمع والبحث والترتيب والتقويم.</p>
            </div>

            <div className="control-rail" aria-label="خيارات الاستعراض">
              <label>
                <span>نوع المشروع</span>
                <select value={symbols} onChange={(event) => setSymbols(event.target.value as SymbolContext)}>
                  {Object.entries(symbolSets).map(([value, set]) => <option key={value} value={value}>{set.label}</option>)}
                </select>
              </label>
              <button type="button" className="control-rail__status" data-state={sync} onClick={() => setSync(sync === 'synced' ? 'offline' : sync === 'offline' ? 'failed' : 'synced')}>
                <span aria-hidden="true" />
                <span aria-live="polite">{syncLabels[sync]}</span>
              </button>
            </div>

            <WorkspaceSpecimen
              symbolMap={symbolMap}
              projects={projects}
              view={view}
              onViewChange={setView}
              onNotify={notify}
            />
          </section>

          <section className="concept-section" id="concept" aria-labelledby="concept-title">
            <div className="concept-section__opening">
              <h2 id="concept-title">واجهة عربية كاملة = تصميم عربي + صحة عربية</h2>
              <p>معظم الأدوات تقلب الاتجاه وتنتهي. ضاد يجمع بين نظام واجهات RTL قابل للتنفيذ وقواعد اللغة والبيانات والزمن التي تجعل المنتج مفهومًا للمستخدم العربي.</p>
            </div>
            <div className="concept-equation" aria-label="طبقتا ضاد تنتجان منتجًا عربيًا كاملًا">
              <p><strong>تصميم عربي</strong><span>تخطيط منطقي، حالات واضحة، وصول، وخط مضمّن</span></p>
              <b aria-hidden="true">+</b>
              <p><strong>صحة عربية</strong><span>جمع، بحث، ترتيب، أرقام، تقويم، وأسبوع محلي</span></p>
              <b aria-hidden="true">=</b>
              <p><strong>منتج عربي كامل</strong><span>لا يبدو مترجمًا ولا يتصرف كنسخة أجنبية</span></p>
            </div>
            <ArabicCorrectnessLab />
          </section>

          <section className="principles" aria-label="مبادئ النظام">
            <p><strong>RTL أصيل</strong><span>التخطيط يبدأ من العربية</span></p>
            <p><strong>جمع صحيح</strong><span>ست حالات، لا حالتان فقط</span></p>
            <p><strong>بحث مرن</strong><span>احمد يجد أحمد</span></p>
            <p><strong>وقت محلي</strong><span>هجري وميلادي وأسبوع المنطقة</span></p>
          </section>

          <section className="catalog-section" id="foundation">
            <header className="section-heading section-heading--split">
              <h2>نظام واحد لكل المنصات</h2>
              <p>الألوان والخطوط والمسافات نفسها تعمل في المواقع والتطبيقات، ليبقى شكل المنتج متناسقًا في كل مكان.</p>
            </header>
            <div className="token-board" aria-label="الألوان الدلالية">
              <TokenSwatch name="الخلفية" token="--dhad-color-bg" className="token--canvas" />
              <TokenSwatch name="السطح" token="--dhad-color-surface-1" className="token--surface" />
              <TokenSwatch name="الإجراء" token="--dhad-color-accent" className="token--action" />
              <TokenSwatch name="النجاح" token="--dhad-color-success-fill" className="token--success" />
              <TokenSwatch name="الخطر" token="--dhad-color-danger-fill" className="token--danger" />
              <TokenSwatch name="التنبيه" token="--dhad-color-warning-fill" className="token--warning" />
            </div>
            <div className="type-board">
              <div className="type-board__display">
                <span>خط واحد مضمّن: IBM Plex Sans Arabic بأوزانه الثمانية</span>
                <strong>نص واضح وسهل القراءة</strong>
              </div>
              <dl>
                <div><dt>عنوان كبير</dt><dd>30 / 700</dd><span>للعناوين الرئيسية</span></div>
                <div><dt>عنوان</dt><dd>22 / 700</dd><span>لعناوين الأقسام</span></div>
                <div><dt>نص</dt><dd>15 / 400</dd><span>للقراءة اليومية</span></div>
                <div><dt>رمز تقني</dt><dd dir="ltr">Dhad-2048</dd><span>للأكواد والأرقام</span></div>
              </dl>
            </div>
            <aside className="font-policy" aria-labelledby="font-policy-title">
              <div>
                <span>الخطوط</span>
                <h3 id="font-policy-title">IBM Plex Sans Arabic — خط ضاد الثابت</h3>
              </div>
              <div>
                <p><strong>الخط مضمّن مع السكِل بأوزانه الثمانية</strong> تحت رخصة SIL Open Font License 1.1 المفتوحة، ويعمل بلا اتصال ولا CDN ولا أي فحص ترخيص.</p>
                <p>التسلسل الهرمي يأتي من الوزن والحجم واللون: النص الجاري 450، عناصر الواجهة 500، العناوين 600–700 — لا حاجة لعائلة ثانية أبدًا.</p>
                <a href="https://github.com/IBM/plex" target="_blank" rel="noreferrer">IBM Plex على GitHub — مفتوح المصدر OFL-1.1</a>
              </div>
            </aside>
          </section>

          <section className="catalog-section" id="components">
            <header className="section-heading">
              <h2>كل عنصر جاهز لمختلف الحالات</h2>
              <p>الأزرار والحقول توضّح للمستخدم عند الحفظ أو الخطأ أو التعطيل أو انقطاع الاتصال.</p>
            </header>
            <div className="component-lab">
              <section className="component-row" aria-labelledby="actions-title">
                <div><h3 id="actions-title">الأزرار</h3><p>أزرار واضحة للحفظ وتبديل العرض والحذف.</p></div>
                <div className="component-row__stage">
                  <button className="dhad-btn dhad-btn--primary" type="button" onClick={saveExample} aria-busy={saving}>{saving ? 'جارٍ الحفظ' : 'حفظ التغييرات'}</button>
                  <button className="dhad-btn dhad-btn--secondary" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'عرض فاتح' : 'عرض داكن'}</button>
                  <button className="dhad-btn dhad-btn--danger" type="button" onClick={() => setDialogOpen(true)}>حذف عنصر</button>
                  <button className="dhad-btn dhad-btn--primary" type="button" disabled>غير متاح</button>
                </div>
              </section>

              <section className="component-row" aria-labelledby="fields-title">
                <div><h3 id="fields-title">الحقول</h3><p>لكل حقل اسم واضح ورسالة مفيدة عند الخطأ.</p></div>
                <div className="field-grid">
                  <label className="dhad-field"><span className="dhad-label">اسم مساحة العمل</span><input className="dhad-input" defaultValue="بوابة العملاء" aria-describedby="project-help" /><small id="project-help">يظهر هذا الاسم للفريق.</small></label>
                  <label className="dhad-field" data-invalid={showFieldError || undefined}><span className="dhad-label">الرابط العام</span><input className="dhad-input" dir="ltr" value={publicUrl} onChange={(event) => setPublicUrl(event.target.value)} aria-invalid={showFieldError} aria-describedby="url-feedback" /><small id="url-feedback">{showFieldError ? 'أدخل رابطًا كاملًا يبدأ بـ https://' : 'يظهر الرابط من اليسار إلى اليمين ليسهل قراءته.'}</small></label>
                  <button className="dhad-btn dhad-btn--secondary" type="button" onClick={() => { const next = !showFieldError; setShowFieldError(next); setPublicUrl(next ? 'example' : 'https://example.com'); }}>{showFieldError ? 'إصلاح المثال' : 'عرض الخطأ'}</button>
                </div>
              </section>

              <section className="component-row" aria-labelledby="feedback-title">
                <div><h3 id="feedback-title">الحالة والتقدم</h3><p>كل حالة مكتوبة بوضوح ولا تعتمد على اللون وحده.</p></div>
                <div className="component-row__stage component-row__stage--vertical">
                  <div className="status-line">
                    {(['saving', 'synced', 'offline', 'failed'] as SyncState[]).map((state) => <button key={state} type="button" className="dhad-sync-status" data-state={state} aria-pressed={sync === state} onClick={() => setSync(state)}><span aria-hidden="true" />{syncLabels[state]}</button>)}
                  </div>
                  <div className="dhad-progress" style={{ '--dhad-progress': 0.68 } as CSSProperties} role="progressbar" aria-label="تقدم المهام" aria-valuemin={0} aria-valuemax={25} aria-valuenow={17} aria-valuetext="17 من 25">
                    <div className="dhad-progress__meta"><span>المهام</span><strong>17 / 25</strong></div>
                    <div className="dhad-progress__track"><span className="dhad-progress__fill" /></div>
                  </div>
                </div>
              </section>
            </div>
          </section>

          <section className="catalog-section" id="patterns">
            <header className="section-heading section-heading--split">
              <h2>يناسب مشروعك بدل أن يفرض شكلًا واحدًا</h2>
              <p>القواعد الأساسية ثابتة، لكن الأسماء والرموز والأمثلة تتغير حسب نوع مشروعك.</p>
            </header>
            <div className="pattern-comparison">
              <article>
                <span>الأساس</span>
                <h3>واجهة تناسب مشاريع مختلفة</h3>
                <ul><li>تنقّل واضح وتغيير طريقة العرض</li><li>حالات التحميل والفراغ والخطأ</li><li>جداول ولوحات تدعم لوحة المفاتيح</li><li>نوافذ تناسب الكمبيوتر والجوال</li></ul>
              </article>
              <article className="adaptation-card">
                <span>أمثلة</span>
                <h3>الأسماء تتغير حسب المشروع</h3>
                <dl className="adaptation-map">
                  <div><dt dir="rtl">SaaS</dt><dd>مساحة · مشروع · مهمة</dd></div>
                  <div><dt>تجارة</dt><dd>متجر · مجموعة · طلب</dd></div>
                  <div><dt>تعليم</dt><dd>أكاديمية · مساق · درس</dd></div>
                </dl>
              </article>
            </div>
          </section>

          <section className="catalog-section symbols-section" id="symbols">
            <header className="section-heading">
              <h2>الإيموجي اختياري ويتغير حسب المشروع</h2>
              <p>إذا كان مشروعك يستخدم الإيموجي، يختار السكيل رموزًا مناسبة له. ويمكنك إيقافها تمامًا.</p>
            </header>
            <div className="symbol-switcher" role="group" aria-label="اختيار نوع المشروع">
              {(Object.entries(symbolSets) as [SymbolContext, typeof symbolSets[SymbolContext]][]).map(([key, set]) => <button key={key} type="button" aria-pressed={symbols === key} onClick={() => setSymbols(key)}>{set.label}</button>)}
            </div>
            <div className="symbol-demo">
              <p><DecorativeSymbol value={symbolMap.workspace} /><strong>مساحة العمل</strong><span>رمز المشروع</span></p>
              <p><DecorativeSymbol value={symbolMap.collection} /><strong>مجموعة</strong><span>تضم عدة عناصر</span></p>
              <p><DecorativeSymbol value={symbolMap.item} /><strong>عنصر</strong><span>العنصر الأساسي</span></p>
              <p><DecorativeSymbol value={symbolMap.complete} /><strong>مكتمل</strong><span>النص يوضح المعنى</span></p>
            </div>
          </section>

          <section className="catalog-section install-section" id="install">
            <header className="section-heading section-heading--split">
              <h2>ملفان لأربع منصات</h2>
              <p>حمّل الملف المناسب: ملف لـChatGPT وCodex، وملف لـClaude Chat وClaude Code.</p>
            </header>
            <div className="installer-list">
              {installers.map((installer, index) => (
                <article key={installer.name}>
                  <span dir="ltr">0{index + 1}</span>
                  <div className="installer-list__identity">
                    <p dir="ltr">{installer.platforms}</p>
                    <h3 dir="ltr">{installer.name}</h3>
                    <p>{installer.context}</p>
                    <code dir="ltr">{installer.archive}</code>
                  </div>
                  <dl className="installer-list__targets">
                    {installer.targets.map((target) => (
                      <div key={target.platform}>
                        <dt dir="ltr">{target.platform}</dt>
                        <dd>
                          <code dir={target.copyable ? 'ltr' : 'rtl'}>{target.invoke}</code>
                          {target.copyable && (
                            <button type="button" aria-label={`نسخ استدعاء ${target.platform}`} onClick={() => copyCommand(target.invoke)}>نسخ</button>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
            <p className="release-note">نفس نظام التصميم يعمل على المنصات الأربع.</p>
          </section>

          <section className="platform-matrix" aria-labelledby="platform-title">
            <div><h2 id="platform-title">ما الذي يعمل الآن؟</h2><p>نسخة الويب جاهزة، أما ملفات التطبيقات فهي نقطة بداية تحتاج إلى تطوير داخل مشروعك.</p></div>
            <dl>
              <div><dt>مواقع الويب</dt><dd>جاهز للاستخدام</dd></div>
              <div><dt>مشاريع React</dt><dd>أمثلة موثقة</dd></div>
              <div><dt>تطبيقات الجوال وسطح المكتب</dt><dd>ملفات بداية تجريبية</dd></div>
              <div><dt>أمثلة متخصصة</dt><dd>اختيارية</dd></div>
            </dl>
          </section>

        </main>

        <footer className="site-footer">
          <section className="creator-section" id="creator" aria-labelledby="creator-title">
            <div className="creator-section__heading">
              <p>ضاد، مشروع مستقل</p>
              <h2 id="creator-title">عمَّار</h2>
            </div>
            <div className="creator-section__body">
              <p>طوّرت ضاد ليجمع تصميم الواجهات العربية مع صحة اللغة والبيانات والزمن في سكيل واحد.</p>
              <a className="creator-project-link" href="https://github.com/iiAMMAR11/Dhad" target="_blank" rel="noreferrer">مستودع Dhad المستقل على GitHub</a>
              <nav className="creator-links" aria-label="وسائل التواصل مع عمّار">
                <a href="https://github.com/iiAMMAR11" target="_blank" rel="noreferrer"><span dir="rtl">GitHub</span><strong dir="ltr">iiAMMAR11</strong></a>
                <a href="https://x.com/iiAMMAR11" target="_blank" rel="noreferrer"><span>X (تويتر)</span><strong dir="ltr">@iiAMMAR11</strong></a>
                <a href="mailto:Hello@iiammar.com"><span>البريد</span><strong dir="ltr">Hello@iiammar.com</strong></a>
                <a href="https://iiammar.com" target="_blank" rel="noreferrer"><span>الموقع</span><strong dir="ltr">iiammar.com</strong></a>
              </nav>
            </div>
          </section>
          <div className="site-footer__policy">
            <nav aria-label="الترخيص والإشعارات">
              <a href="https://github.com/iiAMMAR11/Dhad/blob/main/NOTICE.md" target="_blank" rel="noreferrer">الإشعارات وحقوق المصادر</a>
              <a href="https://github.com/IBM/plex" target="_blank" rel="noreferrer">ترخيص IBM Plex Sans Arabic</a>
            </nav>
            <span>ضاد مفتوح المصدر تحت MIT، وخطه العربي مضمّن بأوزانه الثمانية تحت OFL-1.1 ويعمل بلا اتصال.</span>
          </div>
        </footer>
      </div>

      {toast && (
        <div className="dhad-toast-stack">
          <div className="dhad-toast" data-tone={toast.tone} role={toast.tone === 'danger' ? 'alert' : 'status'} aria-atomic="true" onMouseEnter={() => setToastPaused(true)} onMouseLeave={() => setToastPaused(false)} onFocus={() => setToastPaused(true)} onBlur={() => setToastPaused(false)} tabIndex={0}>
            <span>{toast.message}</span><button type="button" onClick={() => setToast(null)} aria-label="إغلاق الرسالة">إغلاق</button>
          </div>
        </div>
      )}

      {dialogOpen && (
        <div className="dhad-dialog-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) closeDialog(); }}>
          <section className="dhad-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
            <h2 id="delete-title">نقل العنصر إلى المحذوفات؟</h2>
            <p id="delete-description">لن يُحذف نهائيًا، ويمكن استعادته لاحقًا.</p>
            <div className="dhad-dialog__actions">
              <button className="dhad-btn dhad-btn--secondary" type="button" onClick={closeDialog}>إلغاء</button>
              <button className="dhad-btn dhad-btn--danger" type="button" onClick={() => { closeDialog(); notify('نُقل العنصر إلى المحذوفات', 'success'); }}>نقل إلى المحذوفات</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function TokenSwatch({ name, token, className }: { name: string; token: string; className: string }) {
  return <div className={`token ${className}`}><strong>{name}</strong><code dir="ltr">{token}</code></div>;
}

function WorkspaceSpecimen({
  symbolMap,
  projects,
  view,
  onViewChange,
  onNotify,
}: {
  symbolMap: typeof symbolSets[SymbolContext];
  projects: { name: string; meta: string; state: string }[];
  view: View;
  onViewChange: (view: View) => void;
  onNotify: (message: string, tone?: Toast['tone']) => void;
}) {
  const [projectQuery, setProjectQuery] = useState('');
  const visibleProjects = useMemo(() => {
    const normalizedQuery = normalizeArabic(projectQuery);
    if (!normalizedQuery) return projects;
    return projects.filter((project) => normalizeArabic(project.name).includes(normalizedQuery));
  }, [projectQuery, projects]);

  return (
    <section className="workspace" aria-labelledby="workspace-title">
      <header className="workspace__header">
        <div><span className="workspace__context"><DecorativeSymbol value={symbolMap.workspace} /> مثال: {symbolMap.label}</span><h2 id="workspace-title">المشاريع الحالية</h2></div>
        <button className="dhad-btn dhad-btn--primary" type="button" onClick={() => onNotify('أُضيف مشروع جديد', 'success')}>مشروع جديد</button>
      </header>
      <div className="workspace__tools">
        <label><span className="dhad-visually-hidden">ابحث في المشاريع</span><input className="dhad-input" type="search" placeholder="ابحث في المشاريع" value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} /></label>
        <div className="view-switcher" role="group" aria-label="طريقة العرض">
          <button type="button" aria-pressed={view === 'cards'} onClick={() => onViewChange('cards')}>بطاقات</button>
          <button type="button" aria-pressed={view === 'table'} onClick={() => onViewChange('table')}>جدول</button>
          <button type="button" aria-pressed={view === 'board'} onClick={() => onViewChange('board')}>لوحة</button>
        </div>
      </div>
      {!visibleProjects.length && <p className="workspace__empty" role="status">لا توجد مشاريع مطابقة.</p>}
      {view === 'cards' && <div className="workspace__cards">{visibleProjects.map((project) => <article key={project.name}><span className="workspace__symbol"><DecorativeSymbol value={symbolMap.collection} /></span><h3>{project.name}</h3><p>{project.state}</p><strong dir="ltr">{project.meta}</strong></article>)}</div>}
      {view === 'table' && <div className="workspace__table-wrap"><table><thead><tr><th scope="col">المشروع</th><th scope="col">الحالة</th><th scope="col">التقدم</th></tr></thead><tbody>{visibleProjects.map((project) => <tr key={project.name}><th scope="row"><DecorativeSymbol value={symbolMap.collection} /> {project.name}</th><td>{project.state}</td><td dir="ltr">{project.meta}</td></tr>)}</tbody></table></div>}
      {view === 'board' && <div className="workspace__board">{['قيد التنفيذ', 'مراجعة', 'مكتمل'].map((state) => <section key={state}><header><h3>{state}</h3><span>{visibleProjects.filter((project) => project.state === state).length}</span></header>{visibleProjects.filter((project) => project.state === state).map((project) => <article key={project.name}><DecorativeSymbol value={symbolMap.item} /><strong>{project.name}</strong><span dir="ltr">{project.meta}</span></article>)}</section>)}</div>}
    </section>
  );
}
