// ─────────────────────────────────────────────────────────────────────────
//  ΠΥΘΕΑΣ Ο ΜΕΣΣΗΝΙΟΣ — Clue schedule & content
//
//  HOW THE TIMING WORKS
//  Clue #1 unlocks exactly at START_ISO.
//  Each following clue unlocks INTERVAL_HOURS later than the previous one.
//  Example: with INTERVAL_HOURS = 24, clue #2 opens 24h after START_ISO,
//  clue #3 opens 48h after START_ISO, and so on.
//
//  TO CHANGE THE START: edit START_ISO below. Keep the +03:00 offset so the
//  time is locked to Greek summer time (EEST) no matter where a visitor is.
//  TO CHANGE THE CADENCE: edit INTERVAL_HOURS.
//
//  IMPORTANT: clue content (country + location hint) is a spoiler. It is only
//  ever sent to the browser AFTER a clue has unlocked. Locked clues never leave
//  the server. Do not import CLUES into a public/landing component.
// ─────────────────────────────────────────────────────────────────────────

export const START_ISO = "2026-07-01T21:00:00+03:00"
export const INTERVAL_HOURS = 24

/** Cookie name used by the per-browser testing override. */
export const PREVIEW_COOKIE = "pythea_preview"

export type Clue = {
  /** 1-based order in the hunt */
  order: number
  /** The country this stop represents */
  country: string
  /** Short subtitle for the stop */
  subtitle: string
  /** lucide-react icon name used on the clue card */
  icon:
    | "Landmark"
    | "Swords"
    | "Home"
    | "Watch"
    | "Lightbulb"
    | "DoorOpen"
    | "Pyramid"
    | "Package"
    | "Snowflake"
  /** Full narrative, split into paragraphs */
  body: string[]
}

