'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const installCommand = '$skill-installer ثبّت dhad من https://github.com/iiAMMAR11/Dhad';

export default function ShowcaseClient() {
  const [theme, setTheme] = useState<Theme>('light');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      try {
        const saved = window.localStorage.getItem('dhad-showcase-theme');
        setTheme(saved === 'dark' || saved === 'light' ? saved : preferred);
      } catch {
        setTheme(preferred);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('dhad-showcase-theme', theme);
    } catch {
      // The visible theme still works when storage is unavailable.
    }
  }, [theme]);

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
        <a className="brand" href="#main" aria-label="ضاد، البداية">
          ضاد
        </a>
        <p>مهارة عربية لكل نوع من العمل</p>
        <nav aria-label="روابط الصفحة">
          <a href="#install">التثبيت</a>
          <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? 'داكن' : 'فاتح'}
          </button>
        </nav>
      </header>

      <main id="main">
        <section className="story" aria-labelledby="story-title">
          <div className="hero">
            <span className="hero-letter" aria-hidden="true">ض</span>
            <div className="hero-copy">
              <h1 id="story-title">العربية أولًا.</h1>
              <p>ضاد مهارة تساعد أدوات الذكاء الاصطناعي على صنع مواقع وملفات وعروض وصور أوضح، بعربية صحيحة وهوية لا تضيع.</p>
            </div>
          </div>

          <div className="method" aria-label="آلية عمل ضاد">
            <p><strong>يفهم المطلوب</strong><span>من سيستخدم العمل؟ وماذا يجب أن يفهم أو يفعل؟</span></p>
            <p><strong>يضبط التفاصيل</strong><span>الاتجاه، والمسافات، والأرقام، والألوان، وحالات الأزرار.</span></p>
            <p><strong>يختبر النتيجة</strong><span>على الهاتف، وفي المتصفح، وداخل PDF أو الصورة نفسها.</span></p>
          </div>

          <div className="advantages">
            <h2>أبرز ما يضيفه ضاد</h2>
            <p>عربية سليمة، قراءة مريحة، خطوات مفهومة، بحث أذكى، تواريخ وأرقام مناسبة للبلد، وهوية المشروع كما هي.</p>
          </div>

          <div className="example" aria-labelledby="example-title">
            <header>
              <h2 id="example-title">مثال واقعي: إعلان دورة</h2>
              <p>طلب بسيط يدخل، ونتيجة واضحة تخرج.</p>
            </header>

            <div className="example-flow">
              <article className="brief">
                <h3>المطلوب</h3>
                <p>أنشئ إعلانًا عربيًا لدورة مباشرة عن تصميم الواجهات. الأحد 20 سبتمبر، الساعة 8 مساءً بتوقيت الرياض، والتسجيل عبر رابط إنجليزي.</p>
              </article>

              <div className="transform" aria-label="يعالجه ضاد">
                <strong>ضاد</strong>
                <span>يضبطه</span>
              </div>

              <figure className="result">
                <figcaption>النتيجة</figcaption>
                <div className="poster" role="img" aria-label="إعلان عربي واضح لدورة مباشرة">
                  <p className="poster-type">دورة مباشرة</p>
                  <h3>صمّم بالعربية</h3>
                  <p className="poster-copy">من الفكرة إلى شاشة سهلة القراءة والاستخدام.</p>
                  <dl>
                    <div><dt>الموعد</dt><dd>الأحد، ٢٠ سبتمبر</dd></div>
                    <div><dt>الوقت</dt><dd>٨:٠٠ مساءً - بتوقيت الرياض</dd></div>
                  </dl>
                  <p className="poster-action">التسجيل: <bdi dir="ltr">example.com/arabic-ui</bdi></p>
                </div>
              </figure>
            </div>
          </div>
        </section>

        <section className="install" id="install" aria-labelledby="install-title">
          <div className="install-copy">
            <h2 id="install-title">ثبّت ضاد.<br />وابدأ بالطلب.</h2>
            <p>حمّل الملف المناسب، أضفه إلى أداتك، ثم اطلب منها تنفيذ العمل بمهارة ضاد.</p>
          </div>

          <div className="install-actions">
            <div className="downloads">
              <a href="https://github.com/iiAMMAR11/Dhad/releases/latest/download/Dhad-openai-plugin.zip">
                <strong>ChatGPT وCodex</strong>
                <span>Dhad-openai-plugin.zip</span>
                <b>تحميل</b>
              </a>
              <a href="https://github.com/iiAMMAR11/Dhad/releases/latest/download/Dhad-agent-skill.zip">
                <strong>Claude</strong>
                <span>Dhad-agent-skill.zip</span>
                <b>تحميل</b>
              </a>
            </div>

            <div className="command">
              <code><bdi dir="ltr">$skill-installer</bdi> ثبّت <bdi dir="ltr">dhad</bdi> من <bdi dir="ltr">github.com/iiAMMAR11/Dhad</bdi></code>
              <button type="button" onClick={copyInstall}>{copyState === 'copied' ? 'نُسخ' : 'نسخ الأمر'}</button>
            </div>
            <p className={`copy-status copy-status--${copyState}`} aria-live="polite">
              {copyState === 'failed' ? 'تعذّر النسخ. انسخ الأمر يدويًا.' : copyState === 'copied' ? 'الأمر جاهز للصق.' : ''}
            </p>
          </div>
        </section>
      </main>

      <footer className="owner">
        <div>
          <p>صاحبها ومطوّرها</p>
          <h2>عمَّار</h2>
        </div>
        <p>ضاد عمل مستقل طوّره عمَّار بعد أسابيع من الدراسة والتجربة والتحسين. شكرًا لمرصاد، وثمانية، ورياضة ثمانية، وللمهارات والمنتجات العربية التي وسّعت الدراسة.</p>
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
