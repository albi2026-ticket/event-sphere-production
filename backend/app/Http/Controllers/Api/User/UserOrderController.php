<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Dashboard\DashboardListRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class UserOrderController extends Controller
{
    public function index(DashboardListRequest $request): AnonymousResourceCollection
    {
        [$sortColumn, $sortDirection] = $request->sort('created_at', 'desc');
        $sortColumn = in_array($sortColumn, ['created_at', 'total', 'status'], true) ? $sortColumn : 'created_at';

        return OrderResource::collection(
            $request->user()
                ->orders()
                ->with(['user', 'items.event', 'items.ticketType', 'tickets' => fn ($query) => $query->orderByDesc('id'), 'tickets.user', 'tickets.event', 'tickets.ticketType'])
                ->when($request->filled('status'), fn ($query) => $query->where('status', $request->input('status')))
                ->when($request->filled('payment_status'), fn ($query) => $query->where('payment_status', $request->input('payment_status')))
                ->when($request->filled('search'), fn ($query) => $query->where('order_number', 'like', '%'.$request->input('search').'%'))
                ->orderBy($sortColumn, $sortDirection)
                ->paginate($request->perPage())
        );
    }

    public function show(Request $request, Order $order): OrderResource
    {
        abort_unless($order->user_id === $request->user()->id || $request->user()->isAdmin(), 403);

        return new OrderResource($order->load(['user', 'items.event', 'items.ticketType', 'tickets' => fn ($query) => $query->orderByDesc('id'), 'tickets.user', 'tickets.event', 'tickets.ticketType']));
    }

    public function receipt(Request $request, Order $order): Response
    {
        abort_unless($order->user_id === $request->user()->id || $request->user()->isAdmin(), 403);

        $order->load(['user', 'items.event', 'items.ticketType']);
        $rows = $order->items->map(fn ($item): string => '<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">'.e($item->event_title).'</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">'.e($item->ticket_type_name).'</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">'.$item->quantity.'</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">'.e($order->currency).' '.e($item->total).'</td></tr>')->implode('');

        $html = '<!doctype html><html><head><meta charset="utf-8"><title>Receipt '.$order->order_number.'</title></head><body style="font-family:Arial,sans-serif;margin:32px;color:#111827;">'
            .'<main style="max-width:760px;margin:0 auto;border:1px solid #d1d5db;padding:28px;border-radius:8px;">'
            .'<p style="text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin:0 0 8px;">Event Sphere Receipt</p>'
            .'<h1 style="margin:0 0 12px;font-size:28px;">Order '.e($order->order_number).'</h1>'
            .'<p><strong>Payment:</strong> '.e($order->payment_status).' · <strong>Status:</strong> '.e($order->status).'</p>'
            .'<p><strong>Customer:</strong> '.e($order->billing_first_name).' '.e($order->billing_last_name).' · '.e($order->billing_email).'</p>'
            .'<table style="width:100%;border-collapse:collapse;margin:24px 0;"><thead><tr><th style="text-align:left;padding:8px;">Event</th><th style="text-align:left;padding:8px;">Ticket</th><th style="padding:8px;">Qty</th><th style="text-align:right;padding:8px;">Total</th></tr></thead><tbody>'.$rows.'</tbody></table>'
            .'<p><strong>Subtotal:</strong> '.e($order->currency).' '.e($order->subtotal).'</p>'
            .'<p><strong>Fees:</strong> '.e($order->currency).' '.e($order->service_fee).'</p>'
            .'<p><strong>Tax:</strong> '.e($order->currency).' '.e($order->tax_total).'</p>'
            .'<h2 style="font-size:20px;">Grand total: '.e($order->currency).' '.e($order->total).'</h2>'
            .'</main></body></html>';

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="event-sphere-receipt-'.$order->order_number.'.html"',
        ]);
    }
}
