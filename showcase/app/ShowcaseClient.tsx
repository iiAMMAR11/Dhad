'use client';

import { useState, type ReactNode } from 'react';

const installCommand = '$skill-installer ثبّت dhad من https://github.com/iiAMMAR11/Dhad';

/* A fixed instant keeps the server and the browser rendering the same date. */
const sampleDate = new Date(Date.UTC(2026, 8, 15));
const arabicDigits = new Intl.NumberFormat('ar-SA-u-nu-arab');
const hijri = new Intl.DateTimeFormat('ar-SA-u-nu-arab', { calendar: 'islamic-umalqura', dateStyle: 'long' });
const riyal = new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' });
const plural = new Intl.PluralRules('ar');
const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });

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

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">تخطَّ إلى المحتوى</a>

      <header className="masthead">
        <a className="brand" href="#main" aria-label="ضاد، البداية">ضاد</a>
        <p>مهارة عربية لكل نوع من العمل</p>
        <nav aria-label="روابط الصفحة">
          <a href="#journey">الفرق</a>
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
                <span>عملك يستحق</span>
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
                <strong>لا ينسى الحالات الصعبة</strong>
                <span>يجهّز التحميل والفراغ والخطأ وانقطاع الاتصال.</span>
                <b className="status status--assistive">تجربة مكتملة</b>
              </div>
            </div>
          </div>
        </section>

        <section className="journey" id="journey" aria-labelledby="journey-title">
          <div className="journey-heading">
            <h2 id="journey-title">هذا هو الفرق. أمامك، الآن.</h2>
            <p>
              كل لوح في اليمين مرسوم في متصفحك هذه اللحظة، لا صورة ولا وعد.
              انزل ببطء، وسترى ما الذي يصلحه ضاد في كل مرحلة من العمل.
            </p>
          </div>

          <ol className="stages">
            <Stage
              number="١"
              title="المسافة والتشكيل"
              lead="أول ما يُكسر في العربية: سطر ضيّق تتلامس فيه الحركات والهمزات، ونص ملاصق للإطار."
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
              lead="حين تنسى الأداة اتجاه العربية تبدأ الجملة من اليسار، وتهاجر النقطة والفاصلة إلى الطرف الخطأ."
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
              lead="العربية ستّ صيغ لا اثنتان. «١١ ملف» خطأ لغوي يراه قارئك قبل أن يراه المطوّر."
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
              title="التاريخ والمال والأرقام"
              lead="التقويم والعملة ونظام الأرقام تتبع بلد جمهورك، لا الإعداد الافتراضي للأداة."
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
              lead="الترتيب الافتراضي يخلط الألفات، والبحث عن «احمد» لا يجد «أحمد»."
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
          </ol>

          <p className="journey-close">
            خمس مراحل هنا، وضاد يفحص عشرات غيرها في كل عمل: الحالات الفارغة، والخطأ،
            وانقطاع الاتصال، ولوحة المفاتيح، والتكبير، والهاتف، والملف بعد تصديره.
          </p>
        </section>

        <section className="install" id="install" aria-labelledby="install-title">
          <div className="install-copy">
            <h2 id="install-title">ثبّت ضاد.<br />وابدأ بالطلب.</h2>
            <p>اختر الملف المناسب، أضفه إلى أداتك، ثم اطلب منها تنفيذ العمل باستخدام ضاد.</p>
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
              <button type="button" onClick={copyInstall}>
                {copyState === 'copied' ? 'نُسخ' : 'نسخ الأمر'}
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
