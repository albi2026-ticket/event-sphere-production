(function () {
  "use strict";

  const sharedContacts = {
    event: [
      { icon: "bi-envelope", title: "Support email", value: "support@tiketa.example" },
      { icon: "bi-clock", title: "Response window", value: "Monday-Friday, 09:00-18:00" },
      {
        icon: "bi-life-preserver",
        title: "Urgent issues",
        value: "Event-day ticket access requests are prioritized.",
      },
    ],
    dining: [
      { icon: "bi-envelope", title: "Dining support", value: "dining@tiketa.example" },
      { icon: "bi-clock", title: "Reservation desk", value: "Monday-Sunday, 10:00-22:00" },
      { icon: "bi-shop", title: "Partner team", value: "partners@tiketa.example" },
    ],
  };

  const sqContacts = {
    event: [
      { icon: "bi-envelope", title: "Email mbështetjeje", value: "support@tiketa.example" },
      { icon: "bi-clock", title: "Orari i përgjigjes", value: "E hënë-E premte, 09:00-18:00" },
      {
        icon: "bi-life-preserver",
        title: "Çështje urgjente",
        value: "Kërkesat për akses në bileta ditën e eventit marrin përparësi.",
      },
    ],
    dining: [
      { icon: "bi-envelope", title: "Mbështetje për rezervime", value: "dining@tiketa.example" },
      { icon: "bi-clock", title: "Orari i rezervimeve", value: "E hënë-E diel, 10:00-22:00" },
      { icon: "bi-shop", title: "Ekipi i partnerëve", value: "partners@tiketa.example" },
    ],
  };

  const en = {
    "event.about": {
      title: "About Tiketa",
      subtitle:
        "A modern ticketing platform built for trusted event discovery, secure checkout, and professional organizer operations.",
      eyebrow: "Company",
      lead: "Tiketa helps fans find live experiences with confidence and gives organizers the tools to publish, sell, and validate tickets in one dependable workflow.",
      cards: [
        {
          icon: "bi-search",
          title: "Clear event discovery",
          body: "Fans can browse events by category, city, date, availability, and popularity before making a purchase decision.",
        },
        {
          icon: "bi-shield-lock",
          title: "Secure ticketing",
          body: "Checkout, order records, and QR ticket delivery are designed to make every purchase easier to verify and manage.",
        },
        {
          icon: "bi-clipboard-check",
          title: "Organizer tools",
          body: "Organizers can configure ticket tiers, manage attendee information, monitor sales, and prepare for check-in.",
        },
      ],
      sections: [
        {
          title: "Our mission",
          body: [
            "We believe buying a ticket should feel simple, transparent, and reliable from the first search to the venue door.",
            "Tiketa is built for concerts, sports, festivals, conferences, theater, workshops, and community events where accurate information and dependable access matter.",
          ],
        },
        {
          title: "How we work",
          body: [
            "We keep the customer journey structured: clear listings, protected checkout, immediate ticket access, and support paths when plans change.",
            "For organizers, Tiketa focuses on practical operations: publishing, inventory, attendee visibility, QR validation, and clear communication with ticket holders.",
          ],
        },
      ],
      cta: {
        title: "Ready to discover your next event?",
        body: "Browse upcoming events or start building your organizer presence on Tiketa.",
        primary: ["Browse Events", "/events/list"],
        secondary: ["Become an Organizer", "/organizer"],
      },
    },
    "event.contact": {
      title: "Contact Us",
      subtitle:
        "Reach the right Tiketa team for ticket, account, organizer, payment, or partnership questions.",
      eyebrow: "Company",
      lead: "The fastest support requests include your account email, event name, order reference when available, and a clear description of what happened.",
      contacts: sharedContacts.event,
      sections: [
        {
          title: "Customer support",
          body: [
            "Use Tiketa support for ticket access, checkout questions, account updates, QR code issues, and refund review guidance.",
            "For an event taking place within 24 hours, include “event-day” in your message subject so the team can triage the request quickly.",
          ],
        },
        {
          title: "Organizer support",
          body: [
            "Organizers can contact us for publishing guidance, ticket setup, attendee management, scanner access, and operational questions before event day.",
          ],
        },
      ],
      cta: {
        title: "Need help with a ticket?",
        body: "Open ticket support for the checklist we use to resolve common access issues.",
        primary: ["Open Ticket Support", "/ticket-support"],
      },
    },
    "event.careers": {
      title: "Careers at Tiketa",
      subtitle:
        "Help build a reliable marketplace for fans, organizers, venues, and live-event communities.",
      eyebrow: "Company",
      lead: "Tiketa is built by people who care about trust, product quality, operational clarity, and the energy of live experiences.",
      cards: [
        {
          icon: "bi-code-slash",
          title: "Product and engineering",
          body: "Build discovery, checkout, ticket delivery, dashboards, and platform reliability.",
        },
        {
          icon: "bi-headset",
          title: "Operations and support",
          body: "Help customers and organizers resolve questions quickly with empathy and accuracy.",
        },
        {
          icon: "bi-megaphone",
          title: "Growth and partnerships",
          body: "Bring more organizers, venues, and communities into the Tiketa marketplace.",
        },
      ],
      sections: [
        {
          title: "How we hire",
          body: [
            "Open roles change over time. When a role is available, we look for practical judgment, clear communication, ownership, and care for customer experience.",
            "If no open role matches your background, you can still introduce yourself and tell us where you could create value.",
          ],
        },
      ],
      cta: {
        title: "Introduce yourself",
        body: "Send your profile, location, and the type of work you want to do with Tiketa.",
        primary: ["Email Careers", "mailto:careers@tiketa.example"],
      },
    },
    "event.blog": {
      title: "Tiketa Blog",
      subtitle:
        "Insights for event discovery, ticketing operations, organizer growth, and better live experiences.",
      eyebrow: "Company",
      lead: "The Tiketa blog is where we share practical guidance for fans and organizers as the platform evolves.",
      cards: [
        {
          icon: "bi-ticket-detailed",
          title: "Ticketing tips",
          body: "Guides for safer purchases, QR ticket access, checkout readiness, and event-day preparation.",
        },
        {
          icon: "bi-graph-up-arrow",
          title: "Organizer playbooks",
          body: "Operational advice for pricing, publishing, promotion, attendee communication, and check-in.",
        },
        {
          icon: "bi-stars",
          title: "Platform updates",
          body: "Product improvements, reliability notes, and new capabilities for the Tiketa community.",
        },
      ],
      sections: [
        {
          title: "Editorial standard",
          body: [
            "Blog content should help customers and organizers make better decisions. We avoid filler and focus on clear, actionable information.",
            "Featured posts will appear here as Tiketa publishes platform updates and event-marketplace resources.",
          ],
        },
      ],
      cta: {
        title: "Looking for help instead?",
        body: "Visit the Help Center for support topics and contact options.",
        primary: ["Go to Help Center", "/help-center"],
      },
    },
    "event.help": {
      title: "Help Center",
      subtitle: "Support for tickets, checkout, QR entry, refunds, accounts, and organizer tools.",
      eyebrow: "Support",
      lead: "Use these resources to resolve common questions before, during, and after an event.",
      cards: [
        {
          icon: "bi-ticket-perforated",
          title: "Buying tickets",
          body: "Review event details, choose a ticket type, complete checkout, and access your order from your dashboard.",
        },
        {
          icon: "bi-qr-code-scan",
          title: "Using QR tickets",
          body: "Keep your QR code ready at entry and bring identification if the organizer requires it.",
        },
        {
          icon: "bi-arrow-counterclockwise",
          title: "Refunds and changes",
          body: "Understand cancellations, postponements, organizer policies, request windows, and payment timelines.",
        },
        {
          icon: "bi-person-lock",
          title: "Account security",
          body: "Keep your account email current, protect your password, and report suspicious activity quickly.",
        },
        {
          icon: "bi-shop-window",
          title: "Organizer support",
          body: "Find guidance for event creation, ticket setup, attendee management, and check-in preparation.",
        },
        {
          icon: "bi-credit-card",
          title: "Payments",
          body: "Check payment status, receipts, failed checkout attempts, and duplicate-charge concerns.",
        },
      ],
      sections: [
        {
          title: "Before contacting support",
          body: [
            "Check the event page for date, venue, entry rules, age restrictions, and organizer updates.",
            "Open your dashboard and confirm ticket quantity, order status, and QR availability.",
            "Save screenshots or receipt details if something looks incorrect.",
          ],
        },
      ],
      cta: {
        title: "Still need help?",
        body: "Contact Tiketa with the event name, order email, and a short description of the issue.",
        primary: ["Contact Us", "/contact"],
      },
    },
    "event.faq": {
      title: "FAQs",
      subtitle:
        "Answers to common questions about Tiketa tickets, payments, refunds, accounts, and organizer tools.",
      eyebrow: "Support",
      lead: "These answers cover general platform behavior. Event-specific terms shown before checkout may also apply.",
      faqs: [
        [
          "How do I buy tickets on Tiketa?",
          "Open an event page, review the date, location, ticket types, and availability, then select your quantity and complete checkout. Confirmed orders appear in your dashboard.",
        ],
        [
          "Where can I find my QR ticket?",
          "Sign in and open your dashboard. Completed orders include QR ticket access for entry.",
        ],
        [
          "Can sold-out events still appear?",
          "Yes. Sold-out events may remain visible so fans can read details and monitor organizer updates.",
        ],
        [
          "What happens if an event is canceled?",
          "Tiketa works with the organizer to review eligible refunds according to the refund policy, event terms, and applicable law.",
        ],
        [
          "Are service fees refundable?",
          "Some service, processing, or payment fees may be non-refundable unless required by law or included in the event policy.",
        ],
        [
          "How do organizers publish an event?",
          "Create an account, complete organizer setup, add event details and ticket tiers, then publish according to platform permissions.",
        ],
      ],
      cta: {
        title: "Need a deeper answer?",
        body: "Send support the event name and your account email so we can review the right record.",
        primary: ["Contact Support", "/contact"],
      },
    },
    "event.ticketSupport": {
      title: "Ticket Support",
      subtitle:
        "Resolve ticket access, QR code, checkout, and event-day issues with the right information ready.",
      eyebrow: "Support",
      lead: "Ticket issues are easiest to resolve when support can match the request to an event, account, and order record.",
      sections: [
        {
          title: "What to include",
          body: [
            "Event name and date.",
            "Order email and order reference if available.",
            "Ticket type, quantity, and screenshots of any error.",
            "Whether the event starts within the next 24 hours.",
          ],
        },
        {
          title: "Common fixes",
          body: [
            "Refresh your dashboard after payment confirmation.",
            "Confirm you are signed in with the same email used at checkout.",
            "Check organizer updates for venue, date, or entry-rule changes.",
            "Keep your QR code visible and your phone charged before arriving.",
          ],
        },
      ],
      contacts: sharedContacts.event,
      faqs: [
        [
          "Why is my ticket not showing yet?",
          "Confirm you are signed in with the same email used at checkout, then refresh your dashboard after payment confirmation.",
        ],
        [
          "What should I do if my QR code will not load?",
          "Check your connection, reopen the ticket from your dashboard, and contact support with the event name and order email if it still does not appear.",
        ],
        [
          "Can support change my ticket type?",
          "Ticket type changes depend on organizer policy, availability, and the event terms shown before checkout.",
        ],
      ],
      cta: {
        title: "Open a support request",
        body: "Use the contact page and include the checklist above.",
        primary: ["Contact Us", "/contact"],
      },
    },
    "event.refund": {
      title: "Refund Policy",
      subtitle:
        "How Tiketa reviews refund requests for canceled, postponed, rescheduled, and organizer-managed events.",
      eyebrow: "Support",
      lead: "Tickets are usually final sale unless an event is canceled, a refund is required by law, or the organizer has published a refund option.",
      sections: [
        {
          title: "Canceled events",
          body: [
            "If an organizer cancels an event and does not provide a replacement date, eligible ticket holders may receive a refund according to organizer instructions and applicable law.",
          ],
        },
        {
          title: "Postponed or rescheduled events",
          body: [
            "Tickets usually remain valid for the new date unless the organizer states otherwise. Refund windows may be limited and must be requested within the announced period.",
          ],
        },
        {
          title: "Fees and timing",
          body: [
            "Service, processing, payment, or delivery fees may be non-refundable unless required by law. Approved refunds are generally returned to the original payment method, and bank timelines may vary.",
          ],
        },
        {
          title: "Disputes",
          body: [
            "Opening a bank dispute may pause standard refund review until the dispute is resolved. Keeping communication in one support thread helps avoid delays.",
          ],
        },
      ],
      cta: {
        title: "Have a refund question?",
        body: "Contact support with your order details and the event status.",
        primary: ["Contact Support", "/contact"],
      },
    },
    "event.organizer": {
      title: "Become an Organizer",
      subtitle:
        "Publish events, sell tickets, manage attendees, and prepare for professional event-day operations.",
      eyebrow: "Organizers",
      lead: "Tiketa gives organizers a structured way to bring live experiences to market with clear listings, ticket tiers, and QR validation.",
      cards: [
        {
          icon: "bi-calendar-plus",
          title: "Create public listings",
          body: "Add event details, date, venue, imagery, category, visibility, and customer-facing descriptions.",
        },
        {
          icon: "bi-tags",
          title: "Configure ticket tiers",
          body: "Set names, pricing, capacity, sale windows, and availability for each ticket type.",
        },
        {
          icon: "bi-qr-code",
          title: "Manage entry",
          body: "Use QR tickets and scanner workflows to support faster, cleaner check-in.",
        },
      ],
      faqs: [
        [
          "Who can become an organizer?",
          "Event teams, venues, promoters, and approved creators can use Tiketa organizer tools after account setup and platform review where required.",
        ],
        [
          "What information is required before publishing?",
          "You need accurate event details, schedule, venue, imagery, ticket tiers, inventory, and customer-facing policies.",
        ],
        [
          "Can organizers manage check-in?",
          "Yes. Organizer workflows support QR ticket validation and scanner preparation for event-day entry.",
        ],
      ],
      cta: {
        title: "Start organizing on Tiketa",
        body: "Create an account or open your organizer workspace to begin.",
        primary: ["Create an Event", "/organizer"],
        secondary: ["Read the Guide", "/organizer-guide"],
      },
    },
    "event.organizerGuide": {
      title: "Organizer Guide",
      subtitle:
        "A practical guide to setting up events, tickets, publishing, communication, and check-in.",
      eyebrow: "Organizers",
      lead: "Professional event pages are accurate, complete, and easy for ticket buyers to understand before checkout.",
      sections: [
        {
          title: "Prepare the listing",
          body: [
            "Use accurate event names, times, locations, organizer details, age rules, refund terms, and accessibility information.",
            "Upload clear imagery that represents the event and avoids misleading customers.",
          ],
        },
        {
          title: "Set up ticket tiers",
          body: [
            "Name each ticket tier clearly, define quantity and price, and make any restrictions visible before checkout.",
          ],
        },
        {
          title: "Communicate changes",
          body: [
            "If the date, venue, lineup, entry rule, or refund status changes, update the listing and notify ticket holders as early as possible.",
          ],
        },
        {
          title: "Plan check-in",
          body: [
            "Assign scanner access, test QR validation, prepare staff instructions, and keep a fallback plan for poor connectivity.",
          ],
        },
      ],
      cta: {
        title: "Ready to publish?",
        body: "Open organizer tools and create your next event.",
        primary: ["Create an Event", "/organizer"],
      },
    },
    "event.createEvent": {
      title: "Create an Event",
      subtitle: "Set up a professional event listing and start selling tickets through Tiketa.",
      eyebrow: "Organizers",
      lead: "A complete event listing helps customers make confident purchase decisions and helps your team operate smoothly.",
      sections: [
        {
          title: "What you need",
          body: [
            "Event title, description, category, date, venue, images, ticket types, capacity, refund terms, and organizer contact details.",
          ],
        },
        {
          title: "Publishing checklist",
          body: [
            "Confirm all customer-facing details, preview the event page, test ticket quantities, and make sure your team understands event-day scanning.",
          ],
        },
      ],
      cta: {
        title: "Build your event",
        body: "Go to organizer tools to create or manage event listings.",
        primary: ["Open Organizer Tools", "/organizer"],
      },
    },
    "event.terms": {
      title: "Terms of Service",
      subtitle: "The rules for using Tiketa as a buyer, organizer, or visitor.",
      eyebrow: "Legal",
      lead: "These terms govern access to Tiketa, ticket purchases, organizer listings, accounts, payments, and platform content.",
      sections: [
        {
          title: "Marketplace role",
          body: [
            "Tiketa provides technology that helps organizers list events and sell tickets. Organizers remain responsible for event accuracy, venue operations, attendee rules, and event delivery.",
          ],
        },
        {
          title: "Accounts",
          body: [
            "You are responsible for accurate account information and credential security. Tiketa may restrict accounts that create risk for customers, organizers, or the platform.",
          ],
        },
        {
          title: "Payments and tickets",
          body: [
            "Ticket prices are set by organizers unless stated otherwise. Fees and taxes may apply and are shown during checkout where possible.",
          ],
        },
        {
          title: "Acceptable use",
          body: [
            "Do not misuse the platform, scrape data at scale, publish fraudulent events, interfere with inventory, or use Tiketa for illegal activity.",
          ],
        },
        {
          title: "Limitations",
          body: [
            "Tiketa works to provide a reliable service, but event operations are controlled by organizers and venues. Platform availability may vary.",
          ],
        },
      ],
    },
    "event.privacy": {
      title: "Privacy Policy",
      subtitle: "How Tiketa collects, uses, protects, and shares personal information.",
      eyebrow: "Legal",
      lead: "We handle personal information to operate ticketing, accounts, support, security, payments, and marketplace features.",
      sections: [
        {
          title: "Information we collect",
          body: [
            "We may collect account details, contact information, order history, event attendance records, organizer profile information, support messages, device data, and usage activity.",
          ],
        },
        {
          title: "How we use information",
          body: [
            "We use information to process orders, deliver tickets, provide support, protect accounts, improve the platform, and communicate important service updates.",
          ],
        },
        {
          title: "Sharing",
          body: [
            "We may share necessary information with organizers, payment providers, service vendors, and legal authorities when required.",
          ],
        },
        {
          title: "Your choices",
          body: [
            "You can manage account details, browser cookie settings, and marketing preferences. Some essential features require operational data to function.",
          ],
        },
      ],
    },
    "event.cookies": {
      title: "Cookie Policy",
      subtitle: "How Tiketa uses cookies and similar technologies.",
      eyebrow: "Legal",
      lead: "Cookies help Tiketa keep sessions secure, remember preferences, measure performance, and improve marketplace functionality.",
      sections: [
        {
          title: "Essential cookies",
          body: [
            "These support login sessions, security, language preference, checkout continuity, and other core platform behavior.",
          ],
        },
        {
          title: "Performance cookies",
          body: [
            "These help us understand page performance, errors, and aggregate usage trends so we can improve the product.",
          ],
        },
        {
          title: "Managing cookies",
          body: [
            "You can manage cookies in your browser settings. Disabling essential cookies may prevent login, checkout, or dashboard features from working correctly.",
          ],
        },
      ],
    },
    "dining.about": {
      title: "About Tiketa Dining",
      subtitle:
        "A reservation platform for restaurants, bars, lounges, cafes, and guests who want a smoother way to book.",
      eyebrow: "Company",
      lead: "Tiketa Dining connects guests with hospitality venues and gives owners practical tools for reservations, availability, guest communication, and profile management.",
      cards: [
        {
          icon: "bi-search-heart",
          title: "Curated discovery",
          body: "Guests can find restaurants and bars by city, style, cuisine, amenities, and availability.",
        },
        {
          icon: "bi-calendar-check",
          title: "Clear reservations",
          body: "Reservation requests capture party size, time, contact details, and guest notes in a consistent flow.",
        },
        {
          icon: "bi-shop-window",
          title: "Owner operations",
          body: "Owners can manage profiles, images, facilities, opening hours, blackout dates, and reservation status. ",
        },
      ],
      sections: [
        {
          title: "Hospitality focus",
          body: [
            "Tiketa Dining is built for venues that care about reliable booking, accurate information, and a polished guest experience.",
            "The platform supports restaurants, bars, lounges, cafes, and destination venues that want to be easier to discover and easier to manage.",
          ],
        },
      ],
      cta: {
        title: "Find your next table",
        body: "Browse restaurants and bars available through Tiketa Dining.",
        primary: ["Discover Restaurants", "/restaurants"],
        secondary: ["Become a Partner", "/become-restaurant-partner"],
      },
    },
    "dining.contact": {
      title: "Contact Tiketa Dining",
      subtitle:
        "Reach the Tiketa Dining team for reservation, guest, or restaurant-partner support.",
      eyebrow: "Company",
      lead: "Include the restaurant name, reservation date and time, guest email, and a short description so the team can route your request quickly.",
      contacts: sharedContacts.dining,
      sections: [
        {
          title: "For guests",
          body: [
            "Contact us for reservation questions, confirmation issues, cancellation guidance, account access, or venue communication concerns.",
          ],
        },
        {
          title: "For restaurant owners",
          body: [
            "Partner support can help with venue setup, profile quality, availability, reservation workflows, and owner dashboard questions.",
          ],
        },
      ],
      cta: {
        title: "Need reservation help?",
        body: "Open reservation support for the details to include.",
        primary: ["Reservation Support", "/reservation-support"],
      },
    },
    "dining.partner": {
      title: "Become a Restaurant Partner",
      subtitle:
        "Bring your restaurant, bar, lounge, or cafe to guests searching for memorable hospitality experiences.",
      eyebrow: "Restaurant Owners",
      lead: "Tiketa Dining helps venues present accurate profiles, receive reservation requests, and manage guest communication from a focused owner workspace.",
      cards: [
        {
          icon: "bi-window",
          title: "Polished venue profile",
          body: "Show your venue type, description, city, address, gallery, cuisine, amenities, and payment options.",
        },
        {
          icon: "bi-calendar2-week",
          title: "Availability controls",
          body: "Manage opening hours, booking horizon, guest limits, reservation intervals, blackout dates, and special hours.",
        },
        {
          icon: "bi-clipboard2-check",
          title: "Reservation management",
          body: "Review requests, confirm bookings, handle cancellations, and monitor upcoming guest arrivals.",
        },
      ],
      cta: {
        title: "List your venue",
        body: "Create or manage your restaurant and bar profile from the owner workspace.",
        primary: ["List Your Restaurant", "/owner-venue"],
        secondary: ["Read Owner Guide", "/restaurant-owner-guide"],
      },
    },
    "dining.ownerGuide": {
      title: "Restaurant Owner Guide",
      subtitle: "Set up a trustworthy venue profile and manage reservations with confidence.",
      eyebrow: "Restaurant Owners",
      lead: "Complete, accurate venue information helps guests choose the right place and helps your team prepare for each booking.",
      sections: [
        {
          title: "Build the profile",
          body: [
            "Add your venue name, type, description, phone, email, website, address, city, country, and exact map location.",
            "Upload high-quality photos that show the space guests will actually experience.",
          ],
        },
        {
          title: "Configure availability",
          body: [
            "Keep opening hours, special hours, blackout dates, booking horizon, guest limits, and reservation intervals current.",
          ],
        },
        {
          title: "Manage requests",
          body: [
            "Review pending reservations promptly, confirm accepted bookings, and add clear cancellation reasons when you cannot host a request.",
          ],
        },
        {
          title: "Keep communication clean",
          body: [
            "Use guest notes and contact information responsibly. Update venue details whenever policies, hours, or availability change.",
          ],
        },
      ],
      cta: {
        title: "Open owner tools",
        body: "Manage your restaurant or bar profile and reservations.",
        primary: ["Owner Workspace", "/owner-venue"],
      },
    },
    "dining.list": {
      title: "List Your Restaurant",
      subtitle: "Create a venue profile guests can discover and request reservations from.",
      eyebrow: "Restaurant Owners",
      lead: "A strong listing gives guests the practical information they need before they book.",
      sections: [
        {
          title: "Listing requirements",
          body: [
            "Prepare your venue name, type, description, contact information, address, photos, cuisine types, facilities, payment options, and opening hours.",
          ],
        },
        {
          title: "Before going live",
          body: [
            "Preview your public page, check booking rules, test reservation limits, and confirm your team knows how to review incoming requests.",
          ],
        },
      ],
      cta: {
        title: "Create your listing",
        body: "Open the owner workspace to add or update your venue.",
        primary: ["List Your Restaurant", "/owner-venue"],
      },
    },
    "dining.how": {
      title: "How Reservations Work",
      subtitle:
        "A simple reservation flow for discovering venues, choosing a time, and receiving confirmation.",
      eyebrow: "Reservations",
      lead: "Tiketa Dining keeps the guest flow clear while giving restaurants and bars control over availability and confirmation.",
      sections: [
        {
          title: "1. Discover a venue",
          body: [
            "Browse restaurants, bars, lounges, and cafes by city, type, cuisine, facilities, and featured status.",
          ],
        },
        {
          title: "2. Choose details",
          body: [
            "Select a date, time, party size, and any occasion or special request the venue should know about.",
          ],
        },
        {
          title: "3. Send the request",
          body: [
            "Submit your reservation request with accurate contact information so the venue can respond.",
          ],
        },
        {
          title: "4. Receive confirmation",
          body: [
            "The restaurant or bar reviews the request and confirms, updates, or cancels it based on availability and policy.",
          ],
        },
      ],
      cta: {
        title: "Ready to book?",
        body: "Explore restaurants and bars accepting reservation requests.",
        primary: ["Find a Table", "/restaurants"],
      },
    },
    "dining.support": {
      title: "Reservation Support",
      subtitle:
        "Help for reservation requests, confirmations, cancellations, guest details, and venue communication.",
      eyebrow: "Reservations",
      lead: "Reservation support works best when the request includes the venue, date, time, guest name, and account email.",
      sections: [
        {
          title: "Guest support",
          body: [
            "Contact us if you cannot find a reservation, need help understanding status, entered incorrect details, or have trouble reaching the venue.",
          ],
        },
        {
          title: "Owner support",
          body: [
            "Venue teams can ask for help with reservation status updates, calendar views, availability settings, cancellations, and guest communication workflows.",
          ],
        },
        {
          title: "Urgent timing",
          body: [
            "For same-day reservations, contact the venue directly when possible and send Tiketa Dining the reservation details for platform support.",
          ],
        },
      ],
      contacts: sharedContacts.dining,
      faqs: [
        [
          "Is a reservation request instantly confirmed?",
          "No. A request is confirmed only after the venue reviews availability and accepts it.",
        ],
        [
          "How do I change reservation details?",
          "Contact the venue when possible and send support the venue name, date, time, and updated guest details.",
        ],
        [
          "What happens if a venue cancels?",
          "The record remains visible for review, and support can help clarify the cancellation reason when needed.",
        ],
      ],
      cta: {
        title: "Review the policy",
        body: "Understand how reservation changes and cancellations are handled.",
        primary: ["Reservation Policy", "/reservation-policy"],
      },
    },
    "dining.policy": {
      title: "Reservation Policy",
      subtitle:
        "How Tiketa Dining handles reservation requests, confirmations, cancellations, and guest responsibilities.",
      eyebrow: "Reservations",
      lead: "Reservation availability is controlled by each restaurant or bar. Tiketa Dining provides the platform workflow and support paths.",
      sections: [
        {
          title: "Requests and confirmations",
          body: [
            "Submitting a request does not guarantee a table until the venue confirms it. Guests should watch for status updates and arrive according to the confirmed details.",
          ],
        },
        {
          title: "Cancellations",
          body: [
            "Guests should cancel as early as possible if plans change. Venues may cancel requests when capacity, hours, private events, or operational issues prevent hosting.",
          ],
        },
        {
          title: "Guest responsibilities",
          body: [
            "Use accurate contact information, arrive on time, respect venue rules, and contact the venue if your party size or arrival time changes.",
          ],
        },
        {
          title: "Venue responsibilities",
          body: [
            "Venues should keep availability accurate, respond to requests promptly, and provide clear cancellation reasons when a booking cannot be honored.",
          ],
        },
      ],
      cta: {
        title: "Need help with a reservation?",
        body: "Contact support with your venue name and reservation details.",
        primary: ["Reservation Support", "/reservation-support"],
      },
    },
  };

  const sq = {
    "event.about": {
      title: "Rreth Tiketa",
      subtitle:
        "Një platformë moderne biletash për zbulim eventesh, pagesë të sigurt dhe operime profesionale për organizatorët.",
      eyebrow: "Kompania",
      lead: "Tiketa i ndihmon fansat të gjejnë përvoja live me besim dhe u jep organizatorëve mjetet për publikim, shitje dhe validim biletash në një rrjedhë të qëndrueshme.",
      cards: [
        {
          icon: "bi-search",
          title: "Zbulim i qartë eventesh",
          body: "Fansat mund të shfletojnë sipas kategorisë, qytetit, datës, disponueshmërisë dhe popullaritetit para blerjes.",
        },
        {
          icon: "bi-shield-lock",
          title: "Bileta të sigurta",
          body: "Pagesa, historiku i porosive dhe dorëzimi i biletave QR janë krijuar për blerje të lehta për t’u verifikuar.",
        },
        {
          icon: "bi-clipboard-check",
          title: "Mjete për organizatorë",
          body: "Organizatorët mund të konfigurojnë nivelet e biletave, të menaxhojnë pjesëmarrësit, shitjet dhe check-in.",
        },
      ],
      sections: [
        {
          title: "Misioni ynë",
          body: [
            "Blerja e një bilete duhet të jetë e thjeshtë, transparente dhe e besueshme nga kërkimi i parë deri te hyrja në event.",
            "Tiketa është ndërtuar për koncerte, sport, festivale, konferenca, teatër, workshop-e dhe evente komunitare ku informacioni i saktë ka rëndësi.",
          ],
        },
        {
          title: "Si punojmë",
          body: [
            "Udhëtimi i klientit është i strukturuar: lista të qarta, pagesë e mbrojtur, akses i menjëhershëm në bileta dhe kanale mbështetjeje.",
            "Për organizatorët, Tiketa fokusohet te publikimi, inventari, pjesëmarrësit, validimi QR dhe komunikimi i qartë me blerësit.",
          ],
        },
      ],
      cta: {
        title: "Gati per eventin e radhes?",
        body: "Shfletoni eventet e ardhshme ose filloni prezencen tuaj si organizator ne Tiketa.",
        primary: ["Shfleto Eventet", "/events/list"],
        secondary: ["Bëhu Organizator", "/organizer"],
      },
    },
    "event.contact": {
      title: "Na Kontaktoni",
      subtitle:
        "Kontaktoni ekipin e duhur te Tiketa per bileta, llogari, organizatore, pagesa ose partneritete.",
      eyebrow: "Kompania",
      lead: "Kerkesat me te shpejta perfshijne emailin e llogarise, emrin e eventit, referencen e porosise kur ekziston dhe nje pershkrim te qarte.",
      contacts: sqContacts.event,
      sections: [
        {
          title: "Mbeshtetje per kliente",
          body: [
            "Na kontaktoni per akses ne bileta, pyetje rreth pageses, llogarise, kodeve QR dhe orientim per rimbursime.",
            "Per evente brenda 24 oreve, vendosni “dita e eventit” ne subjekt qe kerkesa te trajtohet me shpejt.",
          ],
        },
        {
          title: "Mbeshtetje per organizatore",
          body: [
            "Organizatoret mund te na kontaktojne per publikim, konfigurim biletash, menaxhim pjesemarresish, akses skaneri dhe pyetje operacionale.",
          ],
        },
      ],
      cta: {
        title: "Keni nevoje per ndihme me bileten?",
        body: "Hapni mbeshtetjen e biletave per listen e kontrollit qe perdorim per zgjidhje.",
        primary: ["Mbeshtetje Biletash", "/ticket-support"],
      },
    },
    "event.careers": {
      title: "Karriera te Tiketa",
      subtitle:
        "Ndihmoni ne ndertimin e nje marketplace te besueshem per fansat, organizatoret, venue-t dhe komunitetet live.",
      eyebrow: "Kompania",
      lead: "Tiketa ndertohet nga njerez qe kujdesen per besimin, cilesine e produktit, qartesine operacionale dhe energjine e eksperiencave live.",
      cards: [
        {
          icon: "bi-code-slash",
          title: "Produkt dhe inxhinieri",
          body: "Ndertoni zbulim eventesh, pagese, dorezim biletash, dashboard-e dhe besueshmeri platforme.",
        },
        {
          icon: "bi-headset",
          title: "Operacione dhe mbeshtetje",
          body: "Ndihmoni klientet dhe organizatoret te zgjidhin pyetje me empati dhe saktesi.",
        },
        {
          icon: "bi-megaphone",
          title: "Rritje dhe partneritete",
          body: "Sillni me shume organizatore, venue dhe komunitete ne Tiketa.",
        },
      ],
      sections: [
        {
          title: "Si punesojme",
          body: [
            "Rolet e hapura ndryshojne. Kerkojme gjykim praktik, komunikim te qarte, pergjegjesi dhe kujdes per eksperiencen e klientit.",
            "Edhe nese nuk ka rol te hapur, mund te prezantoheni dhe te tregoni ku mund te krijoni vlere.",
          ],
        },
      ],
      cta: {
        title: "Prezantohuni",
        body: "Dergo profilin, vendndodhjen dhe llojin e punes qe deshironi te beni me Tiketa.",
        primary: ["Email Karriera", "mailto:careers@tiketa.example"],
      },
    },
    "event.blog": {
      title: "Blogu i Tiketa",
      subtitle:
        "Udhezime per zbulim eventesh, operime biletash, rritje organizatoresh dhe eksperienca me te mira live.",
      eyebrow: "Kompania",
      lead: "Blogu i Tiketa do te sjelle udhezime praktike per fansat dhe organizatoret nderkohe qe platforma zhvillohet.",
      cards: [
        {
          icon: "bi-ticket-detailed",
          title: "Keshilla per bileta",
          body: "Udhezime per blerje te sigurta, akses QR, pergatitje per checkout dhe diten e eventit.",
        },
        {
          icon: "bi-graph-up-arrow",
          title: "Playbook per organizatore",
          body: "Keshilla per cmimet, publikimin, promovimin, komunikimin dhe check-in.",
        },
        {
          icon: "bi-stars",
          title: "Perditesime platforme",
          body: "Permiresime produkti, shenime besueshmerie dhe aftesi te reja per komunitetin Tiketa.",
        },
      ],
      sections: [
        {
          title: "Standard editorial",
          body: [
            "Permbajtja duhet te ndihmoje klientet dhe organizatoret te marrin vendime me te mira. Shmangim tekstin bosh dhe fokusohemi te informacioni i dobishem.",
            "Postimet e zgjedhura do te shfaqen ketu kur Tiketa te publikoje burime dhe perditesime.",
          ],
        },
      ],
      cta: {
        title: "Po kerkoni ndihme?",
        body: "Vizitoni Qendren e Ndihmes per tema mbeshtetjeje dhe kontakte.",
        primary: ["Qendra e Ndihmes", "/help-center"],
      },
    },
    "event.help": {
      title: "Qendra e Ndihmes",
      subtitle:
        "Mbeshtetje per bileta, pagesa, hyrje QR, rimbursime, llogari dhe mjete organizatoresh.",
      eyebrow: "Mbeshtetje",
      lead: "Perdorni keto burime per te zgjidhur pyetje te zakonshme para, gjate dhe pas nje eventi.",
      cards: [
        {
          icon: "bi-ticket-perforated",
          title: "Blerja e biletave",
          body: "Rishikoni detajet e eventit, zgjidhni llojin e biletes, perfundoni pagesen dhe gjeni porosine ne dashboard.",
        },
        {
          icon: "bi-qr-code-scan",
          title: "Perdorimi i biletave QR",
          body: "Mbani kodin QR gati ne hyrje dhe merrni dokument identifikimi nese organizatori e kerkon.",
        },
        {
          icon: "bi-arrow-counterclockwise",
          title: "Rimbursime dhe ndryshime",
          body: "Kuptoni anulimet, shtyrjet, politikat e organizatorit, afatet e kerkesave dhe kohen e pagesave.",
        },
        {
          icon: "bi-person-lock",
          title: "Siguria e llogarise",
          body: "Mbani emailin e llogarise te sakte, mbroni fjalekalimin dhe raportoni aktivitet te dyshimte.",
        },
        {
          icon: "bi-shop-window",
          title: "Mbeshtetje per organizatore",
          body: "Udhezime per krijim eventesh, bileta, pjesemarres dhe pergatitje check-in.",
        },
        {
          icon: "bi-credit-card",
          title: "Pagesat",
          body: "Kontrolloni statusin e pageses, faturat, deshtimet ne checkout dhe pagesat e dyfishta.",
        },
      ],
      sections: [
        {
          title: "Para se te kontaktoni mbeshtetjen",
          body: [
            "Kontrolloni faqen e eventit per daten, venue, rregullat e hyrjes dhe perditesimet.",
            "Hapni dashboard-in dhe konfirmoni sasine e biletave, statusin e porosise dhe disponueshmerine QR.",
            "Ruani screenshot-e ose detaje fature nese dicka duket gabim.",
          ],
        },
      ],
      cta: {
        title: "Ende keni nevoje per ndihme?",
        body: "Kontaktoni Tiketa me emrin e eventit, emailin e porosise dhe nje pershkrim te shkurter.",
        primary: ["Na Kontaktoni", "/contact"],
      },
    },
    "event.faq": {
      title: "Pyetje te Shpeshta",
      subtitle:
        "Pergjigje per bileta, pagesa, rimbursime, llogari dhe mjete organizatoresh ne Tiketa.",
      eyebrow: "Mbeshtetje",
      lead: "Keto pergjigje mbulojne sjelljen e pergjithshme te platformes. Mund te vlejne edhe kushtet specifike te eventit.",
      faqs: [
        [
          "Si blej bileta ne Tiketa?",
          "Hapni faqen e eventit, kontrolloni daten, vendndodhjen, llojet e biletave dhe disponueshmerine, pastaj zgjidhni sasine dhe perfundoni pagesen.",
        ],
        [
          "Ku e gjej bileten QR?",
          "Hyni ne llogari dhe hapni dashboard-in. Porosite e perfunduara perfshijne akses QR per hyrje.",
        ],
        [
          "A shfaqen eventet e shitura?",
          "Po. Ato mund te mbeten te dukshme qe fansat te lexojne detajet dhe perditesimet.",
        ],
        [
          "Cfare ndodh nese eventi anulohet?",
          "Tiketa punon me organizatorin per te rishikuar rimbursimet e pranueshme sipas politikes dhe ligjit te aplikueshem.",
        ],
        [
          "A rimbursohen tarifat e sherbimit?",
          "Disa tarifa sherbimi, procesimi ose pagese mund te mos rimbursohen pervec rasteve kur kerkohet nga ligji ose politika e eventit.",
        ],
        [
          "Si publikon nje event organizatori?",
          "Krijoni llogari, perfundoni konfigurimin e organizatorit, shtoni detaje dhe bileta, pastaj publikoni sipas lejeve te platformes.",
        ],
      ],
      cta: {
        title: "Keni nevoje per pergjigje me te thelle?",
        body: "Dergojini mbeshtetjes emrin e eventit dhe emailin e llogarise.",
        primary: ["Kontakto Mbeshtetjen", "/contact"],
      },
    },
    "event.ticketSupport": {
      title: "Mbeshtetje per Bileta",
      subtitle:
        "Zgjidhni problemet e aksesit, kodeve QR, checkout dhe dites se eventit me informacionin e duhur.",
      eyebrow: "Mbeshtetje",
      lead: "Problemet me bileta zgjidhen me shpejt kur kerkesa lidhet me eventin, llogarine dhe porosine.",
      sections: [
        {
          title: "Cfare te perfshini",
          body: [
            "Emri dhe data e eventit.",
            "Emaili i porosise dhe referenca nese ekziston.",
            "Lloji i biletes, sasia dhe screenshot i gabimit.",
            "Nese eventi fillon brenda 24 oreve.",
          ],
        },
        {
          title: "Zgjidhje te zakonshme",
          body: [
            "Rifreskoni dashboard-in pas konfirmimit te pageses.",
            "Sigurohuni qe jeni futur me te njejtin email te checkout.",
            "Kontrolloni perditesimet e organizatorit per vendin, daten ose rregullat e hyrjes.",
            "Mbani kodin QR te dukshem dhe telefonin te karikuar.",
          ],
        },
      ],
      contacts: sqContacts.event,
      faqs: [
        [
          "Pse nuk po shfaqet ende bileta ime?",
          "Sigurohuni qe jeni futur me te njejtin email qe perdoret ne checkout, pastaj rifreskoni dashboard-in pas konfirmimit te pageses.",
        ],
        [
          "Cfare te bej nese kodi QR nuk hapet?",
          "Kontrolloni lidhjen, rihapni bileten nga dashboard-i dhe kontaktoni mbeshtetjen me emrin e eventit dhe emailin e porosise nese ende nuk shfaqet.",
        ],
        [
          "A mund ta ndryshoje mbeshtetja llojin e biletes?",
          "Ndryshimet varen nga politika e organizatorit, disponueshmeria dhe kushtet e eventit te shfaqura para checkout.",
        ],
      ],
      cta: {
        title: "Hapni kerkese mbeshtetjeje",
        body: "Perdorni faqen e kontaktit dhe perfshini listen me siper.",
        primary: ["Na Kontaktoni", "/contact"],
      },
    },
    "event.refund": {
      title: "Politika e Rimbursimit",
      subtitle:
        "Si Tiketa shqyrton kerkesat per evente te anuluara, shtyra, riplanifikuara ose te menaxhuara nga organizatori.",
      eyebrow: "Mbeshtetje",
      lead: "Biletat zakonisht jane shitje finale pervec rasteve kur eventi anulohet, ligji kerkon rimbursim ose organizatori ka publikuar opsion rimbursimi.",
      sections: [
        {
          title: "Evente te anuluara",
          body: [
            "Nese organizatori anulon eventin dhe nuk jep date zevendesuese, mbajtesit e pranueshem mund te marrin rimbursim sipas udhezimeve dhe ligjit.",
          ],
        },
        {
          title: "Evente te shtyra ose riplanifikuara",
          body: [
            "Biletat zakonisht mbeten te vlefshme per daten e re pervec nese organizatori deklaron ndryshe. Afatet e rimbursimit mund te jene te kufizuara.",
          ],
        },
        {
          title: "Tarifat dhe afatet",
          body: [
            "Tarifat e sherbimit, procesimit, pageses ose dorezimit mund te mos rimbursohen. Rimbursimet e miratuara kthehen zakonisht ne metoden origjinale te pageses.",
          ],
        },
        {
          title: "Mosmarreveshjet",
          body: [
            "Hapja e nje dispute bankare mund te ndaloje shqyrtimin standard deri ne zgjidhje. Nje komunikim i vetem ndihmon te shmangen vonesat.",
          ],
        },
      ],
      cta: {
        title: "Keni pyetje per rimbursim?",
        body: "Kontaktoni mbeshtetjen me detajet e porosise dhe statusin e eventit.",
        primary: ["Kontakto Mbeshtetjen", "/contact"],
      },
    },
    "event.organizer": {
      title: "Bëhu Organizator",
      subtitle:
        "Publikoni evente, shisni bileta, menaxhoni pjesemarres dhe pergatituni per operime profesionale.",
      eyebrow: "Organizatoret",
      lead: "Tiketa u jep organizatoreve nje menyre te strukturuar per te sjelle eksperienca live ne treg me lista te qarta dhe validim QR.",
      cards: [
        {
          icon: "bi-calendar-plus",
          title: "Krijoni lista publike",
          body: "Shtoni detaje, date, venue, imazhe, kategori, dukshmeri dhe pershkrime per klientet.",
        },
        {
          icon: "bi-tags",
          title: "Konfiguroni nivele biletash",
          body: "Vendosni emra, cmime, kapacitet, afate shitjeje dhe disponueshmeri.",
        },
        {
          icon: "bi-qr-code",
          title: "Menaxhoni hyrjen",
          body: "Perdorni bileta QR dhe rrjedha skanimi per check-in me te paster.",
        },
      ],
      faqs: [
        [
          "Kush mund te behet organizator?",
          "Ekipet e eventeve, venue-t, promovuesit dhe krijuesit e miratuar mund te perdorin mjetet e organizatorit pas konfigurimit te llogarise.",
        ],
        [
          "Cfare informacioni duhet para publikimit?",
          "Ju duhen detaje te sakta eventi, orar, venue, imazhe, nivele biletash, inventar dhe politika per klientet.",
        ],
        [
          "A mund te menaxhojne organizatoret check-in?",
          "Po. Rrjedhat e organizatorit mbeshtesin validimin QR dhe pergatitjen e skanerit per hyrje.",
        ],
      ],
      cta: {
        title: "Filloni organizimin ne Tiketa",
        body: "Krijoni llogari ose hapni hapesiren e organizatorit.",
        primary: ["Krijo Event", "/organizer"],
        secondary: ["Lexo Udhezuesin", "/organizer-guide"],
      },
    },
    "event.organizerGuide": {
      title: "Udhezues per Organizatore",
      subtitle: "Udhezues praktik per evente, bileta, publikim, komunikim dhe check-in.",
      eyebrow: "Organizatoret",
      lead: "Faqet profesionale te eventeve jane te sakta, te plota dhe te lehta per bleresit para checkout.",
      sections: [
        {
          title: "Pergatitni listen",
          body: [
            "Perdorni emra, orare, vende, detaje organizatori, rregulla moshe, kushte rimbursimi dhe informacion aksesibiliteti te sakte.",
            "Ngarkoni imazhe te qarta qe perfaqesojne eventin.",
          ],
        },
        {
          title: "Vendosni biletat",
          body: [
            "Emertoni qarte cdo nivel bilete, percaktoni sasine dhe cmimin, dhe shfaqni kufizimet para checkout.",
          ],
        },
        {
          title: "Komunikoni ndryshimet",
          body: [
            "Nese ndryshon data, vendi, programi, rregullat e hyrjes ose rimbursimi, perditesoni listen dhe njoftoni bleresit sa me heret.",
          ],
        },
        {
          title: "Planifikoni check-in",
          body: [
            "Caktoni akses skaneri, testoni validimin QR, pergatitni stafin dhe mbani nje plan rezerve.",
          ],
        },
      ],
      cta: {
        title: "Gati per publikim?",
        body: "Hapni mjetet e organizatorit dhe krijoni eventin tuaj.",
        primary: ["Krijo Event", "/organizer"],
      },
    },
    "event.createEvent": {
      title: "Krijo Event",
      subtitle:
        "Krijoni nje liste profesionale eventi dhe filloni shitjen e biletave permes Tiketa.",
      eyebrow: "Organizatoret",
      lead: "Nje liste e plote ndihmon klientet te blejne me besim dhe ekipin tuaj te operoje me qetesi.",
      sections: [
        {
          title: "Cfare ju duhet",
          body: [
            "Titulli, pershkrimi, kategoria, data, venue, imazhet, llojet e biletave, kapaciteti, kushtet e rimbursimit dhe kontaktet e organizatorit.",
          ],
        },
        {
          title: "Lista para publikimit",
          body: [
            "Konfirmoni detajet publike, shikoni parapamjen, testoni sasite e biletave dhe sigurohuni qe ekipi njeh skanimin.",
          ],
        },
      ],
      cta: {
        title: "Ndertoni eventin",
        body: "Shkoni te mjetet e organizatorit per te krijuar ose menaxhuar evente.",
        primary: ["Hap Mjetet e Organizatorit", "/organizer"],
      },
    },
    "event.terms": {
      title: "Kushtet e Sherbimit",
      subtitle: "Rregullat per perdorimin e Tiketa si bleres, organizator ose vizitor.",
      eyebrow: "Ligjore",
      lead: "Keto kushte rregullojne aksesin ne Tiketa, blerjen e biletave, listat e organizatoreve, llogarite, pagesat dhe permbajtjen.",
      sections: [
        {
          title: "Roli i marketplace",
          body: [
            "Tiketa ofron teknologji qe ndihmon organizatoret te listojne evente dhe te shesin bileta. Organizatori mban pergjegjesine per saktesine dhe realizimin e eventit.",
          ],
        },
        {
          title: "Llogarite",
          body: [
            "Ju jeni pergjegjes per informacion te sakte dhe sigurine e kredencialeve. Tiketa mund te kufizoje llogari qe krijojne rrezik.",
          ],
        },
        {
          title: "Pagesat dhe biletat",
          body: [
            "Cmimet vendosen nga organizatoret pervec rasteve kur thuhet ndryshe. Tarifa dhe taksa mund te aplikohen dhe shfaqen ne checkout kur eshte e mundur.",
          ],
        },
        {
          title: "Perdorim i pranueshem",
          body: [
            "Mos abuzoni platformen, mos grumbulloni te dhena ne mase, mos publikoni evente mashtruese dhe mos e perdorni Tiketa per aktivitet ilegal.",
          ],
        },
        {
          title: "Kufizime",
          body: [
            "Tiketa punon per sherbim te besueshem, por operimi i eventit kontrollohet nga organizatoret dhe venue-t. Disponueshmeria mund te ndryshoje.",
          ],
        },
      ],
    },
    "event.privacy": {
      title: "Politika e Privatësisë",
      subtitle: "Si Tiketa mbledh, perdor, mbron dhe ndan informacion personal.",
      eyebrow: "Ligjore",
      lead: "Ne perpunojme informacion personal per bileta, llogari, mbeshtetje, siguri, pagesa dhe funksione marketplace.",
      sections: [
        {
          title: "Informacioni qe mbledhim",
          body: [
            "Mund te mbledhim detaje llogarie, kontakte, histori porosish, te dhena pjesemarrjeje, profile organizatori, mesazhe mbeshtetjeje, te dhena pajisjeje dhe perdorimi.",
          ],
        },
        {
          title: "Si e perdorim",
          body: [
            "E perdorim per te procesuar porosi, dorezuar bileta, ofruar mbeshtetje, mbrojtur llogari, permiresuar platformen dhe komunikuar perditesime te rendesishme.",
          ],
        },
        {
          title: "Ndarja",
          body: [
            "Mund te ndajme informacion te nevojshem me organizatore, ofrues pagesash, furnizues sherbimesh dhe autoritete ligjore kur kerkohet.",
          ],
        },
        {
          title: "Zgjedhjet tuaja",
          body: [
            "Mund te menaxhoni detajet e llogarise, cookie-t ne browser dhe preferencat e marketingut. Disa funksione thelbesore kerkojne te dhena operative.",
          ],
        },
      ],
    },
    "event.cookies": {
      title: "Politika e Cookies",
      subtitle: "Si Tiketa perdor cookies dhe teknologji te ngjashme.",
      eyebrow: "Ligjore",
      lead: "Cookies ndihmojne Tiketa te mbaje sesione te sigurta, te ruaje preferenca, te mase performance dhe te permiresoje funksionalitetin.",
      sections: [
        {
          title: "Cookies thelbesore",
          body: [
            "Mbajne login, sigurine, preferencen e gjuhes, vazhdimesine e checkout dhe funksione baze.",
          ],
        },
        {
          title: "Cookies performance",
          body: [
            "Na ndihmojne te kuptojme performancen, gabimet dhe prirjet agregate te perdorimit.",
          ],
        },
        {
          title: "Menaxhimi i cookies",
          body: [
            "Mund t’i menaxhoni nga browser-i. Caktivizimi i cookie-ve thelbesore mund te pengoje login, checkout ose dashboard.",
          ],
        },
      ],
    },
    "dining.about": {
      title: "Rreth Tiketa Dining",
      subtitle:
        "Nje platforme rezervimesh per restorante, bare, lounge, kafene dhe mysafire qe duan prenotim me te lehte.",
      eyebrow: "Kompania",
      lead: "Tiketa Dining lidh mysafiret me venue mikpritjeje dhe u jep pronareve mjete per rezervime, disponueshmeri, komunikim dhe menaxhim profili.",
      cards: [
        {
          icon: "bi-search-heart",
          title: "Zbulim i kuruar",
          body: "Mysafiret mund te gjejne restorante dhe bare sipas qytetit, stilit, kuzhines, faciliteteve dhe disponueshmerise.",
        },
        {
          icon: "bi-calendar-check",
          title: "Rezervime te qarta",
          body: "Kerkesat perfshijne numrin e personave, oren, kontaktet dhe shenimet ne nje rrjedhe te qendrueshme.",
        },
        {
          icon: "bi-shop-window",
          title: "Operime per pronare",
          body: "Pronaret menaxhojne profile, imazhe, facilitete, orare, data te bllokuara dhe status rezervimesh.",
        },
      ],
      sections: [
        {
          title: "Fokus te mikpritja",
          body: [
            "Tiketa Dining eshte ndertuar per venue qe vleresojne rezervim te besueshem, informacion te sakte dhe eksperience te kuruar per mysafiret.",
            "Platforma mbeshtet restorante, bare, lounge, kafene dhe venue destinacioni qe duan te zbulohen dhe menaxhohen me lehte.",
          ],
        },
      ],
      cta: {
        title: "Gjeni tavolinen e radhes",
        body: "Shfletoni restorantet dhe baret ne Tiketa Dining.",
        primary: ["Zbulo Restorante", "/restaurants"],
        secondary: ["Bëhu Partner", "/become-restaurant-partner"],
      },
    },
    "dining.contact": {
      title: "Kontakto Tiketa Dining",
      subtitle:
        "Kontaktoni ekipin Tiketa Dining per mbeshtetje rezervimesh, mysafiresh ose partneresh.",
      eyebrow: "Kompania",
      lead: "Perfshini emrin e restorantit, daten dhe oren e rezervimit, emailin e mysafirit dhe nje pershkrim te shkurter.",
      contacts: sqContacts.dining,
      sections: [
        {
          title: "Per mysafiret",
          body: [
            "Na kontaktoni per pyetje rezervimi, probleme konfirmimi, udhezim anulimi, akses llogarie ose komunikim me venue.",
          ],
        },
        {
          title: "Per pronaret",
          body: [
            "Mbeshtetja e partnereve ndihmon me konfigurim venue, cilesi profili, disponueshmeri, rrjedha rezervimi dhe dashboard.",
          ],
        },
      ],
      cta: {
        title: "Keni nevoje per ndihme me rezervim?",
        body: "Hapni mbeshtetjen e rezervimeve per detajet qe duhen perfshire.",
        primary: ["Mbeshtetje Rezervimesh", "/reservation-support"],
      },
    },
    "dining.partner": {
      title: "Bëhu Partner Restoranti",
      subtitle:
        "Sillni restorantin, barin, lounge-in ose kafenen tuaj te mysafiret qe kerkojne eksperienca mikpritjeje.",
      eyebrow: "Pronaret e Restoranteve",
      lead: "Tiketa Dining ndihmon venue-t te prezantojne profile te sakta, te marrin kerkesa rezervimi dhe te menaxhojne komunikimin.",
      cards: [
        {
          icon: "bi-window",
          title: "Profil i kuruar venue",
          body: "Shfaqni tipin, pershkrimin, qytetin, adresen, galerine, kuzhinen, facilitetet dhe opsionet e pageses.",
        },
        {
          icon: "bi-calendar2-week",
          title: "Kontrolle disponueshmerie",
          body: "Menaxhoni oraret, horizontin e rezervimit, limitet e mysafireve, intervalet, blackout dhe oraret speciale.",
        },
        {
          icon: "bi-clipboard2-check",
          title: "Menaxhim rezervimesh",
          body: "Rishikoni kerkesa, konfirmoni rezervime, trajtoni anulime dhe monitoroni ardhjet.",
        },
      ],
      cta: {
        title: "Listoni venue-n",
        body: "Krijoni ose menaxhoni profilin nga hapesira e pronarit.",
        primary: ["Listo Restorantin", "/owner-venue"],
        secondary: ["Lexo Udhezuesin", "/restaurant-owner-guide"],
      },
    },
    "dining.ownerGuide": {
      title: "Udhezues per Pronaret e Restoranteve",
      subtitle: "Krijoni profil te besueshem dhe menaxhoni rezervime me siguri.",
      eyebrow: "Pronaret e Restoranteve",
      lead: "Informacioni i plote dhe i sakte ndihmon mysafiret te zgjedhin vendin e duhur dhe ekipin tuaj te pergatitet.",
      sections: [
        {
          title: "Ndertoni profilin",
          body: [
            "Shtoni emrin, tipin, pershkrimin, telefonin, emailin, website, adresen, qytetin, shtetin dhe lokacionin ne harte.",
            "Ngarkoni foto cilesore qe tregojne hapesiren reale.",
          ],
        },
        {
          title: "Konfiguroni disponueshmerine",
          body: [
            "Mbani aktuale oraret, oraret speciale, datat e bllokuara, horizontin e rezervimit, limitet dhe intervalet.",
          ],
        },
        {
          title: "Menaxhoni kerkesat",
          body: [
            "Rishikoni shpejt rezervimet ne pritje, konfirmoni ato te pranuara dhe shtoni arsye anulimi kur nuk mund t’i prisni.",
          ],
        },
        {
          title: "Mbani komunikim te qarte",
          body: [
            "Perdorini shenimet dhe kontaktet me pergjegjesi. Perditesoni detajet kur politikat, oraret ose disponueshmeria ndryshojne.",
          ],
        },
      ],
      cta: {
        title: "Hap mjetet e pronarit",
        body: "Menaxhoni profilin dhe rezervimet e restorantit ose barit.",
        primary: ["Hapesira e Pronarit", "/owner-venue"],
      },
    },
    "dining.list": {
      title: "Listo Restorantin",
      subtitle: "Krijoni nje profil venue qe mysafiret mund ta zbulojne dhe te kerkojne rezervim.",
      eyebrow: "Pronaret e Restoranteve",
      lead: "Nje liste e forte u jep mysafireve informacionin praktik qe u duhet para rezervimit.",
      sections: [
        {
          title: "Kerkesat e listes",
          body: [
            "Pergatitni emrin, tipin, pershkrimin, kontaktet, adresen, fotot, llojet e kuzhines, facilitetet, opsionet e pageses dhe oraret.",
          ],
        },
        {
          title: "Para publikimit",
          body: [
            "Shikoni faqen publike, kontrolloni rregullat e rezervimit, testoni limitet dhe sigurohuni qe ekipi di si te rishikoje kerkesat.",
          ],
        },
      ],
      cta: {
        title: "Krijoni listen",
        body: "Hapni hapesiren e pronarit per te shtuar ose perditesuar venue-n.",
        primary: ["Listo Restorantin", "/owner-venue"],
      },
    },
    "dining.how": {
      title: "Si Funksionojne Rezervimet",
      subtitle: "Nje rrjedhe e thjeshte per te zbuluar venue, zgjedhur oren dhe marre konfirmim.",
      eyebrow: "Rezervimet",
      lead: "Tiketa Dining mban rrjedhen e mysafirit te qarte dhe u jep restoranteve e bareve kontroll mbi disponueshmerine.",
      sections: [
        {
          title: "1. Zbuloni nje venue",
          body: [
            "Shfletoni restorante, bare, lounge dhe kafene sipas qytetit, tipit, kuzhines, faciliteteve dhe statusit te zgjedhur.",
          ],
        },
        {
          title: "2. Zgjidhni detajet",
          body: [
            "Zgjidhni daten, oren, numrin e personave dhe cdo rast apo kerkese speciale qe venue duhet ta dije.",
          ],
        },
        {
          title: "3. Dergoni kerkesen",
          body: ["Dergo kerkesen me kontakte te sakta qe venue te mund te pergjigjet."],
        },
        {
          title: "4. Merrni konfirmim",
          body: [
            "Restoranti ose bari e rishikon kerkesen dhe e konfirmon, perditeson ose anulon sipas disponueshmerise dhe politikes.",
          ],
        },
      ],
      cta: {
        title: "Gati per rezervim?",
        body: "Eksploroni restorante dhe bare qe pranojne kerkesa rezervimi.",
        primary: ["Gjej Tavoline", "/restaurants"],
      },
    },
    "dining.support": {
      title: "Mbeshtetje per Rezervime",
      subtitle:
        "Ndihme per kerkesa, konfirmime, anulime, detaje mysafiresh dhe komunikim me venue.",
      eyebrow: "Rezervimet",
      lead: "Mbeshtetja funksionon me mire kur perfshin venue, daten, oren, emrin e mysafirit dhe emailin e llogarise.",
      sections: [
        {
          title: "Mbeshtetje per mysafire",
          body: [
            "Na kontaktoni nese nuk gjeni rezervimin, keni nevoje te kuptoni statusin, keni futur detaje gabim ose nuk arrini venue-n.",
          ],
        },
        {
          title: "Mbeshtetje per pronare",
          body: [
            "Ekipet e venue-ve mund te kerkojne ndihme per statuset, kalendarin, disponueshmerine, anulimet dhe komunikimin.",
          ],
        },
        {
          title: "Kohe urgjente",
          body: [
            "Per rezervime te se njejtes dite, kontaktoni venue-n direkt kur eshte e mundur dhe dergoni Tiketa Dining detajet.",
          ],
        },
      ],
      contacts: sqContacts.dining,
      faqs: [
        [
          "A konfirmohet menjehere kerkesa e rezervimit?",
          "Jo. Kerkesa konfirmohet vetem pasi venue kontrollon disponueshmerine dhe e pranon.",
        ],
        [
          "Si i ndryshoj detajet e rezervimit?",
          "Kontaktoni venue-n kur eshte e mundur dhe dergoni mbeshtetjes emrin e venue-s, daten, oren dhe detajet e reja.",
        ],
        [
          "Cfare ndodh nese venue anulon?",
          "Regjistrimi mbetet i dukshem per rishikim dhe mbeshtetja mund te ndihmoje me arsyen e anulimit.",
        ],
      ],
      cta: {
        title: "Rishikoni politiken",
        body: "Kuptoni si trajtohen ndryshimet dhe anulimet.",
        primary: ["Politika e Rezervimeve", "/reservation-policy"],
      },
    },
    "dining.policy": {
      title: "Politika e Rezervimeve",
      subtitle:
        "Si Tiketa Dining trajton kerkesat, konfirmimet, anulimet dhe pergjegjesite e mysafireve.",
      eyebrow: "Rezervimet",
      lead: "Disponueshmeria kontrollohet nga cdo restorant ose bar. Tiketa Dining ofron rrjedhen e platformes dhe mbeshtetjen.",
      sections: [
        {
          title: "Kerkesa dhe konfirmime",
          body: [
            "Dergimi i kerkeses nuk garanton tavoline derisa venue ta konfirmoje. Mysafiret duhet te ndjekin perditesimet dhe te vijne sipas detajeve te konfirmuara.",
          ],
        },
        {
          title: "Anulimet",
          body: [
            "Mysafiret duhet te anulojne sa me heret nese planet ndryshojne. Venue-t mund te anulojne kur kapaciteti, oraret, eventet private ose operimet nuk e lejojne.",
          ],
        },
        {
          title: "Pergjegjesite e mysafirit",
          body: [
            "Perdorni kontakte te sakta, ejani ne kohe, respektoni rregullat dhe kontaktoni venue-n nese ndryshon numri i personave ose ora.",
          ],
        },
        {
          title: "Pergjegjesite e venue",
          body: [
            "Venue-t duhet te mbajne disponueshmerine te sakte, te pergjigjen shpejt dhe te japin arsye te qarta anulimi kur nuk mund te presin rezervimin.",
          ],
        },
      ],
      cta: {
        title: "Keni nevoje per ndihme?",
        body: "Kontaktoni mbeshtetjen me emrin e venue dhe detajet e rezervimit.",
        primary: ["Mbeshtetje Rezervimesh", "/reservation-support"],
      },
    },
  };

  const legalEn = {
    "event.terms": {
      title: "Terms of Service",
      subtitle: "The rules for using Tiketa to browse events, buy tickets, make reservations, and use organizer, venue owner, scanner, and admin tools.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      notice: "These terms are written from Tiketa's current implementation. Some operational items, such as self-service account deletion and formal retention schedules, are handled by support processes until dedicated product workflows are added.",
      sections: [
        { title: "1. Tiketa's service", body: ["Tiketa provides a web platform for event discovery, ticket purchases, QR ticket delivery, event check-in, organizer operations, restaurant and venue reservations, venue owner tools, notifications, and account management.", "Tiketa is not the organizer of every event or the operator of every venue shown on the platform. Organizers and venue owners remain responsible for the accuracy, legality, safety, and delivery of their events, listings, venue profiles, reservation availability, customer-facing rules, and uploaded content."] },
        { title: "2. Accounts and eligibility", body: ["You need an account for ticket checkout, dashboards, reservations, organizer tools, venue owner tools, scanner tools, and admin areas. Registration requires an email address and password. Name, phone, default city, role request, and preferred language may also be collected or stored.", "Tiketa supports user, organizer, venue owner, scanner, and admin roles. Organizer accounts may require approval before organizer tools are available. Accounts must use accurate information, and you are responsible for protecting your password, devices, and Tiketa session. Tiketa may restrict accounts that are suspended, banned, abusive, fraudulent, or risky to the platform."] },
        { title: "3. Email verification and security", body: ["Tiketa may require email verification before reservation and venue owner workflows are available. Password reset and account security emails are provided through Tiketa's email system.", "Tiketa uses Laravel Sanctum bearer-token authentication. The frontend stores the token and a cached user profile in browser localStorage so the application can keep you signed in. You should use Tiketa only on devices and browsers you trust."] },
        { title: "4. Ticket purchases and checkout", body: ["When you buy tickets, Tiketa stores order details, billing contact information, ticket items, attendee information for each ticket, amounts, service fees, currency, checkout status, and purchase history. Billing email, billing first name, billing last name, attendee name, and attendee email are required for checkout. Billing phone/address fields and attendee phone are optional.", "You must have the right to provide attendee information for other people. Tickets may be subject to event-specific limits, sale windows, organizer policies, and availability. Checkout reservations may expire if payment is not completed in time."] },
        { title: "5. Payments", body: ["Tiketa's backend supports Stripe Checkout. When Stripe Checkout is enabled, Tiketa sends Stripe the billing email and order metadata needed to create and reconcile payment sessions. Tiketa stores payment provider, payment reference, Stripe checkout session ID, payment intent ID, refund ID, Stripe payment status, webhook payload records, and payment timestamps.", "Tiketa's current frontend includes a local/mock checkout completion path used by the existing application flow. The visible card fields on the checkout page are not submitted by the active checkout JavaScript. Tiketa does not intentionally collect raw card numbers, CVCs, or card expiry values in its own API."] },
        { title: "6. QR tickets and entry", body: ["Paid orders generate QR tickets with ticket codes, internal ticket UUIDs, random QR tokens, attendee details, issue timestamps, download records, and check-in status. The QR payload contains internal identifiers and a token, not the attendee's name, email, or phone number.", "QR tickets are bearer-style credentials. Anyone who can present a valid QR code or ticket download may be able to request entry until the ticket is used, cancelled, or refunded. Keep QR codes and ticket downloads private. Organizers, scanners, and admins may validate tickets and record attendance/check-in activity."] },
        { title: "7. Reservations", body: ["Tiketa supports restaurant and venue reservation requests for authenticated, email-verified users. Reservation requests store venue, account, guest name derived from the account, optional phone, party size, date, time, status, notes, occasion, cancellation details, no-show/completion status, and timestamps.", "Submitting a reservation request does not guarantee a table until the venue confirms it. Guests must provide accurate information, arrive according to the confirmed details, and avoid placing sensitive information in free-text notes. Venue owners are responsible for keeping availability accurate and managing requests in a timely way."] },
        { title: "8. Organizers, venue owners, scanners, and admins", body: ["Organizers can create and manage events, ticket types, inventory, images, attendees, orders, payments, analytics, scanner access, and check-in logs for their events. Venue owners can manage venue profiles, images, facilities, cuisines, payment options, hours, special hours, blackout dates, reservation settings, reservations, and analytics. Scanners can validate assigned event tickets. Admins have broader platform access for users, events, tickets, reservations, payments, subscribers, email center, audit logs, settings, and moderation.", "Each role must use operational data only for legitimate Tiketa-related purposes. Misuse of attendee, guest, order, reservation, scanner, or payment metadata may result in account restriction or removal."] },
        { title: "9. Uploaded and public content", body: ["Organizers and venue owners may upload images and provide listing content. Event and venue images may be stored in local public storage or Supabase/S3-compatible public storage and displayed publicly. Tiketa stores image metadata such as path, disk, original filename, MIME type, size, dimensions, alt text, role, and sort order where implemented.", "You must own or have permission to use the content you upload. By uploading content, you give Tiketa permission to host, store, copy, display, resize, publish, and use it to operate and promote the relevant event, venue, reservation, or platform page."] },
        { title: "10. Prohibited conduct", body: ["You may not use Tiketa for fraudulent events, fake reservations, unlawful content, unauthorized resale, scraping or interference with inventory, payment abuse, security testing without permission, spam, harassment, impersonation, data harvesting, or misuse of attendee/guest data.", "Tiketa may remove content, reject events, unpublish listings, suspend accounts, revoke scanner access, cancel unpaid orders, or take other reasonable steps to protect users, organizers, venues, and the platform."] },
        { title: "11. Changes, availability, and liability", body: ["Tiketa may change, suspend, or discontinue features, pages, providers, or workflows as the product evolves. The platform depends on third-party providers for hosting, email, storage, payments, CDNs, maps/fonts, and logs, so availability may vary.", "To the maximum extent permitted by law, Tiketa is not responsible for organizer-controlled event operations, venue-controlled reservation decisions, third-party outages, user-provided inaccurate information, or losses that the law allows us to exclude. Nothing in these terms limits rights that cannot be waived under applicable law."] },
        { title: "12. Contact", body: ["For support, legal notices, privacy requests, refund questions, organizer issues, venue owner issues, or copyright reports, use the Contact & Legal Information page."] },
      ],
      cta: { title: "Need a specific legal contact?", body: "Use the legal contact page to route privacy, refund, copyright, and platform notices correctly.", primary: ["Contact Tiketa", "/legal-contact"], secondary: ["Privacy Policy", "/privacy-policy"] },
    },
    "event.privacy": {
      title: "Privacy Policy",
      subtitle: "How Tiketa collects, uses, shares, stores, and protects information across tickets, reservations, dashboards, payments, notifications, and support.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      notice: "Tiketa does not currently show behavioral advertising or third-party analytics tracking in the audited source. If analytics are added later, this policy should be updated before launch.",
      sections: [
        { title: "1. Information we collect", body: ["Account information includes email, password hash, name fields, role, phone, avatar URL, default city, preferred language, notification preferences, organizer status, account status, email verification state, last login time, and timestamps.", "Ticketing information includes orders, billing contact and optional billing address fields, ticket items, attendee name/email/phone, ticket codes, QR identifiers, payment status, checkout reservation records, purchase history, receipt access, download counts, and check-in status.", "Reservation information includes venue, user account, guest name, optional phone, party size, reservation date/time, status, notes, occasion, cancellation/no-show/completion records, and timestamps. Newsletter information includes email, source, language, subscription status, subscribed/unsubscribed timestamps, IP address, and user agent."] },
        { title: "2. Information from devices and browser storage", body: ["Tiketa may process IP addresses, user agents, session records, operational logs, audit logs, email delivery logs, ticket validation logs, and Stripe webhook event payloads. Browser storage is used for auth tokens, cached user profile, cart/checkout continuity, last order ID, language preference, theme, notification cache, and favorite-event fallback behavior.", "Laravel/Sanctum cookies and CSRF/session mechanisms may be used depending on environment and authentication mode. The frontend also reads language preferences so Tiketa can present English or Albanian content."] },
        { title: "3. How we use information", body: ["We use information to create and secure accounts, verify email addresses, authenticate sessions, process orders, reserve ticket inventory, generate QR tickets, send order/reservation/account emails, provide dashboards, validate tickets, store attendance records, manage reservations, provide owner/organizer/admin tools, support customers, maintain security, detect abuse, reconcile payments, and operate the platform.", "We use newsletter information to manage subscriptions and unsubscribes. We use operational logs, audit logs, email logs, validation logs, and payment metadata to troubleshoot, prevent fraud, support users, and maintain reliable service."] },
        { title: "4. Payments and Stripe", body: ["Tiketa's backend supports Stripe Checkout. Tiketa sends billing email and order metadata to Stripe when creating a Stripe checkout session. Tiketa stores payment references, Stripe session/payment/refund identifiers, Stripe payment status, and Stripe webhook payload records to reconcile payment state.", "Tiketa does not intentionally store raw card numbers, CVCs, or card expiry values in its own API. The audited frontend currently completes checkout through a local/mock payment path, while the backend Stripe Checkout path is implemented for payment sessions."] },
        { title: "5. Sharing and role-based access", body: ["Organizers can access operational information for their events, including orders, attendees, tickets, payments, analytics, check-in stats, and validation logs. Venue owners can access reservation and guest details for venues they manage. Scanners can access assigned event ticket validation workflows. Admins can access broader platform records for operations, support, moderation, payments, and security.", "We may share information with service providers that help operate Tiketa, including Stripe for payments, email providers such as Resend/Postmark/SES when configured, Supabase/S3-compatible storage for public images, Railway for backend hosting, Cloudflare for frontend hosting, jsDelivr and Google Fonts/Maps where used by the frontend, and optional logging/notification providers such as Papertrail or Slack when configured."] },
        { title: "6. Uploaded content", body: ["Event and venue images may be publicly displayed. Image files may be stored in public local storage or Supabase/S3-compatible public storage. Metadata such as original filename, MIME type, size, dimensions, path, disk, alt text, and sort order may be stored to operate the image system.", "Do not upload private, sensitive, infringing, misleading, or unlawful images. If a public image must be removed, use the copyright or legal contact process."] },
        { title: "7. Retention", body: ["Tiketa's audited code does not define a universal retention schedule for accounts, orders, tickets, reservations, validation logs, audit logs, newsletter records, Stripe webhook records, or uploaded files. Database records generally remain until deleted, cancelled, soft-deleted, or handled by an admin/support process. Reservations support soft deletion. Rendered email bodies were intentionally removed from email logs.", "Laravel daily logs, when the daily log channel is used, are configured for 14 days by default. Tiketa should define a formal retention schedule before publishing a final compliance program."] },
        { title: "8. Your choices and rights", body: ["You can update profile information, language, notification preferences, and some dashboard data through the application where available. You can unsubscribe from newsletters using signed unsubscribe links. Because no self-service account deletion route was found in the audit, deletion, access, correction, restriction, and export requests should be made through the Data Deletion & Privacy Requests page.", "Some records may be retained where needed for security, fraud prevention, payment reconciliation, tax/accounting, legal compliance, dispute handling, organizer operations, venue operations, or platform integrity."] },
        { title: "9. Security", body: ["Tiketa uses role checks, active-account checks, organizer approval, verified-email gates, rate limits, signed links for some ticket email access, Stripe webhook signature verification, security headers, CORS settings, production cookie security flags, QR token hashing in validation logs, and masked QR identifiers where implemented.", "No system is perfectly secure. Protect your account credentials and QR tickets, avoid using shared devices, and contact Tiketa if you suspect unauthorized access."] },
        { title: "10. Children and minors", body: ["The audited application does not include a specific age gate or minor-consent workflow. Tiketa should define a minimum-age policy before final publication. Until then, users should not provide information for minors unless they have appropriate authority and the relevant event or venue permits it."] },
        { title: "11. International transfers and GDPR", body: ["Tiketa may use providers and infrastructure outside your country, including payment, email, hosting, storage, CDN, map/font, and logging providers. If you are in the EEA, UK, or similar jurisdictions, see the GDPR Information page for rights and lawful-basis details."] },
        { title: "12. Contact", body: ["Use the Contact & Legal Information page for privacy, GDPR, deletion, data access, security, and legal questions."] },
      ],
      cta: { title: "Manage a privacy request", body: "Use the privacy request page for access, deletion, correction, export, objection, or unsubscribe help.", primary: ["Privacy Requests", "/data-deletion-privacy-requests"], secondary: ["GDPR Information", "/gdpr-information"] },
    },
    "event.cookies": {
      title: "Cookie & Browser Storage Policy",
      subtitle: "How Tiketa uses cookies, localStorage, and sessionStorage for authentication, preferences, checkout continuity, notifications, and security.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      sections: [
        { title: "1. Summary", body: ["Tiketa uses browser storage primarily for essential and preference-based functionality. The audit did not find active PostHog, Sentry, Mixpanel, Google Analytics, Meta Pixel, or similar behavioral tracking code.", "If tracking or analytics cookies are added later, this policy should be updated before those tools are enabled."] },
        { title: "2. Cookies and server-side sessions", body: ["Laravel session and CSRF/Sanctum mechanisms may create cookies depending on environment and authentication mode. Session records can include session ID, user ID, IP address, user agent, payload, and last activity. Production session configuration supports secure, HttpOnly, same-site, and encrypted session behavior when enabled by environment.", "Server-side rendering may read a preferred_language cookie if present, but the main frontend language preference is stored in localStorage."] },
        { title: "3. localStorage", body: ["Tiketa stores event_sphere_token for authentication, event_sphere_user for cached user profile details, preferred_language for English/Albanian preference, theme preference, notification cache, and a favorite-event fallback cache in localStorage.", "These items help keep you signed in, display account-aware navigation, remember language/theme choices, and improve dashboard/header behavior. Because localStorage persists after closing the browser, sign out on shared devices."] },
        { title: "4. sessionStorage", body: ["Tiketa stores event_sphere_cart for checkout continuity, event_sphere_last_order_id for checkout success recovery, and may migrate legacy auth keys from sessionStorage to localStorage.", "SessionStorage normally clears when the browser tab or session ends, but behavior can vary by browser."] },
        { title: "5. Essential versus optional storage", body: ["Authentication, CSRF/session, cart, checkout, and security storage are essential for core platform features. Language, theme, notifications, and favorites are preference or convenience storage. Disabling essential storage may prevent login, checkout, dashboards, QR ticket access, or reservations from working."] },
        { title: "6. Managing storage", body: ["You can clear cookies, localStorage, and sessionStorage in your browser settings. Clearing storage may sign you out, remove checkout carts, reset preferences, hide cached notifications, and require you to reauthenticate."] },
      ],
      cta: { title: "See how storage connects to privacy", body: "The Privacy Policy explains the personal data connected to these browser and session records.", primary: ["Privacy Policy", "/privacy-policy"] },
    },
    "event.refund": {
      title: "Refund & Cancellation Policy",
      subtitle: "How Tiketa handles ticket refunds, event changes, checkout expirations, Stripe refunds, reservations, cancellations, and no-shows.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      notice: "Tiketa's code stores event-level refund policy fields, payment/refund status, reservation statuses, and cancellation/no-show records. The audit did not find a universal automated refund rule, so event- and organizer-specific policies matter.",
      sections: [
        { title: "1. Ticket purchases", body: ["Tickets are generally governed by the event's displayed details, organizer policy, and applicable law. Organizers are responsible for accurate event information, venue details, dates, ticket tiers, entry rules, and customer-facing refund terms.", "Tiketa stores order, ticket, payment, and attendee records so purchases can be confirmed, tickets generated, receipts shown, and support requests reviewed."] },
        { title: "2. Fees", body: ["Orders may include ticket subtotal, service fee, refund protection fee if used, discounts, taxes, total, and currency. Service-fee percentages can be configured per event by admins. Whether fees are refundable depends on the event policy, payment provider rules, and applicable law."] },
        { title: "3. Canceled, postponed, or changed events", body: ["If an event is canceled, postponed, rescheduled, or materially changed, Tiketa may use event cancellation email workflows and notifications to inform affected users. Refund eligibility depends on organizer instructions, the event refund policy, payment status, and applicable law.", "Tickets for canceled, ended, or unpublished events may be blocked from validation/check-in by the ticket validation workflow."] },
        { title: "4. Stripe and local/mock payment status", body: ["For Stripe orders, approved refunds are processed through Stripe and Tiketa stores the Stripe refund identifier and refunded timestamp. Bank or card-network timelines may vary.", "The current application also includes local/mock checkout completion paths. Those paths create paid orders and tickets for the existing application flow but do not represent a live card charge by Tiketa's API."] },
        { title: "5. Failed, cancelled, and expired checkout", body: ["Checkout reservations hold ticket inventory for a short period. If checkout expires, fails, or is cancelled before payment, Tiketa can release inventory and mark the order or checkout reservation accordingly. The configured checkout reservation window is five minutes by default."] },
        { title: "6. Reservation cancellations and no-shows", body: ["Restaurant and venue reservations are requests until confirmed by the venue. Guests should cancel as early as possible if plans change. Venue owners and admins can confirm, cancel, complete, restore, delete, or mark reservations as no-show according to the application's current workflows.", "Reservation cancellation reasons and owner cancellation notes may be stored. No-show and completion records may remain in reservation history for operational review."] },
        { title: "7. How to request help", body: ["Contact Tiketa with your account email, order number if available, event or venue name, reservation date/time if applicable, and a short explanation. Opening duplicate requests or payment disputes may slow review."] },
      ],
      cta: { title: "Need refund or cancellation help?", body: "Send the right order, event, or reservation details so support can match the correct record.", primary: ["Contact Support", "/legal-contact"] },
    },
    "legal.organizerTerms": {
      title: "Organizer Terms",
      subtitle: "Operational and legal responsibilities for organizers using Tiketa to publish events, sell tickets, manage attendees, and run check-in.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      sections: [
        { title: "1. Organizer access", body: ["Organizer accounts can be requested during registration but may remain pending until Tiketa approves them. Organizer tools are available only to active, approved organizer accounts or admins.", "Tiketa may reject, suspend, unpublish, or restrict organizer access when events, content, payments, user safety, or platform integrity create risk."] },
        { title: "2. Event listings", body: ["Organizers are responsible for accurate event title, description, category, date, time, timezone, venue name, city, country, address, status, visibility, ticket types, inventory, purchase limits, pricing, currency, refund policy, and uploaded images.", "Do not publish misleading events, unavailable inventory, unlawful events, fake venues, inaccurate accessibility/age/entry rules, or imagery you do not have rights to use."] },
        { title: "3. Tickets, attendees, and check-in", body: ["Tiketa stores attendee details, order details, tickets, QR payload identifiers, ticket status, download records, check-in status, and validation logs. Organizers may access attendee and validation information for their own events.", "Organizer staff and assigned scanners must use attendee data only for event operations, entry, safety, support, refunds, and legal compliance. They must not sell, export, contact, or reuse attendee data outside the purpose of operating the event unless they have a lawful basis and appropriate notice."] },
        { title: "4. Payments, refunds, and cancellations", body: ["Tiketa's backend supports Stripe Checkout and stores payment metadata for reconciliation. Organizers must honor event refund terms, cancellation communications, and legal obligations. If an event is canceled or materially changed, organizers must update Tiketa records and cooperate with support to notify ticket holders and review refunds.", "Organizers are responsible for disputes caused by inaccurate listings, canceled events, capacity issues, denied entry inconsistent with published terms, or misuse of attendee data."] },
        { title: "5. Uploaded content license", body: ["By uploading event images or content, organizers confirm they have all required rights and grant Tiketa permission to host, store, process, display, publish, resize, and use that content for the event page, marketplace, emails, support, SEO, and platform promotion.", "Tiketa may remove or replace content that appears infringing, misleading, low quality, unsafe, or inconsistent with platform standards."] },
        { title: "6. Scanner assignment", body: ["Organizers and admins may assign scanner access for event check-in. Scanner accounts can validate or check in tickets for assigned events and generate validation logs that include scan result, method, time, scanner, event/ticket references, IP address, user agent, attendee details, masked QR identifier, and token hash."] },
        { title: "7. Compliance", body: ["Organizers must comply with ticketing, consumer protection, tax, event safety, age restriction, accessibility, privacy, anti-spam, venue, and local law requirements that apply to their events. Tiketa provides platform tools, not legal clearance for an event."] },
      ],
      cta: { title: "Related policies", body: "Organizer responsibilities also connect to acceptable use, refunds, privacy, and copyright.", primary: ["Acceptable Use", "/acceptable-use-content-policy"], secondary: ["Copyright Policy", "/copyright-takedown-policy"] },
    },
    "legal.venueOwnerTerms": {
      title: "Restaurant / Venue Owner Terms",
      subtitle: "Responsibilities for restaurants, bars, lounges, cafes, and venue teams using Tiketa reservation and owner tools.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      sections: [
        { title: "1. Owner access", body: ["Venue owner workflows are available to active owner accounts with verified email. Owners can manage their own venues, while admins may manage venues across the platform.", "Owners are responsible for keeping venue profiles, contact details, availability, reservation rules, and public imagery accurate."] },
        { title: "2. Venue profiles", body: ["Venue profiles may include name, slug, type, description, phone, email, website, address, city, country, latitude/longitude, logo, status, featured flag, guest limits, reservation interval, max reservations per slot, booking horizon, last reservation time, social links, facilities, cuisines, payment options, opening hours, special hours, blackout dates, and images.", "Public venue data and images may be displayed on Tiketa restaurant pages and search/discovery surfaces."] },
        { title: "3. Reservation management", body: ["Reservations store guest name derived from the account, optional phone, party size, reservation date/time, status, notes, occasion, cancellation details, no-show/completion status, and timestamps. Owners can view and manage reservations for venues they control.", "Owners should confirm, cancel, complete, and mark no-shows accurately and promptly. If a reservation cannot be honored, owners should provide clear cancellation reasons and avoid unnecessary collection or reuse of guest information."] },
        { title: "4. Guest data", body: ["Guest data may be used only to manage the reservation, prepare for service, communicate about the booking, resolve support issues, comply with law, or protect the venue and platform. It must not be sold, reused for unrelated marketing, or shared outside the venue's legitimate operations without appropriate notice and permission."] },
        { title: "5. Uploaded content", body: ["Venue images may be stored in public local or Supabase/S3-compatible storage. Owners must upload only images they have rights to use and that accurately represent the venue experience.", "By uploading venue content, owners grant Tiketa permission to host, store, process, display, publish, resize, and use it for venue pages, discovery, reservation workflows, support, SEO, and platform promotion."] },
        { title: "6. Compliance and enforcement", body: ["Venue owners are responsible for hospitality, reservation, consumer, privacy, accessibility, food/beverage, age restriction, and local law compliance. Tiketa may deactivate, remove, or edit venue listings where needed for accuracy, safety, legal compliance, or platform integrity."] },
      ],
      cta: { title: "Reservation rules", body: "Review the refund and cancellation policy for reservation cancellation and no-show handling.", primary: ["Refund & Cancellation", "/refund-policy"] },
    },
    "legal.acceptableUse": {
      title: "Acceptable Use & Content Policy",
      subtitle: "Rules for safe, accurate, lawful use of Tiketa listings, dashboards, reservations, uploads, tickets, and platform data.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      sections: [
        { title: "1. Accuracy and honesty", body: ["Do not create fake accounts, fake events, fake venue profiles, fake reservations, misleading ticket inventory, false pricing, inaccurate refund terms, false venue details, deceptive images, or impersonated organizations.", "Organizers and venue owners must keep customer-facing details current and correct."] },
        { title: "2. Prohibited content", body: ["Do not upload or publish content that is illegal, infringing, defamatory, hateful, harassing, exploitative, sexually explicit where inappropriate, violent, deceptive, spammy, malware-related, privacy-invasive, or likely to create safety risks.", "Do not upload images or descriptions you do not have rights to use."] },
        { title: "3. Platform misuse", body: ["Do not scrape Tiketa at scale, bypass rate limits, interfere with checkout reservations, manipulate ticket inventory, attack QR validation, probe security without permission, abuse APIs, reverse engineer private workflows, use automated purchasing, or disrupt platform availability.", "Do not use Tiketa data to build unauthorized profiles, send spam, resell personal data, or contact attendees/guests outside legitimate event or reservation operations."] },
        { title: "4. Payments, tickets, and reservations", body: ["Do not use stolen payment methods, create fraudulent refund claims, sell invalid tickets, share QR codes deceptively, submit reservations you do not intend to honor, or misuse attendee or guest information.", "Tiketa may cancel unpaid or failed checkout records, release inventory, block invalid tickets, and log validation activity."] },
        { title: "5. Enforcement", body: ["Tiketa may remove content, reject or unpublish events, deactivate venues, suspend users, restrict roles, revoke scanner access, preserve records for investigations, or contact law enforcement where appropriate."] },
      ],
      cta: { title: "Report misuse", body: "Send clear details, links, screenshots, and account or order references where available.", primary: ["Contact Legal", "/legal-contact"] },
    },
    "legal.copyright": {
      title: "Copyright & Takedown Policy",
      subtitle: "How Tiketa handles claims about event images, venue images, listing text, and other user-generated content.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      sections: [
        { title: "1. User-generated content", body: ["Tiketa allows organizers and venue owners to upload public images and listing content. Uploaders are responsible for making sure they own the content or have permission to use it.", "Uploaded images may be stored publicly and displayed across Tiketa pages, emails, discovery, SEO metadata, and support workflows."] },
        { title: "2. License to Tiketa", body: ["When you upload content, you grant Tiketa a non-exclusive, worldwide permission to host, store, copy, process, display, publish, resize, and use that content as needed to operate, improve, support, and promote Tiketa, the relevant event, or the relevant venue.", "You keep ownership of your content unless a separate agreement says otherwise."] },
        { title: "3. Reporting infringement", body: ["If you believe content on Tiketa infringes your copyright or other rights, send a takedown notice with your name, organization if applicable, contact details, a description of the copyrighted work, the Tiketa URL or content location, a statement that you believe the use is unauthorized, a statement that your notice is accurate, and your physical or electronic signature.", "Send notices through the Contact & Legal Information page. Tiketa may ask for more information before acting if the notice is incomplete."] },
        { title: "4. Response and counter-notices", body: ["Tiketa may remove, disable, or restrict access to content that appears infringing or legally risky. Tiketa may notify the uploader and may allow a counter-notice process where appropriate.", "Repeated or serious infringement may result in account restrictions, event rejection, venue deactivation, or organizer/owner removal."] },
        { title: "5. No legal determination", body: ["Tiketa's response to a takedown notice does not decide ownership or legal rights. Parties remain responsible for resolving disputes directly or through lawful processes."] },
      ],
      cta: { title: "Submit a takedown notice", body: "Use the legal contact route and include the information listed above.", primary: ["Legal Contact", "/legal-contact"] },
    },
    "legal.dataDeletion": {
      title: "Data Deletion & Privacy Requests",
      subtitle: "How to request access, correction, deletion, export, objection, restriction, or unsubscribe help for Tiketa data.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      notice: "The audit did not find a self-service account deletion or data export route. Requests should be handled through support/legal operations until a product workflow exists.",
      sections: [
        { title: "1. Requests you can make", body: ["You can ask Tiketa to access, correct, delete, export, restrict, or object to processing of personal information where applicable law gives you that right. You can also ask for help unsubscribing from newsletters or clarifying reservation/order/ticket records.", "Use the Contact & Legal Information page and include the email address tied to your Tiketa account, relevant order/reservation/event/venue details, and the type of request."] },
        { title: "2. Identity verification", body: ["Tiketa may need to verify that you control the account email or have authority to act for the person whose data is involved. We may refuse or narrow requests that cannot be verified."] },
        { title: "3. Limits and exceptions", body: ["Some information may need to remain for payment reconciliation, fraud prevention, chargebacks, tax/accounting, legal compliance, event operations, reservation disputes, security logs, audit logs, Stripe webhook reconciliation, or platform integrity.", "Deleting an account may not automatically erase organizer event records, public venue listings, orders, tickets, reservations, validation logs, uploaded images, or legal/security records where retention is justified. Tiketa should define a formal retention schedule before launching a mature deletion workflow."] },
        { title: "4. Newsletter unsubscribe", body: ["Newsletter emails include signed unsubscribe links. Tiketa stores subscription status, language, source, subscribed/unsubscribed timestamps, IP address, and user agent for subscription lifecycle and compliance records."] },
        { title: "5. Timing", body: ["Tiketa should respond within the time required by applicable law after a verified request is received. Complex requests or legally limited requests may take longer or receive a scoped response."] },
      ],
      cta: { title: "Start a request", body: "Use the legal contact page and choose the privacy/data request route.", primary: ["Contact Legal", "/legal-contact"], secondary: ["GDPR Information", "/gdpr-information"] },
    },
    "legal.gdpr": {
      title: "GDPR Information",
      subtitle: "Additional information for people in the EEA, UK, and similar privacy jurisdictions.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      sections: [
        { title: "1. Roles", body: ["Tiketa generally acts as a controller for account, platform, ticketing, reservation, support, security, newsletter, and payment metadata it decides to collect and use. Organizers and venue owners may also act as independent controllers for how they use attendee or guest data outside Tiketa's platform operations.", "Service providers such as hosting, payment, email, storage, CDN, and logging providers may act as processors or independent controllers depending on the service and their terms."] },
        { title: "2. Categories of data", body: ["Tiketa processes account data, contact data, billing and order data, attendee data, ticket and QR/check-in data, reservation data, venue and organizer data, uploaded content metadata, newsletter data, browser storage data, session data, operational logs, email delivery metadata, audit logs, and payment metadata."] },
        { title: "3. Lawful bases", body: ["Contract: to provide accounts, checkout, tickets, reservations, dashboards, organizer tools, venue owner tools, scanner workflows, receipts, and support.", "Legitimate interests: to secure the platform, prevent fraud, maintain logs, operate notifications, troubleshoot, improve reliability, enforce rules, and support organizers/venues.", "Consent: for newsletter/marketing communications where required. Legal obligation: for tax, accounting, payment, dispute, safety, regulatory, and legal-response needs."] },
        { title: "4. Recipients and transfers", body: ["Data may be shared with organizers, venue owners, scanners, admins, Stripe, email providers, Supabase/S3-compatible storage, Railway, Cloudflare, CDNs, Google Maps/Fonts, logging providers, support personnel, and legal authorities where appropriate.", "These providers may process data outside your country. Tiketa should confirm final subprocessors and transfer safeguards before publishing a final production privacy program."] },
        { title: "5. Retention", body: ["The audited application does not define a comprehensive retention schedule. Records generally remain until deleted, soft-deleted, cancelled, replaced, or handled by admin/support processes. Daily Laravel logs are configured for 14 days when that channel is used. Email bodies were intentionally removed from email logs.", "A formal retention matrix should be completed for accounts, orders, tickets, reservations, validation logs, audit logs, newsletter records, Stripe webhook events, and uploads."] },
        { title: "6. Your rights", body: ["Depending on your location, you may have rights to access, correct, delete, export, restrict, object, withdraw consent, and complain to a supervisory authority. These rights may be limited by legal, payment, fraud, security, tax, dispute, or operational needs.", "Use the Data Deletion & Privacy Requests page to start a verified request."] },
        { title: "7. Automated decision-making", body: ["The audit did not find automated legal or similarly significant decision-making. Tiketa does store operational statuses such as organizer approval, event status, payment status, fraud status fields, reservation status, ticket validation result, and account status."] },
      ],
      cta: { title: "Exercise a privacy right", body: "Start with the privacy request page so Tiketa can verify and route your request.", primary: ["Privacy Requests", "/data-deletion-privacy-requests"] },
    },
    "legal.contact": {
      title: "Contact & Legal Information",
      subtitle: "Where to send Tiketa support, privacy, refund, organizer, venue owner, copyright, and legal requests.",
      eyebrow: "Legal",
      updated: "Last updated: August 3, 2026",
      cards: [
        { icon: "bi-envelope", title: "General support", body: "support@tiketa.example" },
        { icon: "bi-shield-lock", title: "Privacy and data", body: "privacy@tiketa.example" },
        { icon: "bi-cash-coin", title: "Refund questions", body: "refunds@tiketa.example" },
        { icon: "bi-calendar-event", title: "Organizer support", body: "organizers@tiketa.example" },
        { icon: "bi-shop", title: "Restaurant partners", body: "partners@tiketa.example" },
        { icon: "bi-c-circle", title: "Copyright notices", body: "legal@tiketa.example" },
      ],
      sections: [
        { title: "What to include", body: ["For ticket or refund requests, include your account email, event name, order number if available, ticket type, and screenshots of any error.", "For reservations, include venue name, reservation date/time, guest name, account email, and the issue.", "For privacy requests, include the account email and the specific right or data category involved. For copyright notices, include the information required by the Copyright & Takedown Policy."] },
        { title: "Response expectations", body: ["Support timing depends on the type and urgency of the request. Event-day ticket access, payment issues, privacy requests, and legal notices may require different review paths.", "Tiketa may ask for identity verification, additional evidence, or confirmation that you are authorized to act for an account, attendee, guest, organizer, or rights holder."] },
        { title: "Legal notice", body: ["Email contact is the current documented route in the frontend. Tiketa should add a production legal entity name, mailing address, registered agent or local legal contact, and final support SLAs before final publication."] },
      ],
      cta: { title: "Prefer policy context first?", body: "Review the privacy and terms pages before sending a legal request.", primary: ["Privacy Policy", "/privacy-policy"], secondary: ["Terms", "/terms-of-service"] },
    },
  };

  const legalSq = {
    "event.terms": {
      title: "Kushtet e Shërbimit",
      subtitle: "Rregullat për përdorimin e Tiketa për evente, bileta, rezervime dhe mjetet për organizatorë, pronarë venue-sh, skanerë dhe administratorë.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      notice: "Këto kushte pasqyrojnë implementimin aktual të Tiketa. Disa procese, si fshirja vetëshërbyese e llogarisë dhe afatet formale të ruajtjes, trajtohen përmes mbështetjes derisa të shtohen rrjedha të dedikuara në produkt.",
      sections: [
        { title: "1. Shërbimi i Tiketa", body: ["Tiketa ofron një platformë web për zbulim eventesh, blerje biletash, dorëzim biletash QR, check-in, operime për organizatorë, rezervime restorantesh dhe venue-sh, mjete për pronarë venue-sh, njoftime dhe menaxhim llogarie.", "Tiketa nuk është organizatori i çdo eventi dhe nuk operon çdo venue në platformë. Organizatorët dhe pronarët e venue-ve janë përgjegjës për saktësinë, ligjshmërinë, sigurinë dhe realizimin e eventeve, listimeve, profileve, disponueshmërisë, rregullave dhe përmbajtjes së ngarkuar."] },
        { title: "2. Llogaritë dhe përshtatshmëria", body: ["Llogaria kërkohet për checkout, dashboard-e, rezervime, mjete organizatori, mjete pronari venue, skaner dhe zona administrimi. Regjistrimi kërkon email dhe fjalëkalim. Emri, telefoni, qyteti i parazgjedhur, roli i kërkuar dhe gjuha mund të ruhen gjithashtu.", "Tiketa mbështet role përdoruesi, organizatori, pronari venue, skaneri dhe administratori. Organizatorët mund të kenë nevojë për miratim. Duhet të përdorni të dhëna të sakta dhe të mbroni fjalëkalimin, pajisjet dhe sesionin tuaj."] },
        { title: "3. Verifikimi dhe siguria", body: ["Tiketa mund të kërkojë verifikim emaili para rezervimeve dhe mjeteve të venue-ve. Email-et për reset fjalëkalimi dhe siguri llogarie dërgohen nga sistemi i email-it të Tiketa.", "Tiketa përdor autentikim me bearer token përmes Laravel Sanctum. Frontendi ruan tokenin dhe profilin e përdoruesit në localStorage që aplikacioni t'ju mbajë të kyçur. Përdoreni Tiketa vetëm në pajisje të besueshme."] },
        { title: "4. Blerjet e biletave", body: ["Kur blini bileta, Tiketa ruan porosinë, kontaktet e faturimit, artikujt e biletave, të dhënat e pjesëmarrësve, shumat, tarifat, monedhën, statusin e checkout-it dhe historikun e blerjeve. Email-i, emri dhe mbiemri i faturimit, si dhe emri/email-i i pjesëmarrësit për çdo biletë, janë të detyrueshme.", "Ju duhet të keni të drejtë të jepni të dhëna për pjesëmarrës të tjerë. Biletat mund të kufizohen nga limiti i eventit, periudhat e shitjes, politikat e organizatorit dhe disponueshmëria."] },
        { title: "5. Pagesat", body: ["Backend-i i Tiketa mbështet Stripe Checkout. Kur Stripe Checkout është aktiv, Tiketa i dërgon Stripe email-in e faturimit dhe metadata të porosisë për të krijuar dhe pajtuar sesionet e pagesës. Tiketa ruan ofruesin e pagesës, referencat, ID-të e Stripe, statuset dhe rekordet e webhook-ut.", "Frontendi aktual përfshin një rrjedhë lokale/mock për përfundimin e checkout-it. Fushat vizuale të kartës në faqen checkout nuk dërgohen nga JavaScript-i aktiv. Tiketa nuk mbledh qëllimisht numra karte, CVC ose skadencë karte në API-në e saj."] },
        { title: "6. Biletat QR dhe hyrja", body: ["Porositë e paguara krijojnë bileta QR me kode, UUID të brendshme, tokenë QR, të dhëna pjesëmarrësi, datë lëshimi, shkarkime dhe status check-in. QR payload përmban identifikues të brendshëm dhe token, jo emrin, email-in apo telefonin e pjesëmarrësit.", "Biletat QR janë kredenciale që duhen mbajtur private. Kushdo që paraqet një QR të vlefshëm mund të kërkojë hyrje derisa bileta të përdoret, anulohet ose rimbursohet. Organizatorët, skanerët dhe administratorët mund të validojnë bileta dhe të ruajnë aktivitetin e check-in."] },
        { title: "7. Rezervimet", body: ["Tiketa mbështet kërkesa rezervimi për përdorues të kyçur dhe me email të verifikuar. Rezervimet ruajnë venue-n, llogarinë, emrin e mysafirit nga llogaria, telefon opsional, numrin e personave, datën, orën, statusin, shënimet, rastin, anulimet, no-show, përfundimin dhe kohët.", "Dërgimi i kërkesës nuk garanton tavolinë derisa venue ta konfirmojë. Mysafirët duhet të japin të dhëna të sakta dhe të mos vendosin informacione të ndjeshme në shënime."] },
        { title: "8. Rolet operative", body: ["Organizatorët menaxhojnë evente, bileta, inventar, imazhe, pjesëmarrës, porosi, pagesa, analitika, skanerë dhe log-e check-in për eventet e tyre. Pronarët e venue-ve menaxhojnë profile, imazhe, fasilitete, kuzhina, opsione pagese, orare, data bllokimi, rezervime dhe analitika. Skanerët validojnë biletat e eventeve të caktuara. Administratorët kanë qasje më të gjerë për operime, mbështetje dhe moderim.", "Çdo rol duhet t'i përdorë të dhënat operative vetëm për qëllime të ligjshme të lidhura me Tiketa."] },
        { title: "9. Përmbajtja e ngarkuar", body: ["Organizatorët dhe pronarët mund të ngarkojnë imazhe dhe tekst listimi. Imazhet mund të ruhen në storage publik lokal ose Supabase/S3 dhe të shfaqen publikisht. Tiketa ruan metadata teknike aty ku është implementuar.", "Duhet të zotëroni ose të keni leje për përmbajtjen që ngarkoni. Me ngarkimin, i jepni Tiketa leje ta hostojë, ruajë, kopjojë, shfaqë, publikojë dhe përdorë për të operuar eventin, venue-n ose platformën."] },
        { title: "10. Sjellje e ndaluar", body: ["Nuk lejohet përdorimi i Tiketa për evente mashtruese, rezervime false, përmbajtje të paligjshme, scraping, ndërhyrje në inventar, abuzim pagesash, testim sigurie pa leje, spam, ngacmim, impersonim, mbledhje të dhënash ose keqpërdorim të të dhënave të pjesëmarrësve/mysafirëve.", "Tiketa mund të heqë përmbajtje, të refuzojë evente, të çpublikojë listime, të pezullojë llogari, të anulojë porosi të papaguara ose të ndërmarrë hapa të arsyeshëm për mbrojtjen e platformës."] },
        { title: "11. Ndryshime dhe përgjegjësi", body: ["Tiketa mund të ndryshojë, pezullojë ose ndërpresë veçori, faqe, ofrues ose rrjedha pune ndërsa produkti zhvillohet. Platforma varet nga ofrues të palëve të treta për hosting, email, storage, pagesa, CDN, harta/font-e dhe log-e.", "Në masën e lejuar nga ligji, Tiketa nuk mban përgjegjësi për operimet e kontrolluara nga organizatorët, vendimet e venue-ve, ndërprerjet e palëve të treta ose të dhënat e pasakta të dhëna nga përdoruesit."] },
        { title: "12. Kontakt", body: ["Për mbështetje, njoftime ligjore, kërkesa privatësie, rimbursime, çështje organizatori/venue ose copyright, përdorni faqen Kontakt & Informacion Ligjor."] },
      ],
      cta: { title: "Keni nevojë për kontakt ligjor?", body: "Përdorni faqen e kontaktit ligjor për kërkesa privatësie, rimbursimi, copyright dhe platforme.", primary: ["Kontakto Tiketa", "/legal-contact"], secondary: ["Privatësia", "/privacy-policy"] },
    },
    "event.privacy": {
      title: "Politika e Privatësisë",
      subtitle: "Si Tiketa mbledh, përdor, ndan, ruan dhe mbron informacionin në bileta, rezervime, dashboard-e, pagesa, njoftime dhe mbështetje.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      notice: "Në kodin e audituar nuk u gjet reklamim sjellor ose tracking analitik i palëve të treta. Nëse shtohen më vonë, kjo politikë duhet të përditësohet para aktivizimit.",
      sections: [
        { title: "1. Informacioni që mbledhim", body: ["Të dhënat e llogarisë përfshijnë email, hash fjalëkalimi, emër, rol, telefon, avatar URL, qytet, gjuhë të preferuar, preferenca njoftimesh, status organizatori, status llogarie, verifikim emaili, login të fundit dhe kohë krijimi/përditësimi.", "Të dhënat e biletave përfshijnë porosi, faturim, artikuj biletash, pjesëmarrës, kode bilete, identifikues QR, status pagese, rezervime checkout-i, historik blerjeje, fatura, shkarkime dhe check-in.", "Të dhënat e rezervimeve përfshijnë venue, llogari, emër mysafiri, telefon opsional, numër personash, datë/orë, status, shënime, rast, anulime/no-show/përfundime dhe kohë. Newsletter-i ruan email, burim, gjuhë, status, kohë abonimi/çabonimi, IP dhe user agent."] },
        { title: "2. Pajisje dhe browser storage", body: ["Tiketa mund të përpunojë IP, user agent, sesione, log-e operative, audit log-e, log-e email-i, log-e validimi biletash dhe Stripe webhook payloads. Browser storage përdoret për token autentikimi, profil të ruajtur, checkout/cart, porosinë e fundit, gjuhë, temë, njoftime dhe favorites.", "Cookie-t dhe mekanizmat Laravel/Sanctum/CSRF mund të përdoren sipas mjedisit dhe mënyrës së autentikimit."] },
        { title: "3. Si i përdorim të dhënat", body: ["I përdorim për llogari, verifikim emaili, autentikim, porosi, inventar biletash, QR, email-e porosie/rezervimi/llogarie, dashboard-e, validim biletash, evidencë pjesëmarrjeje, rezervime, mjete pronari/organizatori/admini, mbështetje, siguri, parandalim abuzimi dhe pajtim pagesash.", "Të dhënat e newsletter-it përdoren për abonim dhe çabonim. Log-et operative përdoren për diagnostikim, siguri dhe besueshmëri."] },
        { title: "4. Pagesat dhe Stripe", body: ["Backend-i i Tiketa mbështet Stripe Checkout. Tiketa i dërgon Stripe email-in e faturimit dhe metadata të porosisë për të krijuar sesionin. Tiketa ruan referenca pagese, ID të Stripe, status dhe webhook records.", "Tiketa nuk ruan qëllimisht numra karte, CVC ose skadencë karte në API. Frontendi aktual ka edhe rrjedhë lokale/mock, ndërsa backend-i ka rrjedhë të implementuar për Stripe Checkout."] },
        { title: "5. Ndarja dhe qasja sipas rolit", body: ["Organizatorët shohin të dhëna operative për eventet e tyre: porosi, pjesëmarrës, bileta, pagesa, analitika, check-in dhe validime. Pronarët e venue-ve shohin rezervimet dhe të dhënat e mysafirëve për venue-t që menaxhojnë. Skanerët përdorin rrjedhat e validimit për eventet e caktuara. Administratorët kanë qasje më të gjerë për operime, mbështetje, moderim, pagesa dhe siguri.", "Të dhënat mund të ndahen me Stripe, ofrues email-i si Resend/Postmark/SES, Supabase/S3, Railway, Cloudflare, jsDelivr, Google Fonts/Maps dhe ofrues log-esh ose njoftimesh si Papertrail/Slack kur janë të konfiguruar."] },
        { title: "6. Përmbajtja e ngarkuar", body: ["Imazhet e eventeve dhe venue-ve mund të shfaqen publikisht dhe të ruhen në storage publik lokal ose Supabase/S3. Metadata si emri origjinal, MIME type, madhësia, dimensionet, path, disk, alt text dhe sort order mund të ruhen.", "Mos ngarkoni imazhe private, të ndjeshme, shkelëse, mashtruese ose të paligjshme."] },
        { title: "7. Ruajtja", body: ["Kodi i audituar nuk përcakton një afat të përgjithshëm ruajtjeje për llogari, porosi, bileta, rezervime, log-e validimi, audit log-e, newsletter, Stripe webhook ose uploads. Rekordet zakonisht mbeten derisa të fshihen, anulohen, soft-delete ose trajtohen nga admin/mbështetja. Trupat e email-eve janë hequr qëllimisht nga email logs.", "Laravel daily logs janë të konfiguruara për 14 ditë kur përdoret ai kanal. Tiketa duhet të përcaktojë një plan formal ruajtjeje."] },
        { title: "8. Zgjedhjet dhe të drejtat tuaja", body: ["Mund të përditësoni profilin, gjuhën, preferencat e njoftimeve dhe disa të dhëna në dashboard. Mund të çabonoheni nga newsletter me link të nënshkruar. Meqë nuk u gjet rrugë vetëshërbyese për fshirje llogarie, kërkesat për fshirje, akses, korrigjim, kufizim ose eksport duhet të bëhen përmes faqes Data Deletion & Privacy Requests.", "Disa rekorde mund të ruhen për siguri, mashtrim, pagesa, taksa, ligj, mosmarrëveshje ose integritet platforme."] },
        { title: "9. Siguria", body: ["Tiketa përdor kontrolle rolesh, llogari aktive, miratim organizatori, verifikim emaili, rate limits, linke të nënshkruara, verifikim Stripe webhook, security headers, CORS, cookie të sigurta në prodhim, hashim tokenësh QR dhe maskim identifikuesish QR.", "Mbroni kredencialet dhe biletat QR dhe na kontaktoni nëse dyshoni për qasje të paautorizuar."] },
        { title: "10. Fëmijët dhe të miturit", body: ["Aplikacioni i audituar nuk ka age gate ose rrjedhë të pëlqimit prindëror. Tiketa duhet të përcaktojë një moshë minimale para publikimit final. Deri atëherë, mos jepni të dhëna për të mitur pa autoritet të përshtatshëm."] },
        { title: "11. Transferime ndërkombëtare dhe GDPR", body: ["Tiketa mund të përdorë ofrues jashtë vendit tuaj për pagesa, email, hosting, storage, CDN, harta/font-e dhe log-e. Nëse jeni në EEA, UK ose juridiksione të ngjashme, shihni faqen GDPR Information."] },
        { title: "12. Kontakt", body: ["Përdorni faqen Kontakt & Informacion Ligjor për privatësi, GDPR, fshirje, akses, siguri dhe pyetje ligjore."] },
      ],
      cta: { title: "Menaxhoni një kërkesë privatësie", body: "Përdorni faqen e kërkesave për akses, fshirje, korrigjim, eksport ose kundërshtim.", primary: ["Kërkesa Privatësie", "/data-deletion-privacy-requests"], secondary: ["GDPR", "/gdpr-information"] },
    },
  };

  Object.assign(legalSq, {
    "event.cookies": {
      title: "Politika e Cookies dhe Browser Storage",
      subtitle: "Si Tiketa përdor cookies, localStorage dhe sessionStorage për autentikim, preferenca, checkout, njoftime dhe siguri.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      sections: [
        { title: "1. Përmbledhje", body: ["Tiketa përdor browser storage kryesisht për funksione thelbësore dhe preferenca. Auditi nuk gjeti PostHog, Sentry, Mixpanel, Google Analytics, Meta Pixel ose tracking të ngjashëm sjellor.", "Nëse shtohen cookies analitike më vonë, kjo politikë duhet të përditësohet para aktivizimit."] },
        { title: "2. Cookies dhe sesionet", body: ["Laravel session dhe mekanizmat CSRF/Sanctum mund të krijojnë cookies sipas mjedisit. Rekordet e sesionit mund të përfshijnë ID sesioni, user ID, IP, user agent, payload dhe aktivitet të fundit. Në prodhim, konfigurimi mbështet secure, HttpOnly, same-site dhe enkriptim kur aktivizohet.", "Renderimi server-side mund të lexojë cookie preferred_language nëse ekziston, ndërsa preferenca kryesore e gjuhës ruhet në localStorage."] },
        { title: "3. localStorage", body: ["Tiketa ruan event_sphere_token, event_sphere_user, preferred_language, temën, cache të njoftimeve dhe fallback favorites në localStorage.", "Këto ndihmojnë qëndrimin e kyçur, navigimin sipas llogarisë, gjuhën/temën dhe sjelljen e dashboard-it. Meqë localStorage vazhdon pas mbylljes së browser-it, dilni nga llogaria në pajisje të përbashkëta."] },
        { title: "4. sessionStorage", body: ["Tiketa ruan event_sphere_cart, event_sphere_last_order_id dhe mund të migrojë çelësa të vjetër autentikimi nga sessionStorage në localStorage.", "sessionStorage zakonisht pastrohet kur mbyllet sesioni ose tab-i, por sjellja varet nga browser-i."] },
        { title: "5. Thelbësore dhe opsionale", body: ["Autentikimi, CSRF/session, cart, checkout dhe siguria janë thelbësore. Gjuha, tema, njoftimet dhe favorites janë preferenca ose komoditet. Çaktivizimi i storage thelbësor mund të pengojë login, checkout, dashboard-e, QR bileta ose rezervime."] },
        { title: "6. Menaxhimi", body: ["Mund të pastroni cookies, localStorage dhe sessionStorage në browser. Kjo mund t'ju nxjerrë nga llogaria, të heqë cart-in, të rivendosë preferencat dhe të kërkojë kyçje të re."] },
      ],
      cta: { title: "Shihni lidhjen me privatësinë", body: "Politika e Privatësisë shpjegon të dhënat personale të lidhura me këto rekorde.", primary: ["Privatësia", "/privacy-policy"] },
    },
    "event.refund": {
      title: "Politika e Rimbursimeve dhe Anulimeve",
      subtitle: "Si Tiketa trajton rimbursimet e biletave, ndryshimet e eventeve, checkout-et e skaduara, Stripe refunds, rezervimet, anulimet dhe no-show.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      notice: "Kodi ruan politika refund në nivel eventi, status pagese/rimbursimi, statuse rezervimi dhe rekorde anulimi/no-show. Nuk u gjet një rregull universal automatik rimbursimi.",
      sections: [
        { title: "1. Blerjet e biletave", body: ["Biletat zakonisht varen nga detajet e eventit, politika e organizatorit dhe ligji i zbatueshëm. Organizatorët janë përgjegjës për informacionin, venue-n, datat, llojet e biletave, rregullat e hyrjes dhe refund terms.", "Tiketa ruan porosi, bileta, pagesa dhe pjesëmarrës për konfirmim, QR, fatura dhe mbështetje."] },
        { title: "2. Tarifat", body: ["Porositë mund të përfshijnë subtotal, service fee, refund protection fee nëse përdoret, zbritje, taksa, total dhe monedhë. Përqindjet e service fee mund të konfigurohen nga adminët për event. Rimbursimi i tarifave varet nga politika e eventit, ofruesi i pagesës dhe ligji."] },
        { title: "3. Evente të anuluara ose ndryshuara", body: ["Nëse eventi anulohet, shtyhet ose ndryshon ndjeshëm, Tiketa mund të përdorë email-e anulimi dhe njoftime për përdoruesit. E drejta për rimbursim varet nga udhëzimet e organizatorit, politika e eventit, statusi i pagesës dhe ligji.", "Biletat për evente të anuluara, të përfunduara ose të papublikuara mund të bllokohen nga validimi/check-in."] },
        { title: "4. Stripe dhe pagesa lokale/mock", body: ["Për porositë Stripe, rimbursimet e miratuara përpunohen përmes Stripe dhe Tiketa ruan ID-në e refund-it dhe kohën. Afatet bankare mund të ndryshojnë.", "Aplikacioni aktual përfshin edhe rrjedha lokale/mock. Ato krijojnë porosi të paguara dhe bileta në rrjedhën ekzistuese, por nuk përfaqësojnë një pagesë live me kartë në API-në e Tiketa."] },
        { title: "5. Checkout i dështuar ose i skaduar", body: ["Checkout reservations mbajnë inventarin për një periudhë të shkurtër. Nëse checkout skadon, dështon ose anulohet para pagesës, Tiketa mund të lirojë inventarin dhe të shënojë statusin përkatës. Dritarja default është pesë minuta."] },
        { title: "6. Rezervime dhe no-show", body: ["Rezervimet janë kërkesa derisa venue t'i konfirmojë. Mysafirët duhet të anulojnë sa më herët. Pronarët dhe adminët mund të konfirmojnë, anulojnë, përfundojnë, rikthejnë, fshijnë ose shënojnë no-show sipas rrjedhave aktuale.", "Arsyet e anulimit dhe shënimet e pronarit mund të ruhen. No-show dhe përfundimet mund të mbeten në historik."] },
        { title: "7. Si të kërkoni ndihmë", body: ["Kontaktoni Tiketa me email-in e llogarisë, numrin e porosisë nëse ekziston, eventin ose venue-n, datën/orën e rezervimit nëse ka dhe një përshkrim të shkurtër."] },
      ],
      cta: { title: "Keni pyetje për rimbursim?", body: "Dërgoni detajet e porosisë, eventit ose rezervimit.", primary: ["Kontakto Mbështetjen", "/legal-contact"] },
    },
  });

  Object.assign(legalSq, {
    "legal.organizerTerms": {
      title: "Kushtet për Organizatorë",
      subtitle: "Përgjegjësitë operative dhe ligjore për organizatorët që përdorin Tiketa për evente, bileta, pjesëmarrës dhe check-in.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      sections: [
        { title: "1. Qasja si organizator", body: ["Roli i organizatorit mund të kërkohet gjatë regjistrimit, por mund të mbetet në pritje derisa Tiketa ta miratojë. Mjetet e organizatorit janë të disponueshme vetëm për llogari aktive dhe të miratuara, ose për administratorë.", "Tiketa mund të refuzojë, pezullojë, çpublikojë ose kufizojë qasjen kur eventet, përmbajtja, pagesat, siguria e përdoruesve ose integriteti i platformës krijojnë risk."] },
        { title: "2. Listimet e eventeve", body: ["Organizatorët janë përgjegjës për titullin, përshkrimin, kategorinë, datën, orën, zonën kohore, venue-n, qytetin, shtetin, adresën, statusin, dukshmërinë, llojet e biletave, inventarin, limitet, çmimet, monedhën, refund policy dhe imazhet.", "Mos publikoni evente mashtruese, inventar të padisponueshëm, evente të paligjshme, venue false, rregulla hyrjeje të pasakta ose imazhe pa të drejta përdorimi."] },
        { title: "3. Biletat, pjesëmarrësit dhe check-in", body: ["Tiketa ruan pjesëmarrës, porosi, bileta, identifikues QR, status bilete, shkarkime, check-in dhe log-e validimi. Organizatorët mund të shohin informacionin për eventet e tyre.", "Stafi i organizatorit dhe skanerët e caktuar duhet t'i përdorin këto të dhëna vetëm për operimin e eventit, hyrjen, sigurinë, mbështetjen, rimbursimet dhe pajtueshmërinë ligjore."] },
        { title: "4. Pagesa, rimbursime dhe anulime", body: ["Backend-i i Tiketa mbështet Stripe Checkout dhe ruan metadata pagese për pajtim. Organizatorët duhet të respektojnë kushtet e rimbursimit, komunikimet e anulimit dhe detyrimet ligjore.", "Nëse eventi anulohet ose ndryshon ndjeshëm, organizatori duhet të përditësojë rekordet dhe të bashkëpunojë me mbështetjen për njoftim dhe shqyrtim rimbursimi."] },
        { title: "5. Licenca e përmbajtjes", body: ["Duke ngarkuar imazhe ose përmbajtje eventi, organizatori konfirmon se ka të drejtat e nevojshme dhe i jep Tiketa leje ta hostojë, ruajë, përpunojë, shfaqë, publikojë, ndryshojë madhësinë dhe përdorë për faqen e eventit, marketplace, email, SEO, mbështetje dhe promovim platforme.", "Tiketa mund të heqë ose zëvendësojë përmbajtje që duket shkelëse, mashtruese, e pasigurt ose jashtë standardeve të platformës."] },
        { title: "6. Skanerët", body: ["Organizatorët dhe administratorët mund të caktojnë qasje skaneri për check-in. Skanerët mund të validojnë bileta dhe të krijojnë log-e me rezultat, metodë, kohë, skaner, event/biletë, IP, user agent, pjesëmarrës, identifikues QR të maskuar dhe hash tokeni."] },
        { title: "7. Pajtueshmëria", body: ["Organizatorët duhet të respektojnë ligjet për bileta, konsumatorë, taksa, siguri eventi, kufizime moshe, aksesueshmëri, privatësi, anti-spam, venue dhe rregulla lokale. Tiketa ofron mjete platforme, jo miratim ligjor të eventit."] },
      ],
      cta: { title: "Politika të lidhura", body: "Përgjegjësitë e organizatorit lidhen edhe me përdorimin e pranueshëm, rimbursimet, privatësinë dhe copyright.", primary: ["Përdorimi i Pranueshëm", "/acceptable-use-content-policy"], secondary: ["Copyright", "/copyright-takedown-policy"] },
    },
    "legal.venueOwnerTerms": {
      title: "Kushtet për Pronarë Restorantesh / Venue",
      subtitle: "Përgjegjësitë për restorante, bare, lounge, kafene dhe ekipe venue-sh që përdorin Tiketa për rezervime.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      sections: [
        { title: "1. Qasja e pronarit", body: ["Rrjedhat e pronarit të venue-s janë për llogari aktive owner me email të verifikuar. Pronarët menaxhojnë venue-t e tyre, ndërsa administratorët mund të menaxhojnë venue në gjithë platformën.", "Pronarët janë përgjegjës për saktësinë e profileve, kontakteve, disponueshmërisë, rregullave të rezervimit dhe imazheve publike."] },
        { title: "2. Profilet e venue-ve", body: ["Profili mund të përfshijë emër, slug, tip, përshkrim, telefon, email, website, adresë, qytet, shtet, koordinata, logo, status, featured flag, limite mysafirësh, interval rezervimi, maksimum rezervimesh për slot, booking horizon, orar të fundit rezervimi, rrjete sociale, fasilitete, kuzhina, opsione pagese, orare, orare speciale, blackout dates dhe imazhe.", "Të dhënat dhe imazhet publike mund të shfaqen në faqet e restoranteve dhe në sipërfaqet e zbulimit të Tiketa."] },
        { title: "3. Menaxhimi i rezervimeve", body: ["Rezervimet ruajnë emrin e mysafirit nga llogaria, telefon opsional, numër personash, datë/orë, status, shënime, rast, anulime, no-show, përfundim dhe kohë. Pronarët mund të shohin dhe menaxhojnë rezervimet për venue-t e tyre.", "Pronarët duhet të konfirmojnë, anulojnë, përfundojnë dhe shënojnë no-show me saktësi dhe në kohë. Kur rezervimi nuk mund të nderohet, duhet të jepet arsye e qartë."] },
        { title: "4. Të dhënat e mysafirëve", body: ["Të dhënat e mysafirëve mund të përdoren vetëm për menaxhim rezervimi, përgatitje shërbimi, komunikim për booking-un, zgjidhje mbështetjeje, pajtueshmëri ligjore ose mbrojtje të venue-s dhe platformës. Nuk duhet të shiten ose përdoren për marketing të palidhur pa njoftim dhe leje të përshtatshme."] },
        { title: "5. Përmbajtja e ngarkuar", body: ["Imazhet e venue-ve mund të ruhen në storage publik lokal ose Supabase/S3. Pronarët duhet të ngarkojnë vetëm imazhe që kanë të drejtë t'i përdorin dhe që përfaqësojnë saktë përvojën e venue-s.", "Me ngarkimin, pronarët i japin Tiketa leje ta hostojë, ruajë, përpunojë, shfaqë, publikojë dhe përdorë për faqe venue, zbulim, rezervime, mbështetje, SEO dhe promovim platforme."] },
        { title: "6. Pajtueshmëria dhe zbatimi", body: ["Pronarët janë përgjegjës për rregullat e mikpritjes, rezervimeve, konsumatorëve, privatësisë, aksesueshmërisë, ushqimit/pijeve, kufizimeve të moshës dhe ligjit lokal. Tiketa mund të çaktivizojë, heqë ose modifikojë listime kur kërkohet për saktësi, siguri, ligj ose integritet platforme."] },
      ],
      cta: { title: "Rregullat e rezervimeve", body: "Shihni politikën e rimbursimeve dhe anulimeve për anulime rezervimi dhe no-show.", primary: ["Rimbursime dhe Anulime", "/refund-policy"] },
    },
    "legal.acceptableUse": {
      title: "Politika e Përdorimit dhe Përmbajtjes",
      subtitle: "Rregulla për përdorim të sigurt, të saktë dhe ligjor të Tiketa.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      sections: [
        { title: "1. Saktësi dhe ndershmëri", body: ["Mos krijoni llogari false, evente false, profile venue të rreme, rezervime false, inventar mashtrues, çmime të pasakta, refund terms të paqarta, detaje venue false ose organizata të imituara.", "Organizatorët dhe pronarët duhet t'i mbajnë detajet publike të sakta dhe të përditësuara."] },
        { title: "2. Përmbajtje e ndaluar", body: ["Nuk lejohet përmbajtje e paligjshme, shkelëse, shpifëse, urrejtëse, ngacmuese, shfrytëzuese, e papërshtatshme seksualisht, e dhunshme, mashtruese, spam, malware, invazive ndaj privatësisë ose e rrezikshme.", "Mos ngarkoni imazhe ose përshkrime pa të drejta përdorimi."] },
        { title: "3. Keqpërdorimi i platformës", body: ["Nuk lejohet scraping në shkallë, anashkalim rate limits, ndërhyrje në checkout reservations, manipulim inventari, sulm ndaj QR validation, testim sigurie pa leje, abuzim API, blerje automatike ose ndërprerje e platformës.", "Mos përdorni të dhënat e Tiketa për profilizim të paautorizuar, spam, shitje të të dhënave personale ose kontaktim të pjesëmarrësve/mysafirëve jashtë operimit legjitim."] },
        { title: "4. Pagesa, bileta dhe rezervime", body: ["Mos përdorni metoda pagese të vjedhura, pretendime mashtruese rimbursimi, bileta të pavlefshme, shpërndarje mashtruese QR, rezervime që nuk synoni t'i respektoni ose keqpërdorim të të dhënave.", "Tiketa mund të anulojë rekorde të papaguara ose të dështuara, të lirojë inventarin, të bllokojë bileta të pavlefshme dhe të ruajë aktivitet validimi."] },
        { title: "5. Zbatimi", body: ["Tiketa mund të heqë përmbajtje, refuzojë ose çpublikojë evente, çaktivizojë venue, pezullojë përdorues, kufizojë role, revokojë skanerë, ruajë rekorde për hetime ose kontaktojë autoritetet kur është e përshtatshme."] },
      ],
      cta: { title: "Raportoni keqpërdorim", body: "Dërgoni detaje të qarta, linke, screenshots dhe referenca llogarie ose porosie kur ka.", primary: ["Kontakt Ligjor", "/legal-contact"] },
    },
    "legal.copyright": {
      title: "Politika e Copyright dhe Takedown",
      subtitle: "Si Tiketa trajton pretendimet për imazhe, tekste listimi dhe përmbajtje të ngarkuar nga përdoruesit.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      sections: [
        { title: "1. Përmbajtje nga përdoruesit", body: ["Tiketa lejon organizatorët dhe pronarët e venue-ve të ngarkojnë imazhe dhe tekst publik. Personi që ngarkon përmbajtjen është përgjegjës të sigurojë pronësinë ose lejen.", "Imazhet mund të ruhen publikisht dhe të shfaqen në faqe, email-e, zbulim, SEO dhe rrjedha mbështetjeje."] },
        { title: "2. Licenca për Tiketa", body: ["Kur ngarkoni përmbajtje, i jepni Tiketa leje jo-ekskluzive dhe globale për ta hostuar, ruajtur, kopjuar, përpunuar, shfaqur, publikuar dhe përdorur për të operuar, përmirësuar, mbështetur dhe promovuar Tiketa, eventin ose venue-n.", "Ju mbani pronësinë e përmbajtjes, përveç nëse një marrëveshje tjetër thotë ndryshe."] },
        { title: "3. Raportimi i shkeljeve", body: ["Nëse besoni se përmbajtja në Tiketa shkel të drejtat tuaja, dërgoni njoftim me emrin, organizatën nëse ka, kontaktin, përshkrimin e veprës, URL-në ose vendndodhjen në Tiketa, deklarimin se përdorimi është i paautorizuar, deklarimin se njoftimi është i saktë dhe nënshkrimin tuaj fizik ose elektronik.", "Dërgojeni njoftimin përmes faqes Kontakt & Informacion Ligjor. Tiketa mund të kërkojë informacione shtesë."] },
        { title: "4. Përgjigjja dhe kundër-njoftimet", body: ["Tiketa mund të heqë, çaktivizojë ose kufizojë përmbajtje që duket shkelëse ose ligjërisht riskoze. Tiketa mund të njoftojë ngarkuesin dhe, kur është e përshtatshme, të lejojë kundër-njoftim.", "Shkeljet e përsëritura ose serioze mund të çojnë në kufizim llogarie, refuzim eventi, çaktivizim venue ose heqje të rolit."] },
        { title: "5. Pa vendim ligjor", body: ["Veprimet e Tiketa mbi një takedown notice nuk vendosin pronësinë apo të drejtat ligjore. Palët janë përgjegjëse t'i zgjidhin mosmarrëveshjet drejtpërdrejt ose përmes proceseve ligjore."] },
      ],
      cta: { title: "Dërgoni njoftim", body: "Përdorni kontaktin ligjor dhe përfshini informacionin e mësipërm.", primary: ["Kontakt Ligjor", "/legal-contact"] },
    },
    "legal.dataDeletion": {
      title: "Fshirja e të Dhënave dhe Kërkesat e Privatësisë",
      subtitle: "Si të kërkoni akses, korrigjim, fshirje, eksport, kundërshtim ose çabonim.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      notice: "Auditi nuk gjeti rrugë vetëshërbyese për fshirje llogarie ose eksport të dhënash. Kërkesat duhet të trajtohen nga mbështetja/operacionet ligjore derisa të ekzistojë rrjedhë produkti.",
      sections: [
        { title: "1. Çfarë mund të kërkoni", body: ["Mund të kërkoni akses, korrigjim, fshirje, eksport, kufizim ose kundërshtim të përpunimit kur ligji ju jep këtë të drejtë. Mund të kërkoni edhe ndihmë për çabonim ose sqarim të rekordeve të rezervimit, porosisë ose biletës.", "Përdorni faqen Kontakt & Informacion Ligjor dhe përfshini email-in e llogarisë, detajet relevante dhe llojin e kërkesës."] },
        { title: "2. Verifikimi i identitetit", body: ["Tiketa mund të kërkojë verifikim se kontrolloni email-in e llogarisë ose keni autoritet të veproni për personin përkatës. Kërkesat e paverifikueshme mund të refuzohen ose ngushtohen."] },
        { title: "3. Kufizime dhe përjashtime", body: ["Disa të dhëna mund të ruhen për pajtim pagesash, mashtrim, chargebacks, taksa/kontabilitet, ligj, operime eventi, mosmarrëveshje rezervimi, siguri, audit logs, Stripe webhook ose integritet platforme.", "Fshirja e llogarisë nuk do të thotë domosdoshmërisht fshirje automatike e eventeve, venue-ve, porosive, biletave, rezervimeve, log-eve të validimit, imazheve ose rekordeve ligjore/sigurie."] },
        { title: "4. Çabonimi", body: ["Newsletter-et përfshijnë linke të nënshkruara çabonimi. Tiketa ruan statusin, gjuhën, burimin, kohët e abonimit/çabonimit, IP dhe user agent për ciklin e abonimit dhe pajtueshmëri."] },
        { title: "5. Afatet", body: ["Tiketa duhet të përgjigjet brenda afateve të ligjit pasi kërkesa të verifikohet. Kërkesat komplekse ose të kufizuara ligjërisht mund të marrin më shumë kohë ose përgjigje të kufizuar."] },
      ],
      cta: { title: "Nisni një kërkesë", body: "Përdorni faqen e kontaktit ligjor dhe zgjidhni rrugën e privatësisë/të dhënave.", primary: ["Kontakt Ligjor", "/legal-contact"], secondary: ["GDPR", "/gdpr-information"] },
    },
    "legal.gdpr": {
      title: "Informacion GDPR",
      subtitle: "Informacion shtesë për persona në EEA, UK dhe juridiksione të ngjashme privatësie.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      sections: [
        { title: "1. Rolet", body: ["Tiketa zakonisht vepron si controller për të dhënat e llogarisë, platformës, biletave, rezervimeve, mbështetjes, sigurisë, newsletter-it dhe metadata të pagesës që vendos të mbledhë dhe përdorë. Organizatorët dhe pronarët e venue-ve mund të jenë controller të pavarur për përdorimin e të dhënave jashtë operimeve të Tiketa.", "Ofruesit e hosting-ut, pagesave, email-it, storage, CDN dhe log-eve mund të jenë processor ose controller të pavarur sipas shërbimit."] },
        { title: "2. Kategoritë e të dhënave", body: ["Tiketa përpunon të dhëna llogarie, kontakti, faturimi, porosie, pjesëmarrësish, bileta/QR/check-in, rezervimesh, venue/organizatori, metadata uploads, newsletter, browser storage, sesione, log-e operative, email metadata, audit logs dhe metadata pagese."] },
        { title: "3. Bazat ligjore", body: ["Kontratë: llogari, checkout, bileta, rezervime, dashboard-e, mjete organizatori/venue, skaner, fatura dhe mbështetje.", "Interes legjitim: siguri, parandalim mashtrimi, log-e, njoftime, diagnostikim, besueshmëri, zbatim rregullash dhe mbështetje për organizatorë/venue. Pëlqim: newsletter/marketing kur kërkohet. Detyrim ligjor: taksa, kontabilitet, pagesa, mosmarrëveshje, siguri dhe përgjigje ligjore."] },
        { title: "4. Marrësit dhe transferimet", body: ["Të dhënat mund të ndahen me organizatorë, pronarë venue, skanerë, administratorë, Stripe, email providers, Supabase/S3, Railway, Cloudflare, CDN, Google Maps/Fonts, log providers, mbështetje dhe autoritete kur duhet.", "Këta ofrues mund të përpunojnë të dhëna jashtë vendit tuaj. Tiketa duhet të konfirmojë subprocessors dhe masat e transferimit para programit final të privatësisë."] },
        { title: "5. Ruajtja", body: ["Aplikacioni i audituar nuk përcakton një plan të plotë ruajtjeje. Rekordet zakonisht mbeten derisa të fshihen, soft-delete, anulohen, zëvendësohen ose trajtohen nga admin/mbështetja. Daily logs janë 14 ditë kur përdoret ai kanal. Trupat e email-eve janë hequr nga email logs.", "Duhet të plotësohet një matricë ruajtjeje për llogari, porosi, bileta, rezervime, validation logs, audit logs, newsletter, Stripe webhook dhe uploads."] },
        { title: "6. Të drejtat tuaja", body: ["Sipas vendndodhjes, mund të keni të drejtë aksesi, korrigjimi, fshirjeje, eksporti, kufizimi, kundërshtimi, tërheqjeje pëlqimi dhe ankese te autoriteti mbikëqyrës. Këto mund të kufizohen nga nevoja ligjore, pagesash, mashtrimi, sigurie, taksash, mosmarrëveshjesh ose operacionale.", "Përdorni faqen Data Deletion & Privacy Requests për të nisur një kërkesë të verifikuar."] },
        { title: "7. Vendimmarrje automatike", body: ["Auditi nuk gjeti vendimmarrje automatike me efekt ligjor ose të ngjashëm. Tiketa ruan statuse operative si miratimi i organizatorit, status eventi, status pagese, fusha fraud status, status rezervimi, rezultat validimi dhe status llogarie."] },
      ],
      cta: { title: "Ushtroni një të drejtë privatësie", body: "Filloni nga faqja e kërkesave të privatësisë që Tiketa të verifikojë dhe routojë kërkesën.", primary: ["Kërkesa Privatësie", "/data-deletion-privacy-requests"] },
    },
    "legal.contact": {
      title: "Kontakt dhe Informacion Ligjor",
      subtitle: "Ku të dërgoni kërkesa për mbështetje, privatësi, rimbursime, organizatorë, venue, copyright dhe çështje ligjore.",
      eyebrow: "Ligjore",
      updated: "Përditësuar së fundi: 3 gusht 2026",
      cards: [
        { icon: "bi-envelope", title: "Mbështetje e përgjithshme", body: "support@tiketa.example" },
        { icon: "bi-shield-lock", title: "Privatësi dhe të dhëna", body: "privacy@tiketa.example" },
        { icon: "bi-cash-coin", title: "Rimbursime", body: "refunds@tiketa.example" },
        { icon: "bi-calendar-event", title: "Organizatorë", body: "organizers@tiketa.example" },
        { icon: "bi-shop", title: "Partnerë restorantesh", body: "partners@tiketa.example" },
        { icon: "bi-c-circle", title: "Njoftime copyright", body: "legal@tiketa.example" },
      ],
      sections: [
        { title: "Çfarë të përfshini", body: ["Për bileta ose rimbursime, përfshini email-in e llogarisë, eventin, numrin e porosisë nëse ekziston, llojin e biletës dhe screenshots të gabimit.", "Për rezervime, përfshini venue-n, datën/orën, emrin e mysafirit, email-in e llogarisë dhe çështjen.", "Për privatësi, përfshini email-in e llogarisë dhe të drejtën ose kategorinë e të dhënave. Për copyright, përfshini informacionin e kërkuar në politikën e takedown."] },
        { title: "Pritshmëritë e përgjigjes", body: ["Koha varet nga lloji dhe urgjenca e kërkesës. Qasja në bileta ditën e eventit, pagesat, kërkesat e privatësisë dhe njoftimet ligjore mund të kenë rrugë të ndryshme shqyrtimi.", "Tiketa mund të kërkojë verifikim identiteti, prova shtesë ose konfirmim se jeni i autorizuar të veproni për një llogari, pjesëmarrës, mysafir, organizator ose mbajtës të të drejtave."] },
        { title: "Njoftim ligjor", body: ["Kontakti me email është rruga aktuale e dokumentuar në frontend. Tiketa duhet të shtojë emrin ligjor të entitetit, adresën postare, agjentin e regjistruar ose kontaktin lokal dhe SLA-të finale para publikimit përfundimtar."] },
      ],
      cta: { title: "Dëshironi kontekst policy fillimisht?", body: "Lexoni privatësinë dhe kushtet para një kërkese ligjore.", primary: ["Privatësia", "/privacy-policy"], secondary: ["Kushtet", "/terms-of-service"] },
    },
  });

  Object.assign(en, legalEn);
  Object.assign(sq, legalSq);

  const pages = { en, sq };
  const defaultEventSocialImage =
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80";
  const defaultDiningSocialImage =
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80";

  function esc(value) {
    return String(value || "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  }

  function currentLanguage() {
    return window.TiketaLanguage?.getLanguage?.() || "en";
  }

  function pageFor(key) {
    const language = currentLanguage();
    return pages[language]?.[key] || pages.en[key];
  }

  function cleanPath() {
    const path = window.location.pathname.replace(/^\/site\//, "/").replace(/\.html$/, "");
    return path === "/welcome" ? "/" : path;
  }

  function absoluteUrl(path) {
    const origin =
      window.EventSphereConfig?.PUBLIC_URL ||
      window.TIKETA_CONFIG?.PUBLIC_URL ||
      "https://tiketa-staging.albi-hellocare.workers.dev";
    return new URL(path || "/", origin).href;
  }

  function setSocialMeta(selector, attr, value) {
    const content = String(value || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!content) return;
    let meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      const [name, key] = attr;
      meta.setAttribute(name, key);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function applyStaticSocialMeta(key, data) {
    const title = `${data.title} | Tiketa`;
    const description =
      data.subtitle ||
      data.lead ||
      "Discover Tiketa events, reservations, support, and platform information.";
    const image = key.startsWith("dining.") ? defaultDiningSocialImage : defaultEventSocialImage;
    const url = absoluteUrl(cleanPath());

    setSocialMeta('meta[property="og:title"]', ["property", "og:title"], title);
    setSocialMeta('meta[property="og:description"]', ["property", "og:description"], description);
    setSocialMeta('meta[property="og:image"]', ["property", "og:image"], image);
    setSocialMeta('meta[property="og:url"]', ["property", "og:url"], url);
    setSocialMeta('meta[property="og:type"]', ["property", "og:type"], "website");
    setSocialMeta('meta[property="og:site_name"]', ["property", "og:site_name"], "Tiketa");
    setSocialMeta('meta[name="twitter:card"]', ["name", "twitter:card"], "summary_large_image");
    setSocialMeta('meta[name="twitter:title"]', ["name", "twitter:title"], title);
    setSocialMeta('meta[name="twitter:description"]', ["name", "twitter:description"], description);
    setSocialMeta('meta[name="twitter:image"]', ["name", "twitter:image"], image);
  }

  function cardMarkup(card) {
    const body = card.body || card.value || "";
    return `<article class="content-card">
      <div class="content-icon"><i class="bi ${esc(card.icon || "bi-info-circle")}"></i></div>
      <h3>${esc(card.title)}</h3>
      <p>${esc(body)}</p>
    </article>`;
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function sectionMarkup(section) {
    const body = Array.isArray(section.body) ? section.body : [section.body];
    const id = section.id || slugify(section.title);
    const items = Array.isArray(section.items) && section.items.length
      ? `<ul class="content-list">${section.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
      : "";
    return `<section id="${esc(id)}">
      <h2>${esc(section.title)}</h2>
      ${body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
      ${items}
    </section>`;
  }

  function tocMarkup(sections) {
    if (!sections?.length || sections.length < 4) return "";
    return `<aside class="content-toc legal-toc" aria-label="Page sections">
      <strong>${esc(window.t?.("legal.on_this_page") || "On this page")}</strong>
      ${sections
        .map((section) => `<a href="#${esc(section.id || slugify(section.title))}">${esc(section.title)}</a>`)
        .join("")}
    </aside>`;
  }

  function contactsMarkup(contacts) {
    if (!contacts?.length) return "";
    return `<section class="section-sm"><div class="container-xxl"><div class="content-grid">
      ${contacts.map(cardMarkup).join("")}
    </div></div></section>`;
  }

  function faqMarkup(faqs) {
    if (!faqs?.length) return "";
    return `<section class="section-sm"><div class="container-xxl"><div class="accordion" id="staticFaqAccordion">
      ${faqs
        .map(
          ([question, answer], index) => `
        <div class="accordion-item">
          <h2 class="accordion-header"><button class="accordion-button ${index ? "collapsed" : ""}" type="button" data-bs-toggle="collapse" data-bs-target="#staticFaq${index}">${esc(question)}</button></h2>
          <div id="staticFaq${index}" class="accordion-collapse collapse ${index ? "" : "show"}" data-bs-parent="#staticFaqAccordion"><div class="accordion-body">${esc(answer)}</div></div>
        </div>
      `,
        )
        .join("")}
    </div></div></section>`;
  }

  function setFaqSchema(faqs) {
    let script = document.querySelector('script[type="application/ld+json"][data-faq-schema]');
    if (!faqs?.length) {
      script?.remove();
      return;
    }

    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.faqSchema = "true";
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: window.TiketaLanguage?.getLanguage?.() || "en",
      mainEntity: faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: String(question || "").trim(),
        acceptedAnswer: {
          "@type": "Answer",
          text: String(answer || "").trim(),
        },
      })),
    });
    window.TiketaLanguage?.applyInternationalSeo?.();
  }

  function ctaMarkup(cta) {
    if (!cta) return "";
    const secondary = cta.secondary
      ? `<a class="btn btn-ghost" href="${esc(cta.secondary[1])}">${esc(cta.secondary[0])}</a>`
      : "";
    return `<section class="section-sm"><div class="container-xxl"><div class="content-card">
      <div class="row g-4 align-items-center">
        <div class="col-lg-8">
          <div class="eyebrow">${esc(cta.title)}</div>
          <p class="text-muted-pro mb-0 mt-2">${esc(cta.body)}</p>
        </div>
        <div class="col-lg-4 d-flex gap-2 justify-content-lg-end flex-wrap">
          <a class="btn btn-primary-grad" href="${esc(cta.primary[1])}">${esc(cta.primary[0])}</a>
          ${secondary}
        </div>
      </div>
    </div></div></section>`;
  }

  function renderPage(root) {
    const data = pageFor(root.dataset.staticPage);
    if (!data) return;
    document.title = `${data.title} | Tiketa`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", data.subtitle);
    applyStaticSocialMeta(root.dataset.staticPage, data);
    setFaqSchema(data.faqs);

    root.innerHTML = `
      <section class="content-hero">
        <div class="container-xxl">
          <div class="eyebrow">${esc(data.eyebrow || "")}</div>
          <h1>${esc(data.title)}</h1>
          ${data.updated ? `<p class="legal-updated">${esc(data.updated)}</p>` : ""}
          <p class="content-lead mt-3">${esc(data.subtitle)}</p>
          ${data.lead ? `<p class="content-lead mt-3">${esc(data.lead)}</p>` : ""}
          ${data.notice ? `<div class="legal-note" role="note"><i class="bi bi-info-circle"></i><span>${esc(data.notice)}</span></div>` : ""}
        </div>
      </section>
      ${data.cards?.length ? `<section class="section-sm"><div class="container-xxl"><div class="content-grid">${data.cards.map(cardMarkup).join("")}</div></div></section>` : ""}
      ${contactsMarkup(data.contacts)}
      ${data.sections?.length ? `<section class="section-sm"><div class="container-xxl legal-layout">${tocMarkup(data.sections)}<div class="policy-content">${data.sections.map(sectionMarkup).join("")}</div></div></section>` : ""}
      ${faqMarkup(data.faqs)}
      ${ctaMarkup(data.cta)}
    `;
  }

  function renderAll() {
    document.querySelectorAll("[data-static-page]").forEach(renderPage);
  }

  document.addEventListener("DOMContentLoaded", renderAll);
  document.addEventListener("tiketa:language-changed", renderAll);
})();
