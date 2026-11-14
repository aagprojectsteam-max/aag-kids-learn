'use strict';
/* Content of the app: categories, items and people roles.
   Every Hebrew word has two spellings: plain (shown on screen) and with niqqud
   (used for speech, and shown on screen when "show niqqud" is on). */

// How many items each level shows (the first N items of the category).
const LEVEL_SIZES = [2, 4, 6, 10, 1000];

function colorItem(id, word, say, hex, emoji) {
  return {
    id: 'color-' + id, word, say, spoken: say, sound: '',
    question: `איפה הצבע ${word}?`, questionSay: `אֵיפֹה הַצֶּבַע ${say}?`,
    emoji, color: hex,
  };
}

// A thing with a definite article in the question ("איפה הכלב?").
function thing(prefix, id, word, say, theSay, emoji, sound = '') {
  return {
    id: `${prefix}-${id}`, word, say, sound,
    spoken: sound ? `${say}. ${sound}` : say,
    question: `איפה ה${word}?`, questionSay: `אֵיפֹה ${theSay}?`,
    emoji,
  };
}

function shapeItem(id, word, say, theSay) {
  return { ...thing('shape', id, word, say, theSay, ''), shape: id };
}

function letterItem(glyph, name, example, exampleSay, emoji) {
  return {
    id: 'letter-' + glyph, word: name, say: name, spoken: name, sound: '',
    question: `איפה האות ${name}?`, questionSay: `אֵיפֹה הָאוֹת ${name}?`,
    emoji, glyph, example, exampleSay,
  };
}

function numberItem(n, word, say) {
  return {
    id: 'number-' + n, word, say, spoken: say, sound: '',
    question: `איפה המספר ${word}?`, questionSay: `אֵיפֹה הַמִּסְפָּר ${say}?`,
    emoji: '', number: n, glyph: String(n),
  };
}

const COLORS = [
  colorItem('red', 'אדום', 'אָדוֹם', '#FF2B2B', '🍎'),
  colorItem('blue', 'כחול', 'כָּחוֹל', '#0A7BFF', '💧'),
  colorItem('yellow', 'צהוב', 'צָהוֹב', '#FFD400', '🍌'),
  colorItem('green', 'ירוק', 'יָרוֹק', '#1FC14A', '🍏'),
  colorItem('orange', 'כתום', 'כָּתוֹם', '#FF8A00', '🥕'),
  colorItem('purple', 'סגול', 'סָגוֹל', '#A63DE8', '🍇'),
  colorItem('pink', 'ורוד', 'וָרוֹד', '#FF69B4', '🌸'),
  colorItem('brown', 'חום', 'חוּם', '#8B4E1E', '🐻'),
  colorItem('black', 'שחור', 'שָׁחוֹר', '#151515', '🖤'),
  colorItem('white', 'לבן', 'לָבָן', '#FFFFFF', '☁️'),
];

const SHAPES = [
  shapeItem('circle', 'עיגול', 'עִגּוּל', 'הָעִגּוּל'),
  shapeItem('square', 'ריבוע', 'רִבּוּעַ', 'הָרִבּוּעַ'),
  shapeItem('triangle', 'משולש', 'מְשֻׁלָּשׁ', 'הַמְּשֻׁלָּשׁ'),
  shapeItem('star', 'כוכב', 'כּוֹכָב', 'הַכּוֹכָב'),
  shapeItem('heart', 'לב', 'לֵב', 'הַלֵּב'),
  shapeItem('rectangle', 'מלבן', 'מַלְבֵּן', 'הַמַּלְבֵּן'),
  shapeItem('oval', 'אליפסה', 'אֶלִּיפְּסָה', 'הָאֶלִּיפְּסָה'),
  shapeItem('diamond', 'מעוין', 'מְעֻיָּן', 'הַמְּעֻיָּן'),
  shapeItem('moon', 'ירח', 'יָרֵחַ', 'הַיָּרֵחַ'),
  shapeItem('hexagon', 'משושה', 'מְשֻׁשֶּׁה', 'הַמְּשֻׁשֶּׁה'),
];

