# اختبار التحمّل — تسجيل الحضور المتزامن (Attendance Load Test)

هذا السكربت يختبر تسجيل الحضور تحت الضغط: 100 → 250 → 500 → 750 → 1000 عملية متزامنة،
ويقيس زمن الاستجابة (P50/P95/P99)، معدل الأخطاء، ويتأكد من **عدم وجود تسجيل مزدوج**.

> ⚠️ **مهم:** هذا الاختبار يستخدم Firebase Client SDK مباشرة (نفس ما يستخدمه الموقع).
> على خطة Spark، الحد الأقصى للكتابات المتزامنة محدود، وقد تظهر أخطاء quota عند 1000.
> النتيجة الحقيقية 1000/1000 بدون أخطاء تتطلب عادةً خطة Blaze + Cloud Function.
> السكربت سيُظهر لك بالضبط أين يبدأ النظام في التباطؤ أو الفشل على خطتك الحالية.

## التشغيل

```bash
# 1) ثبّت الحزمة (مرة واحدة)
npm install firebase

# 2) شغّل الاختبار
node loadtest-attendance.mjs
```

عدّل قيم `firebaseConfig` بالأسفل لتطابق مشروعك (نفس القيم في `.env.local`).

---

```javascript
// loadtest-attendance.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, runTransaction, getDocs, collection, deleteDoc } from 'firebase/firestore'

// ====== عدّل دي بقيم مشروعك ======
const firebaseConfig = {
  apiKey: "AIzaSyAVMue4F40ECsy0R--zf8poA0x2ECDu5yk",
  authDomain: "orthopraxia.firebaseapp.com",
  projectId: "orthopraxia",
  storageBucket: "orthopraxia.firebasestorage.app",
  messagingSenderId: "451774324900",
  appId: "1:451774324900:web:59229d62b22cb80044c631"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const TEST_ITEM = 'loadtest_item'   // فقرة وهمية للاختبار
const STAGES = [100, 250, 500, 750, 1000]

// نفس منطق recordAttendance في الموقع (transaction + idempotency)
async function recordAttendance(personId) {
  const docId = `${TEST_ITEM}__${personId}`
  return runTransaction(db, async (tx) => {
    const ref = doc(db, 'attendanceScans', docId)
    const snap = await tx.get(ref)
    if (snap.exists()) return { duplicate: true }
    tx.set(ref, {
      itemId: TEST_ITEM, personId, points: 100,
      scanTime: new Date().toISOString(), id: docId
    })
    return { duplicate: false }
  })
}

function percentile(arr, p) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

async function cleanup() {
  const snap = await getDocs(collection(db, 'attendanceScans'))
  const dels = []
  snap.forEach(d => { if (d.id.startsWith(TEST_ITEM + '__')) dels.push(deleteDoc(d.ref)) })
  await Promise.all(dels)
  console.log(`  🧹 نظّفت ${dels.length} سجل اختبار`)
}

async function runStage(n) {
  console.log(`\n===== ${n} عملية متزامنة =====`)
  await cleanup()

  const latencies = []
  let ok = 0, dup = 0, err = 0
  const errors = {}

  const t0 = Date.now()
  const tasks = Array.from({ length: n }, (_, i) => {
    const start = Date.now()
    // كل العمليات على أشخاص مختلفين (أسوأ حالة: كلها كتابات جديدة)
    return recordAttendance('p' + i)
      .then(r => { latencies.push(Date.now() - start); r.duplicate ? dup++ : ok++ })
      .catch(e => { latencies.push(Date.now() - start); err++; const k = (e.code || e.message || 'unknown'); errors[k] = (errors[k] || 0) + 1 })
  })
  await Promise.all(tasks)
  const totalMs = Date.now() - t0

  // تأكد من عدم وجود تكرار: عدد السجلات لازم = عدد العمليات الفريدة
  const snap = await getDocs(collection(db, 'attendanceScans'))
  let recorded = 0
  snap.forEach(d => { if (d.id.startsWith(TEST_ITEM + '__')) recorded++ })

  console.log(`  ✅ نجح: ${ok}  | 🔁 مكرر (ممنوع): ${dup}  | ❌ خطأ: ${err}`)
  console.log(`  ⏱  الإجمالي: ${totalMs}ms  | Throughput: ${(n / (totalMs / 1000)).toFixed(1)} عملية/ث`)
  console.log(`  📊 P50: ${percentile(latencies, 50)}ms | P95: ${percentile(latencies, 95)}ms | P99: ${percentile(latencies, 99)}ms | Max: ${Math.max(...latencies)}ms`)
  console.log(`  🗄  سجلات فعلية في DB: ${recorded} (المتوقع: ${n})`)
  console.log(`  🔒 سلامة البيانات: ${recorded === n ? 'ممتازة ✓ (لا فقد ولا تكرار)' : '⚠️ تحقق — العدد مختلف'}`)
  if (err > 0) console.log(`  أنواع الأخطاء:`, errors)

  return { n, ok, dup, err, totalMs, p95: percentile(latencies, 95), recorded, integrity: recorded === n }
}

async function main() {
  console.log('🚀 بدء اختبار تحمّل تسجيل الحضور')
  console.log('   (كل مرحلة: أشخاص مختلفون، كتابات جديدة — أصعب سيناريو)')
  const results = []
  for (const n of STAGES) {
    try { results.push(await runStage(n)) }
    catch (e) { console.error(`فشلت مرحلة ${n}:`, e.message); break }
    await new Promise(r => setTimeout(r, 2000)) // راحة بين المراحل
  }

  console.log('\n\n════════ الملخص النهائي ════════')
  console.log('العمليات | نجح | خطأ | Throughput | P95 | سلامة')
  for (const r of results) {
    console.log(`${String(r.n).padStart(7)} | ${String(r.ok).padStart(4)} | ${String(r.err).padStart(3)} | ${(r.n/(r.totalMs/1000)).toFixed(0).padStart(6)}/ث | ${String(r.p95).padStart(5)}ms | ${r.integrity ? '✓' : '⚠️'}`)
  }
  const maxOk = results.filter(r => r.integrity && r.err === 0).map(r => r.n)
  console.log(`\n🏆 أقصى حِمل ناجح بالكامل (0 أخطاء + سلامة تامة): ${maxOk.length ? Math.max(...maxOk) : 'أقل من 100'} عملية متزامنة`)

  console.log('\n🧹 تنظيف نهائي...')
  await cleanup()
  console.log('✅ خلص. لو شفت أخطاء quota عند الأرقام الكبيرة، ده حد خطة Spark — الحل Blaze + Cloud Function.')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
```

---

## تفسير النتائج

- **P95 / P99**: 95% / 99% من العمليات خلصت في الزمن ده أو أقل. لو P95 تحت ~1500ms فده كويس لحدث مباشر.
- **سلامة البيانات**: أهم رقم — لازم عدد السجلات = عدد العمليات، ومفيش تكرار. الـ transaction بيضمن ده.
- **معدل الأخطاء**: على Spark متوقع تبدأ أخطاء `resource-exhausted` عند الأحمال العالية. سجّل الرقم اللي بيبدأ عنده.

## القيود على Spark (المهم تعرفه)

1. الدرجة (`points`) بتتحسب على جهاز العميل — قابلة للتلاعب من DevTools. الحل: Cloud Function تقرأ وقت السيرفر.
2. مفيش rate limiting على مستوى السيرفر.
3. حد الكتابات المتزامنة أقل من Blaze.

كل دي بتتحل بترقية Blaze + Cloud Functions، وساعتها نحوّل `recordAttendance` لـ callable function.