export const CLUES: Clue[] = [
  {
    order: 1,
    country: "Κίνα",
    subtitle: "Η αρχή του ταξιδιού",
    icon: "Landmark",
    body: [
      "Το πρώτο μου ταξίδι με οδήγησε μακριά, στην Άπω Ανατολή. Στην Κίνα, τη χώρα των μεγάλων αντιθέσεων: αρχαίων αυτοκρατόρων και σύγχρονων εργοστασίων, δράκων, μεταξιού και αμέτρητων δρόμων.",
      "Όταν γύρισα στην Καλαμάτα, σκέφτηκα πως δεν χρειάζεται να φτάσει κανείς ως την άλλη άκρη του κόσμου για να βρει το πρώτο σημάδι. Αρκεί να ψάξεις εκεί όπου η Ανατολή συναντά μια οδό που θυμίζει ολόκληρη ελληνική γη.",
      "Εκεί όπου η Κίνα μοιάζει να έχει ανοίξει μια μικρή πύλη μέσα στην πόλη, άφησα το πρώτο σου βήμα.",
    ],
  },
  {
    order: 2,
    country: "Ταϊλάνδη",
    subtitle: "Η τέχνη της μάχης",
    icon: "Swords",
    body: [
      "Από την Κίνα συνέχισα νοτιότερα, αναζητώντας όχι θησαυρούς, αλλά πειθαρχία. Έφτασα στη χώρα όπου η μάχη γίνεται τέχνη, το σώμα γίνεται όργανο, και κάθε κίνηση κρύβει σεβασμό.",
      "Στην Ταϊλάνδη έμαθα πως ο αληθινός εξερευνητής δεν χρειάζεται μόνο μάτια, αλλά και συγκέντρωση. Δεν αρκεί να ψάχνεις· πρέπει να παρατηρείς.",
      "Γι’ αυτό και στην Καλαμάτα άφησα το επόμενο σημάδι εκεί όπου η σημαία αυτής της χώρας κοιτάζει τον δρόμο σαν σιωπηλός φύλακας.",
    ],
  },
  {
    order: 3,
    country: "Γαλλία",
    subtitle: "Η επιστροφή στην Ευρώπη",
    icon: "Home",
    body: [
      "Αφήνοντας πίσω μου την Ασία, γύρισα στην Ευρώπη. Πρώτη μου στάση ήταν η Γαλλία, χώρα των τεχνών, των ιδεών και των μεγάλων περιπάτων.",
      "Εκεί κατάλαβα κάτι σημαντικό: πως κάθε ταξίδι, όσο μακρινό κι αν είναι, στο τέλος οδηγεί σε ένα σπίτι. Κι έτσι, όταν θέλησα να κρύψω το επόμενο στοιχείο, διάλεξα ένα μέρος στην Καλαμάτα που ψιθυρίζει τη γαλλική λέξη για το σπίτι.",
      "Αν καταλάβεις πού κατοικεί η Γαλλία μέσα στην πόλη, θα βρεις και το επόμενο ίχνος του χάρτη.",
    ],
  },
  {
    order: 4,
    country: "Ελβετία",
    subtitle: "Τα βουνά και ο χρόνος",
    icon: "Watch",
    body: [
      "Από τη Γαλλία, ο δρόμος με έφερε στην Ελβετία. Εκεί όπου τα βουνά στέκουν αγέρωχα και ο χρόνος μοιάζει να μετριέται με μεγαλύτερη ακρίβεια απ’ ό,τι αλλού.",
      "Η Ελβετία μου δίδαξε ότι κάθε ταξίδι χρειάζεται ρυθμό. Αν βιαστείς, χάνεις τα σημάδια. Αν αργήσεις πολύ, χάνεις τον δρόμο.",
      "Στην Καλαμάτα, το επόμενο στοιχείο δεν το έκρυψα σε κορυφή βουνού ούτε μέσα σε ρολόι. Το άφησα εκεί όπου μια ελβετική σημαία εμφανίζεται αναπάντεχα κοντά στη θάλασσα, σαν να θυμίζει πως ακόμη και οι Άλπεις μπορούν να καθρεφτιστούν στον Μεσσηνιακό.",
    ],
  },
  {
    order: 5,
    country: "Σερβία",
    subtitle: "Ο άνθρωπος που φώτισε τον κόσμο",
    icon: "Lightbulb",
    body: [
      "Συνεχίζοντας προς τα Βαλκάνια, έφτασα στη Σερβία. Μια χώρα όχι μεγάλη σε έκταση, αλλά αρκετά μεγάλη ώστε να γεννήσει έναν από τους ανθρώπους που άλλαξαν τον τρόπο με τον οποίο ο κόσμος βλέπει το φως.",
      "Πάντα θαύμαζα όσους δεν ταξίδευαν μόνο με καράβια και άλογα, αλλά και με τη σκέψη. Κι έτσι, στην Καλαμάτα άφησα το επόμενο στοιχείο εκεί όπου το βλέμμα ενός μεγάλου Σέρβου επιστήμονα μένει ζωγραφισμένο πάνω στην πόλη.",
      "Αν τον βρεις, στάσου για λίγο μπροστά του. Κάπου εκεί κρύβεται η συνέχεια.",
    ],
  },
  {
    order: 6,
    country: "Ισπανία",
    subtitle: "Το σπίτι του ξένου",
    icon: "DoorOpen",
    body: [
      "Από τα Βαλκάνια κατευθύνθηκα δυτικά, προς την Ισπανία. Εκεί βρήκα χρώμα, μουσική, θάλασσες, πλατείες ��αι ανθρώπους που ήξεραν να κάνουν τον ξένο να αισθάνεται φιλοξενούμενος.",
      "Κάθε ταξιδιώτης, πιστεύω, χρειάζεται κάπου να νιώσει πως κάποιος τον αναγνωρίζει, ακόμη κι αν βρίσκεται μακριά από την πατρίδα του.",
      "Γι’ αυτό και το επόμενο σημάδι το άφησα σε ένα σημείο της Καλαμάτας όπου ένας Ισπανός θα μπορούσε να χτυπήσει την πόρτα και να νιώσει, έστω για λίγο, σαν να βρίσκεται σε γνώριμο έδαφος.",
    ],
  },
  {
    order: 7,
    country: "Αίγυπτος",
    subtitle: "Η μνήμη της ερήμου",
    icon: "Pyramid",
    body: [
      "Ύστερα άφησα την Ευρώπη και ταξίδεψα νότια, εκεί όπου η άμμος κρατά μυστικά παλαιότερα από τα ίδια τα βασίλεια. Στην Αίγυπτο στάθηκα μπροστά στις πυραμίδες και στη Σφίγγα, κι ένιωσα πως ο χρόνος δεν χάνεται· απλώς κρύβεται.",
      "Η Αίγυπτος μου έμαθε πως κάθε θησαυρός χρειάζεται έναν γρίφο. Κανείς δεν φτάνει στην καρδιά του μυστηρίου χωρίς να σταθεί πρώτα μπροστά σε ένα σύμβολο.",
      "Στην Καλαμάτα, το αιγυπτιακό σημάδι δεν το έκρυψα σε έρημο ούτε σε ναό. Το άφησα ζωγραφισμένο, σαν ανάμνηση από έναν αρχαίο κόσμο, κοντά σε ένα μέρος όπου οι περαστικοί συχνά βιάζονται και σπάνια κοιτούν προσεκτικά.",
    ],
  },
  {
    order: 8,
    country: "Ρωσία",
    subtitle: "Η χώρα των μεγάλων αποστάσεων",
    icon: "Package",
    body: [
      "Από την Αίγυπτο στράφηκα προς τον βορρά και έφτασα στη Ρωσία. Μια χώρα αχανής, γεμάτη χειμώνες, ιστορίες, μουσικές και προϊόντα που ταξιδεύουν μακριά από τον τόπο τους.",
      "Συνηθίζω να λέω πως μια χώρα δεν τη θυμάσαι μόνο από τα μνημεία της, αλλά και από τις γεύσεις, τις μυρωδιές και τα μικρά πράγματα που κουβαλούν οι άνθρωποι μαζί τους.",
      "Έτσι, στην Καλαμάτα, το επόμενο ίχνος το άφησα εκεί όπου κάτι από τη Ρωσία συνεχίζει να φτάνει στην πόλη, σαν μικρό φορτίο από έναν πολύ μεγάλο τόπο.",
    ],
  },
  {
    order: 9,
    country: "Φινλανδία",
    subtitle: "Το τελευταίο σημάδι του χάρτη",
    icon: "Snowflake",
    body: [
      "Το τελευταίο μου ταξίδι ήταν προς τον μακρινό βορρά. Εκεί όπου οι λίμνες μοιάζουν αμέτρητες, τα δάση δεν τελειώνουν εύκολα, και τον χειμώνα ο ουρανός μπορεί να φωτιστεί από χρώματα που δεν μοιάζουν αληθινά.",
      "Στη Φινλανδία βρήκα σιωπή. Όχι μοναξιά, αλλά εκείνη τη βαθιά σιωπή που σε αναγκάζει να ακούσεις καλύτερα τις σκέψεις σου. Και τότε κατάλαβα το τελευταίο μυστικό του χάρτη: πως ο θησαυρός δεν βρίσκεται μόνο στο τέλος της διαδρομής. Βρίσκεται σε όλα όσα πρόσεξες για να φτάσεις εκεί.",
      "Κάποτε, σε μια γωνιά της Καλαμάτας, μαζεύονταν άνθρωποι από αυτή τη μακρινή βόρεια χώρα. Σήμερα έχουν φύγει, και το μέρος έχει αλλάξει. Όμως άφησα ένα σημάδι πίσω, κρυμμένο σε κοινή θέα, για όσους ξέρουν να κοιτούν όχι αυτό που φαίνεται πρώτο, αλλά αυτό που επιμένει να υπάρχει από παλιά.",
      "Εκεί θα βρεις το τελευταίο στοιχείο.",
    ],
  },
]

