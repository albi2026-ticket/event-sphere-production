<?php

namespace App\Services\Tickets;

use App\Models\Ticket;
use Carbon\CarbonInterface;

class TicketPdfService
{
    private const EVENT_DISPLAY_TIMEZONE = 'Europe/Pristina';

    private const EVENT_CALCULATION_TIMEZONE = 'Europe/Belgrade';

    private const PAGE_WIDTH = 595.28;

    private const PAGE_HEIGHT = 841.89;

    public function __construct(private readonly TicketService $tickets) {}

    /**
     * @return array{filename: string, content: string}
     */
    public function download(Ticket $ticket): array
    {
        $ticket->loadMissing([
            'user',
            'event',
            'ticketType',
            'order.user',
            'order.items.ticketType',
            'order.tickets.ticketType',
            'order.tickets.user',
            'orderItem',
        ]);

        return [
            'filename' => 'event-sphere-ticket-'.$ticket->ticket_code.'.pdf',
            'content' => $this->render($ticket),
        ];
    }

    protected function render(Ticket $ticket): string
    {
        $pdf = new SimpleTicketPdf(self::PAGE_WIDTH, self::PAGE_HEIGHT);

        $event = $ticket->event;
        $order = $ticket->order;
        $item = $ticket->orderItem;
        $currency = strtoupper($order?->currency ?: $event?->currency ?: 'USD');
        $ticketPrice = (float) ($item?->unit_price ?: $ticket->ticketType?->price ?: 0);
        $attendeeName = $ticket->attendee_name ?: $ticket->user?->name ?: 'Guest';
        $attendeeEmail = $ticket->attendee_email ?: $ticket->user?->email;
        $eventDate = $this->eventDate($event?->starts_at, $event?->timezone);
        $venue = $this->venueLabel($ticket);
        $city = $event?->city ?: '-';

        $this->renderEntryTicketPage($pdf, $ticket, [
            'event_title' => $event?->title ?: 'Event',
            'event_date' => $this->dateLabel($eventDate),
            'event_time' => $this->timeLabel($eventDate),
            'timezone' => $this->timezoneLabel($event?->starts_at, $event?->timezone),
            'venue' => $venue,
            'city' => $city,
            'ticket_type' => $ticket->ticketType?->name ?: 'Ticket',
            'attendee_name' => $attendeeName,
            'attendee_email' => $attendeeEmail ?: '-',
            'order_number' => $order?->order_number ?: '-',
            'ticket_number' => $ticket->ticket_code ?: (string) $ticket->id,
            'ticket_uuid' => (string) $ticket->ticket_uuid,
            'ticket_status' => strtoupper((string) $ticket->status),
            'ticket_price' => $this->money($ticketPrice, $currency),
        ]);

        $this->renderReceiptPage($pdf, $ticket, [
            'event_title' => $event?->title ?: 'Event',
            'event_date' => $this->dateLabel($eventDate),
            'event_time' => $this->timeLabel($eventDate),
            'timezone' => $this->timezoneLabel($event?->starts_at, $event?->timezone),
            'venue' => $venue,
            'purchaser_name' => $order?->user?->name ?: $ticket->user?->name ?: $attendeeName,
            'purchaser_email' => $order?->user?->email ?: $ticket->user?->email ?: $attendeeEmail ?: '-',
            'order_number' => $order?->order_number ?: '-',
            'purchase_date' => $this->purchaseDate($order?->paid_at ?: $order?->created_at),
            'payment_status' => strtoupper((string) ($order?->payment_status ?: 'PAID')),
            'currency' => $currency,
        ]);

        return $pdf->output();
    }