const ANIMALS = [
  thing('animal', 'dog', 'כלב', 'כֶּלֶב', 'הַכֶּלֶב', '🐶', 'הַב הַב'),
  thing('animal', 'cat', 'חתול', 'חָתוּל', 'הֶחָתוּל', '🐱', 'מְיָאוּ'),
  thing('animal', 'cow', 'פרה', 'פָּרָה', 'הַפָּרָה', '🐮', 'מוּ'),
  thing('animal', 'horse', 'סוס', 'סוּס', 'הַסּוּס', '🐴'),
  thing('animal', 'sheep', 'כבשה', 'כִּבְשָׂה', 'הַכִּבְשָׂה', '🐑', 'מֶה'),
  thing('animal', 'chicken', 'תרנגולת', 'תַּרְנְגוֹלֶת', 'הַתַּרְנְגוֹלֶת', '🐔'),
  thing('animal', 'duck', 'ברווז', 'בַּרְוָז', 'הַבַּרְוָז', '🦆', 'גָּא גָּא'),
  thing('animal', 'fish', 'דג', 'דָּג', 'הַדָּג', '🐟'),
  thing('animal', 'bird', 'ציפור', 'צִפּוֹר', 'הַצִּפּוֹר', '🐦', 'צִיף צִיף'),
  thing('animal', 'lion', 'אריה', 'אַרְיֵה', 'הָאַרְיֵה', '🦁'),
  thing('animal', 'elephant', 'פיל', 'פִּיל', 'הַפִּיל', '🐘'),
  thing('animal', 'monkey', 'קוף', 'קוֹף', 'הַקּוֹף', '🐵'),
  thing('animal', 'rabbit', 'ארנב', 'אַרְנָב', 'הָאַרְנָב', '🐰'),
  thing('animal', 'frog', 'צפרדע', 'צְפַרְדֵּעַ', 'הַצְּפַרְדֵּעַ', '🐸', 'קְוָוה קְוָוה'),
  thing('animal', 'turtle', 'צב', 'צָב', 'הַצָּב', '🐢'),
  thing('animal', 'butterfly', 'פרפר', 'פַּרְפַּר', 'הַפַּרְפַּר', '🦋'),
];

const FOOD = [
  thing('food', 'apple', 'תפוח', 'תַּפּוּחַ', 'הַתַּפּוּחַ', '🍎'),
  thing('food', 'banana', 'בננה', 'בָּנָנָה', 'הַבָּנָנָה', '🍌'),
  thing('food', 'bread', 'לחם', 'לֶחֶם', 'הַלֶּחֶם', '🍞'),
  thing('food', 'milk', 'חלב', 'חָלָב', 'הֶחָלָב', '🥛'),
  thing('food', 'egg', 'ביצה', 'בֵּיצָה', 'הַבֵּיצָה', '🥚'),
  thing('food', 'cheese', 'גבינה', 'גְּבִינָה', 'הַגְּבִינָה', '🧀'),
  thing('food', 'cucumber', 'מלפפון', 'מְלָפְפוֹן', 'הַמְּלָפְפוֹן', '🥒'),
  thing('food', 'carrot', 'גזר', 'גֶּזֶר', 'הַגֶּזֶר', '🥕'),
  thing('food', 'grapes', 'ענבים', 'עֲנָבִים', 'הָעֲנָבִים', '🍇'),
  thing('food', 'strawberry', 'תות', 'תּוּת', 'הַתּוּת', '🍓'),
  thing('food', 'watermelon', 'אבטיח', 'אֲבַטִּיחַ', 'הָאֲבַטִּיחַ', '🍉'),
  thing('food', 'cake', 'עוגה', 'עוּגָה', 'הָעוּגָה', '🍰'),
];

const VEHICLES = [
  thing('vehicle', 'car', 'מכונית', 'מְכוֹנִית', 'הַמְּכוֹנִית', '🚗', 'בִּיפּ בִּיפּ'),
  thing('vehicle', 'bus', 'אוטובוס', 'אוֹטוֹבּוּס', 'הָאוֹטוֹבּוּס', '🚌'),
  thing('vehicle', 'train', 'רכבת', 'רַכֶּבֶת', 'הָרַכֶּבֶת', '🚂', 'טוּ טוּ'),
  thing('vehicle', 'plane', 'מטוס', 'מָטוֹס', 'הַמָּטוֹס', '✈️'),
  thing('vehicle', 'bicycle', 'אופניים', 'אוֹפַנַּיִם', 'הָאוֹפַנַּיִם', '🚲'),
  thing('vehicle', 'truck', 'משאית', 'מַשָּׂאִית', 'הַמַּשָּׂאִית', '🚚'),
  thing('vehicle', 'ship', 'אונייה', 'אֳנִיָּה', 'הָאֳנִיָּה', '🚢'),
  thing('vehicle', 'helicopter', 'מסוק', 'מַסּוֹק', 'הַמַּסּוֹק', '🚁'),
  thing('vehicle', 'ambulance', 'אמבולנס', 'אַמְבּוּלַנְס', 'הָאַמְבּוּלַנְס', '🚑', 'וִיוּ וִיוּ'),
  thing('vehicle', 'tractor', 'טרקטור', 'טְרַקְטוֹר', 'הַטְּרַקְטוֹר', '🚜'),
];

