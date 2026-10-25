/* KOY Studio — brand details for KOY COSMETICS (Keren, spray tan), used by the shared Studio core (render.js, app.js).
   Golden Hour palette (D-013), Assistant for Hebrew (D-027), the KOY COSMETICS logo (D-024..D-026). */
window.BRAND = {
  APP: 'KOY Studio',
  KEY: 'koy-studio-v1', // same storage as KOY Studio 1.x, so nothing already entered is lost
  FILE_PREFIX: 'KOY',
  SHARE_TITLE: 'KOY COSMETICS',
  SIGN: 'קרן · KOY COSMETICS',
  HEART: '🤎',
  HANDLE_HINT: 'k.o.y_cosmetics',
  CLIENT_NOTES_HINT: 'גוון מועדף, אירוע, רגישויות',
  PHOTO_BIAS: 0.55, // new portrait photo starts a little higher (faces usually sit in the top part)
  FONT: 'Assistant', HW: 600, BW: 400,
  COL: { bg: '#FFF8F1', surface: '#F5DCCB', accent: '#D9A066', primary: '#9A5A33', text: '#3A2219' },
  THEMES: {
    ivory: { name: 'שמנת', bg: '#FFF8F1', text: '#3A2219', accent: '#9A5A33', logo: 'light', row: '#FFFFFF', rgb: '255,248,241', btn: '#9A5A33', btnText: '#FFF8F1' },
    peach: { name: 'אפרסק', bg: '#F5DCCB', text: '#3A2219', accent: '#9A5A33', logo: 'light', row: '#FFF8F1', rgb: '245,220,203', btn: '#9A5A33', btnText: '#FFF8F1' },
    bronze: { name: 'ברונזה', bg: '#9A5A33', text: '#FFF8F1', accent: '#F5DCCB', logo: 'dark', row: 'rgba(255,248,241,.16)', rgb: '154,90,51', btn: '#FFF8F1', btnText: '#3A2219' },
    cocoa: { name: 'כהה', bg: '#3A2219', text: '#FFF8F1', accent: '#D9A066', logo: 'dark', row: 'rgba(255,248,241,.12)', rgb: '58,34,25', btn: '#D9A066', btnText: '#3A2219' },
  },
  DEFAULT_THEME: {
    'story:window': 'peach', 'story:full': 'peach', 'post:band': 'ivory', 'post:window': 'peach', 'slots:main': 'peach',
    'video:full': 'peach', 'video:window': 'peach', 'video:clean': 'peach',
    'prices:main': 'ivory', 'promo:main': 'bronze', 'shade:main': 'peach', 'review:main': 'peach', 'tip:main': 'ivory',
  },
  PLACEHOLDER: { stops: ['#F8DFC8', '#EFC096', '#D08A58'], label: 'rgba(255,248,241,.95)' },
  TILES: ['photo', 'video', 'slots', 'prices', 'promo', 'review', 'tip'], // "shade of the week" is for nails
  SVC_SUGGEST: ['שיזוף בהתזה', 'הגעה לבית הלקוחה', 'שיזוף לכלה', 'שיזוף לפני אירוע', 'מחיר לקבוצה (3 ומעלה)', 'כרטיסייה (3 טיפולים)'],
  PHRASES: ['זוהר לפני האירוע ✨', 'עוד לקוחה זוהרת 🤎', 'שיזוף בהתזה'], // her ready caption phrases (editable in the app)
  SERVICE_CHIP: name => name,
  TIPS: [
    ['איך מתכוננים לשיזוף בהתזה?', ['פילינג עדין יום לפני', 'מגיעים עם עור נקי, בלי קרם', 'בגדים כהים ורחבים לדרך הביתה']],
    ['אחרי הטיפול', ['בגדים רחבים ונוחים', 'בלי מקלחת ובלי ספורט עד הזמן שקרן ממליצה', 'קרם לחות בימים שאחרי']],
    ['כמה זמן לוקח הטיפול?', ['בערך 20-30 דקות', 'אפשר לקבוע גם בערב', 'לקביעת תור בהודעה']],
  ],
  migrate(S, EMPTY) {
    // KOY Studio 1.x kept one "kind" instead of type + format
    if (S.prefs && S.prefs.kind) {
      const k = S.prefs.kind;
      S.prefs.type = k === 'story' || k === 'post' ? 'photo' : k; S.prefs.format = k === 'post' ? 'post' : 'story';
      delete S.prefs.kind;
    }
    // KOY Studio 1.x came with assumed hours. If she never changed them, start empty so she enters her own.
    const OLD = JSON.stringify({ 0: { works: true, from: '', label: 'בתיאום' }, 1: { works: true, from: '16:30', label: '' }, 2: { works: true, from: '16:30', label: '' }, 3: { works: true, from: '', label: 'בתיאום' }, 4: { works: true, from: '16:30', label: '' }, 5: { works: true, from: '', label: 'מהבוקר' }, 6: { works: false, from: '', label: '' } });
    if (JSON.stringify(S.schedule) === OLD) S.schedule = EMPTY();
    for (let i = 0; i < 7; i++) { const d = S.schedule[i] || {}; S.schedule[i] = { works: !!d.works, from: d.from || '', to: d.to || '' }; }
    if (!Array.isArray(S.biz.phrases)) S.biz.phrases = this.PHRASES.slice();
  },
};