    /**
     * @param array<string, string> $data
     */
    protected function renderEntryTicketPage(SimpleTicketPdf $pdf, Ticket $ticket, array $data): void
    {
        $pdf->addPage();
        $this->pageBackground($pdf);

        $pdf->setFillColor(15, 23, 42);
        $pdf->rect(0, 0, self::PAGE_WIDTH, 132, true);
        $pdf->setFillColor(37, 99, 235);
        $pdf->rect(42, 34, 42, 42, true);
        $pdf->setTextColor(255, 255, 255);
        $pdf->text(51, 60, 'ES', 17, true);
        $pdf->text(102, 45, 'EVENT SPHERE', 15, true);
        $pdf->text(102, 66, 'Your Ticket to Great Events', 11);
        $pdf->text(42, 104, 'ENTRY TICKET', 28, true);

        $pdf->setFillColor(255, 255, 255);
        $pdf->setStrokeColor(226, 232, 240);
        $pdf->rect(34, 154, 527, 620, true, true);
        $pdf->setFillColor(248, 250, 252);
        $pdf->rect(34, 154, 527, 86, true);

        $pdf->setTextColor(15, 23, 42);
        $pdf->text(58, 188, $data['event_title'], 26, true, 460);
        $pdf->setTextColor(71, 85, 105);
        $pdf->text(58, 224, $data['event_date'].'  |  '.$data['event_time'].'  |  '.$data['timezone'], 11, false, 350);
        $this->statusPill($pdf, 428, 188, $data['ticket_status']);

        $pdf->setTextColor(15, 23, 42);
        $pdf->sectionTitle(58, 276, 'Event Details');
        $pdf->field(58, 304, 'Venue', $data['venue']);
        $pdf->field(58, 354, 'City', $data['city']);
        $pdf->field(58, 404, 'Ticket Type', $data['ticket_type']);
        $pdf->field(58, 454, 'Attendee', $data['attendee_name']);
        $pdf->field(58, 504, 'Order Number', $data['order_number']);
        $pdf->field(58, 554, 'Ticket Number', $data['ticket_number']);

        $pdf->setFillColor(255, 255, 255);
        $pdf->setStrokeColor(15, 23, 42);
        $pdf->rect(324, 278, 210, 210, true, true);
        $pdf->drawQrSvg($this->tickets->qrSvg($ticket, 320), 342, 296, 174);
        $pdf->setTextColor(15, 23, 42);
        $pdf->text(318, 514, 'Scan this QR code at the venue entrance.', 12, true, 222, 'center');
        $pdf->setTextColor(71, 85, 105);
        $pdf->text(318, 536, 'Event Sphere Verification', 9, true, 222, 'center');
        $pdf->text(318, 558, $data['ticket_uuid'], 7, false, 222, 'center');

        $pdf->setStrokeColor(226, 232, 240);
        $pdf->line(58, 638, 536, 638);
        $pdf->setTextColor(71, 85, 105);
        $pdf->text(58, 670, 'Present this page at entry. Keep the QR code bright, flat, and unobstructed for scanning.', 10, false, 450);
        $pdf->text(58, 704, 'Valid for one entry only. Duplicate, altered, cancelled, refunded, or already checked-in tickets are not valid.', 10, false, 450);
        $pdf->setTextColor(15, 23, 42);
        $pdf->text(58, 744, 'Event Sphere', 10, true);
        $pdf->setTextColor(100, 116, 139);
        $pdf->text(448, 744, 'Page 1 of 2', 9);
    }

