/*
  Secret Friend (الصديق الخفي) game logic.

  Terminology:
   - giver → receiver : the giver prepares a gift for the receiver.
   - For a participant P:
       * "المرسل إليه" (giveTo)      = the receiver P was assigned  → P is giver
       * "الصديق الخفي" (secretFriend) = the person who has P as their receiver → that person is P's giver

  We store assignments as a list of { giverId, giverName, receiverId, receiverName }.
  From that list:
   - P.giveTo      = assignment where giverId == P  → receiver
   - P.secretFriend = assignment where receiverId == P → giver
*/

// Fisher–Yates shuffle
function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/*
  Generate a single cycle covering all participants (a derangement with no
  fixed points, guaranteed valid: everyone gives to exactly one, receives
  from exactly one, nobody gives to themselves).
  Needs at least 2 participants.
*/
export function generateAssignments(participants) {
  if (!participants || participants.length < 2) {
    throw new Error('يجب اختيار مشاركَين على الأقل')
  }
  const order = shuffle(participants)
  const assignments = []
  for (let i = 0; i < order.length; i++) {
    const giver = order[i]
    const receiver = order[(i + 1) % order.length] // cycle → last gives to first
    assignments.push({
      giverId: giver.id, giverName: giver.name,
      receiverId: receiver.id, receiverName: receiver.name
    })
  }
  return assignments
}

// Validate: no self, no duplicate giver/receiver, complete mapping
export function validateAssignments(assignments, participantIds) {
  const givers = new Set()
  const receivers = new Set()
  for (const a of assignments) {
    if (a.giverId === a.receiverId) return { ok: false, error: 'يوجد شخص موزّع على نفسه' }
    if (givers.has(a.giverId)) return { ok: false, error: 'يوجد مُرسِل مكرر' }
    if (receivers.has(a.receiverId)) return { ok: false, error: 'يوجد مُستقبِل مكرر' }
    givers.add(a.giverId); receivers.add(a.receiverId)
  }
  if (participantIds) {
    if (givers.size !== participantIds.length) return { ok: false, error: 'التوزيعة غير كاملة' }
    for (const id of participantIds) {
      if (!givers.has(id)) return { ok: false, error: 'مشارك بدون توزيع' }
      if (!receivers.has(id)) return { ok: false, error: 'مشارك لا أحد يرسل له' }
    }
  }
  return { ok: true }
}

// Given assignments + a participant id, return their view
export function viewFor(assignments, pid) {
  const asGiver = assignments.find(a => a.giverId === pid)     // المرسل إليه
  const asReceiver = assignments.find(a => a.receiverId === pid) // الصديق الخفي
  return {
    giveTo: asGiver ? { id: asGiver.receiverId, name: asGiver.receiverName } : null,
    secretFriend: asReceiver ? { id: asReceiver.giverId, name: asReceiver.giverName } : null
  }
}

// game status flow
export const SF_STATUS = {
  NONE: 'none',        // no distribution yet
  DRAFT: 'draft',      // generated, not approved
  APPROVED: 'approved',// locked, not shown to participants
  REVEALED: 'revealed',// participants see their giveTo
  FINAL: 'final'       // everyone sees both giveTo + secretFriend
}
