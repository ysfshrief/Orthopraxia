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
        { untilTime: '19:15', points: 100 }, // عند أو قبل 7:15 م
        { untilTime: '19:30', points: 50 },  // من 7:15 حتى 7:30 م
        { untilTime: '23:59', points: 0 }    // بعد 7:30 م
      ]
    }
  },

  teams: [
    { id: 'team1', name: 'ميطانيا', color: '#3E8B4F', leader: '', order: 1, bonusPoints: 0 },
    { id: 'team2', name: 'دياكونيا', color: '#5B9BD5', leader: 'فادى أشرف', order: 2, bonusPoints: 0 },
    { id: 'team3', name: 'كينونيا', color: '#C0392B', leader: '', order: 3, bonusPoints: 0 },
    { id: 'team4', name: 'مارتيريا', color: '#F1C40F', leader: '', order: 4, bonusPoints: 0 }
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
  ],

  // فريق دياكونيا — مستخرج من ملف الإكسل
  participants: [
    { id: 'dk01', name: 'فادى أشرف', teamId: 'team2', qr: 'dk01', phone: '' },
    { id: 'dk02', name: 'فيفيان ميشيل', teamId: 'team2', qr: 'dk02', phone: '' },
    { id: 'dk03', name: 'كيرلس مينا', teamId: 'team2', qr: 'dk03', phone: '' },
    { id: 'dk04', name: 'مينا ملاك', teamId: 'team2', qr: 'dk04', phone: '' },
    { id: 'dk05', name: 'ثابت البطل', teamId: 'team2', qr: 'dk05', phone: '' },
    { id: 'dk06', name: 'سامى رياض', teamId: 'team2', qr: 'dk06', phone: '' },
    { id: 'dk07', name: 'مينا أيمن', teamId: 'team2', qr: 'dk07', phone: '' },
    { id: 'dk08', name: 'يوسف فهيم', teamId: 'team2', qr: 'dk08', phone: '' },
    { id: 'dk09', name: 'جون طارق', teamId: 'team2', qr: 'dk09', phone: '' },
    { id: 'dk10', name: 'منى وائل', teamId: 'team2', qr: 'dk10', phone: '' },
    { id: 'dk11', name: 'مهرائيل ناجح', teamId: 'team2', qr: 'dk11', phone: '' },
    { id: 'dk12', name: 'يوستنا سعيد', teamId: 'team2', qr: 'dk12', phone: '' },
    { id: 'dk13', name: 'يوستينا عادل', teamId: 'team2', qr: 'dk13', phone: '' },
    { id: 'dk14', name: 'كلارا كمال', teamId: 'team2', qr: 'dk14', phone: '' },
    { id: 'dk15', name: 'إيفيتا نادر', teamId: 'team2', qr: 'dk15', phone: '' },
    { id: 'dk16', name: 'مريم عماد نبيل', teamId: 'team2', qr: 'dk16', phone: '' },
    { id: 'dk17', name: 'دميانه عماد', teamId: 'team2', qr: 'dk17', phone: '' },
    { id: 'dk18', name: 'كاترين سعد', teamId: 'team2', qr: 'dk18', phone: '' },
  ]
}

export const DAYS = [day1, day2, day3]
