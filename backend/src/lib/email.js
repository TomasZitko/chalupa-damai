export async function sendBookingNotification(reservation, property, apiKey) {
  const { guest_name, guest_email, check_in, check_out, guests_count, notes } =
    reservation;

  const body = {
    from: "rezervace@damai.cz",
    to: [property.owner_email],
    subject: `Nová rezervace: ${guest_name} (${check_in} – ${check_out})`,
    html: `
      <h2>Nová rezervace — ${property.name}</h2>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td><strong>Host</strong></td><td>${guest_name}</td></tr>
        <tr><td><strong>E-mail</strong></td><td>${guest_email}</td></tr>
        <tr><td><strong>Příjezd</strong></td><td>${check_in}</td></tr>
        <tr><td><strong>Odjezd</strong></td><td>${check_out}</td></tr>
        <tr><td><strong>Počet hostů</strong></td><td>${guests_count}</td></tr>
        ${notes ? `<tr><td><strong>Poznámka</strong></td><td>${notes}</td></tr>` : ""}
      </table>
      <p>Přihlaste se do administrace a rezervaci potvrďte nebo zrušte.</p>
    `,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
}

export async function sendBookingConfirmation(reservation, property, apiKey) {
  const { guest_name, guest_email, check_in, check_out, guests_count } =
    reservation;

  const body = {
    from: "rezervace@damai.cz",
    to: [guest_email],
    subject: `Potvrzení rezervace — ${property.name}`,
    html: `
      <h2>Vaše rezervace byla potvrzena</h2>
      <p>Vážený/á ${guest_name},</p>
      <p>Těšíme se na Vás v <strong>${property.name}</strong>.</p>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td><strong>Příjezd</strong></td><td>${check_in}</td></tr>
        <tr><td><strong>Odjezd</strong></td><td>${check_out}</td></tr>
        <tr><td><strong>Počet hostů</strong></td><td>${guests_count}</td></tr>
      </table>
      <p>V případě dotazů nás kontaktujte na ${property.owner_email}.</p>
    `,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
}
