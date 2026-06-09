<?php

namespace App\Console\Commands;

use App\Services\Checkout\CheckoutReservationService;
use App\Services\Orders\OrderService;
use Illuminate\Console\Command;

class ExpireCheckoutReservations extends Command
{
    protected $signature = 'checkout-reservations:expire';

    protected $description = 'Expire stale checkout reservations and release unpaid order inventory.';

    public function handle(
        CheckoutReservationService $checkoutReservations,
        OrderService $orders,
    ): int {
        $releasedOrders = $orders->releaseExpiredReservations();
        $expiredReservations = $checkoutReservations->expireStaleReservations();

        $this->info("Expired {$expiredReservations} checkout reservation(s); released {$releasedOrders} unpaid order(s).");

        return self::SUCCESS;
    }
}
