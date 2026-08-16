# خطوات ربط Firebase — Orthopraxia

الموقع يعمل فوراً في **الوضع التجريبي (Demo)** بدون Firebase (البيانات تُحفظ محلياً على الجهاز).
لتفعيل المزامنة بين كل الأجهزة (ضروري أثناء الخلوة لأن المنظمين على أجهزة مختلفة)، اتبع الخطوات:

## 1. إنشاء مشروع Firebase
1. افتح https://console.firebase.google.com
2. اضغط **Add project** وسمِّه مثلاً `orthopraxia`.
3. تجاهل Google Analytics (اختياري).

## 2. تفعيل Firestore
1. من القائمة الجانبية: **Build → Firestore Database → Create database**.
2. اختر **Start in production mode** ثم اختر أقرب منطقة (مثلاً `eur3`).
3. بعد الإنشاء، افتح تبويب **Rules** والصق محتوى ملف `firestore.rules` الموجود في المشروع، ثم **Publish**.

## 3. الحصول على مفاتيح الويب
1. اذهب إلى **Project settings** (رمز الترس) → قسم **Your apps**.
2. اضغط أيقونة الويب `</>` وسجّل تطبيق ويب باسم `orthopraxia-web`.
3. ستظهر لك قيم `firebaseConfig`. انسخها.

## 4. وضع المفاتيح في Vercel
عند رفع المشروع على Vercel، افتح:
**Project → Settings → Environment Variables** وأضف هذه المتغيرات (بنفس الأسماء):

```
VITE_FIREBASE_API_KEY            = ...
VITE_FIREBASE_AUTH_DOMAIN        = orthopraxia.firebaseapp.com
VITE_FIREBASE_PROJECT_ID         = orthopraxia
VITE_FIREBASE_STORAGE_BUCKET     = orthopraxia.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID= ...
VITE_FIREBASE_APP_ID             = ...
```

ثم أعد النشر (**Redeploy**). بمجرد وجود المفاتيح، يخرج الموقع تلقائياً من الوضع التجريبي.

> للتجربة محلياً: انسخ `.env.example` إلى `.env.local` وضع نفس القيم، ثم `npm run dev`.

## 5. أول تشغيل
- عند فتح الموقع لأول مرة والـ Firestore فارغ، يقوم التطبيق تلقائياً بزرع:
  - **البرنامج الكامل** (المستخرج من الـPDF).
  - **4 فرق** فارغة.
  - **الإعدادات** الافتراضية (كلمة مرور الأدمن `000`، النتائج مخفية).
- ادخل كأدمن (اضغط على اللوجو في أسفل الصفحة الرئيسية **3 مرات** ثم اكتب `000`).
- من لوحة التحكم: أضف الفرق والمخدومين، واطبع الكارنيهات.

## 6. (اختياري) تفعيل Push Notifications — FCM
البنية جاهزة لذلك. الإشعارات تُحفظ في مجموعة `notifications`.
لإرسالها فعلياً كإشعارات Push:
1. فعّل **Cloud Messaging** من Firebase.
2. أنشئ **Cloud Function** تستمع لإضافات مجموعة `notifications` وترسل عبر FCM
   إلى الجمهور المناسب (`audience`: all / team).
3. أضف `firebase-messaging-sw.js` وسجّل الأجهزة للحصول على FCM tokens.

> لم يتم تفعيل الإرسال الفعلي حتى لا نفترض إعداداً معيناً؛ لكن كل الحقول والبنية جاهزة.
