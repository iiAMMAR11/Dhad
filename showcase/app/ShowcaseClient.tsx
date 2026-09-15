'use client';

import { useState } from 'react';

const installCommand = '$skill-installer ثبّت dhad من https://github.com/iiAMMAR11/Dhad';

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
          <a href="#how">كيف يعمل؟</a>
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
