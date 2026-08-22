/*
  Program extracted from the retreat PDF (updated version).
  المقدم column omitted. Empty places left empty.
  Teams + all members from الفرق.xlsx.
*/

const day1 = 'الخميس 27 أغسطس 2026'
const day2 = 'الجمعة 28 أغسطس 2026'
const day3 = 'السبت 29 أغسطس 2026'

// helper to build participant objects
function mk(prefix, teamId, names) {
  return names.map((name, i) => {
    const id = `${prefix}${String(i + 1).padStart(2, '0')}`
    return { id, name, teamId, qr: id, phone: '', active: true }
  })
}

const diakonia = mk('dk', 'team_diakonia', [
  'فادى أشرف', 'فيفيان ميشيل', 'كيرلس مينا', 'مينا ملاك', 'ثابت البطل',
  'سامى رياض', 'مينا أيمن', 'يوسف فهيم', 'جون طارق', 'منى وائل',
  'مهرائيل ناجح', 'يوستنا سعيد', 'يوستينا عادل', 'كلارا كمال', 'إيفيتا نادر',
  'مريم عماد نبيل', 'دميانه عماد', 'كاترين سعد', 'مريم فوزى'
])
const metania = mk('mt', 'team_metania', [
  'يوسف صبرى', 'هناء فوزى', 'بيشوى صبرى', 'جون هانى', 'كيرلس ايهاب',
  'تيمون نادر', 'رياض رضا', 'كارول سامى', 'لوجى عطا لله', 'مريم ايهاب',
  'سارة ايهاب', 'كاترين مدحت امين', 'كرستين مدحت أمين', 'نانى ماجد', 'مارينا عاطف',
  'مارو وليد', 'بساده وهيب نبيل', 'محب أديب', 'ماجى مراد أمين'
])
const kinonia = mk('kn', 'team_kinonia', [
  'كيرلس ماهر', 'بيشوى ايمن', 'جون تامر', 'صفوت محب', 'ماريو أشرف',
  'مينا ماهر', 'بيشوى ايوب', 'مينا ابراهيم', 'مينا ناجح', 'كرستين عدلى',
  'مريم سمير', 'إيرينى ناروز', 'مهرائيل مجدى مرتجى', 'جومانه هانى', 'مارينا وجيه أنيس',
  'مريم فايز', 'دميانه مينا', 'مريم وائل', 'مارينا مجدى مرتجى'
])
const martiria = mk('mr', 'team_martiria', [
  'نردين نشأت', 'نرفين نشات', 'مايكل أشرف', 'مينا ملاك', 'مينا منير',
  'مينا إيهاب', 'أنطونيوس جورج', 'إبرام هانى عزيز', 'بافلى هشام زكريا', 'بارتى هشام زكريا',
  'ملاك صبحى', 'مادونا وجيه', 'نورا عوض', 'ريموندا عماد', 'مريم فارس',
  'ساندى وجيه', 'سارة أشرف', 'مريم عادل', 'كارين كمال نبيل'
])