const BODY = [
  thing('body', 'eye', 'עין', 'עַיִן', 'הָעַיִן', '👁️'),
  thing('body', 'nose', 'אף', 'אַף', 'הָאַף', '👃'),
  thing('body', 'mouth', 'פה', 'פֶּה', 'הַפֶּה', '👄'),
  thing('body', 'ear', 'אוזן', 'אֹזֶן', 'הָאֹזֶן', '👂'),
  thing('body', 'hand', 'יד', 'יָד', 'הַיָּד', '✋'),
  thing('body', 'leg', 'רגל', 'רֶגֶל', 'הָרֶגֶל', '🦵'),
  thing('body', 'teeth', 'שיניים', 'שִׁנַּיִם', 'הַשִּׁנַּיִם', '🦷'),
  thing('body', 'tongue', 'לשון', 'לָשׁוֹן', 'הַלָּשׁוֹן', '👅'),
];

const NUMBERS = [
  numberItem(1, 'אחת', 'אַחַת'),
  numberItem(2, 'שתיים', 'שְׁתַּיִם'),
  numberItem(3, 'שלוש', 'שָׁלוֹשׁ'),
  numberItem(4, 'ארבע', 'אַרְבַּע'),
  numberItem(5, 'חמש', 'חָמֵשׁ'),
  numberItem(6, 'שש', 'שֵׁשׁ'),
  numberItem(7, 'שבע', 'שֶׁבַע'),
  numberItem(8, 'שמונה', 'שְׁמוֹנֶה'),
  numberItem(9, 'תשע', 'תֵּשַׁע'),
  numberItem(10, 'עשר', 'עֶשֶׂר'),
];

const LETTERS = [
  letterItem('א', 'אָלֶף', 'אריה', 'אַרְיֵה', '🦁'),
  letterItem('ב', 'בֵּית', 'בננה', 'בָּנָנָה', '🍌'),
  letterItem('ג', 'גִּימֶל', 'גמל', 'גָּמָל', '🐪'),
  letterItem('ד', 'דָּלֶת', 'דג', 'דָּג', '🐟'),
  letterItem('ה', 'הֵא', 'הר', 'הַר', '⛰️'),
  letterItem('ו', 'וָו', 'ורד', 'וֶרֶד', '🌹'),
  letterItem('ז', 'זַיִן', 'זברה', 'זֶבְּרָה', '🦓'),
  letterItem('ח', 'חֵית', 'חתול', 'חָתוּל', '🐱'),
  letterItem('ט', 'טֵית', 'טרקטור', 'טְרַקְטוֹר', '🚜'),
  letterItem('י', 'יוּד', 'יד', 'יָד', '✋'),
  letterItem('כ', 'כַּף', 'כלב', 'כֶּלֶב', '🐶'),
  letterItem('ל', 'לָמֶד', 'לימון', 'לִימוֹן', '🍋'),
  letterItem('מ', 'מֵם', 'מטריה', 'מִטְרִיָּה', '☂️'),
  letterItem('נ', 'נוּן', 'נר', 'נֵר', '🕯️'),
  letterItem('ס', 'סָמֶךְ', 'סוס', 'סוּס', '🐴'),
  letterItem('ע', 'עַיִן', 'עץ', 'עֵץ', '🌳'),
  letterItem('פ', 'פֵּא', 'פיל', 'פִּיל', '🐘'),
  letterItem('צ', 'צָדִי', 'צב', 'צָב', '🐢'),
  letterItem('ק', 'קוּף', 'קשת', 'קֶשֶׁת', '🌈'),
  letterItem('ר', 'רֵישׁ', 'רכבת', 'רַכֶּבֶת', '🚂'),
  letterItem('ש', 'שִׁין', 'שמש', 'שֶׁמֶשׁ', '☀️'),
  letterItem('ת', 'תָּו', 'תפוח', 'תַּפּוּחַ', '🍎'),
];

