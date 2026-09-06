# نقطة بداية ضاد للويب

توكنز ومكوّنات وسلوكيات عامة قابلة للاستبدال. هوية المشروع وخطه واتجاه لغته هي الأصل.

## الاستيراد

```html
<html lang="ar" dir="rtl" data-dhad-theme="auto">
  <link rel="stylesheet" href="./css/dhad.tokens.css">
  <link rel="stylesheet" href="./css/dhad.core.css">
  <link rel="stylesheet" href="./css/dhad.patterns.css">
  <body class="dhad-app">
    <script src="./js/dhad.runtime.js"></script>
  </body>
</html>
```

استخدم `dhad.tokens.css` وحده إذا كان للمشروع نظام مكوّنات. استورد `core` و`patterns` فقط عند الحاجة، ولا تستبدل مكوّنات مضيفة عاملة.

## الهوية

القيم الافتراضية للعرض التجريبي فقط. غيّر المتغيرات الدلالية أو اربطها بتوكنز مشروعك. لا تحتاج إلى خط ضاد أو ألوانه أو زواياه لتطبيق المهارة.

خط IBM Plex Sans Arabic مرفق كخيار محلي تحت OFL-1.1. لتفعيله أضف `data-dhad-font="plex"` إلى الحاوية. اتركه دون السمة ليرث خط النظام أو المشروع.

## التحقق

```bash
node --check js/dhad.runtime.js
python3 -m json.tool ../tokens/dhad.tokens.json
```

اختبر الاتجاه المختلط والنص الطويل ولوحة المفاتيح والتكبير والحركة المخفّضة والحالات التي يستعملها منتجك.
