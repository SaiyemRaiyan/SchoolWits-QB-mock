/**
 * Cambridge syllabus code -> subject name.
 *
 * The level is part of the name everywhere except O Level, whose plain names are
 * already in the bank: the browse page filters by subject name, so one name for
 * two syllabuses would list their papers together.
 */
const O_LEVEL: Record<string, string> = {
  "1123": "English Language",
  "2010": "Literature in English",
  "2058": "Islamiyat",
  "2059": "Pakistan Studies",
  "2068": "Islamic Studies",
  "2147": "History",
  "2210": "Computer Science",
  "2217": "Geography",
  "2251": "Sociology",
  "2281": "Economics",
  "3204": "Bengali",
  "3247": "First Language Urdu",
  "3248": "Second Language Urdu",
  "4024": "Maths D",
  "4037": "Add Maths",
  "4040": "Statistics",
  "5014": "Environmental Management",
  "5038": "Agriculture",
  "5054": "Physics",
  "5070": "Chemistry",
  "5090": "Biology",
  "5129": "Combined Science",
  "6065": "Food and Nutrition",
  "6090": "Art and Design",
  "7094": "Bangladesh Studies",
  "7100": "Commerce",
  "7115": "Business Studies",
  "7707": "Accounting",
};

const IGCSE: Record<string, string> = {
  "0400": "Art and Design",
  "0410": "Music",
  "0411": "Drama",
  "0413": "Physical Education",
  "0417": "ICT",
  "0445": "Design and Technology",
  "0448": "Pakistan Studies",
  "0450": "Business Studies",
  "0452": "Accounting",
  "0455": "Economics",
  "0457": "Global Perspectives",
  "0460": "Geography",
  "0470": "History",
  "0471": "Travel and Tourism",
  "0475": "Literature in English",
  "0478": "Computer Science",
  "0493": "Islamiyat",
  "0495": "Sociology",
  "0500": "First Language English",
  "0510": "English as a Second Language",
  "0520": "French",
  "0525": "German",
  "0530": "Spanish",
  "0580": "Mathematics",
  "0606": "Additional Mathematics",
  "0607": "International Mathematics",
  "0610": "Biology",
  "0620": "Chemistry",
  "0625": "Physics",
  "0653": "Combined Science",
  "0654": "Co-ordinated Sciences",
  "0680": "Environmental Management",
};

const IGCSE_9_1: Record<string, string> = {
  "0970": "Biology",
  "0971": "Chemistry",
  "0972": "Physics",
  "0976": "Geography",
  "0977": "History",
  "0980": "Mathematics",
  "0984": "Computer Science",
  "0985": "Accounting",
  "0986": "Business Studies",
  "0987": "Economics",
  "0990": "First Language English",
  "0992": "Literature in English",
};

const A_LEVEL: Record<string, string> = {
  "8021": "English General Paper",
  "9084": "Law",
  "9093": "English Language",
  "9231": "Further Mathematics",
  "9239": "Global Perspectives and Research",
  "9274": "Classical Studies",
  "9395": "Travel and Tourism",
  "9396": "Physical Education",
  "9479": "Art and Design",
  "9482": "Drama",
  "9483": "Music",
  "9488": "Islamic Studies",
  "9489": "History",
  "9609": "Business",
  "9618": "Computer Science",
  "9626": "Information Technology",
  "9693": "Marine Science",
  "9695": "Literature in English",
  "9696": "Geography",
  "9699": "Sociology",
  "9700": "Biology",
  "9701": "Chemistry",
  "9702": "Physics",
  "9705": "Design and Technology",
  "9706": "Accounting",
  "9708": "Economics",
  "9709": "Mathematics",
  "9990": "Psychology",
};

const named = (codes: Record<string, string>, name: (subject: string) => string) =>
  Object.entries(codes).map(([code, subject]) => [code, name(subject)] as const);

const SUBJECTS = new Map<string, string>([
  ...named(O_LEVEL, (s) => s),
  ...named(IGCSE, (s) => `IGCSE ${s}`),
  ...named(IGCSE_9_1, (s) => `IGCSE (9-1) ${s}`),
  ...named(A_LEVEL, (s) => `A Level ${s}`),
]);

/** "" for a code not listed, so the admin types it. */
export function subjectForCode(code: string | undefined): string {
  return SUBJECTS.get(code ?? "") ?? "";
}
