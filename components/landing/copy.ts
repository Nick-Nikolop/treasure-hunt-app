import type { Locale } from "@/lib/i18n"

export const LANDING_COPY = {
  el: {
    nav: { how: "Πώς παίζεται", missions: "Αποστολές", faq: "Ερωτήσεις" },
    hero: {
      eyebrow: "Ένα παιχνίδι μυστηρίου στον πραγματικό κόσμο",
      title: ["Κάτι", "κρύβεται εδώ."],
      body: "Το The Hunt μετατρέπει την πόλη σε παιχνίδι. Ακολουθείς στοιχεία, λύνεις γρίφους, βρίσκεις κρυμμένα σημεία και φτάνεις με την ομάδα σου μέχρι το τέλος.",
      primary: "Ανακάλυψε τις αποστολές",
      secondary: "Πώς παίζεται",
      hint: "Κούνησε το φως. Η πόλη έχει κι άλλα να σου δείξει.",
    },
    story: {
      label: "Η ιδέα",
      lines: [
        "Περνάμε κάθε μέρα από τα ίδια μέρη.",
        "Τους ίδιους δρόμους. Τα ίδια κτίρια.",
        "Κι αν κάτι από όλα αυτά έκρυβε ένα στοιχείο;",
        "Αν μια συνηθισμένη διαδρομή ήταν η αρχή μιας ιστορίας;",
      ],
      close: "Αυτό είναι το The Hunt.",
    },
    how: {
      label: "Πώς παίζεται",
      title: "Τέσσερις σκηνές. Μία ιστορία.",
      scene: "Σκηνή",
      steps: [
        {
          title: "Διάλεξε αποστολή",
          body: "Κάθε αποστολή έχει τη δική της ιστορία, τοποθεσία, διάρκεια και κανόνες.",
          image: "/landing/scene-mission.png",
          alt: "Σφραγισμένος φάκελος πάνω σε χάρτη πόλης",
        },
        {
          title: "Φτιάξε την ομάδα σου",
          body: "Μάζεψε την παρέα σου. Συνεργασία, παρατηρητικότητα και φαντασία κάνουν τη διαφορά.",
          image: "/landing/scene-team.png",
          alt: "Παρέα φίλων τη νύχτα κοιτάζει ένα κινητό",
        },
        {
          title: "Βρες τα στοιχεία",
          body: "Εξερεύνησε πραγματικά σημεία, λύσε γρίφους και σκάναρε QR checkpoints. Κάθε ανακάλυψη ξεκλειδώνει το επόμενο κομμάτι.",
          image: "/landing/scene-clue.png",
          alt: "Φακός φωτίζει πλακέτα με QR σε πέτρινο τοίχο",
        },
        {
          title: "Φτάσε στο τέλος",
          body: "Ένωσε τα κομμάτια και μάθε τι κρύβεται πίσω από το μυστήριο. Το φινάλε αλλάζει σε κάθε αποστολή.",
          image: "/landing/scene-finale.png",
          alt: "Ξύλινο κουτί ανοίγει και βγαίνει φως",
        },
      ],
      note: "Δεν κερδίζει όποιος τρέχει πιο γρήγορα. Κερδίζει όποιος παρατηρεί, σκέφτεται και συνεργάζεται.",
    },
    why: {
      label: "Τι το κάνει διαφορετικό",
      items: [
        { title: "Η περιπέτεια είναι αληθινή", body: "Δεν μπαίνεις σε φανταστικό κόσμο. Οι πραγματικοί δρόμοι γίνονται σημεία ανακάλυψης." },
        { title: "Κάθε στοιχείο μετράει", body: "Γρίφοι, παρατηρήσεις και πληροφορίες είναι κομμάτια μιας μεγαλύτερης ιστορίας." },
        { title: "Η ομάδα κάνει τη διαφορά", body: "Διαφορετικά μυαλά βλέπουν διαφορετικά πράγματα. Εδώ χρειάζονται όλα." },
        { title: "Κάθε αποστολή είναι αλλιώτικη", body: "Νέες ιστορίες, νέα σημεία, νέες προκλήσεις, κάτω από το ίδιο όνομα." },
      ],
    },
    missions: {
      label: "Οι αποστολές",
      title: "Κάθε αποστολή είναι μια νέα ιστορία.",
      body: "Εδώ θα βρίσκεις όσες αποστολές τρέχουν, με τις ημερομηνίες, τους όρους και τη σελίδα συμμετοχής της καθεμιάς.",
      next: { status: "Σύντομα", title: "Η επόμενη αποστολή", body: "Ετοιμάζεται. Οι λεπτομέρειες ανακοινώνονται σύντομα." },
      past: { status: "Ολοκληρώθηκε", title: "Το ταξίδι του Πυθέα", body: "Η πρώτη αποστολή του The Hunt. Δέκα σταθμοί, ένα ημερολόγιο, ένας θησαυρός." },
    },
    who: {
      title: "Για όσους δεν αρκούνται στο προφανές.",
      body: "Για παρέες που αγαπούν τους γρίφους και τα escape rooms, για όσους ψάχνουν κάτι διαφορετικό από μια συνηθισμένη έξοδο. Δεν χρειάζεται να είσαι εξερευνητής. Αρκεί η περιέργεια.",
    },
    faq: {
      label: "Ερωτήσεις",
      items: [
        { q: "Τι είναι το The Hunt;", a: "Μια διαδραστική εμπειρία εξερεύνησης και γρίφων που ενώνει τον πραγματικό κόσμο με ένα ψηφιακό παιχνίδι." },
        { q: "Πώς συμμετέχω;", a: "Διαλέγεις μια διαθέσιμη αποστολή και ακολουθείς τις οδηγίες συμμετοχής της. Κάθε αποστολή έχει τους δικούς της όρους." },
        { q: "Χρειάζομαι κινητό;", a: "Ναι. Από το κινητό βλέπεις τα στοιχεία και σκανάρεις τα QR checkpoints. Οι ακριβείς απαιτήσεις αναφέρονται σε κάθε αποστολή." },
        { q: "Παίζω με φίλους;", a: "Φυσικά. Η ομάδα είναι η καρδιά του παιχνιδιού. Το μέγεθός της το ορίζει κάθε αποστολή." },
        { q: "Πόσο διαρκεί;", a: "Εξαρτάται από την αποστολή. Κάποιες ολοκληρώνονται σε λίγες ώρες, άλλες εξελίσσονται σε μέρες ή φάσεις." },
        { q: "Κοστίζει; Έχει έπαθλα;", a: "Το κόστος και τυχόν έπαθλα διαφέρουν ανά αποστολή και αναφέρονται στη σελίδα της." },
        { q: "Πρέπει να τρέχω;", a: "Όχι. Το The Hunt βασίζεται στην παρατήρηση και τη σκέψη. Η ασφάλεια και ο σεβασμός στους δημόσιους χώρους έρχονται πρώτα." },
      ],
    },
    closing: {
      title: "Το επόμενο στοιχείο σε περιμένει.",
      body: "Μάζεψε την ομάδα σου και ετοιμάσου να δεις την πόλη αλλιώς.",
      cta: "Ανακάλυψε τις αποστολές",
    },
    footer: { terms: "Όροι συμμετοχής", rights: "Με επιφύλαξη παντός δικαιώματος." },
    lang: "EN",
    langLabel: "Switch to English",
  },
  en: {
    nav: { how: "How it works", missions: "Hunts", faq: "FAQ" },
    hero: {
      eyebrow: "A mystery game played in the real world",
      title: ["Something", "is hidden here."],
      body: "The Hunt turns the city into a game. Follow clues, solve puzzles, find hidden spots and reach the end with your team.",
      primary: "Explore the Hunts",
      secondary: "How it works",
      hint: "Move the light. The city has more to show you.",
    },
    story: {
      label: "The idea",
      lines: [
        "Every day we pass the same places.",
        "The same streets. The same buildings.",
        "What if one of them was hiding a clue?",
        "What if an ordinary walk was the start of a story?",
      ],
      close: "That is The Hunt.",
    },
    how: {
      label: "How it works",
      title: "Four scenes. One story.",
      scene: "Scene",
      steps: [
        {
          title: "Pick a Hunt",
          body: "Every Hunt has its own story, location, length and rules.",
          image: "/landing/scene-mission.png",
          alt: "A sealed envelope on a city map",
        },
        {
          title: "Build your team",
          body: "Gather your crew. Teamwork, a sharp eye and imagination make the difference.",
          image: "/landing/scene-team.png",
          alt: "Friends at night looking at a phone",
        },
        {
          title: "Find the clues",
          body: "Explore real places, solve puzzles and scan QR checkpoints. Every find unlocks the next part.",
          image: "/landing/scene-clue.png",
          alt: "A flashlight lighting a QR plaque on a stone wall",
        },
        {
          title: "Reach the end",
          body: "Connect the pieces and learn what lies behind the mystery. Every Hunt ends differently.",
          image: "/landing/scene-finale.png",
          alt: "A wooden box opening with light spilling out",
        },
      ],
      note: "It is not about running fastest. It is about noticing, thinking and working together.",
    },
    why: {
      label: "What makes it different",
      items: [
        { title: "The adventure is real", body: "No fantasy world needed. Real streets become places of discovery." },
        { title: "Every clue matters", body: "Puzzles, observations and facts are pieces of a bigger story." },
        { title: "The team makes the difference", body: "Different minds notice different things. Here you need them all." },
        { title: "Every Hunt is different", body: "New stories, new places, new challenges, under the same name." },
      ],
    },
    missions: {
      label: "The Hunts",
      title: "Every Hunt is a new story.",
      body: "This is where running Hunts will appear, each with its dates, terms and its own sign-up page.",
      next: { status: "Coming soon", title: "The next Hunt", body: "In the making. Details will be announced soon." },
      past: { status: "Completed", title: "Pytheas' Voyage", body: "The first Hunt. Ten stops, one journal, one treasure." },
    },
    who: {
      title: "For those who look past the obvious.",
      body: "For friends who love puzzles and escape rooms, and anyone after something different from a usual night out. You do not need to be an explorer. Curiosity is enough.",
    },
    faq: {
      label: "FAQ",
      items: [
        { q: "What is The Hunt?", a: "An interactive exploration and puzzle experience that connects the real world with a digital game." },
        { q: "How do I join?", a: "Pick an available Hunt and follow its sign-up instructions. Each Hunt has its own terms." },
        { q: "Do I need a phone?", a: "Yes. You use it to view clues and scan QR checkpoints. Exact requirements are listed for each Hunt." },
        { q: "Can I play with friends?", a: "Of course. The team is the heart of the game. Each Hunt sets its team size." },
        { q: "How long does it last?", a: "It depends on the Hunt. Some take a few hours, others unfold over days or phases." },
        { q: "Does it cost anything? Are there prizes?", a: "Cost and any prizes vary by Hunt and are listed on its page." },
        { q: "Do I have to run?", a: "No. The Hunt is about observation and thinking. Safety and respect for public spaces come first." },
      ],
    },
    closing: {
      title: "The next clue is waiting.",
      body: "Gather your team and get ready to see the city differently.",
      cta: "Explore the Hunts",
    },
    footer: { terms: "Terms", rights: "All rights reserved." },
    lang: "ΕΛ",
    langLabel: "Αλλαγή σε Ελληνικά",
  },
} satisfies Record<Locale, unknown>

export type LandingCopy = (typeof LANDING_COPY)["el"]