export const SEED = {
  settings: {
    retreatName: 'Orthopraxia',
    subtitle: 'خلوة اجتماع الشباب',
    about:
      'خلوة روحية لاجتماع الشباب — أيام من الصلاة والتعليم واللقاء معًا. ' +
      'هذا النص قابل للتعديل من لوحة التحكم.',
    adminPassword: '000',
    adminTapCount: 3,
    leaderboardVisible: false,
    mainVideoVisible: false,
    points: {
      startTime: '19:00',
      tiers: [
        { untilTime: '19:15', points: 100 },
        { untilTime: '19:30', points: 50 },
        { untilTime: '23:59', points: 0 }
      ]
    }
  },

  teams: [
    { id: 'team_metania',  name: 'ميطانيا',  color: '#3E8B4F', leader: 'يوسف صبرى',   order: 1, bonusPoints: 0 },
    { id: 'team_diakonia', name: 'دياكونيا', color: '#5B9BD5', leader: 'فادى أشرف',   order: 2, bonusPoints: 0 },
    { id: 'team_kinonia',  name: 'كينونيا',  color: '#C0392B', leader: 'كيرلس ماهر',  order: 3, bonusPoints: 0 },
    { id: 'team_martiria', name: 'مارتيريا', color: '#F1C40F', leader: 'نردين نشأت',  order: 4, bonusPoints: 0 }
  ],

  program: [
    // ---- Day 1 : Thursday ----
    { id: 'p1',  day: day1, order: 1,  time: '11:00 ص - 12:00 ظ', title: 'التسكين', place: '' },
    { id: 'p2',  day: day1, order: 2,  time: '12:00 ظ - 12:30 ظ', title: 'Welcome Drink', place: '' },
    { id: 'p3',  day: day1, order: 3,  time: '12:30 ظ - 1:00 ظ',  title: 'صالة', place: 'قاعة' },
    { id: 'p4',  day: day1, order: 4,  time: '1:00 ظ - 2:00 م',   title: 'التعليمات + تقسيم الفرق', place: 'قاعة' },
    { id: 'p5',  day: day1, order: 5,  time: '2:00 م - 3:00 م',   title: 'محاضرة 1', place: 'قاعة' },
    { id: 'p6',  day: day1, order: 6,  time: '3:00 م - 4:00 م',   title: 'الغداء', place: 'المطعم' },
    { id: 'p7',  day: day1, order: 7,  time: '4:00 م - 5:00 م',   title: 'Escape Bible', place: 'قاعة' },
    { id: 'p8',  day: day1, order: 8,  time: '5:00 م - 6:00 م',   title: 'محاضرة 2', place: 'قاعة' },
    { id: 'p9',  day: day1, order: 9,  time: '6:00 م - 7:00 م',   title: 'بسين الشابات', place: '' },
    { id: 'p10', day: day1, order: 10, time: '7:00 م - 8:00 م',   title: 'بسين الشباب', place: '' },
    { id: 'p11', day: day1, order: 11, time: '9:00 م - 10:00 م',  title: 'العشاء', place: 'المطعم' },
    { id: 'p12', day: day1, order: 12, time: '10:00 م - 11:00 م', title: 'صالة النوم + تسبحة', place: 'الكنيسة' },
    { id: 'p13', day: day1, order: 13, time: '11:00 م - 12:00 م', title: 'قعدة زردة', place: 'الملعب الكبير' },

    // ---- Day 2 : Friday ----
    { id: 'p14', day: day2, order: 14, time: '8:00 ص - 10:00 ص',  title: 'القداس', place: 'الكنيسة' },
    { id: 'p15', day: day2, order: 15, time: '10:00 ص - 11:00 ص', title: 'الفطار', place: 'المطعم' },
    { id: 'p16', day: day2, order: 16, time: '11:00 ص - 12:00 ظ', title: 'لعبة القضية', place: '' },
    { id: 'p17', day: day2, order: 17, time: '12:00 ظ - 2:00 م',  title: 'الورش: دراسة كتاب / الخلوة / ورشة عمل / ثيرابى', place: '4 قاعات' },
    { id: 'p18', day: day2, order: 18, time: '2:00 م - 3:00 م',   title: 'محاضرة 3', place: 'قاعة' },
    { id: 'p19', day: day2, order: 19, time: '3:00 م - 4:00 م',   title: 'الغداء', place: '' },
    { id: 'p20', day: day2, order: 20, time: '4:00 م - 5:00 م',   title: 'بسين الشابات', place: 'البسين' },
    { id: 'p21', day: day2, order: 21, time: '5:00 م - 6:00 م',   title: 'بسين الشباب', place: 'البسين' },
    { id: 'p22', day: day2, order: 22, time: '7:00 م - 9:00 م',   title: 'ألعاب', place: 'الملاعب' },
    { id: 'p23', day: day2, order: 23, time: '9:00 م - 10:00 م',  title: 'العشاء', place: 'المطعم' },
    { id: 'p24', day: day2, order: 24, time: '10:00 م - 11:00 م', title: 'صالة النوم', place: 'الكنيسة' },
    { id: 'p25', day: day2, order: 25, time: '11:00 م - 12:00 م', title: 'حفلة سمر', place: 'الملعب الكبير' },

    // ---- Day 3 : Saturday ----
    { id: 'p26', day: day3, order: 26, time: '8:00 ص - 10:00 ص',  title: 'القداس', place: 'الكنيسة' },
    { id: 'p27', day: day3, order: 27, time: '10:00 ص - 11:00 ص', title: 'الفطار', place: 'المطعم' },
    { id: 'p28', day: day3, order: 28, time: '11:00 ص - 12:00 ظ', title: 'الختام', place: 'القاعة' },
    { id: 'p29', day: day3, order: 29, time: '12:00 ظ',           title: 'تسليم الغرف', place: '' }
  ],

  participants: [...metania, ...diakonia, ...kinonia, ...martiria],

  judges: [
    { id: 'judge_main', name: 'الحكم', qr: 'judge_main', active: true }
  ]
}

export const DAYS = [day1, day2, day3]