    /**
     * @param array<string, string> $data
     */
    protected function renderReceiptPage(SimpleTicketPdf $pdf, Ticket $ticket, array $data): void
    {
        $order = $ticket->order;
        $items = $order?->items ?: collect([$ticket->orderItem])->filter();
        $attendees = $order?->tickets ?: collect([$ticket]);

        $pdf->addPage();
        $this->pageBackground($pdf);

        $pdf->setTextColor(15, 23, 42);
        $pdf->text(42, 54, 'Event Sphere', 15, true);
        $pdf->setTextColor(37, 99, 235);
        $pdf->text(42, 82, 'Ticket Purchase Receipt', 26, true);
        $pdf->setTextColor(100, 116, 139);
        $pdf->text(42, 108, 'This page is your proof of purchase. It is not required for QR scanning.', 10);
        $this->statusPill($pdf, 428, 62, $data['payment_status']);

        $this->sectionCard($pdf, 42, 142, 244, 116, 'Purchaser Information');
        $pdf->field(62, 184, 'Purchaser Name', $data['purchaser_name']);
        $pdf->field(62, 224, 'Purchaser Email', $data['purchaser_email']);

        $this->sectionCard($pdf, 310, 142, 244, 116, 'Order Information');
        $pdf->field(330, 184, 'Order Number', $data['order_number']);
        $pdf->field(330, 224, 'Purchase Date', $data['purchase_date']);

        $this->sectionCard($pdf, 42, 286, 512, 102, 'Event Information');
        $pdf->field(62, 328, 'Event Name', $data['event_title']);
        $pdf->field(62, 368, 'Event Date / Time', $data['event_date'].' at '.$data['event_time'].' '.$data['timezone']);
        $pdf->field(318, 368, 'Venue', $data['venue']);

        $pdf->sectionTitle(42, 430, 'Ticket Breakdown');
        $pdf->setFillColor(241, 245, 249);
        $pdf->rect(42, 448, 512, 30, true);
        $pdf->setTextColor(15, 23, 42);
        $pdf->text(58, 468, 'Ticket Type', 9, true);
        $pdf->text(300, 468, 'Qty', 9, true);
        $pdf->text(362, 468, 'Unit Price', 9, true);
        $pdf->text(466, 468, 'Subtotal', 9, true);

        $y = 500;
        foreach ($items as $lineItem) {
            $qty = max(1, (int) ($lineItem?->quantity ?? 1));
            $unit = (float) ($lineItem?->unit_price ?? $ticket->ticketType?->price ?? 0);
            $subtotal = $qty * $unit;
            $pdf->setTextColor(15, 23, 42);
            $pdf->text(58, $y, $lineItem?->ticket_type_name ?: $lineItem?->ticketType?->name ?: $ticket->ticketType?->name ?: 'Ticket', 10, false, 210);
            $pdf->text(304, $y, (string) $qty, 10);
            $pdf->text(362, $y, $this->money($unit, $data['currency']), 10);
            $pdf->text(466, $y, $this->money($subtotal, $data['currency']), 10);
            $pdf->setStrokeColor(226, 232, 240);
            $pdf->line(42, $y + 18, 554, $y + 18);
            $y += 36;
        }

        $serviceFee = (float) ($order?->service_fee ?? $items->sum(fn ($lineItem) => (float) ($lineItem?->service_fee ?? 0)));
        $totalPaid = (float) ($order?->total ?? ($items->sum(fn ($lineItem) => (float) ($lineItem?->total ?? 0)) + $serviceFee));
        $summaryY = max($y + 8, 600);
        $pdf->setTextColor(71, 85, 105);
        $pdf->text(362, $summaryY, 'Service Fee', 10, true);
        $pdf->text(466, $summaryY, $this->money($serviceFee, $data['currency']), 10);
        $pdf->setTextColor(15, 23, 42);
        $pdf->text(362, $summaryY + 28, 'Total Paid', 12, true);
        $pdf->text(466, $summaryY + 28, $this->money($totalPaid, $data['currency']), 12, true);

        $pdf->sectionTitle(42, 664, 'Attendees');
        $attendeeY = 692;
        foreach ($attendees->take(5) as $index => $attendeeTicket) {
            $name = $attendeeTicket->attendee_name ?: $attendeeTicket->user?->name ?: 'Guest';
            $email = $attendeeTicket->attendee_email ?: $attendeeTicket->user?->email ?: '-';
            $pdf->setTextColor(15, 23, 42);
            $pdf->text(58, $attendeeY, ($index + 1).'. '.$name, 10, true, 220);
            $pdf->setTextColor(71, 85, 105);
            $pdf->text(300, $attendeeY, $email, 9, false, 220);
            $attendeeY += 24;
        }

        $pdf->setStrokeColor(226, 232, 240);
        $pdf->line(42, 782, 554, 782);
        $pdf->setTextColor(15, 23, 42);
        $pdf->text(42, 808, 'Event Sphere', 10, true);
        $pdf->setTextColor(100, 116, 139);
        $pdf->text(152, 808, 'This receipt was generated automatically.', 9);
        $pdf->text(470, 808, 'Page 2 of 2', 9);
    }

    protected function eventDate(?CarbonInterface $date, ?string $timezone): ?CarbonInterface
    {
        return $date?->copy()->setTimezone($this->calculationTimezone($timezone));
    }

    protected function dateLabel(?CarbonInterface $date): string
    {
        return $date?->format('M j, Y') ?: 'Date to be announced';
    }

    protected function timeLabel(?CarbonInterface $date): string
    {
        return $date?->format('g:i A') ?: 'Time to be announced';
    }

