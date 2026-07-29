import { HandwrittenNote } from "@/components/pythea/handwritten-note"

// TEMPORARY scratch route for visual verification of the note only. Delete.
const BODY = `Αν κρατάς αυτό το σημείωμα στα χέρια σου, τότε το πλήρωμά σου έφτασε ως το τέλος του ίχνους. Δεν περίμενα λιγότερα.

Η πυξίδα μου δεν χάθηκε στη θάλασσα. Την άφησα εκεί που ο ήλιος αγγίζει την πέτρα το απόγευμα, κοντά στο νερό που δεν παγώνει ποτέ.

Βρες την, και θα σου δείξει το τελευταίο σημείο. Ο θησαυρός περιμένει ακόμη.`

export default function Page() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto flex max-w-xl flex-col gap-16">
        <HandwrittenNote body={BODY} signature="Πυθέας" animate={false} />
        <HandwrittenNote
          body="Ένα σημείωμα με μία μόνο παράγραφο, για να ελεγχθεί ότι το πρώτο μέγεθος δεν μεγαλώνει άσκοπα ολόκληρη την κάρτα."
          signature="Πυθέας"
          animate={false}
        />
      </div>
    </main>
  )
}
