(function () {
  'use strict';

  const sharedContacts = {
    event: [
      { icon: 'bi-envelope', title: 'Support email', value: 'support@tiketa.example' },
      { icon: 'bi-clock', title: 'Response window', value: 'Monday-Friday, 09:00-18:00' },
      { icon: 'bi-life-preserver', title: 'Urgent issues', value: 'Event-day ticket access requests are prioritized.' },
    ],
    dining: [
      { icon: 'bi-envelope', title: 'Dining support', value: 'dining@tiketa.example' },
      { icon: 'bi-clock', title: 'Reservation desk', value: 'Monday-Sunday, 10:00-22:00' },
      { icon: 'bi-shop', title: 'Partner team', value: 'partners@tiketa.example' },
    ],
  };

  const sqContacts = {
    event: [
      { icon: 'bi-envelope', title: 'Email mbeshtetjeje', value: 'support@tiketa.example' },
      { icon: 'bi-clock', title: 'Orari i pergjigjes', value: 'E hene-E premte, 09:00-18:00' },
      { icon: 'bi-life-preserver', title: 'Ceshtje urgjente', value: 'Kerkesat per akses ne bileta diten e eventit marrin perparesi.' },
    ],
    dining: [
      { icon: 'bi-envelope', title: 'Mbeshtetje per rezervime', value: 'dining@tiketa.example' },
      { icon: 'bi-clock', title: 'Orari i rezervimeve', value: 'E hene-E diel, 10:00-22:00' },
      { icon: 'bi-shop', title: 'Ekipi i partnereve', value: 'partners@tiketa.example' },
    ],
  };

  const en = {
    'event.about': {
      title: 'About Tiketa',
      subtitle: 'A modern ticketing platform built for trusted event discovery, secure checkout, and professional organizer operations.',
      eyebrow: 'Company',
      lead: 'Tiketa helps fans find live experiences with confidence and gives organizers the tools to publish, sell, and validate tickets in one dependable workflow.',
      cards: [
        { icon: 'bi-search', title: 'Clear event discovery', body: 'Fans can browse events by category, city, date, availability, and popularity before making a purchase decision.' },
        { icon: 'bi-shield-lock', title: 'Secure ticketing', body: 'Checkout, order records, and QR ticket delivery are designed to make every purchase easier to verify and manage.' },
        { icon: 'bi-clipboard-check', title: 'Organizer tools', body: 'Organizers can configure ticket tiers, manage attendee information, monitor sales, and prepare for check-in.' },
      ],
      sections: [
        { title: 'Our mission', body: ['We believe buying a ticket should feel simple, transparent, and reliable from the first search to the venue door.', 'Tiketa is built for concerts, sports, festivals, conferences, theater, workshops, and community events where accurate information and dependable access matter.'] },
        { title: 'How we work', body: ['We keep the customer journey structured: clear listings, protected checkout, immediate ticket access, and support paths when plans change.', 'For organizers, Tiketa focuses on practical operations: publishing, inventory, attendee visibility, QR validation, and clear communication with ticket holders.'] },
      ],
      cta: { title: 'Ready to discover your next event?', body: 'Browse upcoming events or start building your organizer presence on Tiketa.', primary: ['Browse Events', '/events/list'], secondary: ['Become an Organizer', '/organizer'] },
    },
    'event.contact': {
      title: 'Contact Us',
      subtitle: 'Reach the right Tiketa team for ticket, account, organizer, payment, or partnership questions.',
      eyebrow: 'Company',
      lead: 'The fastest support requests include your account email, event name, order reference when available, and a clear description of what happened.',
      contacts: sharedContacts.event,
      sections: [
        { title: 'Customer support', body: ['Use Tiketa support for ticket access, checkout questions, account updates, QR code issues, and refund review guidance.', 'For an event taking place within 24 hours, include “event-day” in your message subject so the team can triage the request quickly.'] },
        { title: 'Organizer support', body: ['Organizers can contact us for publishing guidance, ticket setup, attendee management, scanner access, and operational questions before event day.'] },
      ],
      cta: { title: 'Need help with a ticket?', body: 'Open ticket support for the checklist we use to resolve common access issues.', primary: ['Open Ticket Support', '/ticket-support'] },
    },
    'event.careers': {
      title: 'Careers at Tiketa',
      subtitle: 'Help build a reliable marketplace for fans, organizers, venues, and live-event communities.',
      eyebrow: 'Company',
      lead: 'Tiketa is built by people who care about trust, product quality, operational clarity, and the energy of live experiences.',
      cards: [
        { icon: 'bi-code-slash', title: 'Product and engineering', body: 'Build discovery, checkout, ticket delivery, dashboards, and platform reliability.' },
        { icon: 'bi-headset', title: 'Operations and support', body: 'Help customers and organizers resolve questions quickly with empathy and accuracy.' },
        { icon: 'bi-megaphone', title: 'Growth and partnerships', body: 'Bring more organizers, venues, and communities into the Tiketa marketplace.' },
      ],
      sections: [
        { title: 'How we hire', body: ['Open roles change over time. When a role is available, we look for practical judgment, clear communication, ownership, and care for customer experience.', 'If no open role matches your background, you can still introduce yourself and tell us where you could create value.'] },
      ],
      cta: { title: 'Introduce yourself', body: 'Send your profile, location, and the type of work you want to do with Tiketa.', primary: ['Email Careers', 'mailto:careers@tiketa.example'] },
    },
    'event.blog': {
      title: 'Tiketa Blog',
      subtitle: 'Insights for event discovery, ticketing operations, organizer growth, and better live experiences.',
      eyebrow: 'Company',
      lead: 'The Tiketa blog is where we share practical guidance for fans and organizers as the platform evolves.',
      cards: [
        { icon: 'bi-ticket-detailed', title: 'Ticketing tips', body: 'Guides for safer purchases, QR ticket access, checkout readiness, and event-day preparation.' },
        { icon: 'bi-graph-up-arrow', title: 'Organizer playbooks', body: 'Operational advice for pricing, publishing, promotion, attendee communication, and check-in.' },
        { icon: 'bi-stars', title: 'Platform updates', body: 'Product improvements, reliability notes, and new capabilities for the Tiketa community.' },
      ],
      sections: [
        { title: 'Editorial standard', body: ['Blog content should help customers and organizers make better decisions. We avoid filler and focus on clear, actionable information.', 'Featured posts will appear here as Tiketa publishes platform updates and event-marketplace resources.'] },
      ],
      cta: { title: 'Looking for help instead?', body: 'Visit the Help Center for support topics and contact options.', primary: ['Go to Help Center', '/help-center'] },
    },
    'event.help': {
      title: 'Help Center',
      subtitle: 'Support for tickets, checkout, QR entry, refunds, accounts, and organizer tools.',
      eyebrow: 'Support',
      lead: 'Use these resources to resolve common questions before, during, and after an event.',
      cards: [
        { icon: 'bi-ticket-perforated', title: 'Buying tickets', body: 'Review event details, choose a ticket type, complete checkout, and access your order from your dashboard.' },
        { icon: 'bi-qr-code-scan', title: 'Using QR tickets', body: 'Keep your QR code ready at entry and bring identification if the organizer requires it.' },
        { icon: 'bi-arrow-counterclockwise', title: 'Refunds and changes', body: 'Understand cancellations, postponements, organizer policies, request windows, and payment timelines.' },
        { icon: 'bi-person-lock', title: 'Account security', body: 'Keep your account email current, protect your password, and report suspicious activity quickly.' },
        { icon: 'bi-shop-window', title: 'Organizer support', body: 'Find guidance for event creation, ticket setup, attendee management, and check-in preparation.' },
        { icon: 'bi-credit-card', title: 'Payments', body: 'Check payment status, receipts, failed checkout attempts, and duplicate-charge concerns.' },
      ],
      sections: [
        { title: 'Before contacting support', body: ['Check the event page for date, venue, entry rules, age restrictions, and organizer updates.', 'Open your dashboard and confirm ticket quantity, order status, and QR availability.', 'Save screenshots or receipt details if something looks incorrect.'] },
      ],
      cta: { title: 'Still need help?', body: 'Contact Tiketa with the event name, order email, and a short description of the issue.', primary: ['Contact Us', '/contact'] },
    },
    'event.faq': {
      title: 'FAQs',
      subtitle: 'Answers to common questions about Tiketa tickets, payments, refunds, accounts, and organizer tools.',
      eyebrow: 'Support',
      lead: 'These answers cover general platform behavior. Event-specific terms shown before checkout may also apply.',
      faqs: [
        ['How do I buy tickets on Tiketa?', 'Open an event page, review the date, location, ticket types, and availability, then select your quantity and complete checkout. Confirmed orders appear in your dashboard.'],
        ['Where can I find my QR ticket?', 'Sign in and open your dashboard. Completed orders include QR ticket access for entry.'],
        ['Can sold-out events still appear?', 'Yes. Sold-out events may remain visible so fans can read details and monitor organizer updates.'],
        ['What happens if an event is canceled?', 'Tiketa works with the organizer to review eligible refunds according to the refund policy, event terms, and applicable law.'],
        ['Are service fees refundable?', 'Some service, processing, or payment fees may be non-refundable unless required by law or included in the event policy.'],
        ['How do organizers publish an event?', 'Create an account, complete organizer setup, add event details and ticket tiers, then publish according to platform permissions.'],
      ],
      cta: { title: 'Need a deeper answer?', body: 'Send support the event name and your account email so we can review the right record.', primary: ['Contact Support', '/contact'] },
    },
    'event.ticketSupport': {
      title: 'Ticket Support',
      subtitle: 'Resolve ticket access, QR code, checkout, and event-day issues with the right information ready.',
      eyebrow: 'Support',
      lead: 'Ticket issues are easiest to resolve when support can match the request to an event, account, and order record.',
      sections: [
        { title: 'What to include', body: ['Event name and date.', 'Order email and order reference if available.', 'Ticket type, quantity, and screenshots of any error.', 'Whether the event starts within the next 24 hours.'] },
        { title: 'Common fixes', body: ['Refresh your dashboard after payment confirmation.', 'Confirm you are signed in with the same email used at checkout.', 'Check organizer updates for venue, date, or entry-rule changes.', 'Keep your QR code visible and your phone charged before arriving.'] },
      ],
      contacts: sharedContacts.event,
      faqs: [
        ['Why is my ticket not showing yet?', 'Confirm you are signed in with the same email used at checkout, then refresh your dashboard after payment confirmation.'],
        ['What should I do if my QR code will not load?', 'Check your connection, reopen the ticket from your dashboard, and contact support with the event name and order email if it still does not appear.'],
        ['Can support change my ticket type?', 'Ticket type changes depend on organizer policy, availability, and the event terms shown before checkout.'],
      ],
      cta: { title: 'Open a support request', body: 'Use the contact page and include the checklist above.', primary: ['Contact Us', '/contact'] },
    },
    'event.refund': {
      title: 'Refund Policy',
      subtitle: 'How Tiketa reviews refund requests for canceled, postponed, rescheduled, and organizer-managed events.',
      eyebrow: 'Support',
      lead: 'Tickets are usually final sale unless an event is canceled, a refund is required by law, or the organizer has published a refund option.',
      sections: [
        { title: 'Canceled events', body: ['If an organizer cancels an event and does not provide a replacement date, eligible ticket holders may receive a refund according to organizer instructions and applicable law.'] },
        { title: 'Postponed or rescheduled events', body: ['Tickets usually remain valid for the new date unless the organizer states otherwise. Refund windows may be limited and must be requested within the announced period.'] },
        { title: 'Fees and timing', body: ['Service, processing, payment, or delivery fees may be non-refundable unless required by law. Approved refunds are generally returned to the original payment method, and bank timelines may vary.'] },
        { title: 'Disputes', body: ['Opening a bank dispute may pause standard refund review until the dispute is resolved. Keeping communication in one support thread helps avoid delays.'] },
      ],
      cta: { title: 'Have a refund question?', body: 'Contact support with your order details and the event status.', primary: ['Contact Support', '/contact'] },
    },
    'event.organizer': {
      title: 'Become an Organizer',
      subtitle: 'Publish events, sell tickets, manage attendees, and prepare for professional event-day operations.',
      eyebrow: 'Organizers',
      lead: 'Tiketa gives organizers a structured way to bring live experiences to market with clear listings, ticket tiers, and QR validation.',
      cards: [
        { icon: 'bi-calendar-plus', title: 'Create public listings', body: 'Add event details, date, venue, imagery, category, visibility, and customer-facing descriptions.' },
        { icon: 'bi-tags', title: 'Configure ticket tiers', body: 'Set names, pricing, capacity, sale windows, and availability for each ticket type.' },
        { icon: 'bi-qr-code', title: 'Manage entry', body: 'Use QR tickets and scanner workflows to support faster, cleaner check-in.' },
      ],
      faqs: [
        ['Who can become an organizer?', 'Event teams, venues, promoters, and approved creators can use Tiketa organizer tools after account setup and platform review where required.'],
        ['What information is required before publishing?', 'You need accurate event details, schedule, venue, imagery, ticket tiers, inventory, and customer-facing policies.'],
        ['Can organizers manage check-in?', 'Yes. Organizer workflows support QR ticket validation and scanner preparation for event-day entry.'],
      ],
      cta: { title: 'Start organizing on Tiketa', body: 'Create an account or open your organizer workspace to begin.', primary: ['Create an Event', '/organizer'], secondary: ['Read the Guide', '/organizer-guide'] },
    },
    'event.organizerGuide': {
      title: 'Organizer Guide',
      subtitle: 'A practical guide to setting up events, tickets, publishing, communication, and check-in.',
      eyebrow: 'Organizers',
      lead: 'Professional event pages are accurate, complete, and easy for ticket buyers to understand before checkout.',
      sections: [
        { title: 'Prepare the listing', body: ['Use accurate event names, times, locations, organizer details, age rules, refund terms, and accessibility information.', 'Upload clear imagery that represents the event and avoids misleading customers.'] },
        { title: 'Set up ticket tiers', body: ['Name each ticket tier clearly, define quantity and price, and make any restrictions visible before checkout.'] },
        { title: 'Communicate changes', body: ['If the date, venue, lineup, entry rule, or refund status changes, update the listing and notify ticket holders as early as possible.'] },
        { title: 'Plan check-in', body: ['Assign scanner access, test QR validation, prepare staff instructions, and keep a fallback plan for poor connectivity.'] },
      ],
      cta: { title: 'Ready to publish?', body: 'Open organizer tools and create your next event.', primary: ['Create an Event', '/organizer'] },
    },
    'event.createEvent': {
      title: 'Create an Event',
      subtitle: 'Set up a professional event listing and start selling tickets through Tiketa.',
      eyebrow: 'Organizers',
      lead: 'A complete event listing helps customers make confident purchase decisions and helps your team operate smoothly.',
      sections: [
        { title: 'What you need', body: ['Event title, description, category, date, venue, images, ticket types, capacity, refund terms, and organizer contact details.'] },
        { title: 'Publishing checklist', body: ['Confirm all customer-facing details, preview the event page, test ticket quantities, and make sure your team understands event-day scanning.'] },
      ],
      cta: { title: 'Build your event', body: 'Go to organizer tools to create or manage event listings.', primary: ['Open Organizer Tools', '/organizer'] },
    },
    'event.terms': {
      title: 'Terms of Service',
      subtitle: 'The rules for using Tiketa as a buyer, organizer, or visitor.',
      eyebrow: 'Legal',
      lead: 'These terms govern access to Tiketa, ticket purchases, organizer listings, accounts, payments, and platform content.',
      sections: [
        { title: 'Marketplace role', body: ['Tiketa provides technology that helps organizers list events and sell tickets. Organizers remain responsible for event accuracy, venue operations, attendee rules, and event delivery.'] },
        { title: 'Accounts', body: ['You are responsible for accurate account information and credential security. Tiketa may restrict accounts that create risk for customers, organizers, or the platform.'] },
        { title: 'Payments and tickets', body: ['Ticket prices are set by organizers unless stated otherwise. Fees and taxes may apply and are shown during checkout where possible.'] },
        { title: 'Acceptable use', body: ['Do not misuse the platform, scrape data at scale, publish fraudulent events, interfere with inventory, or use Tiketa for illegal activity.'] },
        { title: 'Limitations', body: ['Tiketa works to provide a reliable service, but event operations are controlled by organizers and venues. Platform availability may vary.'] },
      ],
    },
    'event.privacy': {
      title: 'Privacy Policy',
      subtitle: 'How Tiketa collects, uses, protects, and shares personal information.',
      eyebrow: 'Legal',
      lead: 'We handle personal information to operate ticketing, accounts, support, security, payments, and marketplace features.',
      sections: [
        { title: 'Information we collect', body: ['We may collect account details, contact information, order history, event attendance records, organizer profile information, support messages, device data, and usage activity.'] },
        { title: 'How we use information', body: ['We use information to process orders, deliver tickets, provide support, protect accounts, improve the platform, and communicate important service updates.'] },
        { title: 'Sharing', body: ['We may share necessary information with organizers, payment providers, service vendors, and legal authorities when required.'] },
        { title: 'Your choices', body: ['You can manage account details, browser cookie settings, and marketing preferences. Some essential features require operational data to function.'] },
      ],
    },
    'event.cookies': {
      title: 'Cookie Policy',
      subtitle: 'How Tiketa uses cookies and similar technologies.',
      eyebrow: 'Legal',
      lead: 'Cookies help Tiketa keep sessions secure, remember preferences, measure performance, and improve marketplace functionality.',
      sections: [
        { title: 'Essential cookies', body: ['These support login sessions, security, language preference, checkout continuity, and other core platform behavior.'] },
        { title: 'Performance cookies', body: ['These help us understand page performance, errors, and aggregate usage trends so we can improve the product.'] },
        { title: 'Managing cookies', body: ['You can manage cookies in your browser settings. Disabling essential cookies may prevent login, checkout, or dashboard features from working correctly.'] },
      ],
    },
    'dining.about': {
      title: 'About Tiketa Dining',
      subtitle: 'A reservation platform for restaurants, bars, lounges, cafes, and guests who want a smoother way to book.',
      eyebrow: 'Company',
      lead: 'Tiketa Dining connects guests with hospitality venues and gives owners practical tools for reservations, availability, guest communication, and profile management.',
      cards: [
        { icon: 'bi-search-heart', title: 'Curated discovery', body: 'Guests can find restaurants and bars by city, style, cuisine, amenities, and availability.' },
        { icon: 'bi-calendar-check', title: 'Clear reservations', body: 'Reservation requests capture party size, time, contact details, and guest notes in a consistent flow.' },
        { icon: 'bi-shop-window', title: 'Owner operations', body: 'Owners can manage profiles, images, facilities, opening hours, blackout dates, and reservation status. ' },
      ],
      sections: [
        { title: 'Hospitality focus', body: ['Tiketa Dining is built for venues that care about reliable booking, accurate information, and a polished guest experience.', 'The platform supports restaurants, bars, lounges, cafes, and destination venues that want to be easier to discover and easier to manage.'] },
      ],
      cta: { title: 'Find your next table', body: 'Browse restaurants and bars available through Tiketa Dining.', primary: ['Discover Restaurants', '/restaurants'], secondary: ['Become a Partner', '/become-restaurant-partner'] },
    },
    'dining.contact': {
      title: 'Contact Tiketa Dining',
      subtitle: 'Reach the Tiketa Dining team for reservation, guest, or restaurant-partner support.',
      eyebrow: 'Company',
      lead: 'Include the restaurant name, reservation date and time, guest email, and a short description so the team can route your request quickly.',
      contacts: sharedContacts.dining,
      sections: [
        { title: 'For guests', body: ['Contact us for reservation questions, confirmation issues, cancellation guidance, account access, or venue communication concerns.'] },
        { title: 'For restaurant owners', body: ['Partner support can help with venue setup, profile quality, availability, reservation workflows, and owner dashboard questions.'] },
      ],
      cta: { title: 'Need reservation help?', body: 'Open reservation support for the details to include.', primary: ['Reservation Support', '/reservation-support'] },
    },
    'dining.partner': {
      title: 'Become a Restaurant Partner',
      subtitle: 'Bring your restaurant, bar, lounge, or cafe to guests searching for memorable hospitality experiences.',
      eyebrow: 'Restaurant Owners',
      lead: 'Tiketa Dining helps venues present accurate profiles, receive reservation requests, and manage guest communication from a focused owner workspace.',
      cards: [
        { icon: 'bi-window', title: 'Polished venue profile', body: 'Show your venue type, description, city, address, gallery, cuisine, amenities, and payment options.' },
        { icon: 'bi-calendar2-week', title: 'Availability controls', body: 'Manage opening hours, booking horizon, guest limits, reservation intervals, blackout dates, and special hours.' },
        { icon: 'bi-clipboard2-check', title: 'Reservation management', body: 'Review requests, confirm bookings, handle cancellations, and monitor upcoming guest arrivals.' },
      ],
      cta: { title: 'List your venue', body: 'Create or manage your restaurant and bar profile from the owner workspace.', primary: ['List Your Restaurant', '/owner-venue'], secondary: ['Read Owner Guide', '/restaurant-owner-guide'] },
    },
    'dining.ownerGuide': {
      title: 'Restaurant Owner Guide',
      subtitle: 'Set up a trustworthy venue profile and manage reservations with confidence.',
      eyebrow: 'Restaurant Owners',
      lead: 'Complete, accurate venue information helps guests choose the right place and helps your team prepare for each booking.',
      sections: [
        { title: 'Build the profile', body: ['Add your venue name, type, description, phone, email, website, address, city, country, and exact map location.', 'Upload high-quality photos that show the space guests will actually experience.'] },
        { title: 'Configure availability', body: ['Keep opening hours, special hours, blackout dates, booking horizon, guest limits, and reservation intervals current.'] },
        { title: 'Manage requests', body: ['Review pending reservations promptly, confirm accepted bookings, and add clear cancellation reasons when you cannot host a request.'] },
        { title: 'Keep communication clean', body: ['Use guest notes and contact information responsibly. Update venue details whenever policies, hours, or availability change.'] },
      ],
      cta: { title: 'Open owner tools', body: 'Manage your restaurant or bar profile and reservations.', primary: ['Owner Workspace', '/owner-venue'] },
    },
    'dining.list': {
      title: 'List Your Restaurant',
      subtitle: 'Create a venue profile guests can discover and request reservations from.',
      eyebrow: 'Restaurant Owners',
      lead: 'A strong listing gives guests the practical information they need before they book.',
      sections: [
        { title: 'Listing requirements', body: ['Prepare your venue name, type, description, contact information, address, photos, cuisine types, facilities, payment options, and opening hours.'] },
        { title: 'Before going live', body: ['Preview your public page, check booking rules, test reservation limits, and confirm your team knows how to review incoming requests.'] },
      ],
      cta: { title: 'Create your listing', body: 'Open the owner workspace to add or update your venue.', primary: ['List Your Restaurant', '/owner-venue'] },
    },
    'dining.how': {
      title: 'How Reservations Work',
      subtitle: 'A simple reservation flow for discovering venues, choosing a time, and receiving confirmation.',
      eyebrow: 'Reservations',
      lead: 'Tiketa Dining keeps the guest flow clear while giving restaurants and bars control over availability and confirmation.',
      sections: [
        { title: '1. Discover a venue', body: ['Browse restaurants, bars, lounges, and cafes by city, type, cuisine, facilities, and featured status.'] },
        { title: '2. Choose details', body: ['Select a date, time, party size, and any occasion or special request the venue should know about.'] },
        { title: '3. Send the request', body: ['Submit your reservation request with accurate contact information so the venue can respond.'] },
        { title: '4. Receive confirmation', body: ['The restaurant or bar reviews the request and confirms, updates, or cancels it based on availability and policy.'] },
      ],
      cta: { title: 'Ready to book?', body: 'Explore restaurants and bars accepting reservation requests.', primary: ['Find a Table', '/restaurants'] },
    },
    'dining.support': {
      title: 'Reservation Support',
      subtitle: 'Help for reservation requests, confirmations, cancellations, guest details, and venue communication.',
      eyebrow: 'Reservations',
      lead: 'Reservation support works best when the request includes the venue, date, time, guest name, and account email.',
      sections: [
        { title: 'Guest support', body: ['Contact us if you cannot find a reservation, need help understanding status, entered incorrect details, or have trouble reaching the venue.'] },
        { title: 'Owner support', body: ['Venue teams can ask for help with reservation status updates, calendar views, availability settings, cancellations, and guest communication workflows.'] },
        { title: 'Urgent timing', body: ['For same-day reservations, contact the venue directly when possible and send Tiketa Dining the reservation details for platform support.'] },
      ],
      contacts: sharedContacts.dining,
      faqs: [
        ['Is a reservation request instantly confirmed?', 'No. A request is confirmed only after the venue reviews availability and accepts it.'],
        ['How do I change reservation details?', 'Contact the venue when possible and send support the venue name, date, time, and updated guest details.'],
        ['What happens if a venue cancels?', 'The record remains visible for review, and support can help clarify the cancellation reason when needed.'],
      ],
      cta: { title: 'Review the policy', body: 'Understand how reservation changes and cancellations are handled.', primary: ['Reservation Policy', '/reservation-policy'] },
    },
    'dining.policy': {
      title: 'Reservation Policy',
      subtitle: 'How Tiketa Dining handles reservation requests, confirmations, cancellations, and guest responsibilities.',
      eyebrow: 'Reservations',
      lead: 'Reservation availability is controlled by each restaurant or bar. Tiketa Dining provides the platform workflow and support paths.',
      sections: [
        { title: 'Requests and confirmations', body: ['Submitting a request does not guarantee a table until the venue confirms it. Guests should watch for status updates and arrive according to the confirmed details.'] },
        { title: 'Cancellations', body: ['Guests should cancel as early as possible if plans change. Venues may cancel requests when capacity, hours, private events, or operational issues prevent hosting.'] },
        { title: 'Guest responsibilities', body: ['Use accurate contact information, arrive on time, respect venue rules, and contact the venue if your party size or arrival time changes.'] },
        { title: 'Venue responsibilities', body: ['Venues should keep availability accurate, respond to requests promptly, and provide clear cancellation reasons when a booking cannot be honored.'] },
      ],
      cta: { title: 'Need help with a reservation?', body: 'Contact support with your venue name and reservation details.', primary: ['Reservation Support', '/reservation-support'] },
    },
  };

  const sq = {
    'event.about': {
      title: 'Rreth Tiketa',
      subtitle: 'Nje platforme moderne biletash per zbulim eventesh, pagese te sigurt dhe operime profesionale per organizatoret.',
      eyebrow: 'Kompania',
      lead: 'Tiketa ndihmon fansat te gjejne eksperienca live me besim dhe u jep organizatoreve mjetet per publikim, shitje dhe validim biletash ne nje rrjedhe te qendrueshme.',
      cards: [
        { icon: 'bi-search', title: 'Zbulim i qarte eventesh', body: 'Fansat mund te shfletojne sipas kategorise, qytetit, dates, disponueshmerise dhe popullaritetit para blerjes.' },
        { icon: 'bi-shield-lock', title: 'Bileta te sigurta', body: 'Pagesa, historiku i porosive dhe dorezimi i biletave QR jane projektuar per blerje te verifikueshme.' },
        { icon: 'bi-clipboard-check', title: 'Mjete per organizatore', body: 'Organizatoret mund te konfigurojne nivelet e biletave, te menaxhojne pjesemarresit, shitjet dhe check-in.' },
      ],
      sections: [
        { title: 'Misioni yne', body: ['Blerja e nje bilete duhet te jete e thjeshte, transparente dhe e besueshme nga kerkimi i pare deri te hyrja ne venue.', 'Tiketa eshte ndertuar per koncerte, sport, festivale, konferenca, teater, workshop-e dhe evente komunitare ku informacioni i sakte ka rendesi.'] },
        { title: 'Si punojme', body: ['Udhetimi i klientit eshte i strukturuar: lista te qarta, pagese e mbrojtur, akses i menjehershem ne bileta dhe kanale mbeshtetjeje.', 'Per organizatoret, Tiketa fokusohet te publikimi, inventari, pjesemarresit, validimi QR dhe komunikimi i qarte me bleresit.'] },
      ],
      cta: { title: 'Gati per eventin e radhes?', body: 'Shfletoni eventet e ardhshme ose filloni prezencen tuaj si organizator ne Tiketa.', primary: ['Shfleto Eventet', '/events/list'], secondary: ['Bëhu Organizator', '/organizer'] },
    },
    'event.contact': {
      title: 'Na Kontaktoni',
      subtitle: 'Kontaktoni ekipin e duhur te Tiketa per bileta, llogari, organizatore, pagesa ose partneritete.',
      eyebrow: 'Kompania',
      lead: 'Kerkesat me te shpejta perfshijne emailin e llogarise, emrin e eventit, referencen e porosise kur ekziston dhe nje pershkrim te qarte.',
      contacts: sqContacts.event,
      sections: [
        { title: 'Mbeshtetje per kliente', body: ['Na kontaktoni per akses ne bileta, pyetje rreth pageses, llogarise, kodeve QR dhe orientim per rimbursime.', 'Per evente brenda 24 oreve, vendosni “dita e eventit” ne subjekt qe kerkesa te trajtohet me shpejt.'] },
        { title: 'Mbeshtetje per organizatore', body: ['Organizatoret mund te na kontaktojne per publikim, konfigurim biletash, menaxhim pjesemarresish, akses skaneri dhe pyetje operacionale.'] },
      ],
      cta: { title: 'Keni nevoje per ndihme me bileten?', body: 'Hapni mbeshtetjen e biletave per listen e kontrollit qe perdorim per zgjidhje.', primary: ['Mbeshtetje Biletash', '/ticket-support'] },
    },
    'event.careers': {
      title: 'Karriera te Tiketa',
      subtitle: 'Ndihmoni ne ndertimin e nje marketplace te besueshem per fansat, organizatoret, venue-t dhe komunitetet live.',
      eyebrow: 'Kompania',
      lead: 'Tiketa ndertohet nga njerez qe kujdesen per besimin, cilesine e produktit, qartesine operacionale dhe energjine e eksperiencave live.',
      cards: [
        { icon: 'bi-code-slash', title: 'Produkt dhe inxhinieri', body: 'Ndertoni zbulim eventesh, pagese, dorezim biletash, dashboard-e dhe besueshmeri platforme.' },
        { icon: 'bi-headset', title: 'Operacione dhe mbeshtetje', body: 'Ndihmoni klientet dhe organizatoret te zgjidhin pyetje me empati dhe saktesi.' },
        { icon: 'bi-megaphone', title: 'Rritje dhe partneritete', body: 'Sillni me shume organizatore, venue dhe komunitete ne Tiketa.' },
      ],
      sections: [
        { title: 'Si punesojme', body: ['Rolet e hapura ndryshojne. Kerkojme gjykim praktik, komunikim te qarte, pergjegjesi dhe kujdes per eksperiencen e klientit.', 'Edhe nese nuk ka rol te hapur, mund te prezantoheni dhe te tregoni ku mund te krijoni vlere.'] },
      ],
      cta: { title: 'Prezantohuni', body: 'Dergo profilin, vendndodhjen dhe llojin e punes qe deshironi te beni me Tiketa.', primary: ['Email Karriera', 'mailto:careers@tiketa.example'] },
    },
    'event.blog': {
      title: 'Blogu i Tiketa',
      subtitle: 'Udhezime per zbulim eventesh, operime biletash, rritje organizatoresh dhe eksperienca me te mira live.',
      eyebrow: 'Kompania',
      lead: 'Blogu i Tiketa do te sjelle udhezime praktike per fansat dhe organizatoret nderkohe qe platforma zhvillohet.',
      cards: [
        { icon: 'bi-ticket-detailed', title: 'Keshilla per bileta', body: 'Udhezime per blerje te sigurta, akses QR, pergatitje per checkout dhe diten e eventit.' },
        { icon: 'bi-graph-up-arrow', title: 'Playbook per organizatore', body: 'Keshilla per cmimet, publikimin, promovimin, komunikimin dhe check-in.' },
        { icon: 'bi-stars', title: 'Perditesime platforme', body: 'Permiresime produkti, shenime besueshmerie dhe aftesi te reja per komunitetin Tiketa.' },
      ],
      sections: [
        { title: 'Standard editorial', body: ['Permbajtja duhet te ndihmoje klientet dhe organizatoret te marrin vendime me te mira. Shmangim tekstin bosh dhe fokusohemi te informacioni i dobishem.', 'Postimet e zgjedhura do te shfaqen ketu kur Tiketa te publikoje burime dhe perditesime.'] },
      ],
      cta: { title: 'Po kerkoni ndihme?', body: 'Vizitoni Qendren e Ndihmes per tema mbeshtetjeje dhe kontakte.', primary: ['Qendra e Ndihmes', '/help-center'] },
    },
    'event.help': {
      title: 'Qendra e Ndihmes',
      subtitle: 'Mbeshtetje per bileta, pagesa, hyrje QR, rimbursime, llogari dhe mjete organizatoresh.',
      eyebrow: 'Mbeshtetje',
      lead: 'Perdorni keto burime per te zgjidhur pyetje te zakonshme para, gjate dhe pas nje eventi.',
      cards: [
        { icon: 'bi-ticket-perforated', title: 'Blerja e biletave', body: 'Rishikoni detajet e eventit, zgjidhni llojin e biletes, perfundoni pagesen dhe gjeni porosine ne dashboard.' },
        { icon: 'bi-qr-code-scan', title: 'Perdorimi i biletave QR', body: 'Mbani kodin QR gati ne hyrje dhe merrni dokument identifikimi nese organizatori e kerkon.' },
        { icon: 'bi-arrow-counterclockwise', title: 'Rimbursime dhe ndryshime', body: 'Kuptoni anulimet, shtyrjet, politikat e organizatorit, afatet e kerkesave dhe kohen e pagesave.' },
        { icon: 'bi-person-lock', title: 'Siguria e llogarise', body: 'Mbani emailin e llogarise te sakte, mbroni fjalekalimin dhe raportoni aktivitet te dyshimte.' },
        { icon: 'bi-shop-window', title: 'Mbeshtetje per organizatore', body: 'Udhezime per krijim eventesh, bileta, pjesemarres dhe pergatitje check-in.' },
        { icon: 'bi-credit-card', title: 'Pagesat', body: 'Kontrolloni statusin e pageses, faturat, deshtimet ne checkout dhe pagesat e dyfishta.' },
      ],
      sections: [
        { title: 'Para se te kontaktoni mbeshtetjen', body: ['Kontrolloni faqen e eventit per daten, venue, rregullat e hyrjes dhe perditesimet.', 'Hapni dashboard-in dhe konfirmoni sasine e biletave, statusin e porosise dhe disponueshmerine QR.', 'Ruani screenshot-e ose detaje fature nese dicka duket gabim.'] },
      ],
      cta: { title: 'Ende keni nevoje per ndihme?', body: 'Kontaktoni Tiketa me emrin e eventit, emailin e porosise dhe nje pershkrim te shkurter.', primary: ['Na Kontaktoni', '/contact'] },
    },
    'event.faq': {
      title: 'Pyetje te Shpeshta',
      subtitle: 'Pergjigje per bileta, pagesa, rimbursime, llogari dhe mjete organizatoresh ne Tiketa.',
      eyebrow: 'Mbeshtetje',
      lead: 'Keto pergjigje mbulojne sjelljen e pergjithshme te platformes. Mund te vlejne edhe kushtet specifike te eventit.',
      faqs: [
        ['Si blej bileta ne Tiketa?', 'Hapni faqen e eventit, kontrolloni daten, vendndodhjen, llojet e biletave dhe disponueshmerine, pastaj zgjidhni sasine dhe perfundoni pagesen.'],
        ['Ku e gjej bileten QR?', 'Hyni ne llogari dhe hapni dashboard-in. Porosite e perfunduara perfshijne akses QR per hyrje.'],
        ['A shfaqen eventet e shitura?', 'Po. Ato mund te mbeten te dukshme qe fansat te lexojne detajet dhe perditesimet.'],
        ['Cfare ndodh nese eventi anulohet?', 'Tiketa punon me organizatorin per te rishikuar rimbursimet e pranueshme sipas politikes dhe ligjit te aplikueshem.'],
        ['A rimbursohen tarifat e sherbimit?', 'Disa tarifa sherbimi, procesimi ose pagese mund te mos rimbursohen pervec rasteve kur kerkohet nga ligji ose politika e eventit.'],
        ['Si publikon nje event organizatori?', 'Krijoni llogari, perfundoni konfigurimin e organizatorit, shtoni detaje dhe bileta, pastaj publikoni sipas lejeve te platformes.'],
      ],
      cta: { title: 'Keni nevoje per pergjigje me te thelle?', body: 'Dergojini mbeshtetjes emrin e eventit dhe emailin e llogarise.', primary: ['Kontakto Mbeshtetjen', '/contact'] },
    },
    'event.ticketSupport': {
      title: 'Mbeshtetje per Bileta',
      subtitle: 'Zgjidhni problemet e aksesit, kodeve QR, checkout dhe dites se eventit me informacionin e duhur.',
      eyebrow: 'Mbeshtetje',
      lead: 'Problemet me bileta zgjidhen me shpejt kur kerkesa lidhet me eventin, llogarine dhe porosine.',
      sections: [
        { title: 'Cfare te perfshini', body: ['Emri dhe data e eventit.', 'Emaili i porosise dhe referenca nese ekziston.', 'Lloji i biletes, sasia dhe screenshot i gabimit.', 'Nese eventi fillon brenda 24 oreve.'] },
        { title: 'Zgjidhje te zakonshme', body: ['Rifreskoni dashboard-in pas konfirmimit te pageses.', 'Sigurohuni qe jeni futur me te njejtin email te checkout.', 'Kontrolloni perditesimet e organizatorit per vendin, daten ose rregullat e hyrjes.', 'Mbani kodin QR te dukshem dhe telefonin te karikuar.'] },
      ],
      contacts: sqContacts.event,
      faqs: [
        ['Pse nuk po shfaqet ende bileta ime?', 'Sigurohuni qe jeni futur me te njejtin email qe perdoret ne checkout, pastaj rifreskoni dashboard-in pas konfirmimit te pageses.'],
        ['Cfare te bej nese kodi QR nuk hapet?', 'Kontrolloni lidhjen, rihapni bileten nga dashboard-i dhe kontaktoni mbeshtetjen me emrin e eventit dhe emailin e porosise nese ende nuk shfaqet.'],
        ['A mund ta ndryshoje mbeshtetja llojin e biletes?', 'Ndryshimet varen nga politika e organizatorit, disponueshmeria dhe kushtet e eventit te shfaqura para checkout.'],
      ],
      cta: { title: 'Hapni kerkese mbeshtetjeje', body: 'Perdorni faqen e kontaktit dhe perfshini listen me siper.', primary: ['Na Kontaktoni', '/contact'] },
    },
    'event.refund': {
      title: 'Politika e Rimbursimit',
      subtitle: 'Si Tiketa shqyrton kerkesat per evente te anuluara, shtyra, riplanifikuara ose te menaxhuara nga organizatori.',
      eyebrow: 'Mbeshtetje',
      lead: 'Biletat zakonisht jane shitje finale pervec rasteve kur eventi anulohet, ligji kerkon rimbursim ose organizatori ka publikuar opsion rimbursimi.',
      sections: [
        { title: 'Evente te anuluara', body: ['Nese organizatori anulon eventin dhe nuk jep date zevendesuese, mbajtesit e pranueshem mund te marrin rimbursim sipas udhezimeve dhe ligjit.'] },
        { title: 'Evente te shtyra ose riplanifikuara', body: ['Biletat zakonisht mbeten te vlefshme per daten e re pervec nese organizatori deklaron ndryshe. Afatet e rimbursimit mund te jene te kufizuara.'] },
        { title: 'Tarifat dhe afatet', body: ['Tarifat e sherbimit, procesimit, pageses ose dorezimit mund te mos rimbursohen. Rimbursimet e miratuara kthehen zakonisht ne metoden origjinale te pageses.'] },
        { title: 'Mosmarreveshjet', body: ['Hapja e nje dispute bankare mund te ndaloje shqyrtimin standard deri ne zgjidhje. Nje komunikim i vetem ndihmon te shmangen vonesat.'] },
      ],
      cta: { title: 'Keni pyetje per rimbursim?', body: 'Kontaktoni mbeshtetjen me detajet e porosise dhe statusin e eventit.', primary: ['Kontakto Mbeshtetjen', '/contact'] },
    },
    'event.organizer': {
      title: 'Bëhu Organizator',
      subtitle: 'Publikoni evente, shisni bileta, menaxhoni pjesemarres dhe pergatituni per operime profesionale.',
      eyebrow: 'Organizatoret',
      lead: 'Tiketa u jep organizatoreve nje menyre te strukturuar per te sjelle eksperienca live ne treg me lista te qarta dhe validim QR.',
      cards: [
        { icon: 'bi-calendar-plus', title: 'Krijoni lista publike', body: 'Shtoni detaje, date, venue, imazhe, kategori, dukshmeri dhe pershkrime per klientet.' },
        { icon: 'bi-tags', title: 'Konfiguroni nivele biletash', body: 'Vendosni emra, cmime, kapacitet, afate shitjeje dhe disponueshmeri.' },
        { icon: 'bi-qr-code', title: 'Menaxhoni hyrjen', body: 'Perdorni bileta QR dhe rrjedha skanimi per check-in me te paster.' },
      ],
      faqs: [
        ['Kush mund te behet organizator?', 'Ekipet e eventeve, venue-t, promovuesit dhe krijuesit e miratuar mund te perdorin mjetet e organizatorit pas konfigurimit te llogarise.'],
        ['Cfare informacioni duhet para publikimit?', 'Ju duhen detaje te sakta eventi, orar, venue, imazhe, nivele biletash, inventar dhe politika per klientet.'],
        ['A mund te menaxhojne organizatoret check-in?', 'Po. Rrjedhat e organizatorit mbeshtesin validimin QR dhe pergatitjen e skanerit per hyrje.'],
      ],
      cta: { title: 'Filloni organizimin ne Tiketa', body: 'Krijoni llogari ose hapni hapesiren e organizatorit.', primary: ['Krijo Event', '/organizer'], secondary: ['Lexo Udhezuesin', '/organizer-guide'] },
    },
    'event.organizerGuide': {
      title: 'Udhezues per Organizatore',
      subtitle: 'Udhezues praktik per evente, bileta, publikim, komunikim dhe check-in.',
      eyebrow: 'Organizatoret',
      lead: 'Faqet profesionale te eventeve jane te sakta, te plota dhe te lehta per bleresit para checkout.',
      sections: [
        { title: 'Pergatitni listen', body: ['Perdorni emra, orare, vende, detaje organizatori, rregulla moshe, kushte rimbursimi dhe informacion aksesibiliteti te sakte.', 'Ngarkoni imazhe te qarta qe perfaqesojne eventin.'] },
        { title: 'Vendosni biletat', body: ['Emertoni qarte cdo nivel bilete, percaktoni sasine dhe cmimin, dhe shfaqni kufizimet para checkout.'] },
        { title: 'Komunikoni ndryshimet', body: ['Nese ndryshon data, vendi, programi, rregullat e hyrjes ose rimbursimi, perditesoni listen dhe njoftoni bleresit sa me heret.'] },
        { title: 'Planifikoni check-in', body: ['Caktoni akses skaneri, testoni validimin QR, pergatitni stafin dhe mbani nje plan rezerve.'] },
      ],
      cta: { title: 'Gati per publikim?', body: 'Hapni mjetet e organizatorit dhe krijoni eventin tuaj.', primary: ['Krijo Event', '/organizer'] },
    },
    'event.createEvent': {
      title: 'Krijo Event',
      subtitle: 'Krijoni nje liste profesionale eventi dhe filloni shitjen e biletave permes Tiketa.',
      eyebrow: 'Organizatoret',
      lead: 'Nje liste e plote ndihmon klientet te blejne me besim dhe ekipin tuaj te operoje me qetesi.',
      sections: [
        { title: 'Cfare ju duhet', body: ['Titulli, pershkrimi, kategoria, data, venue, imazhet, llojet e biletave, kapaciteti, kushtet e rimbursimit dhe kontaktet e organizatorit.'] },
        { title: 'Lista para publikimit', body: ['Konfirmoni detajet publike, shikoni parapamjen, testoni sasite e biletave dhe sigurohuni qe ekipi njeh skanimin.'] },
      ],
      cta: { title: 'Ndertoni eventin', body: 'Shkoni te mjetet e organizatorit per te krijuar ose menaxhuar evente.', primary: ['Hap Mjetet e Organizatorit', '/organizer'] },
    },
    'event.terms': {
      title: 'Kushtet e Sherbimit',
      subtitle: 'Rregullat per perdorimin e Tiketa si bleres, organizator ose vizitor.',
      eyebrow: 'Ligjore',
      lead: 'Keto kushte rregullojne aksesin ne Tiketa, blerjen e biletave, listat e organizatoreve, llogarite, pagesat dhe permbajtjen.',
      sections: [
        { title: 'Roli i marketplace', body: ['Tiketa ofron teknologji qe ndihmon organizatoret te listojne evente dhe te shesin bileta. Organizatori mban pergjegjesine per saktesine dhe realizimin e eventit.'] },
        { title: 'Llogarite', body: ['Ju jeni pergjegjes per informacion te sakte dhe sigurine e kredencialeve. Tiketa mund te kufizoje llogari qe krijojne rrezik.'] },
        { title: 'Pagesat dhe biletat', body: ['Cmimet vendosen nga organizatoret pervec rasteve kur thuhet ndryshe. Tarifa dhe taksa mund te aplikohen dhe shfaqen ne checkout kur eshte e mundur.'] },
        { title: 'Perdorim i pranueshem', body: ['Mos abuzoni platformen, mos grumbulloni te dhena ne mase, mos publikoni evente mashtruese dhe mos e perdorni Tiketa per aktivitet ilegal.'] },
        { title: 'Kufizime', body: ['Tiketa punon per sherbim te besueshem, por operimi i eventit kontrollohet nga organizatoret dhe venue-t. Disponueshmeria mund te ndryshoje.'] },
      ],
    },
    'event.privacy': {
      title: 'Politika e Privatësisë',
      subtitle: 'Si Tiketa mbledh, perdor, mbron dhe ndan informacion personal.',
      eyebrow: 'Ligjore',
      lead: 'Ne perpunojme informacion personal per bileta, llogari, mbeshtetje, siguri, pagesa dhe funksione marketplace.',
      sections: [
        { title: 'Informacioni qe mbledhim', body: ['Mund te mbledhim detaje llogarie, kontakte, histori porosish, te dhena pjesemarrjeje, profile organizatori, mesazhe mbeshtetjeje, te dhena pajisjeje dhe perdorimi.'] },
        { title: 'Si e perdorim', body: ['E perdorim per te procesuar porosi, dorezuar bileta, ofruar mbeshtetje, mbrojtur llogari, permiresuar platformen dhe komunikuar perditesime te rendesishme.'] },
        { title: 'Ndarja', body: ['Mund te ndajme informacion te nevojshem me organizatore, ofrues pagesash, furnizues sherbimesh dhe autoritete ligjore kur kerkohet.'] },
        { title: 'Zgjedhjet tuaja', body: ['Mund te menaxhoni detajet e llogarise, cookie-t ne browser dhe preferencat e marketingut. Disa funksione thelbesore kerkojne te dhena operative.'] },
      ],
    },
    'event.cookies': {
      title: 'Politika e Cookies',
      subtitle: 'Si Tiketa perdor cookies dhe teknologji te ngjashme.',
      eyebrow: 'Ligjore',
      lead: 'Cookies ndihmojne Tiketa te mbaje sesione te sigurta, te ruaje preferenca, te mase performance dhe te permiresoje funksionalitetin.',
      sections: [
        { title: 'Cookies thelbesore', body: ['Mbajne login, sigurine, preferencen e gjuhes, vazhdimesine e checkout dhe funksione baze.'] },
        { title: 'Cookies performance', body: ['Na ndihmojne te kuptojme performancen, gabimet dhe prirjet agregate te perdorimit.'] },
        { title: 'Menaxhimi i cookies', body: ['Mund t’i menaxhoni nga browser-i. Caktivizimi i cookie-ve thelbesore mund te pengoje login, checkout ose dashboard.'] },
      ],
    },
    'dining.about': {
      title: 'Rreth Tiketa Dining',
      subtitle: 'Nje platforme rezervimesh per restorante, bare, lounge, kafene dhe mysafire qe duan prenotim me te lehte.',
      eyebrow: 'Kompania',
      lead: 'Tiketa Dining lidh mysafiret me venue mikpritjeje dhe u jep pronareve mjete per rezervime, disponueshmeri, komunikim dhe menaxhim profili.',
      cards: [
        { icon: 'bi-search-heart', title: 'Zbulim i kuruar', body: 'Mysafiret mund te gjejne restorante dhe bare sipas qytetit, stilit, kuzhines, faciliteteve dhe disponueshmerise.' },
        { icon: 'bi-calendar-check', title: 'Rezervime te qarta', body: 'Kerkesat perfshijne numrin e personave, oren, kontaktet dhe shenimet ne nje rrjedhe te qendrueshme.' },
        { icon: 'bi-shop-window', title: 'Operime per pronare', body: 'Pronaret menaxhojne profile, imazhe, facilitete, orare, data te bllokuara dhe status rezervimesh.' },
      ],
      sections: [
        { title: 'Fokus te mikpritja', body: ['Tiketa Dining eshte ndertuar per venue qe vleresojne rezervim te besueshem, informacion te sakte dhe eksperience te kuruar per mysafiret.', 'Platforma mbeshtet restorante, bare, lounge, kafene dhe venue destinacioni qe duan te zbulohen dhe menaxhohen me lehte.'] },
      ],
      cta: { title: 'Gjeni tavolinen e radhes', body: 'Shfletoni restorantet dhe baret ne Tiketa Dining.', primary: ['Zbulo Restorante', '/restaurants'], secondary: ['Bëhu Partner', '/become-restaurant-partner'] },
    },
    'dining.contact': {
      title: 'Kontakto Tiketa Dining',
      subtitle: 'Kontaktoni ekipin Tiketa Dining per mbeshtetje rezervimesh, mysafiresh ose partneresh.',
      eyebrow: 'Kompania',
      lead: 'Perfshini emrin e restorantit, daten dhe oren e rezervimit, emailin e mysafirit dhe nje pershkrim te shkurter.',
      contacts: sqContacts.dining,
      sections: [
        { title: 'Per mysafiret', body: ['Na kontaktoni per pyetje rezervimi, probleme konfirmimi, udhezim anulimi, akses llogarie ose komunikim me venue.'] },
        { title: 'Per pronaret', body: ['Mbeshtetja e partnereve ndihmon me konfigurim venue, cilesi profili, disponueshmeri, rrjedha rezervimi dhe dashboard.'] },
      ],
      cta: { title: 'Keni nevoje per ndihme me rezervim?', body: 'Hapni mbeshtetjen e rezervimeve per detajet qe duhen perfshire.', primary: ['Mbeshtetje Rezervimesh', '/reservation-support'] },
    },
    'dining.partner': {
      title: 'Bëhu Partner Restoranti',
      subtitle: 'Sillni restorantin, barin, lounge-in ose kafenen tuaj te mysafiret qe kerkojne eksperienca mikpritjeje.',
      eyebrow: 'Pronaret e Restoranteve',
      lead: 'Tiketa Dining ndihmon venue-t te prezantojne profile te sakta, te marrin kerkesa rezervimi dhe te menaxhojne komunikimin.',
      cards: [
        { icon: 'bi-window', title: 'Profil i kuruar venue', body: 'Shfaqni tipin, pershkrimin, qytetin, adresen, galerine, kuzhinen, facilitetet dhe opsionet e pageses.' },
        { icon: 'bi-calendar2-week', title: 'Kontrolle disponueshmerie', body: 'Menaxhoni oraret, horizontin e rezervimit, limitet e mysafireve, intervalet, blackout dhe oraret speciale.' },
        { icon: 'bi-clipboard2-check', title: 'Menaxhim rezervimesh', body: 'Rishikoni kerkesa, konfirmoni rezervime, trajtoni anulime dhe monitoroni ardhjet.' },
      ],
      cta: { title: 'Listoni venue-n', body: 'Krijoni ose menaxhoni profilin nga hapesira e pronarit.', primary: ['Listo Restorantin', '/owner-venue'], secondary: ['Lexo Udhezuesin', '/restaurant-owner-guide'] },
    },
    'dining.ownerGuide': {
      title: 'Udhezues per Pronaret e Restoranteve',
      subtitle: 'Krijoni profil te besueshem dhe menaxhoni rezervime me siguri.',
      eyebrow: 'Pronaret e Restoranteve',
      lead: 'Informacioni i plote dhe i sakte ndihmon mysafiret te zgjedhin vendin e duhur dhe ekipin tuaj te pergatitet.',
      sections: [
        { title: 'Ndertoni profilin', body: ['Shtoni emrin, tipin, pershkrimin, telefonin, emailin, website, adresen, qytetin, shtetin dhe lokacionin ne harte.', 'Ngarkoni foto cilesore qe tregojne hapesiren reale.'] },
        { title: 'Konfiguroni disponueshmerine', body: ['Mbani aktuale oraret, oraret speciale, datat e bllokuara, horizontin e rezervimit, limitet dhe intervalet.'] },
        { title: 'Menaxhoni kerkesat', body: ['Rishikoni shpejt rezervimet ne pritje, konfirmoni ato te pranuara dhe shtoni arsye anulimi kur nuk mund t’i prisni.'] },
        { title: 'Mbani komunikim te qarte', body: ['Perdorini shenimet dhe kontaktet me pergjegjesi. Perditesoni detajet kur politikat, oraret ose disponueshmeria ndryshojne.'] },
      ],
      cta: { title: 'Hap mjetet e pronarit', body: 'Menaxhoni profilin dhe rezervimet e restorantit ose barit.', primary: ['Hapesira e Pronarit', '/owner-venue'] },
    },
    'dining.list': {
      title: 'Listo Restorantin',
      subtitle: 'Krijoni nje profil venue qe mysafiret mund ta zbulojne dhe te kerkojne rezervim.',
      eyebrow: 'Pronaret e Restoranteve',
      lead: 'Nje liste e forte u jep mysafireve informacionin praktik qe u duhet para rezervimit.',
      sections: [
        { title: 'Kerkesat e listes', body: ['Pergatitni emrin, tipin, pershkrimin, kontaktet, adresen, fotot, llojet e kuzhines, facilitetet, opsionet e pageses dhe oraret.'] },
        { title: 'Para publikimit', body: ['Shikoni faqen publike, kontrolloni rregullat e rezervimit, testoni limitet dhe sigurohuni qe ekipi di si te rishikoje kerkesat.'] },
      ],
      cta: { title: 'Krijoni listen', body: 'Hapni hapesiren e pronarit per te shtuar ose perditesuar venue-n.', primary: ['Listo Restorantin', '/owner-venue'] },
    },
    'dining.how': {
      title: 'Si Funksionojne Rezervimet',
      subtitle: 'Nje rrjedhe e thjeshte per te zbuluar venue, zgjedhur oren dhe marre konfirmim.',
      eyebrow: 'Rezervimet',
      lead: 'Tiketa Dining mban rrjedhen e mysafirit te qarte dhe u jep restoranteve e bareve kontroll mbi disponueshmerine.',
      sections: [
        { title: '1. Zbuloni nje venue', body: ['Shfletoni restorante, bare, lounge dhe kafene sipas qytetit, tipit, kuzhines, faciliteteve dhe statusit te zgjedhur.'] },
        { title: '2. Zgjidhni detajet', body: ['Zgjidhni daten, oren, numrin e personave dhe cdo rast apo kerkese speciale qe venue duhet ta dije.'] },
        { title: '3. Dergoni kerkesen', body: ['Dergo kerkesen me kontakte te sakta qe venue te mund te pergjigjet.'] },
        { title: '4. Merrni konfirmim', body: ['Restoranti ose bari e rishikon kerkesen dhe e konfirmon, perditeson ose anulon sipas disponueshmerise dhe politikes.'] },
      ],
      cta: { title: 'Gati per rezervim?', body: 'Eksploroni restorante dhe bare qe pranojne kerkesa rezervimi.', primary: ['Gjej Tavoline', '/restaurants'] },
    },
    'dining.support': {
      title: 'Mbeshtetje per Rezervime',
      subtitle: 'Ndihme per kerkesa, konfirmime, anulime, detaje mysafiresh dhe komunikim me venue.',
      eyebrow: 'Rezervimet',
      lead: 'Mbeshtetja funksionon me mire kur perfshin venue, daten, oren, emrin e mysafirit dhe emailin e llogarise.',
      sections: [
        { title: 'Mbeshtetje per mysafire', body: ['Na kontaktoni nese nuk gjeni rezervimin, keni nevoje te kuptoni statusin, keni futur detaje gabim ose nuk arrini venue-n.'] },
        { title: 'Mbeshtetje per pronare', body: ['Ekipet e venue-ve mund te kerkojne ndihme per statuset, kalendarin, disponueshmerine, anulimet dhe komunikimin.'] },
        { title: 'Kohe urgjente', body: ['Per rezervime te se njejtes dite, kontaktoni venue-n direkt kur eshte e mundur dhe dergoni Tiketa Dining detajet.'] },
      ],
      contacts: sqContacts.dining,
      faqs: [
        ['A konfirmohet menjehere kerkesa e rezervimit?', 'Jo. Kerkesa konfirmohet vetem pasi venue kontrollon disponueshmerine dhe e pranon.'],
        ['Si i ndryshoj detajet e rezervimit?', 'Kontaktoni venue-n kur eshte e mundur dhe dergoni mbeshtetjes emrin e venue-s, daten, oren dhe detajet e reja.'],
        ['Cfare ndodh nese venue anulon?', 'Regjistrimi mbetet i dukshem per rishikim dhe mbeshtetja mund te ndihmoje me arsyen e anulimit.'],
      ],
      cta: { title: 'Rishikoni politiken', body: 'Kuptoni si trajtohen ndryshimet dhe anulimet.', primary: ['Politika e Rezervimeve', '/reservation-policy'] },
    },
    'dining.policy': {
      title: 'Politika e Rezervimeve',
      subtitle: 'Si Tiketa Dining trajton kerkesat, konfirmimet, anulimet dhe pergjegjesite e mysafireve.',
      eyebrow: 'Rezervimet',
      lead: 'Disponueshmeria kontrollohet nga cdo restorant ose bar. Tiketa Dining ofron rrjedhen e platformes dhe mbeshtetjen.',
      sections: [
        { title: 'Kerkesa dhe konfirmime', body: ['Dergimi i kerkeses nuk garanton tavoline derisa venue ta konfirmoje. Mysafiret duhet te ndjekin perditesimet dhe te vijne sipas detajeve te konfirmuara.'] },
        { title: 'Anulimet', body: ['Mysafiret duhet te anulojne sa me heret nese planet ndryshojne. Venue-t mund te anulojne kur kapaciteti, oraret, eventet private ose operimet nuk e lejojne.'] },
        { title: 'Pergjegjesite e mysafirit', body: ['Perdorni kontakte te sakta, ejani ne kohe, respektoni rregullat dhe kontaktoni venue-n nese ndryshon numri i personave ose ora.'] },
        { title: 'Pergjegjesite e venue', body: ['Venue-t duhet te mbajne disponueshmerine te sakte, te pergjigjen shpejt dhe te japin arsye te qarta anulimi kur nuk mund te presin rezervimin.'] },
      ],
      cta: { title: 'Keni nevoje per ndihme?', body: 'Kontaktoni mbeshtetjen me emrin e venue dhe detajet e rezervimit.', primary: ['Mbeshtetje Rezervimesh', '/reservation-support'] },
    },
  };

  const pages = { en, sq };
  const defaultEventSocialImage = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80';
  const defaultDiningSocialImage = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80';

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function currentLanguage() {
    return window.TiketaLanguage?.getLanguage?.() || 'en';
  }

  function pageFor(key) {
    const language = currentLanguage();
    return pages[language]?.[key] || pages.en[key];
  }

  function cleanPath() {
    const path = window.location.pathname.replace(/^\/site\//, '/').replace(/\.html$/, '');
    return path === '/welcome' ? '/' : path;
  }

  function absoluteUrl(path) {
    return new URL(path || '/', 'https://tiketa.example').href;
  }

  function setSocialMeta(selector, attr, value) {
    const content = String(value || '').replace(/\s+/g, ' ').trim();
    if (!content) return;
    let meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement('meta');
      const [name, key] = attr;
      meta.setAttribute(name, key);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function applyStaticSocialMeta(key, data) {
    const title = `${data.title} | Tiketa`;
    const description = data.subtitle || data.lead || 'Discover Tiketa events, reservations, support, and platform information.';
    const image = key.startsWith('dining.') ? defaultDiningSocialImage : defaultEventSocialImage;
    const url = absoluteUrl(cleanPath());

    setSocialMeta('meta[property="og:title"]', ['property', 'og:title'], title);
    setSocialMeta('meta[property="og:description"]', ['property', 'og:description'], description);
    setSocialMeta('meta[property="og:image"]', ['property', 'og:image'], image);
    setSocialMeta('meta[property="og:url"]', ['property', 'og:url'], url);
    setSocialMeta('meta[property="og:type"]', ['property', 'og:type'], 'website');
    setSocialMeta('meta[property="og:site_name"]', ['property', 'og:site_name'], 'Tiketa');
    setSocialMeta('meta[name="twitter:card"]', ['name', 'twitter:card'], 'summary_large_image');
    setSocialMeta('meta[name="twitter:title"]', ['name', 'twitter:title'], title);
    setSocialMeta('meta[name="twitter:description"]', ['name', 'twitter:description'], description);
    setSocialMeta('meta[name="twitter:image"]', ['name', 'twitter:image'], image);
  }

  function cardMarkup(card) {
    const body = card.body || card.value || '';
    return `<article class="content-card">
      <div class="content-icon"><i class="bi ${esc(card.icon || 'bi-info-circle')}"></i></div>
      <h3>${esc(card.title)}</h3>
      <p>${esc(body)}</p>
    </article>`;
  }

  function sectionMarkup(section) {
    const body = Array.isArray(section.body) ? section.body : [section.body];
    return `<section>
      <h2>${esc(section.title)}</h2>
      ${body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}
    </section>`;
  }

  function contactsMarkup(contacts) {
    if (!contacts?.length) return '';
    return `<section class="section-sm"><div class="container-xxl"><div class="content-grid">
      ${contacts.map(cardMarkup).join('')}
    </div></div></section>`;
  }

  function faqMarkup(faqs) {
    if (!faqs?.length) return '';
    return `<section class="section-sm"><div class="container-xxl"><div class="accordion" id="staticFaqAccordion">
      ${faqs.map(([question, answer], index) => `
        <div class="accordion-item">
          <h2 class="accordion-header"><button class="accordion-button ${index ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#staticFaq${index}">${esc(question)}</button></h2>
          <div id="staticFaq${index}" class="accordion-collapse collapse ${index ? '' : 'show'}" data-bs-parent="#staticFaqAccordion"><div class="accordion-body">${esc(answer)}</div></div>
        </div>
      `).join('')}
    </div></div></section>`;
  }

  function setFaqSchema(faqs) {
    let script = document.querySelector('script[type="application/ld+json"][data-faq-schema]');
    if (!faqs?.length) {
      script?.remove();
      return;
    }

    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.faqSchema = 'true';
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: window.TiketaLanguage?.getLanguage?.() || 'en',
      mainEntity: faqs.map(([question, answer]) => ({
        '@type': 'Question',
        name: String(question || '').trim(),
        acceptedAnswer: {
          '@type': 'Answer',
          text: String(answer || '').trim(),
        },
      })),
    });
    window.TiketaLanguage?.applyInternationalSeo?.();
  }

  function ctaMarkup(cta) {
    if (!cta) return '';
    const secondary = cta.secondary ? `<a class="btn btn-ghost" href="${esc(cta.secondary[1])}">${esc(cta.secondary[0])}</a>` : '';
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
    if (description) description.setAttribute('content', data.subtitle);
    applyStaticSocialMeta(root.dataset.staticPage, data);
    setFaqSchema(data.faqs);

    root.innerHTML = `
      <section class="content-hero">
        <div class="container-xxl">
          <div class="eyebrow">${esc(data.eyebrow || '')}</div>
          <h1>${esc(data.title)}</h1>
          <p class="content-lead mt-3">${esc(data.subtitle)}</p>
          ${data.lead ? `<p class="content-lead mt-3">${esc(data.lead)}</p>` : ''}
        </div>
      </section>
      ${data.cards?.length ? `<section class="section-sm"><div class="container-xxl"><div class="content-grid">${data.cards.map(cardMarkup).join('')}</div></div></section>` : ''}
      ${contactsMarkup(data.contacts)}
      ${data.sections?.length ? `<section class="section-sm"><div class="container-xxl"><div class="policy-content">${data.sections.map(sectionMarkup).join('')}</div></div></section>` : ''}
      ${faqMarkup(data.faqs)}
      ${ctaMarkup(data.cta)}
    `;
  }

  function renderAll() {
    document.querySelectorAll('[data-static-page]').forEach(renderPage);
  }

  document.addEventListener('DOMContentLoaded', renderAll);
  document.addEventListener('tiketa:language-changed', renderAll);
})();
