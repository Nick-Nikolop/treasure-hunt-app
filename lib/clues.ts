// ─────────────────────────────────────────────────────────────────────────
//  ΠΥΘΕΑΣ Ο ΜΕΣΣΗΝΙΟΣ — Clue content & progression rules
//
//  HOW PROGRESSION WORKS
//  Clue #1 unlocks for everyone at START_ISO (a countdown ticks down to it).
//  Clues #2..#9 unlock only by scanning the physical QR code hidden at each
//  location, strictly in order. A player's progress is stored per-user in the
//  database (see lib/hunt.ts); being in a team means a teammate's scan unlocks
//  the lead for the whole crew.
//
//  TO CHANGE THE START: edit START_ISO below. Keep the +03:00 offset so the
//  time is locked to Greek summer time (EEST) no matter where a visitor is.
//
//  IMPORTANT: clue content (country + location hint) is a spoiler. It is only
//  ever sent to the browser AFTER a clue has unlocked. Locked clues never leave
//  the server. Do not import CLUES into a public/landing component.
// ─────────────────────────────────────────────────────────────────────────

export const START_ISO = "2026-07-01T21:00:00+03:00"

/** Cookie name used by the per-browser testing override. */
export const PREVIEW_COOKIE = "pythea_preview"

export type Clue = {
  /** 1-based order in the hunt */
  order: number
  /** The country this stop represents (Greek; also the canonical stamp key) */
  country: string
  /** The country name in English */
  countryEn: string
  /** Short subtitle for the stop */
  subtitle: string
  /** Short subtitle for the stop, in English */
  subtitleEn: string
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
  /** Full narrative in English, split into paragraphs */
  bodyEn: string[]
}

