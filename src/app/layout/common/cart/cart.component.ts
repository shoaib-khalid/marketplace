import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { BooleanInput } from '@angular/cdk/coercion';
import { Subject, takeUntil } from 'rxjs';
import { Cart, CartWithDetails, CustomerCart } from 'app/core/cart/cart.types';
import { CustomerAuthenticate } from 'app/core/auth/auth.types';
import { CartService } from 'app/core/cart/cart.service';
import { User } from 'app/core/user/user.types';
import { Store } from 'app/core/store/store.types';
import { DOCUMENT } from '@angular/common';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { JwtService } from 'app/core/jwt/jwt.service';
import { AuthService } from 'app/core/auth/auth.service';



@Component({
    selector       : 'cart',
    templateUrl    : './cart.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs       : 'cart',
    styles         : [
        `
            /* Change mat badge styles */
            body.light .mat-badge-accent .mat-badge-content {
                background: var(--fuse-primary);
                color: white;
            }
        `
    ]
})
export class CartComponent implements OnInit, OnDestroy
{
    /* eslint-disable @typescript-eslint/naming-convention */
    static ngAcceptInputType_showAvatar: BooleanInput;
    /* eslint-enable @typescript-eslint/naming-convention */

    @Input() showAvatar: boolean = true;

    customerId: string = '';
    platform: Platform;

    cart: Cart;
    carts: CartWithDetails[] = [];
    totalCartItems: number = 0;
    user: User;
    seeMoreCarts: boolean = true;
    customer:any;
    customerAuthenticate: CustomerAuthenticate;


    private _unsubscribeAll: Subject<any> = new Subject<any>();
    stores: Store[] = [];
    totalCartList: number;

    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _platformService: PlatformService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _router: Router,
        private _cartService: CartService,
        private _jwtService: JwtService,
        private _authService: AuthService
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
        this.customerId = this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid ? this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid : null

        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                if (platform) {
                    this.platform = platform;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this._cartService.cartsHeaderWithDetails$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((cartsWithDetails: CartWithDetails[]) => {                

                if (cartsWithDetails) {

                    this.carts = cartsWithDetails;

                    // Total of all carts
                    // this.totalCartList = cartsWithDetails.length;

                    // Total of all carts' items
                    // this.totalCartList = cartsWithDetails.map(item => item.cartItems).flat().length;

                    // Total quantity of all carts
                    this.totalCartList = cartsWithDetails.map(item => item.cartItems.map(element => element.quantity).reduce((partialSum, a) => partialSum + a, 0)).reduce((a, b) => a + b, 0);
    
                    // remove duplicate stores
                    // let resArr = [];
                    // this.carts.filter(function(item){
                    //     let i = resArr.findIndex(x => (x.storeId == item.storeId));
    
                    //     if (i <= -1){
                    //         resArr.push(item);
                    //     }
                    //     return null;
                    // });
                    
                    // // to show only 3
                    // if (resArr.length >= 3) {
                    //     // this.totalCartList = resArr.length;
                    //     const slicedArray = resArr.slice(0, 3);
                    //     this.carts = slicedArray;
                    // }
    
                }
                else {
                    this.seeMoreCarts = false
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();
                
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

    /**
     * Sign out
     */
    signOut(): void
    {
        this._router.navigate(['/sign-out']);
    }

    redirectToStore(store: Store, cartId: string) {
        this._document.location.href = 'https://' + store.domain + '/checkout' +
         '?customerCartId=' + cartId;
    }

    displayStoreLogo(store: Store) {
        // let storeAssetsIndex = storeAssets.findIndex(item => item.assetType === 'LogoUrl');
        if (store.storeLogoUrl != null) {
            return store.storeLogoUrl;
        } else {
            return this.platform.logo;
        }
    }
    
}