export const TOTAL_CLUES = CLUES.length

const START_MS = new Date(START_ISO).getTime()

/** Absolute unlock time (ms epoch) for a 1-based clue order. */
export function unlockTimeMs(order: number): number {
  return START_MS + (order - 1) * INTERVAL_HOURS * 3600_000
}

/**
 * How many clues are unlocked at a given moment.
 *
 * `previewOverride` forces a specific number of clues open for testing.
 * It is honored only when `allowOverride` is true. The caller decides that:
 * it is true in development, or in production when the visitor supplied the
 * correct secret key (see isOverrideAuthorized). This lets organizers preview
 * clues early on the live site while the public cannot.
 */
export function unlockedCountAt(
  nowMs: number,
  previewOverride?: number,
  allowOverride = false,
): number {
  if (
    allowOverride &&
    previewOverride !== undefined &&
    Number.isFinite(previewOverride)
  ) {
    return Math.max(0, Math.min(TOTAL_CLUES, Math.floor(previewOverride)))
  }
  // The first clue is always revealed, even before the official start time,
  // so visitors always have a starting point in the journal.
  if (nowMs < START_MS) return 1
  const elapsedHours = (nowMs - START_MS) / 3600_000
  return Math.min(TOTAL_CLUES, Math.floor(elapsedHours / INTERVAL_HOURS) + 1)
}

/**
 * Decides whether a testing override is allowed for this request.
 *
 * - Always allowed in development (no key needed).
 * - In production, allowed only when `providedKey` matches the PYTHEA_TEST_KEY
 *   environment variable. If PYTHEA_TEST_KEY is not set, overrides are disabled
 *   in production entirely.
 */
export function isOverrideAuthorized(providedKey?: string): boolean {
  if (process.env.NODE_ENV === "development") return true
  const secret = process.env.PYTHEA_TEST_KEY
  if (!secret) return false
  return providedKey === secret
}

/** Epoch ms when the next still-locked clue opens, or null if all are open. */
export function nextUnlockMs(unlockedCount: number): number | null {
  if (unlockedCount >= TOTAL_CLUES) return null
  return unlockTimeMs(unlockedCount + 1)
}

/** Shape sent to the client for a locked clue: no spoilers, only timing. */
export type LockedClue = {
  order: number
  unlockMs: number
}

/** Computes the public-safe payload for the journey page. */
export function buildClueState(
  nowMs: number,
  previewOverride?: number,
  allowOverride = false,
) {
  const unlockedCount = unlockedCountAt(nowMs, previewOverride, allowOverride)
  const unlocked = CLUES.slice(0, unlockedCount)
  const locked: LockedClue[] = CLUES.slice(unlockedCount).map((c) => ({
    order: c.order,
    unlockMs: unlockTimeMs(c.order),
  }))
  return {
    unlockedCount,
    total: TOTAL_CLUES,
    startMs: START_MS,
    nextUnlockMs: nextUnlockMs(unlockedCount),
    unlocked,
    locked,
  }
}