export const CLUES: Clue[] = [
  {
    order: 1,
    country: "Κίνα",
    countryEn: "China",
    subtitle: "Η αρχή του ταξιδιού",
    subtitleEn: "The journey begins",
    icon: "Landmark",
    body: [
      "Το πρώτο μου ταξίδι με οδήγησε μακριά, στην Άπω Ανατολή. Στην Κίνα, τη χώρα των μεγάλων αντιθέσεων: αρχαίων αυτοκρατόρων και σύγχρονων εργοστασίων, δράκων, μεταξιού και αμέτρητων δρόμων.",
      "Όταν γύρισα στην Καλαμάτα, σκέφτηκα πως δεν χρειάζεται να φτάσει κανείς ως την άλλη άκρη του κόσμου για να βρει το πρώτο σημάδι. Αρκεί να ψάξεις εκεί όπου η Ανατολή συναντά μια οδό που θυμίζει ολόκληρη ελληνική γη.",
      "Εκεί όπου η Κίνα μοιάζει να έχει ανοίξει μια μικρή πύλη μέσα στην πόλη, άφησα το πρώτο σου βήμα.",
    ],
    bodyEn: [
      "My first voyage carried me far away, to the Far East. To China, the land of great contrasts: ancient emperors and modern factories, dragons, silk and countless roads.",
      "When I returned to Kalamata, I thought there is no need to travel to the other end of the world to find the first mark. It is enough to look where the East meets a street that recalls the whole of the Greek land.",
      "There, where China seems to have opened a small gate inside the city, I left your first step.",
    ],
  },
  {
    order: 2,
    country: "Ταϊλάνδη",
    countryEn: "Thailand",
    subtitle: "Η τέχνη της μάχης",
    subtitleEn: "The art of combat",
    icon: "Swords",
    body: [
      "Από την Κίνα συνέχισα νοτιότερα, αναζητώντας όχι θησαυρούς, αλλά πειθαρχία. Έφτασα στη χώρα όπου η μάχη γίνεται τέχνη, το σώμα γίνεται όργανο, και κάθε κίνηση κρύβει σεβασμό.",
      "Στην Ταϊλάνδη έμαθα πως ο αληθινός εξερευνητής δεν χρειάζεται μόνο μάτια, αλλά και συγκέντρωση. Δεν αρκεί να ψάχνεις· πρέπει να παρατηρείς.",
      "Γι’ αυτό και στην Καλαμάτα άφησα το επόμενο σημάδι εκεί όπου η σημαία αυτής της χώρας κοιτάζει τον δρόμο σαν σιωπηλός φύλακας.",
    ],
    bodyEn: [
      "From China I continued further south, seeking not treasures but discipline. I reached the land where combat becomes an art, the body becomes an instrument, and every movement carries respect.",
      "In Thailand I learned that a true explorer needs not only eyes, but also focus. It is not enough to search; you must observe.",
      "That is why, in Kalamata, I left the next mark where the flag of this country watches the street like a silent guardian.",
    ],
  },
  {
    order: 3,
    country: "Γαλλία",
    countryEn: "France",
    subtitle: "Η επιστροφή στην Ευρώπη",
    subtitleEn: "The return to Europe",
    icon: "Home",
    body: [
      "Αφήνοντας πίσω μου την Ασία, γύρισα στην Ευρώπη. Πρώτη μου στάση ήταν η Γαλλία, χώρα των τεχνών, των ιδεών και των μεγάλων περιπάτων.",
      "Εκεί κατάλαβα κάτι σημαντικό: πως κάθε ταξίδι, όσο μακρινό κι αν είναι, στο τέλος οδηγεί σε ένα σπίτι. Κι έτσι, όταν θέλησα να κρύψω το επόμενο στοιχείο, διάλεξα ένα μέρος στην Καλαμάτα που ψιθυρίζει τη γαλλική λέξη για το σπίτι.",
      "Αν καταλάβεις πού κατοικεί η Γαλλία μέσα στην πόλη, θα βρεις και το επόμενο ίχνος του χάρτη.",
    ],
    bodyEn: [
      "Leaving Asia behind me, I returned to Europe. My first stop was France, land of the arts, of ideas and of long walks.",
      "There I understood something important: that every voyage, however distant, leads in the end to a home. And so, when I wanted to hide the next clue, I chose a place in Kalamata that whispers the French word for home.",
      "If you work out where France dwells inside the city, you will find the next trace on the map.",
    ],
  },
  {
    order: 4,
    country: "Ελβετία",
    countryEn: "Switzerland",
    subtitle: "Τα βουνά και ο χρόνος",
    subtitleEn: "The mountains and time",
    icon: "Watch",
    body: [
      "Από τη Γαλλία, ο δρόμος με έφερε στην Ελβετία. Εκεί όπου τα βουνά στέκουν αγέρωχα και ο χρόνος μοιάζει να μετριέται με μεγαλύτερη ακρίβεια απ’ ό,τι αλλού.",
      "Η Ελβετία μου δίδαξε ότι κάθε ταξίδι χρειάζεται ρυθμό. Αν βιαστείς, χάνεις τα σημάδια. Αν αργήσεις πολύ, χάνεις τον δρόμο.",
      "Στην Καλαμάτα, το επόμενο στοιχείο δεν το έκρυψα σε κορυφή βουνού ούτε μέσα σε ρολόι. Το άφησα εκεί όπου μια ελβετική σημαία εμφανίζεται αναπάντεχα κοντά στη θάλασσα, σαν να θυμίζει πως ακόμη και οι Άλπεις μπορούν να καθρεφτιστούν στον Μεσσηνιακό.",
    ],
    bodyEn: [
      "From France, the road brought me to Switzerland. There, where the mountains stand proud and time seems to be measured with greater precision than anywhere else.",
      "Switzerland taught me that every voyage needs a rhythm. Rush, and you miss the marks. Linger too long, and you lose the way.",
      "In Kalamata, I hid the next clue neither on a mountain peak nor inside a clock. I left it where a Swiss flag appears unexpectedly near the sea, as if to remind us that even the Alps can be mirrored in the Messenian gulf.",
    ],
  },
  {
    order: 5,
    country: "Σερβία",
    countryEn: "Serbia",
    subtitle: "Ο άνθρωπος που φώτισε τον κόσμο",
    subtitleEn: "The man who lit the world",
    icon: "Lightbulb",
    body: [
      "Συνεχίζοντας προς τα Βαλκάνια, έφτασα στη Σερβία. Μια χώρα όχι μεγάλη σε έκταση, αλλά αρκετά μεγάλη ώστε να γεννήσει έναν από τους ανθρώπους που άλλαξαν τον τρόπο με τον οποίο ο κόσμος βλέπει το φως.",
      "Πάντα θαύμαζα όσους δεν ταξίδευαν μόνο με καράβια και άλογα, αλλά και με τη σκέψη. Κι έτσι, στην Καλαμάτα άφησα το επόμενο στοιχείο εκεί όπου το βλέμμα ενός μεγάλου Σέρβου επιστήμονα μένει ζωγραφισμένο πάνω στην πόλη.",
      "Αν τον βρεις, στάσου για λίγο μπροστά του. Κάπου εκεί κρύβεται η συνέχεια.",
    ],
    bodyEn: [
      "Continuing towards the Balkans, I reached Serbia. A country not large in size, yet large enough to give birth to one of the people who changed the way the world sees light.",
      "I always admired those who travelled not only by ship and horse, but also by thought. And so, in Kalamata I left the next clue where the gaze of a great Serbian scientist remains painted upon the city.",
      "If you find him, pause for a moment before him. Somewhere there the next step is hidden.",
    ],
  },
  {
    order: 6,
    country: "Ισπανία",
    countryEn: "Spain",
    subtitle: "Το σπίτι του ξένου",
    subtitleEn: "The stranger's home",
    icon: "DoorOpen",
    body: [
      "Από τα Βαλκάνια κατευθύνθηκα δυτικά, προς την Ισπανία. Εκεί βρήκα χρώμα, μουσική, θάλασσες, πλατείες και ανθρώπους που ήξεραν να κάνουν τον ξένο να αισθάνεται φιλοξενούμενος.",
      "Κάθε ταξιδιώτης, πιστεύω, χρειάζεται κάπου να νιώσει πως κάποιος τον αναγνωρίζει, ακόμη κι αν βρίσκεται μακριά από την πατρίδα του.",
      "Γι’ αυτό και το επόμενο σημάδι το άφησα σε ένα σημείο της Καλαμάτας όπου ένας Ισπανός θα μπορούσε να χτυπήσει την πόρτα και να νιώσει, έστω για λίγο, σαν να βρίσκεται σε γνώριμο έδαφος.",
    ],
    bodyEn: [
      "From the Balkans I headed west, towards Spain. There I found colour, music, seas, squares and people who knew how to make a stranger feel like a welcomed guest.",
      "Every traveller, I believe, needs somewhere to feel that someone recognises them, even when far from their homeland.",
      "That is why I left the next mark at a spot in Kalamata where a Spaniard could knock on the door and feel, if only for a moment, as if standing on familiar ground.",
    ],
  },
  {
    order: 7,
    country: "Αίγυπτος",
    countryEn: "Egypt",
    subtitle: "Η μνήμη της ερήμου",
    subtitleEn: "The memory of the desert",
    icon: "Pyramid",
    body: [
      "Ύστερα άφησα την Ευρώπη και ταξίδεψα νότια, εκεί όπου η άμμος κρατά μυστικά παλαιότερα από τα ίδια τα βασίλεια. Στην Αίγυπτο στάθηκα μπροστά στις πυραμίδες και στη Σφίγγα, κι ένιωσα πως ο χρόνος δεν χάνεται· απλώς κρύβεται.",
      "Η Αίγυπτος μου έμαθε πως κάθε θησαυρός χρειάζεται έναν γρίφο. Κανείς δεν φτάνει στην καρδιά του μυστηρίου χωρίς να σταθεί πρώτα μπροστά σε ένα σύμβολο.",
      "Στην Καλαμάτα, το αιγυπτιακό σημάδι δεν το έκρυψα σε έρημο ούτε σε ναό. Το άφησα ζωγραφισμένο, σαν ανάμνηση από έναν αρχαίο κόσμο, κοντά σε ένα μέρος όπου οι περαστικοί συχνά βιάζονται και σπάνια κοιτούν προσεκτικά.",
    ],
    bodyEn: [
      "Then I left Europe and travelled south, where the sand keeps secrets older than the kingdoms themselves. In Egypt I stood before the pyramids and the Sphinx, and felt that time is not lost; it simply hides.",
      "Egypt taught me that every treasure needs a riddle. No one reaches the heart of the mystery without first standing before a symbol.",
      "In Kalamata, I hid the Egyptian mark neither in a desert nor in a temple. I left it painted, like a memory of an ancient world, near a place where passers-by often hurry and rarely look closely.",
    ],
  },
  {
    order: 8,
    country: "Ρωσία",
    countryEn: "Russia",
    subtitle: "Η χώρα των μεγάλων αποστάσεων",
    subtitleEn: "The land of great distances",
    icon: "Package",
    body: [
      "Από την Αίγυπτο στράφηκα προς τον βορρά και έφτασα στη Ρωσία. Μια χώρα αχανής, γεμάτη χειμώνες, ιστορίες, μουσικές και προϊόντα που ταξιδεύουν μακριά από τον τόπο τους.",
      "Συνηθίζω να λέω πως μια χώρα δεν τη θυμάσαι μόνο από τα μνημεία της, αλλά και από τις γεύσεις, τις μυρωδιές και τα μικρά πράγματα που κουβαλούν οι άνθρωποι μαζί τους.",
      "Έτσι, στην Καλαμάτα, το επόμενο ίχνος το άφησα εκεί όπου κάτι από τη Ρωσία συνεχίζει να φτάνει στην πόλη, σαν μικρό φορτίο από έναν πολύ μεγάλο τόπο.",
    ],
    bodyEn: [
      "From Egypt I turned north and reached Russia. A vast country, full of winters, stories, music and goods that travel far from their place of origin.",
      "I often say that you remember a country not only by its monuments, but also by its flavours, its scents and the small things people carry with them.",
      "So, in Kalamata, I left the next trace where something of Russia keeps arriving in the city, like a small cargo from a very large land.",
    ],
  },
  {
    order: 9,
    country: "Φινλανδία",
    countryEn: "Finland",
    subtitle: "Το τελευταίο σημάδι του χάρτη",
    subtitleEn: "The map's final mark",
    icon: "Snowflake",
    body: [
      "Το τελευταίο μου ταξίδι ήταν προς τον μακρινό βορρά. Εκεί όπου οι λίμνες μοιάζουν αμέτρητες, τα δάση δεν τελειώνουν εύκολα, και τον χειμώνα ο ουρανός μπορεί να φωτιστεί από χρώματα που δεν μοιάζουν αληθινά.",
      "Στη Φινλανδία βρήκα σιωπή. Όχι μοναξιά, αλλά εκείνη τη βαθιά σιωπή που σε αναγκάζει να ακούσεις καλύτερα τις σκέψεις σου. Και τότε κατάλαβα το τελευταίο μυστικό του χάρτη: πως ο θησαυρός δεν βρίσκεται μόνο στο τέλος της διαδρομής. Βρίσκεται σε όλα όσα πρόσεξες για να φτάσεις εκεί.",
      "Κάποτε, σε μια γωνιά της Καλαμάτας, μαζεύονταν άνθρωποι από αυτή τη μακρινή βόρεια χώρα. Σήμερα έχουν φύγει, και το μέρος έχει αλλάξει. Όμως άφησα ένα σημάδι πίσω, κρυμμένο σε κοινή θέα, για όσους ξέρουν να κοιτούν όχι αυτό που φαίνεται πρώτο, αλλά αυτό που επιμένει να υπάρχει από παλιά.",
      "Εκεί θα βρεις το τελευταίο στοιχείο.",
    ],
    bodyEn: [
      "My last voyage was towards the far north. There, where the lakes seem countless, the forests do not end easily, and in winter the sky can be lit by colours that hardly seem real.",
      "In Finland I found silence. Not loneliness, but that deep silence which forces you to listen more closely to your own thoughts. And then I understood the map's final secret: that the treasure is not found only at the end of the route. It is found in everything you noticed in order to get there.",
      "Once, in a corner of Kalamata, people from that distant northern country used to gather. Today they have gone, and the place has changed. Yet I left a mark behind, hidden in plain sight, for those who know to look not at what appears first, but at what has stubbornly endured since long ago.",
      "There you will find the final clue.",
    ],
  },
]

