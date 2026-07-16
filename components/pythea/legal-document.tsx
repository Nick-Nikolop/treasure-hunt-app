"use client"

import Link from "next/link"
import { ArrowLeft, Languages } from "lucide-react"
import { useI18n } from "@/components/pythea/language-provider"
import { TERMS_EFFECTIVE, TERMS_VERSION, LEGAL_ORG } from "@/lib/legal"
import { GEO } from "@/lib/seo"

type Block =
  | { k: "p"; t: string }
  | { k: "sub"; t: string }
  | { k: "list"; items: string[] }

type Section = { id: string; title: string; blocks: Block[] }

type Doc = {
  docTitle: string
  intro: string
  effective: string
  version: string
  toc: string
  back: string
  terms: { heading: string; sections: Section[] }
  privacy: { heading: string; sections: Section[] }
  cookies: { heading: string; sections: Section[] }
}

const EL: Doc = {
  docTitle: "Όροι Χρήσης & Πολιτική Απορρήτου",
  intro:
    "Οι παρόντες όροι διέπουν τη συμμετοχή σου στο κυνήγι θησαυρού και τη χρήση αυτού του ιστότοπου. Διάβασέ τους προσεκτικά. Δημιουργώντας λογαριασμό ή εγγραφόμενος στη λίστα ειδοποιήσεων, δηλώνεις ότι τους αποδέχεσαι.",
  effective: "Σε ισχύ από",
  version: "Έκδοση",
  toc: "Περιεχόμενα",
  back: "Επιστροφή",
  terms: {
    heading: "Α. Όροι Χρήσης",
    sections: [
      {
        id: "acceptance",
        title: "1. Αποδοχή των όρων",
        blocks: [
          {
            k: "p",
            t: "Με την πρόσβαση στον ιστότοπο, τη δημιουργία λογαριασμού ή τη συμμετοχή στο παιχνίδι, αποδέχεσαι πλήρως τους παρόντες όρους και την Πολιτική Απορρήτου. Αν δεν συμφωνείς, δεν πρέπει να χρησιμοποιήσεις την υπηρεσία.",
          },
        ],
      },
      {
        id: "the-game",
        title: "2. Το παιχνίδι",
        blocks: [
          {
            k: "p",
            t: "Πρόκειται για ένα κυνήγι θησαυρού που εκτυλίσσεται στην πόλη της Καλαμάτας, Μεσσηνία, Ελλάδα. Οι συμμετέχοντες λύνουν γρίφους, εντοπίζουν σημάδια στον αστικό χώρο και σαρώνουν κωδικούς QR για να προχωρήσουν στη διαδρομή. Το παιχνίδι απευθύνεται σε ομάδες έως πέντε ατόμων.",
          },
          {
            k: "p",
            t: "Ο διοργανωτής μπορεί να προσαρμόσει τη διαδρομή, τους γρίφους, το χρονοδιάγραμμα ή τους κανόνες ανά πάσα στιγμή, ώστε να διασφαλίζεται η ομαλή και ασφαλής διεξαγωγή.",
          },
        ],
      },
      {
        id: "eligibility",
        title: "3. Επιλεξιμότητα & λογαριασμοί",
        blocks: [
          {
            k: "list",
            items: [
              "Δηλώνεις ότι τα στοιχεία που παρέχεις (email, όνομα, έτος γέννησης) είναι ακριβή και σου ανήκουν.",
              "Ανήλικοι μπορούν να συμμετέχουν μόνο με τη συγκατάθεση και την εποπτεία γονέα ή κηδεμόνα, ο οποίος αναλαμβάνει την ευθύνη.",
              "Είσαι υπεύθυνος για την ασφάλεια των στοιχείων εισόδου σου και για κάθε δραστηριότητα στον λογαριασμό σου.",
              "Απαγορεύεται η δημιουργία πολλαπλών ή ψευδών λογαριασμών με σκοπό την παράκαμψη των κανόνων.",
            ],
          },
        ],
      },
      {
        id: "safety",
        title: "4. Ασφάλεια & συμπεριφορά συμμετεχόντων",
        blocks: [
          {
            k: "p",
            t: "Το παιχνίδι περιλαμβάνει σωματική δραστηριότητα και μετακίνηση σε δημόσιο χώρο. Συμμετέχεις με δική σου ευθύνη και οφείλεις να ενεργείς με σύνεση.",
          },
          {
            k: "list",
            items: [
              "Τήρησε πάντα τον Κώδικα Οδικής Κυκλοφορίας και τη νομοθεσία.",
              "Σεβάσου τους πεζούς, την ιδιωτική περιουσία, τα μνημεία και το περιβάλλον.",
              "Μην εισέρχεσαι σε χώρους όπου δεν επιτρέπεται η πρόσβαση και μην θέτεις σε κίνδυνο τον εαυτό σου ή άλλους.",
              "Φρόντισε την ασφάλεια των ανηλίκων της ομάδας σου σε κάθε στιγμή.",
              "Κανένας γρίφος ή QR δεν απαιτεί είσοδο σε επικίνδυνο, ιδιωτικό ή απαγορευμένο χώρο.",
              "Αν σε οποιοδήποτε σημείο η συνέχιση της διαδρομής φαίνεται επικίνδυνη, οφείλεις να σταματήσεις και να επικοινωνήσεις με τον διοργανωτή.",
            ],
          },
        ],
      },
      {
        id: "fair-play",
        title: "5. Έντιμο παιχνίδι",
        blocks: [
          {
            k: "list",
            items: [
              "Μην καταστρέφεις, μετακινείς ή αλλοιώνεις τα σημάδια και τους κωδικούς QR.",
              "Μην επιχειρείς να παραβιάσεις, να χειραγωγήσεις ή να αποκτήσεις μη εξουσιοδοτημένη πρόσβαση στην υπηρεσία.",
              "Η εξαπάτηση, ο διαμοιρασμός απαντήσεων ή η χρήση αυτοματισμών μπορεί να οδηγήσει σε αποκλεισμό.",
            ],
          },
        ],
      },
      {
        id: "prizes",
        title: "6. Βραβεία, κατάταξη και ανάδειξη νικητών",
        blocks: [
          {
            k: "p",
            t: "Η κατάταξη βασίζεται στην πρόοδο της ομάδας, στις σωστές λύσεις και στις χρονικές σημάνσεις που καταγράφονται από την υπηρεσία. Ο διοργανωτής μπορεί να ελέγξει τα αποτελέσματα πριν την ανακοίνωση των νικητών και να αποκλείσει συμμετοχές που παραβιάζουν τους κανόνες. Σε περίπτωση ισοβαθμίας, ο διοργανωτής μπορεί να εφαρμόσει πρόσθετο κριτήριο ή να ζητήσει επιπλέον διαδικασία επίλυσης. Τυχόν βραβεία δεν ανταλλάσσονται με χρήματα, εκτός αν αναφέρεται ρητά κάτι διαφορετικό.",
          },
        ],
      },
      {
        id: "ip",
        title: "7. Πνευματική ιδιοκτησία",
        blocks: [
          {
            k: "p",
            t: "Το σύνολο του περιεχομένου (κείμενα, γρίφοι, εικαστικά, λογότυπα, κώδικας) ανήκει στον διοργανωτή ή στους δικαιοπαρόχους του και προστατεύεται από τη νομοθεσία περί πνευματικής ιδιοκτησίας. Δεν επιτρέπεται η αναπαραγωγή ή εμπορική εκμετάλλευση χωρίς άδεια.",
          },
        ],
      },
      {
        id: "disclaimer",
        title: "8. Αποποίηση & περιορισμός ευθύνης",
        blocks: [
          {
            k: "p",
            t: "Η υπηρεσία παρέχεται όπως είναι, χωρίς εγγύηση αδιάλειπτης ή χωρίς σφάλματα λειτουργίας. Στον μέγιστο βαθμό που επιτρέπει ο νόμος, ο διοργανωτής δεν ευθύνεται για έμμεσες ή αποθετικές ζημίες, ούτε για τραυματισμούς ή απώλειες που προκύπτουν από τη συμμετοχή, εφόσον δεν οφείλονται σε δόλο ή βαριά αμέλειά του.",
          },
        ],
      },
      {
        id: "changes",
        title: "9. Τροποποιήσεις & εφαρμοστέο δίκαιο",
        blocks: [
          {
            k: "p",
            t: "Μπορούμε να επικαιροποιήσουμε τους όρους. Οι ουσιώδεις αλλαγές θα επισημαίνονται με νέα έκδοση και ημερομηνία. Οι παρόντες όροι διέπονται από το ελληνικό δίκαιο και αρμόδια ορίζονται τα δικαστήρια της Καλαμάτας.",
          },
        ],
      },
    ],
  },
  privacy: {
    heading: "Β. Πολιτική Απορρήτου (GDPR)",
    sections: [
      {
        id: "controller",
        title: "1. Υπεύθυνος επεξεργασίας",
        blocks: [
          {
            k: "p",
            t: `Υπεύθυνος επεξεργασίας των δεδομένων σου είναι ο διοργανωτής του παιχνιδιού «${LEGAL_ORG.name}». Για κάθε ζήτημα σχετικό με τα προσωπικά σου δεδομένα, μπορείς να επικοινωνήσεις στο ${LEGAL_ORG.contactEmail} ή μέσω Instagram (${LEGAL_ORG.instagram}).`,
          },
        ],
      },
      {
        id: "data",
        title: "2. Ποια δεδομένα συλλέγουμε",
        blocks: [
          {
            k: "list",
            items: [
              "Στοιχεία λογαριασμού: email, όνομα, επώνυμο (προαιρετικά), έτος γέννησης.",
              "Δεδομένα λίστας ειδοποιήσεων: το email σου, αν εγγραφείς για ενημέρωση.",
              "Δεδομένα παιχνιδιού: ομάδα, πρόοδος, χρονικές σημάνσεις λύσεων και κατάταξη.",
              "Απόδειξη συγκατάθεσης: η έκδοση των όρων που αποδέχτηκες και η στιγμή αποδοχής.",
              "Δεδομένα τοποθεσίας: μόνο στιγμιαίος έλεγχος εγγύτητας κατά τη σάρωση, χωρίς αποθήκευση των συντεταγμένων σου (βλ. ενότητα 3).",
              "Φωτογραφίες απόδειξης: αν επιλέξεις να ανεβάσεις φωτογραφίες αντί για τοποθεσία, ώστε να ελεγχθεί ότι βρίσκεσαι στο σημάδι.",
              "Τεχνικά δεδομένα: διεύθυνση IP, τύπος συσκευής και προγράμματος περιήγησης, βασικά αναλυτικά συμβάντα χρήσης.",
            ],
          },
        ],
      },
      {
        id: "location",
        title: "3. Δεδομένα τοποθεσίας (GPS)",
        blocks: [
          {
            k: "p",
            t: "Ορισμένα σημάδια ξεκλειδώνουν μόνο από κοντά. Για να επιβεβαιώσουμε ότι βρίσκεσαι πραγματικά εκεί, μπορείς να μοιραστείς την τοποθεσία σου τη στιγμή που σαρώνεις τον κωδικό. Ο έλεγχος αυτός γίνεται αποκλειστικά εκείνη τη στιγμή.",
          },
          {
            k: "list",
            items: [
              "Η τοποθεσία σου χρησιμοποιείται μόνο τη στιγμή της σάρωσης, για να υπολογιστεί αν απέχεις έως 100 μέτρα από το σημάδι.",
              "Δεν αποθηκεύουμε τις συντεταγμένες σου. Δεν κρατάμε ιστορικό τοποθεσίας και δεν παρακολουθούμε τις κινήσεις σου.",
              "Ο υπολογισμός της απόστασης είναι στιγμιαίος και το μόνο που παραμένει είναι το αποτέλεσμα «εντός ή εκτός εμβέλειας». Οι ίδιες οι συντεταγμένες δεν αποθηκεύονται πουθενά.",
              "Ο εντοπισμός τοποθεσίας απαιτεί τη ρητή άδειά σου στο πρόγραμμα περιήγησης. Μπορείς να την αρνηθείς ή να την ανακαλέσεις οποτεδήποτε.",
              "Αν δεν θέλεις ή δεν μπορείς να μοιραστείς τοποθεσία, ξεκλειδώνεις το σημάδι ανεβάζοντας 1 έως 3 φωτογραφίες ως απόδειξη.",
            ],
          },
        ],
      },
      {
        id: "bases",
        title: "4. Νομικές βάσεις επεξεργασίας",
        blocks: [
          {
            k: "list",
            items: [
              "Συγκατάθεση (άρθρο 6 παρ. 1 α GDPR): για τη λίστα ειδοποιήσεων και τυχόν ενημερωτικά μηνύματα. Μπορείς να την ανακαλέσεις οποτεδήποτε.",
              "Εκτέλεση σύμβασης (άρθρο 6 παρ. 1 β): για τη δημιουργία λογαριασμού και τη διεξαγωγή του παιχνιδιού.",
              "Έννομο συμφέρον (άρθρο 6 παρ. 1 στ): για την ασφάλεια, την πρόληψη κατάχρησης και τη βελτίωση της υπηρεσίας μέσω περιορισμένων αναλυτικών στοιχείων.",
            ],
          },
        ],
      },
      {
        id: "retention",
        title: "5. Χρόνος διατήρησης",
        blocks: [
          {
            k: "p",
            t: "Τα δεδομένα λογαριασμού και παιχνιδιού διατηρούνται όσο διαρκεί ο λογαριασμός και η διοργάνωση, καθώς και έως 6 μήνες μετά τη λήξη της διοργάνωσης, εκτός αν απαιτείται μεγαλύτερη διατήρηση για λόγους ασφάλειας, νομικής υποχρέωσης ή επίλυσης διαφορών. Τα email της λίστας ειδοποιήσεων διατηρούνται μέχρι την έναρξη της διοργάνωσης ή μέχρι να ζητήσεις τη διαγραφή σου.",
          },
        ],
      },
      {
        id: "sharing",
        title: "6. Αποδέκτες & διαβιβάσεις",
        blocks: [
          {
            k: "p",
            t: "Δεν πουλάμε τα δεδομένα σου. Τα μοιραζόμαστε μόνο με παρόχους που μας υποστηρίζουν ως εκτελούντες την επεξεργασία, όπως η υποδομή φιλοξενίας (Vercel) και η βάση δεδομένων (Neon), υπό κατάλληλες συμβατικές δεσμεύσεις. Τυχόν διαβιβάσεις εκτός ΕΟΧ γίνονται με τις κατάλληλες εγγυήσεις (π.χ. Τυποποιημένες Συμβατικές Ρήτρες). Ενδέχεται να κοινοποιήσουμε δεδομένα αν το επιβάλλει ο νόμος.",
          },
        ],
      },
      {
        id: "rights",
        title: "7. Τα δικαιώματά σου",
        blocks: [
          {
            k: "p",
            t: "Σύμφωνα με τον GDPR, έχεις τα ακόλουθα δικαιώματα ως προς τα δεδομένα σου:",
          },
          {
            k: "list",
            items: [
              "Πρόσβαση, διόρθωση και διαγραφή.",
              "Περιορισμός και εναντίωση στην επεξεργασία.",
              "Φορητότητα των δεδομένων.",
              "Ανάκληση της συγκατάθεσης ανά πάσα στιγμή, χωρίς να θίγεται η νομιμότητα της προηγούμενης επεξεργασίας.",
            ],
          },
          {
            k: "p",
            t: `Για να ασκήσεις τα δικαιώματά σου, επικοινώνησε στο ${LEGAL_ORG.contactEmail}. Έχεις επίσης το δικαίωμα να υποβάλεις καταγγελία στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (www.dpa.gr).`,
          },
        ],
      },
      {
        id: "security",
        title: "8. Ασφάλεια & ανήλικοι",
        blocks: [
          {
            k: "p",
            t: "Λαμβάνουμε εύλογα τεχνικά και οργανωτικά μέτρα: οι κωδικοί αποθηκεύονται κρυπτογραφημένοι (hashed) και η μεταφορά δεδομένων γίνεται μέσω κρυπτογραφημένης σύνδεσης. Η υπηρεσία δεν απευθύνεται σε παιδιά κάτω των 15 ετών χωρίς συγκατάθεση γονέα ή κηδεμόνα. Για λόγους ασφάλειας του παιχνιδιού, ανήλικοι συμμετέχουν μόνο με συγκατάθεση και εποπτεία γονέα ή κηδεμόνα.",
          },
        ],
      },
    ],
  },
  cookies: {
    heading: "Γ. Cookies & τοπική αποθήκευση",
    sections: [
      {
        id: "cookies-use",
        title: "Τι χρησιμοποιούμε",
        blocks: [
          {
            k: "list",
            items: [
              "Απαραίτητα: διαχείριση σύνδεσης και συνεδρίας, έλεγχος φάσης της διοργάνωσης. Χωρίς αυτά η υπηρεσία δεν λειτουργεί.",
              "Προτιμήσεων: γλώσσα και ελαφριά λειτουργία εμφάνισης.",
              "Αναλυτικά: βασικά, first-party συμβάντα χρήσης για τη βελτίωση της εμπειρίας.",
            ],
          },
          {
            k: "p",
            t: "Τα μη απαραίτητα cookies ή αναλυτικά εργαλεία ενεργοποιούνται μόνο εφόσον έχεις δώσει τη συγκατάθεσή σου, όπου απαιτείται. Μπορείς να ανακαλέσεις ή να αλλάξεις τη συγκατάθεσή σου οποτεδήποτε μέσω των ρυθμίσεων cookies, όταν αυτές είναι διαθέσιμες.",
          },
          {
            k: "p",
            t: "Μπορείς να ελέγξεις ή να διαγράψεις τα cookies μέσα από τις ρυθμίσεις του προγράμματος περιήγησής σου.",
          },
        ],
      },
    ],
  },
}

