# تثبيت Dhad

خلال المراجعة النهائية ثبّت من المصدر. بعد الاعتماد سيحتوي **Release 1** على حزمتين مبنيتين من السكيل نفسه؛ التقسيم حسب بيئة التثبيت وليس حسب إصدار النظام.

## حزمة OpenAI: ChatGPT وCodex

الحزمة: `Dhad-openai-plugin.zip`

### ChatGPT وCodex Plugins

1. افتح دليل Plugins في ChatGPT أو متصفح Plugins في Codex CLI.
2. ثبّت `Dhad` بعد اعتماده في الدليل العام.
3. ابدأ محادثة أو جلسة جديدة، ثم استدعِه من محدد `@` في ChatGPT أو باسم `$dhad` في Codex. ويمكن للمنتج اختياره تلقائيًا عندما يطابق الطلب وصفه.

هذه حزمة `Skills only` ولا تحتاج حسابًا خارجيًا أو MCP. ملف ZIP هو ملف الإرسال إلى دليل OpenAI، ويحتوي `INSTALL.md` يشرح القناتين.

### Codex IDE أو التثبيت المحلي

Plugins غير مدعومة داخل امتداد Codex للـIDE. استخدم السكيل المتداخل في الحزمة نفسها: فك الضغط وانقل `skills/dhad/` إلى أحد المسارين:

```text
$HOME/.agents/skills/dhad/
<repository>/.agents/skills/dhad/
```

أو ثبّته من المستودع باستخدام Skill Installer:

```text
$skill-installer ثبّت dhad من https://github.com/iiAMMAR11/Dhad
```

## حزمة Agent Skill: Claude Chat وClaude Code

الحزمة: `Dhad-agent-skill.zip`

الحزمة Agent Skill خالصة ولا تحتوي على `.claude-plugin`.

### Claude Chat

1. فعّل `Code execution and file creation` إن كان حسابك أو نطاق العمل يطلب ذلك.
2. افتح `Customize > Skills`.
3. اضغط الإضافة، ثم `Create skill` و`Upload a skill`.
4. ارفع ملف ZIP كما هو، ثم فعّل السكيل.
5. اطلب تطبيق Dhad على منتجك؛ يتولى Claude اختياره تلقائيًا.

### Claude Code

فك الضغط، ثم انقل مجلد `dhad` إلى أحد المسارين:

```text
~/.claude/skills/dhad/           # لكل المشاريع
<project>/.claude/skills/dhad/   # لهذا المشروع فقط
```

الاستدعاء المباشر:

```text
/dhad صمّم واجهة التطبيق الحالية
```

يمكن لـClaude Code تفعيله تلقائيًا عندما يطابق الطلب وصف الـSkill.

## دمجه مباشرة في مشروع برمجي

لا تحتاج إلى منصة محادثة لاستخدام النواة:

- الويب: انسخ `assets/starter/css/` و`assets/starter/js/`، واستخدم المصدر الموحّد `assets/tokens/dhad.tokens.json` عند ربط token pipeline.
- مشروع قائم: انسخ القيم المطلوبة إلى نظام الثيم والمكوّنات الحالي.
- React Native وFlutter وSwiftUI: استخدم الخرائط في `assets/examples/` و`references/platforms.md` كـtheme starters، لا كمكتبات مكوّنات مكتملة.
- Android وCompose: ابدأ من `assets/examples/android-compose/DhadTheme.kt` ثم اربطه بثيم التطبيق؛ هذه خريطة theme مولّدة وليست مكتبة مكوّنات.

## قبل النشر العام

- اختبر الاستدعاء المباشر والضمني على كل قناة مستهدفة.
- شغّل اختبارات التباين والوصول وRTL والحزم العامة.
- تأكد أن ZIP لا يحتوي خطوطًا غير مصرّح بها أو أسرارًا أو بيانات من أي منتج مصدر.
- لا تنشر الحزمتين قبل اعتماد المعرض والنتيجة النهائية؛ عند الاعتماد تُنشران مع `SHA256SUMS.txt` داخل Release 1.
