# نواة Dhad للويب

نقطة بداية عربية RTL بلا إطار عمل. بلا اعتماديات إطلاقًا: خط IBM Plex Sans Arabic مضمّن بأوزانه الثمانية في `fonts/` ويعمل بلا اتصال. القيم مولّدة من المصدر الموحّد `../tokens/dhad.tokens.json`، والمكوّنات منفصلة عن أنماط المنتج ووصفات المجال.

## الاستيراد

ثبّت الاعتمادية المعلنة في `package.json` أولًا:

```bash
npm install
```

```html
<html lang="ar" dir="rtl" data-dhad-theme="dark">
  <head>
    <link rel="stylesheet" href="./node_modules/@ibm/plex-sans-arabic/css/ibm-plex-sans-arabic-all.css">
    <link rel="stylesheet" href="./css/dhad.tokens.css">
    <link rel="stylesheet" href="./css/dhad.core.css">
    <link rel="stylesheet" href="./css/dhad.patterns.css">
  </head>
  <body class="dhad-app">
    <script src="./js/dhad.runtime.js"></script>
  </body>
</html>
```

أضف `dhad.recipes-production.css` و`dhad.recipes-production.js` فقط عندما يحتاج المنتج فعلًا إلى مفاهيم المشاهد، المقاطع، التايم كود أو مراحل إنتاج المحتوى. أضف `dhad.recipes-shared-expenses.css` فقط لتدفقات المصاريف المشتركة والتقسيم والأرصدة والتسويات؛ الحسابات والتحويلات تبقى مسؤولية المنتج المضيف.

## الطبقات

- `dhad.tokens.css`: التوكنز المولّدة للوضعين الداكن والفاتح والكثافتين.
- `dhad.core.css`: الطباعة، الأزرار، الحقول، البطاقات، حالة الاختيار المحايدة، المال، الحالة، التقدم، decision dialogs، task-form dialogs والـtoast.
- `dhad.patterns.css`: التنقل، tabs، segmented radio، طرق العرض، summaries، ledger rows، compact charts، الجداول، اللوحات والمحرر.
- `dhad.recipes-production.css`: وصفات مجال اختيارية مستقلة عن النواة.
- `dhad.recipes-shared-expenses.css`: تركيب بصري اختياري لوصفة المصاريف المشتركة، بلا منطق محاسبي.
- `dhad.runtime.js`: سلوك الثيم، الحوار، toast، disclosure، tabs، segmented radio، طرق العرض والرموز المتكيّفة.

## الاختيار والقيم المختلطة

- لا تستخدم success لتلوين checkbox يعبّر عن اختيار عادي. استعمل selection؛ احتفظ بـcompletion لقوائم الإنجاز.
- لا تتبادل tabs وsegmented radio وview switcher لمجرد تشابه الشكل. لكل منها عقد keyboard وARIA مختلف.
- اعزل تعبير المال كاملًا LTR ونسّقه عبر API المنصة. استخدم tabular figures عند المحاذاة، لا monospace.
- التحويل الثانوي التقريبي يحتاج وسمًا نصيًا وحالة freshness من المنتج المضيف.

## الإيموجي والرموز

لا يفرض النظام قاموس إيموجي ثابتًا. ابدأ بوضع `inherit` لاتباع هوية المنتج المضيف، أو مرّر قاموسًا خاصًا بالمجال:

```js
Dhad.configureSymbols({
  mode: "emoji",
  map: { workspace: "🎓", collection: "📚", item: "📝", complete: "✅" }
});
```

الانتقال بين `emoji` و`icon` و`none` و`inherit` قابل للعكس؛ يعيد `inherit` محتوى المضيف وسماته الأصلية، ولا تمسح الخريطة الجزئية رمزًا غير معرّف. في وضع الأيقونات مرّر اسم الأيقونة مع renderer يعيد عقدة DOM فعلية:

```js
Dhad.configureSymbols({
  mode: "icon",
  map: { workspace: { icon: "workspace" } },
  renderIcon(name) {
    return document.querySelector(`#icon-${name}`).content.firstElementChild;
  }
});
```

ضع `aria-label` على التحكم الرمزي نفسه. الرمز الزخرفي يُخفى عن قارئ الشاشة، أما الرمز المعلوماتي المنفرد فيحافظ على `role="img"` واسمه المتاح.

## الخطوط

الخط الوحيد هو IBM Plex Sans Arabic (OFL-1.1) مضمّنًا في `fonts/`، ثم خطوط النظام العربية كاحتياط لحظة التحميل فقط. التسلسل الهرمي بالوزن والحجم واللون وفق references/fonts.md — لا عائلة عربية ثانية.

للويب ثبّت حزمة IBM الرسمية:

```bash
npm install @ibm/plex-sans-arabic
```

```scss
@use '@ibm/plex-sans-arabic/scss' as PlexSansArabic;
@include PlexSansArabic.all();
```

في Native لا يسجّل استيراد npm الخط. إمّا أن يدمج التطبيق ملفات IBM ويسجّلها وفق OFL-1.1 مع إشعار الترخيص، أو يحدد fallback عربيًا من المنصة وقت التشغيل.

## التحقق

من مجلد Starter:

```bash
node --check js/dhad.runtime.js
python3 -m json.tool ../tokens/dhad.tokens.json >/dev/null
```

اختبر RTL وLTR المحلي، الثيمين، 320px و390px و600px وسطح المكتب، tabs وsegmented radio بلوحة المفاتيح، التكبير، الحركة المخفّضة، العملات المختلفة، وحالات الخطأ وعدم الاتصال قبل اعتماد واجهة المنتج.