/* kind: color | shape | emoji | letter | number | people
   visible: shown on the home screen by default (parents can change it). */
const CATS = [
  { id: 'colors', title: 'צבעים', say: 'צְבָעִים', icon: '🎨', tint: '#FF6A00', kind: 'color', items: COLORS, visible: true },
  { id: 'shapes', title: 'צורות', say: 'צוּרוֹת', icon: '🔷', tint: '#00B3A6', kind: 'shape', items: SHAPES, visible: true },
  { id: 'animals', title: 'חיות', say: 'חַיּוֹת', icon: '🐶', tint: '#1FB24A', kind: 'emoji', items: ANIMALS, visible: true },
  { id: 'family', title: 'משפחה', say: 'מִשְׁפָּחָה', icon: '🏠', tint: '#8E3FE8', kind: 'people', items: [], visible: true },
  { id: 'friends', title: 'חברים', say: 'חֲבֵרִים', icon: '🫂', tint: '#FF3D7F', kind: 'people', items: [], visible: true },
  { id: 'letters', title: 'אותיות', say: 'אוֹתִיּוֹת', icon: 'א', tint: '#1F6BFF', kind: 'letter', items: LETTERS, visible: true },
  { id: 'food', title: 'אוכל', say: 'אֹכֶל', icon: '🍎', tint: '#F03E3E', kind: 'emoji', items: FOOD, visible: false },
  { id: 'vehicles', title: 'תחבורה', say: 'תַּחְבּוּרָה', icon: '🚗', tint: '#00A3E0', kind: 'emoji', items: VEHICLES, visible: false },
  { id: 'body', title: 'הגוף', say: 'הַגּוּף', icon: '👂', tint: '#E8590C', kind: 'emoji', items: BODY, visible: false },
  { id: 'numbers', title: 'מספרים', say: 'מִסְפָּרִים', icon: '123', tint: '#6741D9', kind: 'number', items: NUMBERS, visible: false },
];

/* People roles.
   style decides how a NAMED person is shown and spoken:
     me    – "אני דני",   question "איפה דני?"
     title – "סבא משה",   question "איפה סבא משה?"
     the   – "גננת רחל",  question "איפה הגננת רחל?"
     rel   – "יוסי" (+ small "אח"), spoken "אח יוסי", question "איפה יוסי?"
     name  – "דני" (+ small "חבר"), spoken "דני",     question "איפה דני?"
   the / theS are used when the person has NO name ("איפה האח?"). */
