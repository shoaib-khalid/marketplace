import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FuseConfigService } from '@fuse/services/config';
import { CartService } from 'app/core/cart/cart.service';
import { CartWithDetails, DiscountOfCartGroup } from 'app/core/cart/cart.types';
import { CartDiscount, CheckoutItems } from 'app/core/checkout/checkout.types';


@Component({
    selector     : 'floating-carts',
    templateUrl  : './floating-carts.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloatingCartsComponent implements OnInit, OnDestroy
{

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    subTotal = 0;
    currencySymbol: string = 'RM'
    totalItems: number = 0;
    /**
     * Constructor
     */
    constructor(
        private _router: Router,
        private _fuseConfigService: FuseConfigService,
        private _cartService: CartService,
        private _changeDetectorRef: ChangeDetectorRef
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {

        // Get cartSummary data
        this._cartService.cartsHeaderWithDetails$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((carts: CartWithDetails[])=>{
                if (carts && carts.length > 0) {
                    
                    // Total of all carts
                    // this.totalItems = carts.length;

                    // Total of all carts' items
                    // this.totalItems = carts.map(item => item.cartItems).flat().length;

                    // Total quantity of all carts
                    this.totalItems = carts.map(item => item.cartItems.map(element => element.quantity).reduce((partialSum, a) => partialSum + a, 0)).reduce((a, b) => a + b, 0);
                    let checkoutListBody = carts.map(item => {
                        this.currencySymbol
                        return {
                            cartId: item.id,
                            selectedItemId: item.cartItems.map(element => {
                                return element.id
                            // to remove if selected = false (undefined array of cart item)
                            }).filter(x => x),
                        }
                    // to remove if selected = false (undefined array of selectedItemId)
                    }).filter(n => {
                        if (n.selectedItemId && n.selectedItemId.length > 0) {
                            return n;
                        }
                    });

                    // Get the curreny symbol
                    this.currencySymbol = carts[0].store.regionCountry.currencySymbol;
                    
                    this._cartService.getDiscountOfCartGroup(checkoutListBody, {
                            platformVoucherCode: null, 
                            customerId: null, 
                            email: null
                        }, true)
                        .subscribe((response : DiscountOfCartGroup) => {
                            this.subTotal = response.sumCartSubTotal;
                            // Mark for change
                            this._changeDetectorRef.markForCheck();
                        })
                }
                else {
                    this.totalItems = 0;
                    this.subTotal = 0
                    // Mark for change
                    this._changeDetectorRef.markForCheck();
                }

            });

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    cartCheckout() {
        this._router.navigate(['carts'])
    }
}