    protected function timezoneLabel(?CarbonInterface $date, ?string $timezone): string
    {
        $eventDate = $this->eventDate($date, $timezone);

        if (! $eventDate) {
            return 'UTC+2';
        }

        $offset = str_replace(':00', '', $eventDate->format('P'));
        $offset = preg_replace('/^([+-])0(\d)$/', '$1$2', $offset) ?: $offset;

        return 'UTC'.$offset;
    }

    protected function purchaseDate(?CarbonInterface $date): string
    {
        return $date?->copy()->setTimezone(config('app.timezone'))->format('M j, Y g:i A T') ?: '-';
    }

    protected function venueLabel(Ticket $ticket): string
    {
        $event = $ticket->event;
        $parts = array_filter([
            $event?->venue_name,
            $event?->address,
            $event?->city,
            $event?->country,
        ]);

        return $parts ? implode(', ', $parts) : 'Venue to be announced';
    }

    protected function money(float $amount, string $currency): string
    {
        return $currency.' '.number_format($amount, 2);
    }

    protected function pageBackground(SimpleTicketPdf $pdf): void
    {
        $pdf->setFillColor(255, 255, 255);
        $pdf->rect(0, 0, self::PAGE_WIDTH, self::PAGE_HEIGHT, true);
        $pdf->setFillColor(248, 250, 252);
        $pdf->rect(0, self::PAGE_HEIGHT - 56, self::PAGE_WIDTH, 56, true);
    }

    protected function statusPill(SimpleTicketPdf $pdf, float $x, float $y, string $label): void
    {
        $pdf->setFillColor(219, 234, 254);
        $pdf->setStrokeColor(147, 197, 253);
        $pdf->rect($x, $y, 106, 32, true, true);
        $pdf->setTextColor(30, 64, 175);
        $pdf->text($x, $y + 20, strtoupper($label), 9, true, 106, 'center');
    }

    protected function sectionCard(SimpleTicketPdf $pdf, float $x, float $y, float $w, float $h, string $title): void
    {
        $pdf->setFillColor(255, 255, 255);
        $pdf->setStrokeColor(226, 232, 240);
        $pdf->rect($x, $y, $w, $h, true, true);
        $pdf->sectionTitle($x + 20, $y + 28, $title);
    }

    protected function displayTimezone(?string $timezone): string
    {
        return $timezone ?: self::EVENT_DISPLAY_TIMEZONE;
    }

    protected function calculationTimezone(?string $timezone): string
    {
        $timezone = $this->displayTimezone($timezone);

        return $timezone === self::EVENT_DISPLAY_TIMEZONE
            ? self::EVENT_CALCULATION_TIMEZONE
            : $timezone;
    }
}

class SimpleTicketPdf
{
    private int $pages = 0;

    /**
     * @var array<int, string>
     */
    private array $pageContents = [];

    private array $objects = [];

    public function __construct(
        private readonly float $width,
        private readonly float $height,
    ) {}

    public function addPage(): void
    {
        $this->pages++;
        $this->pageContents[$this->pages] = '';
    }

    public function setFillColor(int $r, int $g, int $b): void
    {
        $this->append(sprintf("%.3F %.3F %.3F rg\n", $r / 255, $g / 255, $b / 255));
    }

    public function setStrokeColor(int $r, int $g, int $b): void
    {
        $this->append(sprintf("%.3F %.3F %.3F RG\n", $r / 255, $g / 255, $b / 255));
    }

    public function setTextColor(int $r, int $g, int $b): void
    {
        $this->append(sprintf("%.3F %.3F %.3F rg\n", $r / 255, $g / 255, $b / 255));
    }

    public function rect(float $x, float $y, float $w, float $h, bool $fill = false, bool $stroke = false): void
    {
        $operator = $fill && $stroke ? 'B' : ($fill ? 'f' : 'S');
        $this->append(sprintf("%.2F %.2F %.2F %.2F re %s\n", $x, $this->height - $y - $h, $w, $h, $operator));
    }

    public function line(float $x1, float $y1, float $x2, float $y2): void
    {
        $this->append(sprintf("%.2F %.2F m %.2F %.2F l S\n", $x1, $this->height - $y1, $x2, $this->height - $y2));
    }

