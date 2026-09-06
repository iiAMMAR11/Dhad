# حالة المكوّنات

هذه الصفحة تفصل ما تنفذه الحزمة عما توثقه بوصفه وصفة أو نقطة بداية. الحالة لا تعني أن المنتج المضيف يستطيع تجاوز اختبارات الوصول والتكامل الخاصة به.

## تعريف الحالات

| الحالة | المعنى |
|---|---|
| `stable` | عقد موثق واجتاز بوابة الاختبار العامة |
| `beta` | تنفيذ عامل، لكنه لم يُعتمد نهائيًا أو ما زالت تغطيته تتوسع |
| `recipe` | تركيب إرشادي يحتاج تنفيذ المنتج المضيف |
| `experimental` | استكشاف غير مستقر، لا يعتمد عليه في الإنتاج |

قبل نشر Release 1 تبقى الأصول المنفذة `beta` حتى اكتمال الاعتماد البصري ونتائج الاختبارات. عند اجتياز البوابة، تُرقّى الأصول التي استوفت العقد فقط إلى `stable`.

## Web foundation

| الأصل | النوع | الحالة | الملاحظات |
|---|---|---|---|
| التوكنز الدلالية والثيمان | Implemented | `beta` | يجب أن تكون المصدر نفسه للstarter والمعرض |
| Typography roles وجزر LTR | Implemented | `beta` | IBM Plex Sans Arabic مضمّن بأوزانه الثمانية ويعمل بلا اتصال |
| Layout utilities وshell | Implemented | `beta` | RTL وresponsive |
| Buttons وicon buttons | Implemented | `beta` | تحقق من 44×44 وloading وaccessible names |
| Fields وvalidation | Implemented | `beta` | label وhelp وerror حقيقية، لا placeholder فقط |
| Cards وsurfaces | Implemented | `beta` | النواة عامة؛ أسماء المجال تبقى recipes |
| Status وsave/sync/offline | Implemented | `beta` | نص/شكل مع اللون و`aria-live` للتغييرات المهمة |
| Progress | Implemented | `beta` | يبدأ من اليمين ويعرض قيمة نصية |
| Toast | Implemented | `beta` | transient feedback فقط |
| Dialog / sheet | Implemented | `beta` | ينفذ focus trap وinert وscroll lock وqueue واستعادة التركيز؛ يلزم إعادة اختباره داخل إطار المنتج |
| Navigation وview switcher | Pattern | `beta` | يحتاج ربط router وحالة التطبيق المضيف |
| Search / filters / table | Pattern | `beta` | المنطق والبيانات مسؤولية المنتج |
| Kanban | Pattern | `beta` | يوفر runtime نقلًا بلوحة المفاتيح وأزرارًا بديلة؛ البيانات والحفظ مسؤولية المنتج |
| Empty / loading / error / permission | Pattern | `beta` | لا تخلط غياب البيانات مع فشل التحميل |

## وصفات إنتاج المحتوى

| الوصفة | الحالة | الحدود |
|---|---|---|
| Segment / shot / checklist | `recipe` | أمثلة مجال يمكن إعادة تركيبها فقط عند تطابق النموذج |
| Timecode | `recipe` | يعتمد على تنسيق الزمن ومنطق المنتج |
| Editor / minimal writer | `recipe` | لا توجد مكتبة تحرير كاملة ضمن النواة |
| Teleprompter | `recipe` | يحتاج منطق التشغيل والمزامنة واختبارات جهازية |
| Sharing / roles / view-only | `recipe` | الصلاحيات والخادم خارج نظام التصميم |
| Import / export | `recipe` | توثيق تجربة الحالات؛ خوارزميات الملفات خارج النواة |

## المنصات

| المنصة | الأصل المتاح | الحالة |
|---|---|---|
| React Native / Expo | typed theme starter | `beta` starter، لا component library |
| Flutter | typed token/theme map | `beta` starter، لا `ThemeData` مكتمل ولا widget library |
| SwiftUI | theme starter | `beta` starter، لا view library |
| Android / Compose | typed theme starter مولّد | `beta` starter، لا component library |
| Electron / Tauri | Web mapping | يتبع حالة Web foundation |

## ترقية الحالة

ترقية أصل إلى `stable` تحتاج API موثقًا، كل الحالات ذات الصلة، اختبار RTL والنص الطويل والاستجابة، لوحة المفاتيح وقارئ الشاشة والتباين والحركة المخفّضة، مثالًا حيًا، واختبار regression. راجع [GOVERNANCE.md](../GOVERNANCE.md).
