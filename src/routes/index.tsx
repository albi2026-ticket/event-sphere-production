import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "TicketHub — Premium Ticket Marketplace" },
      { name: "description", content: "A complete HTML/CSS/JS + Bootstrap 5 frontend for a premium ticket marketplace. Laravel-ready partial structure." },
    ],
  }),
});

const pages = [
  { href: "/site/index.html", title: "Home", desc: "Hero, search, categories, trending, festivals, cities, testimonials" },
  { href: "/site/events.html", title: "Events", desc: "Filters, sorting, grid/list, pagination, autocomplete" },
  { href: "/site/event-details.html", title: "Event Details", desc: "Banner, seat map, countdown, sticky checkout, reviews" },
  { href: "/site/checkout.html", title: "Checkout", desc: "Multi-step UI, Apple/Google Pay, promo code, success modal" },
  { href: "/site/login.html", title: "Sign in", desc: "Split auth layout, social login" },
  { href: "/site/register.html", title: "Register", desc: "Split auth layout, password rules" },
  { href: "/site/dashboard.html", title: "User Dashboard", desc: "QR tickets, favorites, notifications, settings" },
  { href: "/site/organizer.html", title: "Organizer", desc: "Create event, inventory, charts, attendees, QR scan" },
  { href: "/site/admin.html", title: "Admin Panel", desc: "Users, refunds, fraud detection, sales charts" },
];

function Index() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B0F19", color: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "5rem 1.5rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} /> Static HTML / CSS / JS / Bootstrap 5 · Laravel-ready
        </div>
        <h1 style={{ fontFamily: "Poppins, sans-serif", fontSize: "clamp(2.4rem, 5vw, 4rem)", lineHeight: 1.05, margin: "1rem 0", letterSpacing: "-0.02em" }}>
          TicketHub —{" "}
          <span style={{ background: "linear-gradient(135deg,#5B8CFF,#8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Premium ticket marketplace.
          </span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "1.1rem", maxWidth: 720 }}>
          A complete production-ready frontend built only with HTML5, CSS3, vanilla JavaScript and Bootstrap 5. Files live under <code style={{ background: "#131A2A", padding: "2px 8px", borderRadius: 6 }}>/public</code> with the structure your Laravel backend expects.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginTop: "3rem" }}>
          {pages.map((p) => (
            <a key={p.href} href={p.href} style={{ display: "block", textDecoration: "none", color: "inherit", padding: "1.4rem", background: "#131A2A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, transition: "transform .2s, border-color .2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ fontFamily: "Poppins, sans-serif", fontSize: "1.05rem" }}>{p.title}</strong>
                <span style={{ color: "#5B8CFF" }}>→</span>
              </div>
              <p style={{ color: "#94A3B8", margin: "0.5rem 0 0", fontSize: ".9rem", lineHeight: 1.5 }}>{p.desc}</p>
            </a>
          ))}
        </div>

        <div style={{ marginTop: "3rem", padding: "1.5rem", background: "#131A2A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, fontSize: 14, color: "#94A3B8" }}>
          <strong style={{ color: "#F8FAFC" }}>Project structure</strong>
          <pre style={{ color: "#94A3B8", marginTop: "0.75rem", marginBottom: 0, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }}>{`public/
├─ assets/
│  ├─ css/style.css       Design system + components
│  ├─ js/main.js          Theme, toasts, favs, seat map, countdown, autocomplete
│  └─ js/partials.js      Header / footer injector
├─ components/
│  ├─ header.html         Reusable nav (Laravel @include-ready)
│  └─ footer.html         Reusable footer
└─ site/
   ├─ index.html · events.html · event-details.html
   ├─ checkout.html · login.html · register.html
   └─ dashboard.html · organizer.html · admin.html`}</pre>
        </div>
      </div>
    </div>
  );
}