    public function text(float $x, float $y, string $text, int $size = 10, bool $bold = false, float $maxWidth = 0, string $align = 'left'): void
    {
        $lines = $maxWidth > 0 ? $this->wrap($text, $size, $maxWidth) : [$text];
        foreach ($lines as $index => $line) {
            $tx = $x;
            if ($align === 'center' && $maxWidth > 0) {
                $tx = $x + max(0, ($maxWidth - $this->textWidth($line, $size)) / 2);
            }
            $font = $bold ? 'F2' : 'F1';
            $this->append(sprintf("BT /%s %d Tf %.2F %.2F Td (%s) Tj ET\n", $font, $size, $tx, $this->height - $y - ($index * ($size + 4)), $this->escape($line)));
        }
    }

    public function sectionTitle(float $x, float $y, string $title): void
    {
        $this->setTextColor(37, 99, 235);
        $this->text($x, $y, strtoupper($title), 11, true);
        $this->setTextColor(15, 23, 42);
    }

    public function field(float $x, float $y, string $label, string $value): void
    {
        $this->setTextColor(100, 116, 139);
        $this->text($x, $y, $label, 8, true);
        $this->setTextColor(15, 23, 42);
        $this->text($x, $y + 16, $value, 11, false, 210);
    }

    public function drawQrSvg(string $svg, float $x, float $y, float $size): void
    {
        if (! preg_match('/viewBox="0 0 ([\d.]+) ([\d.]+)"/', $svg, $viewBox)) {
            return;
        }

        $viewSize = (float) $viewBox[1];
        $scale = $size / $viewSize;
        $this->setFillColor(255, 255, 255);
        $this->rect($x, $y, $size, $size, true);
        $this->setFillColor(0, 0, 0);

        preg_match_all('/M([\d.]+),([\d.]+)L([\d.]+),([\d.]+)L([\d.]+),([\d.]+)L([\d.]+),([\d.]+)Z/', $svg, $matches, PREG_SET_ORDER);

        foreach ($matches as $rect) {
            $rx = (float) $rect[1];
            $ry = (float) $rect[2];
            $rw = (float) $rect[3] - $rx;
            $rh = (float) $rect[6] - $ry;
            $this->rect($x + ($rx * $scale), $y + ($ry * $scale), $rw * $scale, $rh * $scale, true);
        }
    }

    public function output(): string
    {
        $this->objects = [
            1 => '<< /Type /Catalog /Pages 2 0 R >>',
            3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            4 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
        ];

        $kids = [];
        $nextId = 5;

        foreach ($this->pageContents as $content) {
            $pageId = $nextId++;
            $contentId = $nextId++;
            $kids[] = "{$pageId} 0 R";
            $this->objects[$pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {$this->width} {$this->height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {$contentId} 0 R >>";
            $this->objects[$contentId] = "<< /Length ".strlen($content)." >>\nstream\n{$content}endstream";
        }

        $this->objects[2] = '<< /Type /Pages /Kids ['.implode(' ', $kids).'] /Count '.count($kids).' >>';

        ksort($this->objects);
        $pdf = "%PDF-1.4\n%".chr(226).chr(227).chr(207).chr(211)."\n";
        $offsets = [0];

        foreach ($this->objects as $id => $body) {
            $offsets[$id] = strlen($pdf);
            $pdf .= "{$id} 0 obj\n{$body}\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($this->objects) + 1)."\n0000000000 65535 f \n";

        foreach (array_keys($this->objects) as $id) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$id]);
        }

        return $pdf."trailer\n<< /Size ".(count($this->objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";
    }

    /**
     * @return array<int, string>
     */
    protected function wrap(string $text, int $size, float $maxWidth): array
    {
        $words = preg_split('/\s+/', trim($text)) ?: [];
        $lines = [];
        $line = '';

        foreach ($words as $word) {
            $candidate = $line === '' ? $word : $line.' '.$word;
            if ($this->textWidth($candidate, $size) <= $maxWidth || $line === '') {
                $line = $candidate;
                continue;
            }

            $lines[] = $line;
            $line = $word;
        }

        if ($line !== '') {
            $lines[] = $line;
        }

        return $lines ?: [''];
    }

    protected function textWidth(string $text, int $size): float
    {
        return strlen($text) * $size * 0.5;
    }

    protected function escape(string $text): string
    {
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $this->ascii($text));
    }

    protected function ascii(string $text): string
    {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);

        return $converted === false ? $text : $converted;
    }

    protected function append(string $content): void
    {
        if ($this->pages === 0) {
            $this->addPage();
        }

        $this->pageContents[$this->pages] .= $content;
    }
}
