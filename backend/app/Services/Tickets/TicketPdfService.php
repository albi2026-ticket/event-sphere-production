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

    private const BRAND_NAVY = [15, 23, 42];

    private const BRAND_NAVY_SURFACE = [24, 34, 53];

    private const BRAND_BLUE = [37, 99, 235];

    private const BRAND_BLUE_SOFT = [191, 219, 254];

    private const BRAND_TEXT = [17, 24, 39];

    private const BRAND_MUTED = [100, 116, 139];

    private const BRAND_BORDER = [230, 234, 240];

    private const BRAND_PAGE = [244, 246, 248];

    private const BRAND_FOOTER = [248, 250, 252];

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
            'ticket_status' => $this->ticketStatusLabel((string) $ticket->status),
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
            'payment_status' => $this->paymentStatusLabel((string) ($order?->payment_status ?: 'paid')),
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

        $this->brandHeader($pdf, __('ticket_pdf.entry_ticket'), __('ticket_pdf.ticket_ready'));

        $this->card($pdf, 34, 150, 527, 606);
        $this->setFillColor($pdf, self::BRAND_FOOTER);
        $pdf->rect(34, 150, 527, 138, true);

        $this->setTextColor($pdf, self::BRAND_MUTED);
        $pdf->text(58, 180, mb_strtoupper(__('ticket_pdf.event_label')), 8, true);
        $this->setTextColor($pdf, self::BRAND_TEXT);
        $titleHeight = $pdf->textBox(58, 204, $data['event_title'], 22, true, 330, 3, 27);
        $this->setTextColor($pdf, self::BRAND_MUTED);
        $pdf->textBox(58, 212 + $titleHeight, $data['event_date'].'  |  '.$data['event_time'].'  |  '.$data['timezone'], 9, false, 330, 2, 13);
        $this->statusPill($pdf, 428, 190, $data['ticket_status']);

        $this->sectionCard($pdf, 58, 312, 224, 312, __('emails.ticket_details'));
        $fieldY = 356;
        $fieldY = $this->fieldBox($pdf, 78, $fieldY, __('emails.attendee'), $data['attendee_name'], 184, 3, 9) + 10;
        $fieldY = $this->fieldBox($pdf, 78, $fieldY, __('emails.ticket_type'), $data['ticket_type'], 184, 3, 9) + 10;
        $fieldY = $this->fieldBox($pdf, 78, $fieldY, __('emails.location'), $data['venue'], 184, 4, 8) + 10;
        $fieldY = $this->fieldBox($pdf, 78, $fieldY, __('ticket_pdf.city'), $data['city'], 184, 2, 8) + 10;
        $fieldY = $this->fieldBox($pdf, 78, $fieldY, __('emails.order_number'), $data['order_number'], 184, 2, 8) + 10;
        $this->fieldBox($pdf, 78, $fieldY, __('ticket_pdf.ticket_number'), $data['ticket_number'], 184, 2, 9);

        $this->sectionCard($pdf, 306, 312, 220, 312, __('ticket_pdf.venue_scan'));
        $pdf->setFillColor(255, 255, 255);
        $this->setStrokeColor($pdf, self::BRAND_BORDER);
        $pdf->rect(344, 350, 144, 144, true, true);
        $pdf->drawQrSvg($this->tickets->qrSvg($ticket, 320), 354, 360, 124);

        $this->setTextColor($pdf, self::BRAND_TEXT);
        $pdf->textBox(330, 526, __('ticket_pdf.scan_instruction'), 11, true, 172, 2, 15, 'center');
        $this->setStrokeColor($pdf, self::BRAND_BORDER);
        $pdf->line(330, 562, 502, 562);
        $this->setTextColor($pdf, self::BRAND_MUTED);
        $pdf->textBox(330, 584, __('ticket_pdf.ticket_verification'), 8, true, 172, 1, 11, 'center');
        $this->setTextColor($pdf, self::BRAND_TEXT);
        $pdf->textBox(330, 606, $data['ticket_uuid'], 7, false, 172, 3, 10, 'center');

        $this->setFillColor($pdf, self::BRAND_FOOTER);
        $this->setStrokeColor($pdf, self::BRAND_BORDER);
        $pdf->rect(58, 652, 468, 76, true, true);
        $this->setTextColor($pdf, self::BRAND_TEXT);
        $pdf->textBox(78, 684, __('ticket_pdf.present_at_entry'), 10, true, 420, 1, 13);
        $this->setTextColor($pdf, self::BRAND_MUTED);
        $pdf->textBox(78, 706, __('ticket_pdf.entry_rules'), 8, false, 420, 3, 11);

        $this->footer($pdf, __('ticket_pdf.page_x_of_y', ['page' => 1, 'total' => 2]));
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

        $this->brandHeader($pdf, __('ticket_pdf.receipt_title'), __('ticket_pdf.proof_of_purchase'), 132);
        $this->statusPill($pdf, 428, 66, $data['payment_status']);
        $this->setTextColor($pdf, self::BRAND_BLUE_SOFT);
        $pdf->textBox(42, 108, __('ticket_pdf.proof_copy'), 9, false, 360, 2, 12);

        $this->sectionCard($pdf, 42, 166, 244, 128, __('ticket_pdf.purchaser_information'));
        $this->fieldBox($pdf, 62, 210, __('ticket_pdf.purchaser_name'), $data['purchaser_name'], 204, 3, 9);
        $this->fieldBox($pdf, 62, 254, __('ticket_pdf.purchaser_email'), $data['purchaser_email'], 204, 2, 9);

        $this->sectionCard($pdf, 310, 166, 244, 128, __('emails.order_information'));
        $this->fieldBox($pdf, 330, 210, __('emails.order_number'), $data['order_number'], 204, 2, 9);
        $this->fieldBox($pdf, 330, 254, __('emails.purchase_date'), $data['purchase_date'], 204, 2, 9);

        $this->sectionCard($pdf, 42, 318, 512, 130, __('ticket_pdf.event_information'));
        $this->fieldBox($pdf, 62, 362, __('emails.event'), $data['event_title'], 456, 3, 9);
        $this->fieldBox($pdf, 62, 414, __('ticket_pdf.event_date_time'), $data['event_date'].' '.$data['event_time'].' '.$data['timezone'], 216, 2, 9);
        $this->fieldBox($pdf, 318, 414, __('emails.location'), $data['venue'], 216, 2, 9);

        $pdf->sectionTitle(42, 486, __('ticket_pdf.ticket_breakdown'));
        $this->setFillColor($pdf, self::BRAND_FOOTER);
        $this->setStrokeColor($pdf, self::BRAND_BORDER);
        $pdf->rect(42, 504, 512, 30, true, true);
        $this->setTextColor($pdf, self::BRAND_TEXT);
        $pdf->text(58, 524, __('emails.ticket_type'), 9, true);
        $pdf->text(300, 524, __('emails.qty'), 9, true);
        $pdf->text(362, 524, __('emails.price_per_ticket'), 9, true);
        $pdf->text(466, 524, __('emails.subtotal'), 9, true);

        $y = 556;
        foreach ($items as $lineItem) {
            $qty = max(1, (int) ($lineItem?->quantity ?? 1));
            $unit = (float) ($lineItem?->unit_price ?? $ticket->ticketType?->price ?? 0);
            $subtotal = $qty * $unit;
            $this->setTextColor($pdf, self::BRAND_TEXT);
            $lineHeight = $pdf->textBox(58, $y, $lineItem?->ticket_type_name ?: $lineItem?->ticketType?->name ?: $ticket->ticketType?->name ?: 'Ticket', 8, false, 214, 2, 10);
            $pdf->text(304, $y, (string) $qty, 9);
            $pdf->textBox(362, $y, $this->money($unit, $data['currency']), 8, false, 82, 2, 10);
            $pdf->textBox(466, $y, $this->money($subtotal, $data['currency']), 8, false, 76, 2, 10);
            $this->setStrokeColor($pdf, self::BRAND_BORDER);
            $rowHeight = max(24, $lineHeight + 8);
            $pdf->line(42, $y + $rowHeight, 554, $y + $rowHeight);
            $y += $rowHeight + 8;
        }

        $serviceFee = (float) ($order?->service_fee ?? $items->sum(fn ($lineItem) => (float) ($lineItem?->service_fee ?? 0)));
        $totalPaid = (float) ($order?->total ?? ($items->sum(fn ($lineItem) => (float) ($lineItem?->total ?? 0)) + $serviceFee));
        $summaryY = max($y + 4, 640);
        $this->setTextColor($pdf, self::BRAND_MUTED);
        $pdf->text(362, $summaryY, __('emails.service_fee'), 10, true);
        $pdf->text(466, $summaryY, $this->money($serviceFee, $data['currency']), 10);
        $this->setTextColor($pdf, self::BRAND_TEXT);
        $pdf->text(362, $summaryY + 28, __('emails.total_paid'), 12, true);
        $pdf->text(466, $summaryY + 28, $this->money($totalPaid, $data['currency']), 12, true);

        $attendeeSectionY = max(704, $summaryY + 56);
        $pdf->sectionTitle(42, $attendeeSectionY, __('emails.attendees'));
        $attendeeY = $attendeeSectionY + 28;
        foreach ($attendees->take(5) as $index => $attendeeTicket) {
            if ($attendeeY > 752) {
                break;
            }
            $name = $attendeeTicket->attendee_name ?: $attendeeTicket->user?->name ?: 'Guest';
            $email = $attendeeTicket->attendee_email ?: $attendeeTicket->user?->email ?: '-';
            $this->setTextColor($pdf, self::BRAND_TEXT);
            $nameHeight = $pdf->textBox(58, $attendeeY, ($index + 1).'. '.$name, 9, true, 220, 2, 12);
            $this->setTextColor($pdf, self::BRAND_MUTED);
            $emailHeight = $pdf->textBox(300, $attendeeY, $email, 8, false, 220, 2, 11);
            $attendeeY += max($nameHeight, $emailHeight, 18) + 8;
        }

        $this->footer($pdf, __('ticket_pdf.page_x_of_y', ['page' => 2, 'total' => 2]), __('ticket_pdf.generated_automatically'));
    }

    protected function eventDate(?CarbonInterface $date, ?string $timezone): ?CarbonInterface
    {
        return $date?->copy()->setTimezone($this->calculationTimezone($timezone));
    }

    protected function dateLabel(?CarbonInterface $date): string
    {
        return $date?->locale(app()->getLocale())->translatedFormat('M j, Y') ?: __('emails.date');
    }

    protected function timeLabel(?CarbonInterface $date): string
    {
        return $date?->locale(app()->getLocale())->translatedFormat('g:i A') ?: __('emails.time');
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
        return $date?->copy()->setTimezone(config('app.timezone'))->locale(app()->getLocale())->translatedFormat('M j, Y g:i A T') ?: '-';
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

    protected function ticketStatusLabel(string $status): string
    {
        return $this->statusLabel($status);
    }

    protected function paymentStatusLabel(string $status): string
    {
        return $this->statusLabel($status);
    }

    protected function statusLabel(string $status): string
    {
        $key = strtolower(trim($status)) ?: 'valid';
        $key = str_replace([' ', '-'], '_', $key);
        $translationKey = 'ticket_pdf.status.'.$key;
        $translated = __($translationKey);

        return $translated === $translationKey ? str_replace('_', ' ', $status) : $translated;
    }

    protected function pageBackground(SimpleTicketPdf $pdf): void
    {
        $this->setFillColor($pdf, self::BRAND_PAGE);
        $pdf->rect(0, 0, self::PAGE_WIDTH, self::PAGE_HEIGHT, true);
        $this->setFillColor($pdf, self::BRAND_FOOTER);
        $pdf->rect(0, self::PAGE_HEIGHT - 56, self::PAGE_WIDTH, 56, true);
    }

    protected function card(SimpleTicketPdf $pdf, float $x, float $y, float $w, float $h): void
    {
        $pdf->setFillColor(255, 255, 255);
        $this->setStrokeColor($pdf, self::BRAND_BORDER);
        $pdf->rect($x, $y, $w, $h, true, true);
    }

    protected function statusPill(SimpleTicketPdf $pdf, float $x, float $y, string $label): void
    {
        $this->setFillColor($pdf, self::BRAND_NAVY_SURFACE);
        $this->setStrokeColor($pdf, [38, 52, 76]);
        $pdf->rect($x, $y, 106, 32, true, true);
        $this->setTextColor($pdf, self::BRAND_BLUE_SOFT);
        $pdf->text($x, $y + 20, strtoupper($label), 9, true, 106, 'center');
    }

    protected function sectionCard(SimpleTicketPdf $pdf, float $x, float $y, float $w, float $h, string $title): void
    {
        $this->card($pdf, $x, $y, $w, $h);
        $pdf->sectionTitle($x + 20, $y + 28, $title);
    }

    protected function fieldBox(SimpleTicketPdf $pdf, float $x, float $y, string $label, string $value, float $width, int $maxLines = 3, int $valueSize = 10): float
    {
        $this->setTextColor($pdf, self::BRAND_MUTED);
        $pdf->text($x, $y, $label, 8, true);
        $this->setTextColor($pdf, self::BRAND_TEXT);

        return $y + 16 + $pdf->textBox($x, $y + 16, $value, $valueSize, false, $width, $maxLines, $valueSize + 3);
    }

    protected function brandHeader(SimpleTicketPdf $pdf, string $title, string $eyebrow, float $height = 132): void
    {
        $this->setFillColor($pdf, self::BRAND_NAVY);
        $pdf->rect(0, 0, self::PAGE_WIDTH, $height, true);
        $this->setFillColor($pdf, self::BRAND_NAVY_SURFACE);
        $this->setStrokeColor($pdf, [38, 52, 76]);
        $pdf->rect(42, 32, 236, 56, true, true);
        $this->setFillColor($pdf, self::BRAND_BLUE);
        $pdf->rect(56, 44, 32, 32, true);
        $pdf->setTextColor(255, 255, 255);
        $pdf->text(62, 65, 'Tk', 13, true);
        $pdf->text(104, 56, 'Tiketa', 20, true);
        $this->setTextColor($pdf, self::BRAND_BLUE_SOFT);
        $pdf->textBox(104, 76, $eyebrow, 9, true, 150, 1, 11);
        $pdf->setTextColor(255, 255, 255);
        $pdf->textBox(42, $height - 28, $title, 24, true, 360, 2, 27);
    }

    protected function footer(SimpleTicketPdf $pdf, string $pageLabel, ?string $note = null): void
    {
        $note ??= __('ticket_pdf.secure_ticket_document');
        $this->setStrokeColor($pdf, self::BRAND_BORDER);
        $pdf->line(42, 782, 554, 782);
        $this->setFillColor($pdf, self::BRAND_BLUE);
        $pdf->rect(42, 798, 22, 22, true);
        $pdf->setTextColor(255, 255, 255);
        $pdf->text(46, 813, 'Tk', 8, true);
        $this->setTextColor($pdf, self::BRAND_TEXT);
        $pdf->text(74, 812, 'Tiketa', 10, true);
        $this->setTextColor($pdf, self::BRAND_MUTED);
        $pdf->textBox(152, 812, $note, 8, false, 260, 1, 11);
        $pdf->text(470, 812, $pageLabel, 8);
    }

    /**
     * @param array{0: int, 1: int, 2: int} $color
     */
    protected function setFillColor(SimpleTicketPdf $pdf, array $color): void
    {
        $pdf->setFillColor($color[0], $color[1], $color[2]);
    }

    /**
     * @param array{0: int, 1: int, 2: int} $color
     */
    protected function setStrokeColor(SimpleTicketPdf $pdf, array $color): void
    {
        $pdf->setStrokeColor($color[0], $color[1], $color[2]);
    }

    /**
     * @param array{0: int, 1: int, 2: int} $color
     */
    protected function setTextColor(SimpleTicketPdf $pdf, array $color): void
    {
        $pdf->setTextColor($color[0], $color[1], $color[2]);
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
        $this->drawTextLines($x, $y, $lines, $size, $bold, $maxWidth, $align, $size + 4);
    }

    public function textBox(float $x, float $y, string $text, int $size = 10, bool $bold = false, float $maxWidth = 0, int $maxLines = 0, ?float $lineHeight = null, string $align = 'left'): float
    {
        $lineHeight ??= $size + 4;
        $lines = $maxWidth > 0 ? $this->wrap($text, $size, $maxWidth) : [$text];

        if ($maxLines > 0 && count($lines) > $maxLines) {
            [$lines, $size] = $this->fitLines($text, $size, $maxWidth, $maxLines);
        }

        $this->drawTextLines($x, $y, $lines, $size, $bold, $maxWidth, $align, $lineHeight);

        return count($lines) * $lineHeight;
    }

    /**
     * @param array<int, string> $lines
     */
    protected function drawTextLines(float $x, float $y, array $lines, int $size, bool $bold, float $maxWidth, string $align, float $lineHeight): void
    {
        foreach ($lines as $index => $line) {
            $tx = $x;
            if ($align === 'center' && $maxWidth > 0) {
                $tx = $x + max(0, ($maxWidth - $this->textWidth($line, $size)) / 2);
            }
            $font = $bold ? 'F2' : 'F1';
            $this->append(sprintf("BT /%s %d Tf %.2F %.2F Td (%s) Tj ET\n", $font, $size, $tx, $this->height - $y - ($index * $lineHeight), $this->escape($line)));
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
            3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            4 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
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
            $wordParts = $this->splitLongWord($word, $size, $maxWidth);

            foreach ($wordParts as $part) {
                $candidate = $line === '' ? $part : $line.' '.$part;
                if ($this->textWidth($candidate, $size) <= $maxWidth || $line === '') {
                    $line = $candidate;
                    continue;
                }

                $lines[] = $line;
                $line = $part;
            }
        }

        if ($line !== '') {
            $lines[] = $line;
        }

        return $lines ?: [''];
    }

    /**
     * @return array{0: array<int, string>, 1: int}
     */
    protected function fitLines(string $text, int $size, float $maxWidth, int $maxLines): array
    {
        for ($fontSize = $size; $fontSize >= 7; $fontSize--) {
            $lines = $this->wrap($text, $fontSize, $maxWidth);
            if (count($lines) <= $maxLines) {
                return [$lines, $fontSize];
            }
        }

        $lines = $this->wrap($text, 7, $maxWidth);

        return [array_slice($lines, 0, $maxLines), 7];
    }

    /**
     * @return array<int, string>
     */
    protected function splitLongWord(string $word, int $size, float $maxWidth): array
    {
        if ($maxWidth <= 0 || $this->textWidth($word, $size) <= $maxWidth) {
            return [$word];
        }

        $maxCharacters = max(1, (int) floor($maxWidth / ($size * 0.5)));
        $parts = str_split($word, $maxCharacters);

        return $parts ?: [$word];
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
        $converted = iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $text);

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
