import { Component, Inject, Input, OnDestroy, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { DOCUMENT } from '@angular/common';
import { StoreAssets } from 'app/core/store/store.types';
import { ProductDetails } from 'app/core/location/location.types';
import { Product } from 'app/core/product/product.types';
import { BottomPopUpService } from '../_bottom-popup/bottom-popup.service';

@Component({
    selector     : 'store-products',
    templateUrl  : './store-products.component.html',
    encapsulation: ViewEncapsulation.None
})
export class _StoreProductsComponent implements OnInit, OnDestroy
{

    platform: Platform;
    @Input() products: any;
    @Input() store: any;
    @Input() productViewOrientation: string = "grid"; 
    @Input() catalogueSlug: any;
    @Input() storeSlug: any;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    combos: any = [];
    selectedCombo: any = [];

    @ViewChild('openDetails', { read: TemplateRef }) _openDetails:TemplateRef<any>;

    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _platformService: PlatformService,
        private _router: Router,
        private _route: ActivatedRoute,
        private _bottomPopUpService: BottomPopUpService

    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {        
        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform)=>{
                this.platform = platform;
            })               
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
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }

    chooseStore(storeDomain:string) {
        let slug = storeDomain.split(".")[0]
        this._router.navigate(['/store/' + slug]);
    }

    redirectToProduct(url: string) {
        // this._document.location.href = url;
        this._router.navigate(['store/' + this.storeSlug + '/' + this.catalogueSlug + '/' + url]);
    }

    addProductToCart(product: Product) {
        console.log("product", product);

        // Precheck for combo
        if (product.isPackage) {
            this._bottomPopUpService.get(this._openDetails).subscribe();
        }

        
        
    }

    // addProductToCart(product: Product) {

    //     // Do nothing if special instruction is empty

    //     if (product.isNoteOptional === false && !this.specialInstructionForm.get('specialInstructionValue').value) {

    //         // this is to make the form shows 'required' error
    //         this.specialInstructionForm.get('specialInstructionValue').markAsTouched();

    //         // Mark for check
    //         this._changeDetectorRef.markForCheck();

    //         return;
    //     }

    //     // Pre-check the product inventory
    //     if (!this.selectedProductInventory) {
    //         const confirmation = this._fuseConfirmationService.open({
    //             "title": "Product Out of Stock",
    //             "message": "Sorry, the product is currently out of stock",
    //             "icon": {
    //               "show": true,
    //               "name": "heroicons_outline:exclamation",
    //               "color": "warn"
    //             },
    //             "actions": {
    //               "confirm": {
    //                 "show": true,
    //                 "label": "Ok",
    //                 "color": "warn"
    //               },
    //               "cancel": {
    //                 "show": false,
    //                 "label": "Cancel"
    //               }
    //             },
    //             "dismissible": true
    //           });

    //         return false;
    //     }

    //     // Pre-check the product price
    //     if (this.selectedProductInventory.price === 0) {
    //         const confirmation = this._fuseConfirmationService.open({
    //             "title": "Product Unavailable",
    //             "message": "Sorry, this item is not available at the moment.",
    //             "icon": {
    //               "show": true,
    //               "name": "heroicons_outline:exclamation",
    //               "color": "warn"
    //             },
    //             "actions": {
    //               "confirm": {
    //                 "show": true,
    //                 "label": "Ok",
    //                 "color": "warn"
    //               },
    //               "cancel": {
    //                 "show": false,
    //                 "label": "Cancel"
    //               }
    //             },
    //             "dismissible": true
    //           });

    //         return false;
    //     }

    //     // Precheck for combo
    //     if (product.isPackage) {
    //         let BreakException = {};
    //         try {
    //             this.combos.forEach(item => {
    //                 if (item.totalAllow !== this.selectedCombo[item.id].length) {
    //                     const confirmation = this._fuseConfirmationService.open({
    //                         "title": "Incomplete Product Combo selection",
    //                         "message": 'You need to select ' + item.totalAllow + ' item of <b>"' + item.title + '"</b>',
    //                         "icon": {
    //                             "show": true,
    //                             "name": "heroicons_outline:exclamation",
    //                             "color": "warn"
    //                         },
    //                         "actions": {
    //                             "confirm": {
    //                             "show": true,
    //                             "label": "Ok",
    //                             "color": "warn"
    //                             },
    //                             "cancel": {
    //                             "show": false,
    //                             "label": "Cancel"
    //                             }
    //                         },
    //                         "dismissible": true
    //                     });
    //                     throw BreakException;
    //                 }                 
    //             });
    //         } catch (error) {
    //             // console.error(error);
    //             return;
    //         }
    //     }

    //     // -----------------
    //     // Provisioning
    //     // -----------------
        
        
    //     let customerId = this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid ? this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid : null

    //     if (customerId){
    //         // Get cartId from that customer
    //         this._cartService.getCartsByCustomerId(customerId)
    //             .subscribe((customerCart: CustomerCart) => {
    //                 let cartIndex = customerCart.cartList.findIndex(item => item.storeId === this.store.id);
    //                 if (cartIndex > -1) { // Cart of store belong to the customer found
    //                     this.postCartItem(customerCart.cartList[cartIndex].id).then(()=>{
    //                         // Re-resolve the cart
    //                         this._cartService.cartResolver().subscribe();
    //                         this._cartService.cartResolver(true).subscribe();
    //                     });
    //                 } else { // No cart found for that customer
    //                     const cart = {
    //                         customerId  : customerId, 
    //                         storeId     : this.store.id,
    //                     }
    //                     // Create it first
    //                     this._cartService.createCart(cart)
    //                         .subscribe((cart: Cart)=>{
    //                             // Post it to cart
    //                             this.postCartItem(cart.id).then(()=>{
    //                                 // Re-resolve the cart
    //                                 this._cartService.cartResolver().subscribe();
    //                                 this._cartService.cartResolver(true).subscribe();
    //                             });
    //                         });
    //                 }
    //             });
    //     } else {
    //         let cartIds: { id: string, storeId: string, cartItems: CartItem[]}[] = this._cartService.cartIds$ ? JSON.parse(this._cartService.cartIds$) : [];
    //         if (cartIds && cartIds.length) {
    //             let cartIndex = cartIds.findIndex(item => item.storeId === this.store.id);
    //             if (cartIndex > -1) { // update cartItems if cartId exists
    //                 if (cartIds[cartIndex].cartItems.length > 9) {
    //                     const confirmation = this._fuseConfirmationService.open({
    //                         "title": "Too many items",
    //                         "message": 'Guest only allowed 10 items per shop',
    //                         "icon": {
    //                             "show": true,
    //                             "name": "heroicons_outline:exclamation",
    //                             "color": "warn"
    //                         },
    //                         "actions": {
    //                             "confirm": {
    //                             "show": true,
    //                             "label": "Ok",
    //                             "color": "warn"
    //                             },
    //                             "cancel": {
    //                             "show": false,
    //                             "label": "Cancel"
    //                             }
    //                         },
    //                         "dismissible": true
    //                     });
                        
    //                     console.error("Guest only allowed 10 cartItems only");

    //                 } else {
    //                     this.postCartItem(cartIds[cartIndex].id).then((response: CartItem)=>{
    //                         cartIds[cartIndex].cartItems.push(response);
    //                         this._cartService.cartIds = JSON.stringify(cartIds);

    //                         // Re-resolve the cart
    //                         this._cartService.cartResolver().subscribe();
    //                         this._cartService.cartResolver(true).subscribe();
    //                     });
    //                 }
    //             } else { // New cart to be pushed
    //                 if (cartIds.length > 4) { // Too many in local storage
    //                     const confirmation = this._fuseConfirmationService.open({
    //                         "title": "Too many carts",
    //                         "message": 'Guest only allowed maximum 5 carts',
    //                         "icon": {
    //                             "show": true,
    //                             "name": "heroicons_outline:exclamation",
    //                             "color": "warn"
    //                         },
    //                         "actions": {
    //                             "confirm": {
    //                             "show": true,
    //                             "label": "Ok",
    //                             "color": "warn"
    //                             },
    //                             "cancel": {
    //                             "show": false,
    //                             "label": "Cancel"
    //                             }
    //                         },
    //                         "dismissible": true
    //                     });
    //                     console.error("Guest only allowed 5 carts only");
    //                 } else {
    //                     const cart = {
    //                         customerId  : null, 
    //                         storeId     : this.store.id,
    //                     }
    //                     // Create it first
    //                     this._cartService.createCart(cart)
    //                         .subscribe((cart: Cart)=>{
    //                             // Post it to cart
    //                             this.postCartItem(cart.id).then((response: CartItem)=>{
    //                                 // Push new cart id
    //                                 cartIds.push({
    //                                     id: response.cartId,
    //                                     cartItems: [response],
    //                                     storeId: this.store.id
    //                                 });

    //                                 this._cartService.cartIds = JSON.stringify(cartIds);

    //                                 // Re-resolve the cart
    //                                 this._cartService.cartResolver().subscribe();
    //                                 this._cartService.cartResolver(true).subscribe();
    //                             });
    //                         })
    //                 }
    //             }
    //         } else {
    //             const cart = {
    //                 customerId  : null, 
    //                 storeId     : this.store.id,
    //             }

    //             // Create it first
    //             this._cartService.createCart(cart)
    //                 .subscribe((cart: Cart)=>{
    //                     // Post it to cart
    //                     this.postCartItem(cart.id).then((response: CartItem)=>{
    //                         cartIds = [{
    //                             id: response.cartId,
    //                             cartItems: [response],
    //                             storeId: this.store.id
    //                         }];

    //                         this._cartService.cartIds = JSON.stringify(cartIds);

    //                         // Re-resolve the cart
    //                         this._cartService.cartResolver().subscribe();
    //                         this._cartService.cartResolver(true).subscribe();
    //                     });
    //                 });
    //         }
    //     }
    // }

    displayStoreLogo(storeAssets: StoreAssets[]) {
        let storeAssetsIndex = storeAssets.findIndex(item => item.assetType === 'LogoUrl');
        if (storeAssetsIndex > -1) {
            return storeAssets[storeAssetsIndex].assetUrl;
        } else {
            return this.platform.logo;
        }
    }
    
    isProductOutOfStock(product: Product): boolean
    {
        if (product.allowOutOfStockPurchases === true) {
            return true;
        } else {
            if (product.productInventories.length > 0) {
                let productInventoryQuantities = product.productInventories.map(item => item.quantity);
                let totalProductInventoryQuantity = productInventoryQuantities.reduce((partialSum, a) => partialSum + a, 0);
    
                if (totalProductInventoryQuantity > 0) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }
    }

    displaySeeMore(productDescription){

        var div = document.createElement("div")
        div.innerHTML = productDescription
        div.style.width ="15rem";
        document.body.appendChild(div)

        if (div.offsetHeight > 100) {
            div.setAttribute("class","hidden")
            return true;
        } else {
            div.setAttribute("class","hidden")
            return false;
        }
    }
    
}
