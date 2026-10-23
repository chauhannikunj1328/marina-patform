# Feedback Log

Comments on the 13-part Marina post series, grouped by date (newest first).
We act on these after the series ends on **2 December 2026**.

Status: **Open** (not started) · **Planned** (agreed, waiting for the update) · **Done** · **Won't do** (with a reason)

---

## 23 October 2026

Post: **Part 2 of 13 · Marinas & Berths** ("Every marina and berth, in one place.")

### 1. Berth status relies on colour alone

- **From:** Tarun Sharma
- **Platform:** Peerlist (please confirm)
- **Area:** Berths: berth grid, dense table view, Arabic (RTL) layout
- **Status:** Open

> The berth grid reads well. Since status is carried by color on the tiles, a second cue like a small icon or letter would keep it usable for color-blind users, especially in the dense table view. For the RTL version I'd decide whether the pier map itself mirrors: a physical layout usually shouldn't flip, while the table, labels and filters should.

**What to do**
- Give every berth status a second cue besides colour, such as a small icon or letter on each tile and in the table's status cell (Available, Occupied, Reserved, Out of service).
- Decide the RTL rule for the pier map. Proposal: keep the physical pier and berth layout in its real-world order, and mirror only the table, labels, filters and controls around it.
- Update the Figma design system (berth tile and status badge) and the web and mobile apps together.

### 2. Two bookings wanting the same berth

- **From:** Raeeza Tameez
- **Platform:** Peerlist (please confirm)
- **Area:** Bookings: conflicts and reassigning berths
- **Status:** Open

> live berth status looks simple until two bookings want the same berth. curious how you handle conflicts - first come first serve, or can marina staff override and reassign?

**What the app does today**
- Bookings › Conflicts lists every double booking (Booking A, Booking B and how many nights overlap) and every booking on a berth that is out of service.
- Each row has a **Resolve** button that opens the booking so staff can move it to another berth.
- The empty state says new bookings are checked automatically.

**What to do**
- Reply on the post explaining this flow.
- Decide and document the rule: which booking keeps the berth (first confirmed, first come first served), and who can override it (admin and marina manager).
- Consider showing the conflict on the berth grid itself, not only in Bookings › Conflicts.
- Consider a clear "Reassign berth" action that suggests free berths of the right size, and a note in the audit log when staff override.

---

<!--
New entry template (copy under a new "## <date>" heading, newest date at the top):

### N. <short title>

- **From:** <name>
- **Platform:** <LinkedIn / Peerlist / Dribbble / Instagram / X>
- **Area:** <page or feature>
- **Status:** Open

> <comment, word for word>

**What to do**
- <action>
-->
