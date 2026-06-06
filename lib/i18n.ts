// ─────────────────────────────────────────────────────────────────────────
//  Internationalisation (EL / EN)
//
//  Greek is the default language. The chosen locale is stored in a cookie so
//  the server can render the correct language on first paint (no flash), and
//  mirrored to localStorage for resilience.
//
//  The Greek dictionary is the canonical shape. The English dictionary must
//  match it key-for-key (enforced by the `Dictionary` type below).
// ─────────────────────────────────────────────────────────────────────────

export const LOCALES = ["el", "en"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "el"
export const LANG_COOKIE = "pythea_lang"

export function isLocale(value: unknown): value is Locale {
  return value === "el" || value === "en"
}

const el = {
  nav: {
    story: "Η Ιστορία",
    journal: "Το Ημερολόγιο",
    treasure: "Ο Θησαυρός",
    how: "Πώς Παίζεται",
    register: "Δήλωσε Συμμετοχή",
    brand: "ΠΥΘΕΑΣ",
    brandSub: "Ο ΜΕΣΣΗΝΙΟΣ",
    openMenu: "Άνοιγμα μενού",
  },
  hero: {
    coords: "36°57′Β · 22°06′Α · ΚΑΛΑΜΑΤΑ",
    season: "ΚΑΛΟΚΑΙΡΙ 2026",
    srTitle: "Το Ταξίδι του Πυθέα του Μεσσήνιου",
    titleTop: ["Το", "Ταξίδι", "του"],
    titleName: "Πυθέα",
    titleBottom: ["του", "Μεσσήνιου"],
    subtitle:
      "Ένα κυνήγι θησαυρού στην Καλαμάτα. Ακολούθησε τα ίχνη ενός πολυταξιδεμένου εξερευνητή και μάθε να βλέπεις την πόλη σαν να την ανακαλύπτεις για πρώτη φορά.",
    ctaStart: "ΞΕΚΙΝΑ ΤΗΝ ΑΝΑΖΗΤΗΣΗ",
    ctaStory: "Η ΙΣΤΟΡΙΑ ΤΟΥ ΠΥΘΕΑ",
    scroll: "ΚΥΛΗΣΕ",
  },
  story: {
    section: "Ι. Ο ΘΡΥΛΟΣ",
    paragraphs: [
      "Λένε πως στην Καλαμάτα, όχι πολύ παλιά, κάπου στις αρχές του περασμένου αιώνα, έζησε ένας άνθρωπος παράξενος και πολυταξιδεμένος. Τον ονόμαζαν Πυθέα τον Μεσσήνιο.",
      "Άλλοι τον έλεγαν εξερευνητή, άλλοι ονειροπόλο, κι άλλοι απλώς έναν άνθρωπο που δεν μπορούσε να μείνει για πολύ στο ίδιο μέρος. Όμως ο ίδιος έλεγε πως ο κόσμος δεν κρύβεται μόνο πίσω από ωκεανούς, βουνά και μακρινές ηπείρους. Κρύβεται και μέσα στις πόλεις μας, στις γωνιές που προσπερνάμε κάθε μέρα, στα σημάδια που βλέπουμε χωρίς να τα παρατηρούμε.",
      "Όταν ο Πυθέας γύρισε πια στην Καλαμάτα από τα ταξίδια του, δεν έφερε μαζί του χρυσάφι, πετράδια ή σεντούκια γεμάτα νομίσματα. Έφερε κάτι πολυτιμότερο: έναν χάρτη που έδειχνε πως μέσα σε μία μόνο πόλη μπορεί κανείς να βρει ολόκληρη τη γη.",
      "Λίγο πριν χαθεί μυστηριωδώς, ο Πυθέας έκρυψε τον θησαυρό του. Όχι για να τον κρατήσει μακριά από τους ανθρώπους, αλλά για να τον βρουν μόνο εκείνοι που θα μάθαιναν να κοιτούν την Καλαμάτα σαν εξερευνητές.",
    ],
    quote: "«Ανακάλυψε το άγνωστο μέσα στο γνώριμο.»",
    author: "ΠΥΘΕΑΣ Ο ΜΕΣΣΗΝΙΟΣ",
  },
  journey: {
    section: "ΙΙ. Η ΔΙΑΔΡΟΜΗ",
    titlePre: "Εννέα χώρες. Εννέα σημάδια.",
    titleEm: "Μία πόλη.",
    intro:
      "Άνοιξε το ημερολόγιο του Πυθέα και διάβασε τις καταχωρήσεις του, μία μία. Κάθε σελίδα κουβαλά μια χώρα του ταξιδιού του και ένα σημάδι κρυμμένο σε μια γωνιά της Καλαμάτας. Οι σελίδες ξεκλειδώνουν με τον καιρό. Κανείς δεν ξέρει ποια χώρα κρύβει η επόμενη.",
  mapAlt: "Παλιός χάρτης της Καλαμάτας με την ακτή, τα βουνά και το λιμάνι",
  mapCaption: "ΚΑΛΑΜΑΤΑ · Ο ΧΑΡΤΗΣ ΤΩΝ ΣΗΜΑΔΙΩΝ",
  open: "ΑΝΟΙΧΤΟ",
  locked: "ΚΛΕΙΔΩΜΕΝΟ",
  openCardAria: (n: number) => `Άνοιξε το ημερολόγιο στη σελίδα ${n}`,
  statCountries: "ΧΩΡΕΣ",
  statMarks: "ΣΗΜΑΔΙΑ",
  statCity: "ΠΟΛΗ",
  legendOpen: "Ανοιχτή σελίδα, έτοιμη να διαβαστεί.",
  legendLocked: "Σφραγισμένη σελίδα, ξεκλειδώνει με τον καιρό.",
  progressLabel: "ΠΡΟΟΔΟΣ ΑΠΟΚΑΛΥΨΗΣ",
  status: (n: number, total: number) =>
  `${n} ΑΠΟ ${total} ΣΗΜΑΔΙΑ ΑΠΟΚΑΛΥΦΘΗΚΑΝ`,
  firstOpensIn: "Το πρώτο σημάδι ανοίγει σε",
  nextOpensIn: "Το επόμενο σημάδι ανοίγει σε",
  allOpen: "Όλα τα σημάδια είναι ανοιχτά. Ο θησαυρός περιμένει.",
  cta: "ΑΝΟΙΞΕ ΤΟ ΗΜΕΡΟΛΟΓΙΟ",
  openJournal: "Άνοιξε το ημερολόγιο",
  },
  treasure: {
    section: "ΙΙΙ. Ο ΘΗΣΑΥΡΟΣ",
    titlePre: "Ο Πυθέας δεν έκρυψε χρυσάφι. Έκρυψε έναν",
    titleEm: "τρόπο να βλέπεις.",
    body: "Κάθε ομάδα που ακολουθεί τα ίχνη του πλησιάζει σε αυτό που ο ίδιος θεωρούσε αληθινό θησαυρό: την ικανότητα να ανακαλύπτεις το άγνωστο μέσα στο γνώριμο.",
  },
  how: {
    section: "IV. ΠΩΣ ΠΑΙΖΕΤΑΙ",
    titlePre: "Τέσσερα βήματα για να γίνεις",
    titleEm: "εξερευνητής.",
    steps: [
      {
        title: "Φτιάξε την ομάδα σου",
        text: "Μάζεψε τους συνεξερευνητές σου. Δύο έως πέντε άτομα ανά ομάδα, όσοι τολμούν να κοιτούν αλλιώς.",
      },
      {
        title: "Ακολούθησε τον χάρτη",
        text: "Κάθε στάση σε οδηγεί σε μια γωνιά της Καλαμάτας που συνδέεται με μια χώρα του ταξιδιού του Πυθέα.",
      },
      {
        title: "Λύσε τους γρίφους",
        text: "Σύμβολα, σημάδια και μικρά μυστικά. Λύσε τον έναν για να ξεκλειδώσεις τον επόμενο.",
      },
      {
        title: "Βρες τον θησαυρό",
        text: "Η τελευταία ένδειξη κλείνει τον κύκλο. Η πρώτη ομάδα που θα φτάσει, κερδίζει.",
      },
    ],
  },
  register: {
    badge: "ΚΑΛΟΚΑΙΡΙ 2026 · ΚΑΛΑΜΑΤΑ",
    title: "Δήλωσε την ομάδα σου.",
    subtitle:
      "Άφησε το email σου και θα είσαι ο πρώτος που θα μάθει ημερομηνία, κανόνες και την ώρα της εκκίνησης. Οι θέσεις είναι περιορισμένες.",
    sentTitle: "Είσαι στον χάρτη.",
    sentBody: "Θα σου στείλ��υμε τα μυστικά του Πυθέα μόλις ανοίξει η πύλη.",
    teamLabel: "Όνομα ομάδας",
    teamPlaceholder: "Όνομα ομάδας",
    emailLabel: "Email",
    emailPlaceholder: "Το email σου",
    submit: "ΚΛΕΙΣΕ ΘΕΣΗ",
    noSpam: "Κανένα spam. Μόνο ό,τι χρειάζεσαι για να ξεκινήσεις το ταξίδι.",
  },
  footer: {
    title: "Το Ταξίδι του Πυθέα του Μεσσήνιου",
    tagline: "ΚΥΝΗΓΙ ΘΗΣΑΥΡΟΥ · ΚΑΛΑΜΑΤΑ · ΚΑΛΟΚΑΙΡΙ 2026",
    motto: "ΑΝΑΚΑΛΥΨΕ ΤΟ ΑΓΝΩΣΤΟ ΜΕΣΑ ΣΤΟ ΓΝΩΡΙΜΟ",
  },
  countdown: {
    days: "ΜΕΡΕΣ",
    hours: "ΩΡΕΣ",
    minutes: "ΛΕΠΤΑ",
    seconds: "ΔΕΥΤ.",
    aria: "Αντίστροφη μέτρηση",
  },
  journal: {
    back: "ΠΙΣΩ ΣΤΗΝ ΑΡΧΗ",
    header: "ΗΜΕΡΟΛΟΓΙΟ ΤΑΞΙΔΙΟΥ",
    tapHint: "Πάτησε ή σύρε για την επόμενη σελίδα",
    prevAria: "Προηγούμενη σελίδα",
    nextAria: "Επόμενη σελίδα",
    prev: "ΠΡΟΗΓΟΥΜΕΝΗ",
    next: "ΕΠΟΜΕΝΗ",
    pageAria: (n: number) => `Σελίδα ${n}`,
    coverOwner: "ΙΔΙΟΚΤΗΤΗΣ",
    coverTitle: "Πυθέας ο Μεσσήνιος",
    coverSubtitle:
      "Ημερολόγιο ενός ταξιδιού γύρω από τον κόσμο, κρυμμένο μέσα σε μία πόλη.",
    coverFlip: "ΓΥΡΙΣΕ ΣΕΛΙΔΑ ΓΙΑ ΝΑ ΞΕΚΙΝΗΣΕΙΣ",
    entryNo: "ΚΑΤΑΧΩΡΗΣΗ Νο.",
    stampAlt: (country: string) => `Γραμματόσημο από ${country}`,
    signature: "Π. Μ.",
    sealedNotStartedLabel: "ΤΟ ΗΜΕΡΟΛΟΓΙΟ ΑΝΟΙΓΕ�� ΣΕ",
    sealedLabel: (n: string) => `Η ΣΕΛΙΔΑ Νο. ${n} ΣΦΡΑΓΙΣΤΗΚΕ`,
    sealedNotStartedBody:
      "Το πρώτο σημάδι θα εμφανιστεί μόλις ο Πυθέας ανοίξει τον χάρτη του.",
    sealedBody:
      "Γύρ��α ξανά όταν λήξει ο χρόνος. Η επόμενη σελίδα θα έχει χαραχτεί στο ημερολόγιο.",
    finalLabel: "ΤΕΛΟΣ ΤΟΥ ΗΜΕΡΟΛΟΓΙΟΥ",
    finalBody:
      "Όλα τα σημάδια αποκαλύφθηκαν. Ο θησαυρός περιμένει εκείνους που έμαθαν να κοιτούν την Καλαμάτα σαν εξερευνητές.",
    home: "ΑΡΧΙΚΗ",
    lead: "Κάθε σελίδα κρατά ένα σημάδι από τα ταξίδια του Πυθέα. Νέες σελίδες ξεκλειδώνουν με τον καιρό.",
    progress: "ΣΗΜΑΔΙΑ",
    hintTap: "Πάτα ή σύρε για να γυρίσεις σελίδα",
    hintKeys: "ή χρησιμοποίησε τα πλήκτρα ← →",
    footerNote: "Νέες σελίδες χαράσσονται στο ημερολόγιο όσο ξεκλειδώνουν τα σημάδια.",
  },
  controls: {
    openAria: "Άνοιγμα πίνακα δοκιμών",
    closeAria: "Κλείσιμο πίνακα δοκιμών",
    chip: "ΔΟΚΙΜΕΣ",
    panelTitle: "ΠΙΝΑΚΑΣ ΔΟΚΙΜΩΝ",
    openNext: "ΑΝΟΙΞΕ ΕΠΟΜΕΝΟ",
    closeOne: "ΚΛΕΙΣΕ ΕΝΑ",
    openAll: "ΑΝΟΙΞΕ ΟΛΑ",
    realTime: "ΠΡΑΓΜΑΤΙΚΟΣ ΧΡΟΝΟΣ",
    note: "Ορατό μόνο σε εσένα, για δοκιμές. Δεν εμφανίζεται στους παίκτες στη δημοσιευμένη σελίδα.",
  },
  lang: {
    toggleToEn: "Switch to English",
    toggleToEl: "Αλλαγή σε Ελληνικά",
  },
  auth: {
    // shared
    brand: "ΠΥΘΕΑΣ",
    brandSub: "Ο ΜΕΣΣΗΝΙΟΣ",
    backHome: "Επιστροφή στην αρχική",
    or: "ή",
    emailLabel: "Email",
    emailPlaceholder: "navigator@pythea.gr",
    passwordLabel: "Κωδικός",
    passwordPlaceholder: "Τουλάχιστον 8 χαρακτήρες",
    firstNameLabel: "Όνομα",
    firstNamePlaceholder: "Πυθέας",
    lastNameLabel: "Επώνυμο (προαιρετικό)",
    lastNamePlaceholder: "ο Μεσσήνιος",
    yearLabel: "Έτος γέννησης",
    yearPlaceholder: "1990",
    optional: "προαιρετικό",
    showPassword: "Εμφάνιση κωδικού",
    hidePassword: "Απόκρυψη κωδικού",
    // sign up
    signUpEyebrow: "ΝΕΟΣ ΕΞΕΡΕΥΝΗΤΗΣ",
    signUpTitle: "Φτιάξε τον λογαριασμό σου",
    signUpSubtitle:
      "Γράψου στο πλήρωμα και κράτα τη δική σου πορεία στο ταξίδι του Πυθέα.",
    signUpCta: "Δημιουργία λογαριασμού",
    signUpLoading: "Γίνεται εγγραφή...",
    haveAccount: "Έχεις ήδη λογαριασμό;",
    goToSignIn: "Σύνδεση",
    // sign in
    signInEyebrow: "ΚΑΛΩΣ ΗΡΘΕΣ ΠΙΣΩ",
    signInTitle: "Σύνδεση",
    signInSubtitle: "Συνέχισε την πορεία σου από εκεί που την άφησες.",
    signInCta: "Σύνδεση",
    signInLoading: "Γίνεται σύνδεση...",
    noAccount: "Δεν έχεις λογαριασμό;",
    goToSignUp: "Δημιουργία λογαριασμού",
    // account / nav
    account: "Ο ΛΟΓΑΡΙΑΣΜΟΣ ΜΟΥ",
    signOut: "Αποσύνδεση",
    greeting: (name: string) => `Καλώς ήρθες, ${name}`,
    // validation / errors
    errRequired: "Συμπλήρωσε το όνομα και το email σου.",
    errPasswordShort: "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.",
    errYearInvalid: "Δώσε ένα έγκυρο έτος γέννησης.",
    errEmailTaken: "Υπάρχει ήδη λογαριασμός με αυτό το email.",
    errInvalidCredentials: "Λάθος email ή κωδικός.",
    errGeneric: "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
  },
}

export type Dictionary = typeof el

const en: Dictionary = {
  nav: {
    story: "The Story",
    journal: "The Journal",
    treasure: "The Treasure",
    how: "How to Play",
    register: "Join the Hunt",
    brand: "PYTHEAS",
    brandSub: "THE MESSENIAN",
    openMenu: "Open menu",
  },
  hero: {
    coords: "36°57′N · 22°06′E · KALAMATA",
    season: "SUMMER 2026",
    srTitle: "The Voyage of Pytheas the Messenian",
    titleTop: ["The", "Voyage", "of"],
    titleName: "Pytheas",
    titleBottom: ["the", "Messenian"],
    subtitle:
      "A treasure hunt through Kalamata. Follow the trail of a well-travelled explorer and learn to see the city as if you were discovering it for the first time.",
    ctaStart: "BEGIN THE SEARCH",
    ctaStory: "THE STORY OF PYTHEAS",
    scroll: "SCROLL",
  },
  story: {
    section: "I. THE LEGEND",
    paragraphs: [
      "They say that in Kalamata, not so long ago, somewhere in the early years of the last century, there lived a strange and well-travelled man. They called him Pytheas the Messenian.",
      "Some called him an explorer, others a dreamer, and others simply a man who could not stay long in the same place. Yet he himself used to say that the world is not hidden only beyond oceans, mountains and distant continents. It hides inside our own cities too, in the corners we pass every day, in the marks we see without ever noticing.",
      "When Pytheas finally returned to Kalamata from his travels, he brought back no gold, no jewels, no chests full of coins. He brought something more precious: a map showing that within a single city one can find the whole of the earth.",
      "Shortly before he vanished mysteriously, Pytheas hid his treasure. Not to keep it away from people, but so that only those who learned to look at Kalamata like explorers would find it.",
    ],
    quote: "\u201cDiscover the unknown within the familiar.\u201d",
    author: "PYTHEAS THE MESSENIAN",
  },
  journey: {
    section: "II. THE ROUTE",
    titlePre: "Nine countries. Nine marks.",
    titleEm: "One city.",
    intro:
  "Open the journal of Pytheas and read his entries, one by one. Each page carries a country from his voyage and a mark hidden in a corner of Kalamata. The pages unlock over time. No one knows which country the next one holds.",
    mapAlt: "Antique map of Kalamata showing the coastline, mountains and harbor",
    mapCaption: "KALAMATA · THE MAP OF MARKS",
  open: "OPEN",
    locked: "LOCKED",
    openCardAria: (n: number) => `Open the journal at page ${n}`,
  statCountries: "COUNTRIES",
  statMarks: "MARKS",
  statCity: "CITY",
  legendOpen: "An open page, ready to be read.",
  legendLocked: "A sealed page, unlocking over time.",
  progressLabel: "REVEAL PROGRESS",
  status: (n: number, total: number) => `${n} OF ${total} MARKS REVEALED`,
  firstOpensIn: "The first mark opens in",
  nextOpensIn: "The next mark opens in",
  allOpen: "Every mark is open. The treasure awaits.",
  cta: "OPEN THE JOURNAL",
  openJournal: "Open the journal",
  },
  treasure: {
    section: "III. THE TREASURE",
    titlePre: "Pytheas did not hide gold. He hid a",
    titleEm: "way of seeing.",
    body: "Every team that follows his trail draws closer to what he considered the true treasure: the ability to discover the unknown within the familiar.",
  },
  how: {
    section: "IV. HOW TO PLAY",
    titlePre: "Four steps to become an",
    titleEm: "explorer.",
    steps: [
      {
        title: "Build your team",
        text: "Gather your fellow explorers. Two to five people per team, those who dare to look differently.",
      },
      {
        title: "Follow the map",
        text: "Each stop leads you to a corner of Kalamata tied to a country from the voyage of Pytheas.",
      },
      {
        title: "Solve the riddles",
        text: "Symbols, marks and small secrets. Solve one to unlock the next.",
      },
      {
        title: "Find the treasure",
        text: "The final clue closes the circle. The first team to arrive wins.",
      },
    ],
  },
  register: {
    badge: "SUMMER 2026 · KALAMATA",
    title: "Register your team.",
    subtitle:
      "Leave your email and you'll be the first to learn the date, the rules and the start time. Spots are limited.",
    sentTitle: "You're on the map.",
    sentBody: "We'll send you the secrets of Pytheas the moment the gate opens.",
    teamLabel: "Team name",
    teamPlaceholder: "Team name",
    emailLabel: "Email",
    emailPlaceholder: "Your email",
    submit: "RESERVE A SPOT",
    noSpam: "No spam. Only what you need to begin the journey.",
  },
  footer: {
    title: "The Voyage of Pytheas the Messenian",
    tagline: "TREASURE HUNT · KALAMATA · SUMMER 2026",
    motto: "DISCOVER THE UNKNOWN WITHIN THE FAMILIAR",
  },
  countdown: {
    days: "DAYS",
    hours: "HRS",
    minutes: "MIN",
    seconds: "SEC",
    aria: "Countdown",
  },
  journal: {
    back: "BACK TO START",
    header: "TRAVEL JOURNAL",
    tapHint: "Tap or swipe for the next page",
    prevAria: "Previous page",
    nextAria: "Next page",
    prev: "PREVIOUS",
    next: "NEXT",
    pageAria: (n: number) => `Page ${n}`,
    coverOwner: "OWNER",
    coverTitle: "Pytheas the Messenian",
    coverSubtitle:
      "The journal of a voyage around the world, hidden inside a single city.",
    coverFlip: "TURN THE PAGE TO BEGIN",
    entryNo: "ENTRY No.",
    stampAlt: (country: string) => `Stamp from ${country}`,
    signature: "P. M.",
    sealedNotStartedLabel: "THE JOURNAL OPENS IN",
    sealedLabel: (n: string) => `PAGE No. ${n} IS SEALED`,
    sealedNotStartedBody:
      "The first mark will appear once Pytheas opens his map.",
    sealedBody:
      "Come back when the timer ends. The next page will have been written into the journal.",
    finalLabel: "END OF THE JOURNAL",
    finalBody:
      "Every mark has been revealed. The treasure awaits those who learned to look at Kalamata like explorers.",
    home: "HOME",
    lead: "Each page holds a mark from the travels of Pytheas. New pages unlock over time.",
    progress: "MARKS",
    hintTap: "Tap or swipe to turn the page",
    hintKeys: "or use the ← → keys",
    footerNote: "New pages are written into the journal as marks unlock.",
  },
  controls: {
    openAria: "Open test panel",
    closeAria: "Close test panel",
    chip: "TESTS",
    panelTitle: "TEST PANEL",
    openNext: "OPEN NEXT",
    closeOne: "CLOSE ONE",
    openAll: "OPEN ALL",
    realTime: "REAL TIME",
    note: "Visible only to you, for testing. It does not appear to players on the published page.",
  },
  lang: {
    toggleToEn: "Switch to English",
    toggleToEl: "Αλλαγή σε Ελληνικά",
  },
  auth: {
    // shared
    brand: "PYTHEAS",
    brandSub: "OF MESSENE",
    backHome: "Back to home",
    or: "or",
    emailLabel: "Email",
    emailPlaceholder: "navigator@pythea.com",
    passwordLabel: "Password",
    passwordPlaceholder: "At least 8 characters",
    firstNameLabel: "First name",
    firstNamePlaceholder: "Pytheas",
    lastNameLabel: "Last name (optional)",
    lastNamePlaceholder: "of Messene",
    yearLabel: "Year of birth",
    yearPlaceholder: "1990",
    optional: "optional",
    showPassword: "Show password",
    hidePassword: "Hide password",
    // sign up
    signUpEyebrow: "NEW EXPLORER",
    signUpTitle: "Create your account",
    signUpSubtitle:
      "Join the crew and keep your own course through the voyage of Pytheas.",
    signUpCta: "Create account",
    signUpLoading: "Creating account...",
    haveAccount: "Already have an account?",
    goToSignIn: "Sign in",
    // sign in
    signInEyebrow: "WELCOME BACK",
    signInTitle: "Sign in",
    signInSubtitle: "Pick up your course right where you left off.",
    signInCta: "Sign in",
    signInLoading: "Signing in...",
    noAccount: "Don't have an account?",
    goToSignUp: "Create account",
    // account / nav
    account: "MY ACCOUNT",
    signOut: "Sign out",
    greeting: (name: string) => `Welcome, ${name}`,
    // validation / errors
    errRequired: "Enter your first name and email.",
    errPasswordShort: "Password must be at least 8 characters.",
    errYearInvalid: "Enter a valid year of birth.",
    errEmailTaken: "An account with this email already exists.",
    errInvalidCredentials: "Wrong email or password.",
    errGeneric: "Something went wrong. Please try again.",
  },
}

export const dictionaries: Record<Locale, Dictionary> = { el, en }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
}