const EN: Doc = {
  docTitle: "Terms of Service & Privacy Policy",
  intro:
    "These terms govern your participation in the treasure hunt and your use of this website. Please read them carefully. By creating an account or joining the notify list, you confirm that you accept them.",
  effective: "Effective from",
  version: "Version",
  toc: "Contents",
  back: "Back",
  terms: {
    heading: "A. Terms of Service",
    sections: [
      {
        id: "acceptance",
        title: "1. Acceptance of terms",
        blocks: [
          {
            k: "p",
            t: "By accessing the website, creating an account or taking part in the game, you fully accept these terms and the Privacy Policy. If you do not agree, you must not use the service.",
          },
        ],
      },
      {
        id: "the-game",
        title: "2. The game",
        blocks: [
          {
            k: "p",
            t: `This is a treasure hunt that takes place in the city of Kalamata, ${GEO.regionEn}, Greece. Participants solve clues, locate marks in the urban space and scan QR codes to advance along the trail. The game is designed for teams of up to five people.`,
          },
          {
            k: "p",
            t: "The organiser may adjust the route, the clues, the schedule or the rules at any time to ensure the event runs smoothly and safely.",
          },
        ],
      },
      {
        id: "eligibility",
        title: "3. Eligibility & accounts",
        blocks: [
          {
            k: "list",
            items: [
              "You confirm that the information you provide (email, name, year of birth) is accurate and belongs to you.",
              "Minors may take part only with the consent and supervision of a parent or guardian, who assumes responsibility.",
              "You are responsible for keeping your login credentials safe and for all activity on your account.",
              "Creating multiple or fake accounts to bypass the rules is not allowed.",
            ],
          },
        ],
      },
      {
        id: "safety",
        title: "4. Participant safety & conduct",
        blocks: [
          {
            k: "p",
            t: "The game involves physical activity and movement through public space. You take part at your own risk and must act sensibly.",
          },
          {
            k: "list",
            items: [
              "Always obey traffic rules and the law.",
              "Respect pedestrians, private property, monuments and the environment.",
              "Do not enter restricted areas and do not put yourself or others at risk.",
              "Look after the safety of any minors in your team at all times.",
              "No clue or QR code requires you to enter a dangerous, private or restricted area.",
              "If at any point continuing the trail feels dangerous, you must stop and contact the organiser.",
            ],
          },
        ],
      },
      {
        id: "fair-play",
        title: "5. Fair play",
        blocks: [
          {
            k: "list",
            items: [
              "Do not damage, move or tamper with the marks and QR codes.",
              "Do not attempt to breach, manipulate or gain unauthorised access to the service.",
              "Cheating, sharing answers or using automation may lead to disqualification.",
            ],
          },
        ],
      },
      {
        id: "prizes",
        title: "6. Prizes, ranking and winner selection",
        blocks: [
          {
            k: "p",
            t: "The ranking is based on each team's progress, correct solutions and the timestamps recorded by the service. The organiser may review the results before announcing the winners and may disqualify entries that break the rules. In the event of a tie, the organiser may apply an additional criterion or request a further resolution process. Any prizes are not exchangeable for cash, unless expressly stated otherwise.",
          },
        ],
      },
      {
        id: "ip",
        title: "7. Intellectual property",
        blocks: [
          {
            k: "p",
            t: "All content (texts, clues, artwork, logos, code) belongs to the organiser or its licensors and is protected by intellectual property law. Reproduction or commercial use without permission is not allowed.",
          },
        ],
      },
      {
        id: "disclaimer",
        title: "8. Disclaimer & limitation of liability",
        blocks: [
          {
            k: "p",
            t: "The service is provided as is, without a guarantee of uninterrupted or error-free operation. To the fullest extent permitted by law, the organiser is not liable for indirect or consequential damages, nor for injuries or losses arising from participation, unless caused by its wilful misconduct or gross negligence.",
          },
        ],
      },
      {
        id: "changes",
        title: "9. Changes & governing law",
        blocks: [
          {
            k: "p",
            t: "We may update these terms. Material changes will be marked with a new version and date. These terms are governed by Greek law and the courts of Kalamata have jurisdiction.",
          },
        ],
      },
    ],
  },
  privacy: {
    heading: "B. Privacy Policy (GDPR)",
    sections: [
      {
        id: "controller",
        title: "1. Data controller",
        blocks: [
          {
            k: "p",
            t: `The controller of your data is the organiser of the game "${LEGAL_ORG.name}". For any matter relating to your personal data, you can contact ${LEGAL_ORG.contactEmail} or reach us on Instagram (${LEGAL_ORG.instagram}).`,
          },
        ],
      },
      {
        id: "data",
        title: "2. What data we collect",
        blocks: [
          {
            k: "list",
            items: [
              "Account details: email, first name, last name (optional), year of birth.",
              "Notify-list data: your email, if you sign up to be notified.",
              "Gameplay data: team, progress, solve timestamps and ranking.",
              "Proof of consent: the version of the terms you accepted and the moment of acceptance.",
              "Location data: only an instant proximity check at the moment of a scan, without storing your coordinates (see section 3).",
              "Proof photos: if you choose to upload photos instead of location, so we can verify you're at the mark.",
              "Technical data: IP address, device and browser type, basic first-party analytics events.",
            ],
          },
        ],
      },
      {
        id: "location",
        title: "3. Location data (GPS)",
        blocks: [
          {
            k: "p",
            t: "Some marks only unlock up close. To confirm you're really there, you can share your location at the moment you scan the code. This check happens only at that moment.",
          },
          {
            k: "list",
            items: [
              "Your location is used only at the moment of the scan, to calculate whether you're within 100 metres of the mark.",
              "We do not store your coordinates. We keep no location history and do not track your movements.",
              "The distance is calculated instantly and the only thing kept is the in-range or out-of-range result. The coordinates themselves are not saved anywhere.",
              "Location access requires your explicit permission in the browser. You can refuse it or revoke it at any time.",
              "If you won't or can't share location, you unlock the mark by uploading 1 to 3 photos as proof instead.",
            ],
          },
        ],
      },
      {
        id: "bases",
        title: "4. Legal bases for processing",
        blocks: [
          {
            k: "list",
            items: [
              "Consent (Article 6(1)(a) GDPR): for the notify list and any informational messages. You can withdraw it at any time.",
              "Performance of a contract (Article 6(1)(b)): to create your account and run the game.",
              "Legitimate interest (Article 6(1)(f)): for security, abuse prevention and improving the service through limited analytics.",
            ],
          },
        ],
      },
      {
        id: "retention",
        title: "5. Retention period",
        blocks: [
          {
            k: "p",
            t: "Account and gameplay data are kept for as long as your account and the event last, and for up to 6 months after the event ends, unless longer retention is required for security, a legal obligation or the resolution of disputes. Notify-list emails are kept until the event launches or until you ask to be removed.",
          },
        ],
      },
      {
        id: "sharing",
        title: "6. Recipients & transfers",
        blocks: [
          {
            k: "p",
            t: "We do not sell your data. We share it only with providers that support us as processors, such as our hosting infrastructure (Vercel) and database (Neon), under appropriate contractual safeguards. Any transfers outside the EEA are made with appropriate safeguards (for example Standard Contractual Clauses). We may disclose data where required by law.",
          },
        ],
      },
      {
        id: "rights",
        title: "7. Your rights",
        blocks: [
          {
            k: "p",
            t: "Under the GDPR, you have the following rights over your data:",
          },
          {
            k: "list",
            items: [
              "Access, rectification and erasure.",
              "Restriction of and objection to processing.",
              "Data portability.",
              "Withdrawal of consent at any time, without affecting the lawfulness of processing before withdrawal.",
            ],
          },
          {
            k: "p",
            t: `To exercise your rights, contact ${LEGAL_ORG.contactEmail}. You also have the right to lodge a complaint with the Hellenic Data Protection Authority (www.dpa.gr).`,
          },
        ],
      },
      {
        id: "security",
        title: "8. Security & children",
        blocks: [
          {
            k: "p",
            t: "We take reasonable technical and organisational measures: passwords are stored hashed and data is transferred over an encrypted connection. The service is not directed at children under 15 without the consent of a parent or guardian. For the safety of the game, minors take part only with the consent and supervision of a parent or guardian.",
          },
        ],
      },
    ],
  },
  cookies: {
    heading: "C. Cookies & local storage",
    sections: [
      {
        id: "cookies-use",
        title: "What we use",
        blocks: [
          {
            k: "list",
            items: [
              "Essential: login and session management, event phase control. The service will not work without these.",
              "Preferences: language and lite display mode.",
              "Analytics: basic, first-party usage events to improve the experience.",
            ],
          },
          {
            k: "p",
            t: "Non-essential cookies or analytics tools are activated only if you have given your consent, where required. You can withdraw or change your consent at any time through the cookie settings, when these are available.",
          },
          {
            k: "p",
            t: "You can control or delete cookies through your browser settings.",
          },
        ],
      },
    ],
  },
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.k === "p") {
          return (
            <p
              key={i}
              className="font-sans text-[15px] leading-[1.75] text-muted-foreground md:text-base"
            >
              {b.t}
            </p>
          )
        }
        if (b.k === "sub") {
          return (
            <h4 key={i} className="font-serif text-base font-black text-foreground">
              {b.t}
            </h4>
          )
        }
        return (
          <ul key={i} className="flex flex-col gap-2">
            {b.items.map((it, j) => (
              <li
                key={j}
                className="flex gap-2.5 font-sans text-[15px] leading-[1.7] text-muted-foreground md:text-base"
              >
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        )
      })}
    </>
  )
}