export const TOTAL_CLUES = CLUES.length

/** The first lead is the only time-gated one. */
export const FIRST_LEAD_ORDER = 1

export const START_MS = new Date(START_ISO).getTime()

/**
 * Whether lead 1 has opened for everyone. Lead 1 is now open by default, so
 * there is no countdown: everyone starts the hunt able to read the first clue.
 */
export function isLeadOneOpen(_nowMs: number): boolean {
  return true
}

/**
 * The number of leads a player sees as unlocked, combining their stored
 * progress with the global time gate on lead 1. A player can never see fewer
 * than the leads they have actually unlocked, and once START passes everyone
 * sees at least lead 1.
 */
export function effectiveUnlockedCount(progress: number, nowMs: number): number {
  const fromProgress = clampProgress(progress)
  const fromTime = isLeadOneOpen(nowMs) ? 1 : 0
  return Math.max(fromProgress, fromTime)
}

/** Clamp any raw progress value to the valid 0..TOTAL_CLUES range. */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(TOTAL_CLUES, Math.floor(value)))
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

/**
 * Shape sent to the client for a still-sealed lead. No spoilers: only the
 * order and how it opens. "time" leads carry the unlock timestamp for the
 * countdown; "qr" leads open by scanning the physical code.
 */
export type LockedClue = {
  order: number
  gate: "time" | "qr"
  /** Only present for time-gated leads (lead 1). */
  unlockMs?: number
}

/**
 * Computes the public-safe payload for the journey page from a player's
 * effective unlocked count.
 */
export function buildClueState(unlockedCount: number, nowMs: number) {
  const count = clampProgress(unlockedCount)
  const unlocked = CLUES.slice(0, count)
  const locked: LockedClue[] = CLUES.slice(count).map((c) => ({
    order: c.order,
    gate: c.order === FIRST_LEAD_ORDER ? "time" : "qr",
    unlockMs: c.order === FIRST_LEAD_ORDER ? START_MS : undefined,
  }))
  // The single next sealed lead (the one the player is working towards).
  const next = locked[0] ?? null
  return {
    unlockedCount: count,
    total: TOTAL_CLUES,
    startMs: START_MS,
    next,
    unlocked,
    locked,
  }
}
