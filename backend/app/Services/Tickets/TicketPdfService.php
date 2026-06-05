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
        $ticket->loadMissing(['user', 'event', 'ticketType', 'order', 'orderItem']);

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
        $serviceFee = $item ? ((float) $item->service_fee / max(1, (int) $item->quantity)) : 0.0;
        $ticketPrice = (float) ($item?->unit_price ?: $ticket->ticketType?->price ?: 0);
        $totalPaid = $ticketPrice + $serviceFee;
        $attendeeName = $ticket->attendee_name ?: $ticket->user?->name ?: 'Guest';
        $attendeeEmail = $ticket->attendee_email ?: $ticket->user?->email;
        $eventDate = $this->eventDate($event?->starts_at, $event?->timezone);
        $venue = $this->venueLabel($ticket);

        $pdf->addPage();
        $pdf->setFillColor(17, 24, 39);
        $pdf->rect(0, 0, self::PAGE_WIDTH, 118, true);
        $pdf->setFillColor(37, 99, 235);
        $pdf->rect(42, 34, 44, 44, true);
        $pdf->setTextColor(255, 255, 255);
        $pdf->text(51, 61, 'ES', 18, true);
        $pdf->text(104, 48, 'EVENT SPHERE', 14, true);
        $pdf->text(104, 74, 'Digital Ticket', 28, true);

        $pdf->setTextColor(15, 23, 42);
        $pdf->text(42, 150, $event?->title ?: 'Event', 24, true, 470);
        $pdf->setTextColor(71, 85, 105);
        $pdf->text(42, 184, $this->dateLabel($eventDate).' at '.$this->timeLabel($eventDate), 12, false, 300);
        $pdf->text(42, 202, $this->timezoneLabel($event?->starts_at, $event?->timezone), 12, false, 300);
        $pdf->text(42, 220, $venue, 12, false, 300);

        $pdf->setFillColor(239, 246, 255);
        $pdf->rect(400, 142, 140, 38, true);
        $pdf->setTextColor(30, 64, 175);
        $pdf->text(414, 158, strtoupper((string) $ticket->status), 11, true);
        $pdf->setTextColor(100, 116, 139);
        $pdf->text(414, 172, 'Ticket status', 8);

        $leftY = 270;
        $pdf->sectionTitle(42, $leftY, 'Attendee');
        $pdf->field(42, $leftY + 28, 'Name', $attendeeName);
        $pdf->field(42, $leftY + 70, 'Email', $attendeeEmail ?: '-');

        $pdf->sectionTitle(42, 420, 'Ticket Information');
        $pdf->field(42, 448, 'Ticket Type', $ticket->ticketType?->name ?: 'Ticket');
        $pdf->field(42, 490, 'Ticket ID', $ticket->ticket_code ?: (string) $ticket->id);
        $pdf->field(42, 532, 'Order Number', $order?->order_number ?: '-');
        $pdf->field(42, 574, 'Purchase Date', $this->purchaseDate($order?->paid_at ?: $order?->created_at));

        $pdf->sectionTitle(302, 420, 'Pricing');
        $pdf->field(302, 448, 'Ticket Price', $this->money($ticketPrice, $currency));
        $pdf->field(302, 490, 'Service Fee', $this->money($serviceFee, $currency));
        $pdf->field(302, 532, 'Total Paid', $this->money($totalPaid, $currency));

        $pdf->setFillColor(255, 255, 255);
        $pdf->setStrokeColor(203, 213, 225);
        $pdf->rect(333, 222, 178, 178, true, true);
        $pdf->drawQrSvg($this->tickets->qrSvg($ticket, 320), 345, 234, 154);
        $pdf->setTextColor(15, 23, 42);
        $pdf->text(338, 416, 'Scan at event check-in', 11, true, 160, 'center');

        $pdf->setStrokeColor(226, 232, 240);
        $pdf->line(42, 690, 553, 690);
        $pdf->setTextColor(71, 85, 105);
        $pdf->text(42, 716, rtrim((string) config('services.frontend.url', config('app.url')), '/'), 10);
        $pdf->text(42, 738, 'Valid for one entry only', 10, true);
        $pdf->text(42, 756, 'Duplicate or altered tickets are not valid', 10);
        $pdf->text(345, 738, 'Ticket UUID', 9, true);
        $pdf->text(345, 754, (string) $ticket->ticket_uuid, 8, false, 180);

        return $pdf->output();
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
    private string $content = '';

    private int $pages = 0;

    private array $objects = [];

    public function __construct(
        private readonly float $width,
        private readonly float $height,
    ) {}

    public function addPage(): void
    {
        $this->pages++;
    }

    public function setFillColor(int $r, int $g, int $b): void
    {
        $this->content .= sprintf("%.3F %.3F %.3F rg\n", $r / 255, $g / 255, $b / 255);
    }

    public function setStrokeColor(int $r, int $g, int $b): void
    {
        $this->content .= sprintf("%.3F %.3F %.3F RG\n", $r / 255, $g / 255, $b / 255);
    }

    public function setTextColor(int $r, int $g, int $b): void
    {
        $this->content .= sprintf("%.3F %.3F %.3F rg\n", $r / 255, $g / 255, $b / 255);
    }

    public function rect(float $x, float $y, float $w, float $h, bool $fill = false, bool $stroke = false): void
    {
        $operator = $fill && $stroke ? 'B' : ($fill ? 'f' : 'S');
        $this->content .= sprintf("%.2F %.2F %.2F %.2F re %s\n", $x, $this->height - $y - $h, $w, $h, $operator);
    }

    public function line(float $x1, float $y1, float $x2, float $y2): void
    {
        $this->content .= sprintf("%.2F %.2F m %.2F %.2F l S\n", $x1, $this->height - $y1, $x2, $this->height - $y2);
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
            $this->content .= sprintf("BT /%s %d Tf %.2F %.2F Td (%s) Tj ET\n", $font, $size, $tx, $this->height - $y - ($index * ($size + 4)), $this->escape($line));
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
            2 => '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            3 => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {$this->width} {$this->height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
            4 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            5 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
            6 => "<< /Length ".strlen($this->content)." >>\nstream\n{$this->content}endstream",
        ];

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
}