function Part({ heading, sections }: { heading: string; sections: Section[] }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="border-b border-border pb-2 font-serif text-xl font-black tracking-tight text-brass md:text-2xl">
        {heading}
      </h2>
      {sections.map((s) => (
        <div key={s.id} id={s.id} className="flex scroll-mt-24 flex-col gap-3">
          <h3 className="font-serif text-lg font-black text-foreground md:text-xl">{s.title}</h3>
          <Blocks blocks={s.blocks} />
        </div>
      ))}
    </section>
  )
}

/**
 * The public /terms page: a single bilingual document holding the Terms of
 * Service, the GDPR Privacy Policy and the Cookies notice. It reads the current
 * locale from the shared i18n provider and offers an inline EL/EN switch so the
 * document can be read in either language without leaving the page.
 */
export function LegalDocument() {
  const { locale, toggle } = useI18n()
  const d = locale === "el" ? EL : EN

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-12 md:px-8 md:py-16">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-sans text-xs font-bold tracking-chip text-muted-foreground transition-colors hover:text-brass"
        >
          <ArrowLeft className="size-4" />
          {d.back}
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-sans text-xs font-bold tracking-chip text-foreground transition-colors hover:border-brass hover:text-brass"
        >
          <Languages className="size-3.5" />
          {locale === "el" ? "EN" : "EL"}
        </button>
      </div>

      <header className="mt-8 flex flex-col gap-3 border-b border-border pb-8">
        <h1 className="text-balance font-serif text-[28px] font-black leading-tight tracking-tight text-foreground md:text-[34px]">
          {d.docTitle}
        </h1>
        <p className="font-sans text-[15px] leading-[1.75] text-muted-foreground md:text-base">
          {d.intro}
        </p>
        <p className="font-sans text-xs font-bold tracking-chip text-muted-foreground/70">
          {d.effective} {TERMS_EFFECTIVE[locale]} · {d.version} {TERMS_VERSION}
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-12">
        <Part heading={d.terms.heading} sections={d.terms.sections} />
        <Part heading={d.privacy.heading} sections={d.privacy.sections} />
        <Part heading={d.cookies.heading} sections={d.cookies.sections} />
      </div>
    </main>
  )
}
