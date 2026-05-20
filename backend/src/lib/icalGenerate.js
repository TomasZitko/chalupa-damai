import ical from "ical-generator";

export function generateIcal(property, reservations) {
  const cal = ical({
    name: property.name,
    prodId: { company: "Damai", product: "Rezervace", language: "CS" },
    timezone: "Europe/Prague",
  });

  for (const r of reservations) {
    if (r.status === "cancelled") continue;

    cal.createEvent({
      uid: `damai-reservation-${r.id}@damai.cz`,
      start: new Date(r.check_in + "T14:00:00"),
      end: new Date(r.check_out + "T10:00:00"),
      // GDPR: never expose guest name — use BLOCKED only
      summary: "BLOCKED",
      description: undefined,
      location: undefined,
    });
  }

  return cal.toString();
}