const ROLES = {
  me: { group: 'family', style: 'me', t: 'אני', s: 'אֲנִי', the: 'אני', theS: 'אֲנִי', color: '#00B3C4' },
  father: { group: 'family', style: 'title', t: 'אבא', s: 'אַבָּא', the: 'אבא', theS: 'אַבָּא', color: '#0A7BFF' },
  mother: { group: 'family', style: 'title', t: 'אימא', s: 'אִמָּא', the: 'אימא', theS: 'אִמָּא', color: '#FF3D7F' },
  brother: { group: 'family', style: 'rel', t: 'אח', s: 'אָח', the: 'האח', theS: 'הָאָח', color: '#FF8A00' },
  sister: { group: 'family', style: 'rel', t: 'אחות', s: 'אָחוֹת', the: 'האחות', theS: 'הָאָחוֹת', color: '#A63DE8' },
  grandfather: { group: 'family', style: 'title', t: 'סבא', s: 'סַבָּא', the: 'סבא', theS: 'סַבָּא', color: '#1FB24A' },
  grandmother: { group: 'family', style: 'title', t: 'סבתא', s: 'סַבְתָּא', the: 'סבתא', theS: 'סַבְתָּא', color: '#E8590C' },
  baby: { group: 'family', style: 'rel', t: 'תינוק', s: 'תִּינוֹק', the: 'התינוק', theS: 'הַתִּינוֹק', color: '#FFB300' },
  babyGirl: { group: 'family', style: 'rel', t: 'תינוקת', s: 'תִּינוֹקֶת', the: 'התינוקת', theS: 'הַתִּינוֹקֶת', color: '#FF69B4' },
  uncle: { group: 'family', style: 'title', t: 'דוד', s: 'דּוֹד', the: 'הדוד', theS: 'הַדּוֹד', color: '#00A3E0' },
  aunt: { group: 'family', style: 'title', t: 'דודה', s: 'דּוֹדָה', the: 'הדודה', theS: 'הַדּוֹדָה', color: '#D6336C' },
  cousinM: { group: 'family', style: 'rel', t: 'בן דוד', s: 'בֶּן דּוֹד', the: 'בן הדוד', theS: 'בֶּן הַדּוֹד', color: '#4C6EF5' },
  cousinF: { group: 'family', style: 'rel', t: 'בת דודה', s: 'בַּת דּוֹדָה', the: 'בת הדודה', theS: 'בַּת הַדּוֹדָה', color: '#CC5DE8' },
  friend: { group: 'friends', style: 'name', t: 'חבר', s: 'חָבֵר', the: 'החבר', theS: 'הֶחָבֵר', color: '#FF8A00' },
  friendGirl: { group: 'friends', style: 'name', t: 'חברה', s: 'חֲבֵרָה', the: 'החברה', theS: 'הַחֲבֵרָה', color: '#FF3D7F' },
  teacher: { group: 'friends', style: 'the', t: 'גננת', s: 'גַּנֶּנֶת', the: 'הגננת', theS: 'הַגַּנֶּנֶת', color: '#1FB24A' },
  assistant: { group: 'friends', style: 'the', t: 'סייעת', s: 'סַיֶּעֶת', the: 'הסייעת', theS: 'הַסַּיֶּעֶת', color: '#0A7BFF' },
  therapist: { group: 'friends', style: 'the', t: 'מטפלת', s: 'מְטַפֶּלֶת', the: 'המטפלת', theS: 'הַמְּטַפֶּלֶת', color: '#8E3FE8' },
};

// Same ids as the original iPad app, so the list looks familiar.
const DEFAULT_PEOPLE = [
  { id: 'family-me', group: 'family', role: 'me', name: '', sayName: '' },
  { id: 'family-father', group: 'family', role: 'father', name: '', sayName: '' },
  { id: 'family-mother', group: 'family', role: 'mother', name: '', sayName: '' },
  { id: 'family-brother', group: 'family', role: 'brother', name: '', sayName: '' },
  { id: 'family-sister', group: 'family', role: 'sister', name: '', sayName: '' },
  { id: 'family-grandfather', group: 'family', role: 'grandfather', name: '', sayName: '' },
  { id: 'family-grandmother', group: 'family', role: 'grandmother', name: '', sayName: '' },
  { id: 'family-baby', group: 'family', role: 'baby', name: '', sayName: '' },
];

const SHAPE_SVG = {
  circle: '<circle cx="50" cy="50" r="44"/>',
  square: '<rect x="9" y="9" width="82" height="82" rx="5"/>',
  triangle: '<polygon points="50,9 94,89 6,89"/>',
  star: '<polygon points="50,5 61,38 96,38 68,59 79,93 50,72 21,93 32,59 4,38 39,38"/>',
  heart: '<path d="M50 90 C20 67 6 51 6 33 C6 19 17 9 30 9 C40 9 47 15 50 23 C53 15 60 9 70 9 C83 9 94 19 94 33 C94 51 80 67 50 90Z"/>',
  rectangle: '<rect x="4" y="25" width="92" height="50" rx="4"/>',
  oval: '<ellipse cx="50" cy="50" rx="46" ry="29"/>',
  diamond: '<polygon points="50,4 88,50 50,96 12,50"/>',
  moon: '<path d="M64 7 A44 44 0 1 0 64 93 A36 36 0 1 1 64 7Z"/>',
  hexagon: '<polygon points="50,5 89,27.5 89,72.5 50,95 11,72.5 11,27.5"/>',
};

// Learn mode: every shape has its own colour. Game mode: all options share one
// colour per round, so the shape itself is the only clue.
const SHAPE_COLORS = {
  circle: '#FF2B2B', square: '#0A7BFF', triangle: '#1FC14A', star: '#FFC400', heart: '#FF3D7F',
  rectangle: '#FF8A00', oval: '#A63DE8', diamond: '#00B8D9', moon: '#5B5BF0', hexagon: '#00B894',
};
const GAME_TONES = ['#FF2B2B', '#0A7BFF', '#1FC14A', '#FF8A00', '#A63DE8', '#FF3D7F', '#00B3A6'];
