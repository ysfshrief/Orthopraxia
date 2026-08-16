/*
  Program extracted directly from the retreat PDF.
  RULES APPLIED:
   - "المقدم" column is OMITTED entirely (not stored, not shown).
   - Empty cells in the PDF are left as empty strings ("") for the Admin to fill.
   - No invented data. Times were decoded from a right-to-left font that
     visually reversed the digits; they are restored to their logical values.
  Days: Thursday / Friday / Saturday, August 2026.
*/

const day1 = 'الخميس 27 أغسطس 2026'
const day2 = 'الجمعة 28 أغسطس 2026'
const day3 = 'السبت 29 أغسطس 2026'

// order = display order within the whole program
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
    // points config (fully editable from Admin)
    points: {
      startTime: '19:00',       // الوقت المرجعي لبداية احتساب النقاط
      tiers: [
        { untilTime: '19:00', points: 100 }, // عند أو قبل 7:00 م
        { untilTime: '19:30', points: 50 },  // حتى 7:30 م
        { untilTime: '20:00', points: 25 },  // حتى 8:00 م
        { untilTime: '23:59', points: 0 }    // بعد ذلك
      ]
    }
  },

  teams: [
    { id: 'team1', name: 'الفريق الأول', color: '#8B2E1E', leader: '', order: 1, bonusPoints: 0 },
    { id: 'team2', name: 'الفريق الثاني', color: '#C99A3A', leader: '', order: 2, bonusPoints: 0 },
    { id: 'team3', name: 'الفريق الثالث', color: '#3E6B4F', leader: '', order: 3, bonusPoints: 0 },
    { id: 'team4', name: 'الفريق الرابع', color: '#3A5A78', leader: '', order: 4, bonusPoints: 0 }
  ],

  program: [
    // ---- Day 1 : Thursday ----
    { id: 'p1',  day: day1, order: 1,  time: '11:00 ص - 12:00 ظ', title: 'التسكين', place: '' },
    { id: 'p2',  day: day1, order: 2,  time: '12:00 ظ - 12:30 ظ', title: 'Welcome Drink', place: '' },
    { id: 'p3',  day: day1, order: 3,  time: '12:30 ظ - 1:00 ظ',  title: 'صالة', place: 'قاعة' },
    { id: 'p4',  day: day1, order: 4,  time: '1:00 ظ - 2:00 م',   title: 'التعليمات + تقسيم الفرق', place: 'قاعة' },
    { id: 'p5',  day: day1, order: 5,  time: '2:00 م - 3:00 م',   title: 'محاضرة 1', place: 'قاعة' },
    { id: 'p6',  day: day1, order: 6,  time: '3:00 م - 4:00 م',   title: 'الغداء', place: 'المطعم' },
    { id: 'p7',  day: day1, order: 7,  time: '4:00 م - 5:00 م',   title: 'بسين الشابات', place: 'البسين' },
    { id: 'p8',  day: day1, order: 8,  time: '5:00 م - 6:00 م',   title: 'بسين الشباب', place: 'البسين' },
    { id: 'p9',  day: day1, order: 9,  time: '7:00 م - 8:00 م',   title: 'لغز', place: '4 قاعات' },
    { id: 'p10', day: day1, order: 10, time: '8:00 م - 9:00 م',   title: 'محاضرة 2', place: 'قاعة' },
    { id: 'p11', day: day1, order: 11, time: '9:00 م - 10:00 م',  title: 'العشاء', place: 'المطعم' },
    { id: 'p12', day: day1, order: 12, time: '10:00 م - 11:00 م', title: 'صالة النوم + تسبحة', place: 'الكنيسة' },
    { id: 'p13', day: day1, order: 13, time: '11:00 م - 12:00 م', title: 'قعدة زردة', place: 'الملعب الكبير' },

    // ---- Day 2 : Friday ----
    { id: 'p14', day: day2, order: 14, time: '8:00 ص - 10:00 ص',  title: 'القداس', place: 'الكنيسة' },
    { id: 'p15', day: day2, order: 15, time: '10:00 ص - 11:00 ص', title: 'الفطار', place: 'المطعم' },
    { id: 'p16', day: day2, order: 16, time: '11:00 ص - 12:00 ظ', title: 'لعبة القضية', place: '' },
    { id: 'p17', day: day2, order: 17, time: '12:00 ظ - 2:00 م',  title: 'الورش: دراسة كتاب / الخلوة / ورشة عمل / اللغز', place: '4 قاعات' },
    { id: 'p18', day: day2, order: 18, time: '2:00 م - 3:00 م',   title: 'محاضرة 3', place: 'قاعة' },
    { id: 'p19', day: day2, order: 19, time: '3:00 م - 4:00 م',   title: 'الغداء', place: '' },
    { id: 'p20', day: day2, order: 20, time: '4:00 م - 5:00 م',   title: 'بسين الشابات', place: 'البسين' },
    { id: 'p21', day: day2, order: 21, time: '5:00 م - 6:00 م',   title: 'بسين الشباب', place: 'البسين' },
    { id: 'p22', day: day2, order: 22, time: '7:00 م - 9:00 م',   title: 'ألعاب', place: 'الملاعب' },
    { id: 'p23', day: day2, order: 23, time: '9:00 م - 10:00 م',  title: 'العشاء', place: 'المطعم' },
    { id: 'p24', day: day2, order: 24, time: '10:00 م - 11:00 م', title: 'صالة النوم', place: 'الكنيسة' },
    { id: 'p25', day: day2, order: 25, time: '11:00 م - 12:00 م', title: 'حفلة سمر', place: 'الملعب الكبير' },

    // ---- Day 3 : Saturday ----
    { id: 'p26', day: day3, order: 26, time: '8:00 ص',  title: 'صالة الساعة الثالثة', place: '' },
    { id: 'p27', day: day3, order: 27, time: '9:00 ص',  title: 'الفطار', place: '' },
    { id: 'p28', day: day3, order: 28, time: '10:00 ص', title: 'الختام', place: '' },
    { id: 'p29', day: day3, order: 29, time: '11:00 ص', title: 'تسليم الغرف', place: '' }
  ]
}

export const DAYS = [day1, day2, day3]
