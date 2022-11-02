import { CurrencyPipe, DatePipe, DOCUMENT, ViewportScroller } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AuthService } from 'app/core/auth/auth.service';
import { CartService } from 'app/core/cart/cart.service';
import { Cart, CartWithDetails, CartPagination, CartItem, DiscountOfCartGroup } from 'app/core/cart/cart.types';
import { ModalConfirmationDeleteItemComponent } from 'app/modules/landing/carts/modal-confirmation-delete-item/modal-confirmation-delete-item.component';
import { JwtService } from 'app/core/jwt/jwt.service';
import { Platform } from 'app/core/platform/platform.types';
import { Store, StoreSnooze, StoreTiming } from 'app/core/store/store.types';
import { fuseAnimations } from '@fuse/animations';
import { distinctUntilChanged, filter, Subject, takeUntil, combineLatest, merge } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { CartDiscount, CheckoutItems, DeliveryCharges, DeliveryProvider, DeliveryProviders } from 'app/core/checkout/checkout.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { UserService } from 'app/core/user/user.service';
import { CustomerAddress } from 'app/core/user/user.types';
import { CheckoutService } from 'app/core/checkout/checkout.service';
import { NavigationEnd, Router } from '@angular/router';
import { StoresService } from 'app/core/store/store.service';
import { CustomerVoucher, CustomerVoucherPagination, GuestVoucher, UsedCustomerVoucherPagination, VoucherVerticalList } from 'app/core/_voucher/voucher.types';
import { VoucherService } from 'app/core/_voucher/voucher.service';
import { VoucherModalComponent } from 'app/modules/customer/vouchers/voucher-modal/voucher-modal.component';
import { SelfPickupInfoDialog } from './modal-self-pickup-info/modal-self-pickup-info.component';
import { CartAddressComponent } from './modal-address/cart-addresses.component';
import { Title } from '@angular/platform-browser';

@Component({
    selector     : 'carts',
    templateUrl  : './carts.component.html',
    styles       : [
        /* language=SCSS */
        `
            .cart-grid {
                grid-template-columns: 24px auto 96px 96px 96px 30px;

                @screen md {
                    grid-template-columns: 24px auto 112px 86px 112px 20px;
                }
                @screen xl {
                    grid-template-columns: 24px auto 112px 112px 112px 30px;
                }
            }

            .cart-title-grid {
                grid-template-columns: 24px auto;

                @screen sm {
                    grid-template-columns: 24px auto;
                }
            }

            .mat-tab-group {

                /* No header */
                &.fuse-mat-no-header {
            
                    .mat-tab-header {
                        height: 0 !important;
                        max-height: 0 !important;
                        border: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                    }
                }
            
                .mat-tab-header {
                    border-bottom: flex !important;
            
                    .mat-tab-label-container {
                        padding: 0 0px;
            
                        .mat-tab-list {
            
                            .mat-tab-labels {
            
                                .mat-tab-label {
                                    min-width: 0 !important;
                                    height: 40px !important;
                                    padding: 0 20px !important;
                                    @apply text-secondary;
            
                                    &.mat-tab-label-active {
                                        @apply bg-primary-700 bg-opacity-0 dark:bg-primary-50 dark:bg-opacity-0 #{'!important'};
                                        @apply text-primary #{'!important'};
                                    }
            
                                    + .mat-tab-label {
                                        margin-left: 0px;
                                    }
            
                                    .mat-tab-label-content {
                                        line-height: 20px;
                                    }
                                }
                            }
            
                            .mat-ink-bar {
                                display: flex !important;
                            }
                        }
                    }
                }
            
                .mat-tab-body-content {
                    padding: 0px;
                }
            }

            /** Custom input number **/
            input[type='number']::-webkit-inner-spin-button,
            input[type='number']::-webkit-outer-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
    
            input[type='number'] {
                -moz-appearance:textfield;
            }
          
            .custom-number-input input:focus {
              outline: none !important;
            }
          
            .custom-number-input button:focus {
              outline: none !important;
            }
        `
    ],
    encapsulation: ViewEncapsulation.None,
    animations     : fuseAnimations
})
export class CartListComponent implements OnInit, OnDestroy
{
    @ViewChild(MatPaginator) private _paginator: MatPaginator;

    platform: Platform;

    // Quantity Selector
    quantity: number = 1;
    minQuantity: number = 1;
    maxQuantity: number = 999;

    currentScreenSize: string[] = [];

    isLoading: boolean = false;
    isPristine: boolean = true;
    pageOfItems: Array<any>;
    pagination: CartPagination;

    cart: Cart;
    carts: CartWithDetails[];
    
    selectedCart: { 
        carts: { 
            id: string, 
            storeId: string,
            cartItem: { 
                id: string, 
                selected: boolean,
                disabled: boolean
            }[], 
            selected: boolean, 
            disabled: boolean,
            minDeliveryCharges?: number, 
            maxDeliveryCharges?: number,
            description: {
                isOpen: boolean,
                value?: string
            },
            deliveryQuotationId: string,
            deliveryType: string,
            deliveryProviderId: string,
            deliveryErrorMessage?: string,
            deliveryProviderImg: string,
            deliveryQuotations: DeliveryProvider[],
            deliveryProviderName: string,
            isSelfPickup: boolean,
            deliveryPrice: {
                selectedDeliveryPrice: number,
                discountAmount: number,
                discountedPrice: number
            },
            showRequiredInfo: boolean
        }[], 
        selected: boolean,
        disabled: boolean 
    };
    totalSelectedCartItem: number = 0;
    
    customerId: string = '';
    customerAddress: CustomerAddress;

    paymentDetails: CartDiscount = {
        cartSubTotal: 0,
        subTotalDiscount: 0,
        subTotalDiscountDescription: null,
        discountCalculationType: null,
        discountCalculationValue: 0,
        discountMaxAmount: 0,
        discountType: null,
        storeServiceChargePercentage: 0,
        storeServiceCharge: 0,
        deliveryCharges: 0,
        deliveryDiscount: 0,
        deliveryDiscountDescription: null,
        deliveryDiscountMaxAmount: 0,
        cartGrandTotal: 0,
        voucherDeliveryDiscount: 0,
        voucherDeliveryDiscountDescription: null,
        voucherDiscountCalculationType: null,
        voucherDiscountCalculationValue: 0,
        voucherDiscountMaxAmount: 0,
        voucherDiscountType: null,
        voucherSubTotalDiscount: 0,
        voucherSubTotalDiscountDescription: null,
        platformVoucherSubTotalDiscount: 0,
        platformVoucherDeliveryDiscount: 0,
        storeDiscountList: []
    }

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    notificationMessage: string;
    daysArray = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    storesOpening: { 
        storeId: string,
        isOpen : boolean,
        messageTitle : string,
        message : string
    }[] = [];

    visibleCartSummary: boolean = false

    // -------------------------
    // Voucher
    // -------------------------

    // Member Voucher
    customerVouchers: CustomerVoucher[] = [] ;
    customerVoucherPagination: CustomerVoucherPagination;

    usedCustomerVouchers: CustomerVoucher[] = [] ;
    usedCustomerVoucherPagination: UsedCustomerVoucherPagination;
    promoCode: string = '';
    voucherApplied: CustomerVoucher = null;
    verticalList: VoucherVerticalList[] = [];

    // Guest Voucher
    guestVouchers: any = null ;
    displayRedeem: boolean = false;


    selfPickupInfo: {
        name: string,
        email: string,
        phoneNumber: string
    } = null;
    
    storesAddresses: { 
        storeId: string,
        storeName: string,
        phoneNumber: string,
        address : string,
        postCode: string,
        city: string,
        state: string,
    }[] = [];
    hasSelfPickup: boolean;
    hasDelivery: boolean;
    isGettingDeliveryPrices: boolean = false;

    /**
     * Constructor
     */
    constructor(
        public _dialog: MatDialog,
        private _platformService: PlatformService,
        private _checkoutService: CheckoutService,
        private _fuseConfirmationService: FuseConfirmationService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _currencyPipe: CurrencyPipe,
        private _router: Router,
        private _cartService: CartService,
        private _jwtService: JwtService,
        private _authService: AuthService,
        private _userService: UserService,
        private _scroller: ViewportScroller,
        private _datePipe: DatePipe,
        private _storesService: StoresService,
        private _voucherService: VoucherService,
        private _titleService: Title

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
            .subscribe((platform) => {
                if(platform) {
                    this.platform = platform;
                    // set title
                    this._titleService.setTitle(this.platform.name + " | " + "Carts");
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this._cartService.cartsWithDetails$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((cartsWithDetails: CartWithDetails[]) => {
                if (cartsWithDetails) {
                    this.carts = cartsWithDetails;  

                    this.storesOpening = [];
                    
                    cartsWithDetails.forEach((cart: CartWithDetails) => {
                        this.checkStoreTimingNew(cart)
                    })

                    let allSelected: boolean[] = [];
                    let allInCartSelected: { id: string; allSelected: boolean[]} = null;
                    if (this.selectedCart) {
                        // set all selected cart to false for every changes
                        this.selectedCart.selected = false;

                        this.carts.forEach(item => {     

                            let storeIsClosed = this.isStoreClose(item.storeId);                    

                            // check if the selectedCart cartId already exists
                            let cartIdIndex = this.selectedCart.carts.findIndex(element => element.id === item.id);
                            
                            if (cartIdIndex > -1) {
                                // set all seleted in cart to false first, later check for true again
                                this.selectedCart.carts[cartIdIndex].selected = false;

                                // disable if store is closed
                                this.selectedCart.carts[cartIdIndex].disabled = storeIsClosed ? true : false;

                                // get all selected boolean from cartItems
                                allSelected = this.selectedCart.carts[cartIdIndex].cartItem.map(element => element.selected);
                                allInCartSelected = {
                                    id: this.selectedCart.carts[cartIdIndex].id,
                                    allSelected: this.selectedCart.carts[cartIdIndex].cartItem.map(element => element.selected)
                                }
                                // this.selectedCart.carts[cartIdIndex] = {...this.selectedCart.carts[cartIdIndex], ...cart};

                                // Enable item if quantity is valid 
                                item.cartItems.forEach(cartItem => {
                                    let selectedCartItemIndex = this.selectedCart.carts[cartIdIndex].cartItem.findIndex(x => x.id === cartItem.id);

                                    if (selectedCartItemIndex > -1) {
                                        if ((cartItem.quantity > cartItem.productInventory.quantity) && (cartItem.productInventory.product.allowOutOfStockPurchases === false)) {
                                            this.selectedCart.carts[cartIdIndex].cartItem[selectedCartItemIndex].disabled = true;
                                        }
                                        else if (storeIsClosed) {
                                            this.selectedCart.carts[cartIdIndex].cartItem[selectedCartItemIndex].disabled = true;
                                        }
                                        else {
                                            this.selectedCart.carts[cartIdIndex].cartItem[selectedCartItemIndex].disabled = false;
                                        }
                                    }
                                })
                            } else {
                                let cart = {
                                    id: item.id, 
                                    storeId: item.storeId,
                                    cartItem: item.cartItems.map(element => {
                                        let obj = {
                                            id: element.id,
                                            selected: false,
                                            disabled: false
                                        }
                                        // Disable the item if quantity is invalid or store is closed
                                        if ((element.quantity > element.productInventory.quantity) && (element.productInventory.product.allowOutOfStockPurchases === false)) {
                                            obj.disabled = true
                                        }
                                        else if (storeIsClosed) {
                                            obj.disabled = true;
                                        }
                                        else {
                                            obj.disabled = false
                                        }
                                        return obj
                                    }),
                                    selected: false,
                                    description: {
                                        value: '',
                                        isOpen: false
                                    },
                                    deliveryQuotationId: null,
                                    deliveryType: null,
                                    deliveryProviderId: null,
                                    disabled: storeIsClosed ? true : false,
                                    deliveryQuotations: null,
                                    deliveryProviderImg: null,
                                    deliveryProviderName: null,
                                    isSelfPickup: false,
                                    deliveryPrice: {
                                        selectedDeliveryPrice: null,
                                        discountAmount: null,
                                        discountedPrice: null
                                    },
                                    showRequiredInfo: false
                                };
                                this.selectedCart.carts.push(cart);
                            }

                            if (cartIdIndex > -1 && allInCartSelected !== null && !allInCartSelected.allSelected.includes(false)) {
                                this.selectedCart.carts[cartIdIndex].selected = true;
                            }
                        });
                        
                        if (this.customerAddress) {
                            // get delivery charges of every carts
                            this.getDeliveryCharges(this.carts.map(element => {
                                return {
                                    cartId: element.id,
                                    customerId: this.customerId,
                                    delivery: {
                                        deliveryAddress     : this.customerAddress.address,
                                        deliveryCity        : this.customerAddress.city,
                                        deliveryState       : this.customerAddress.state,
                                        deliveryPostcode    : this.customerAddress.postCode,
                                        deliveryCountry     : this.customerAddress.country,
                                        deliveryContactEmail: this.customerAddress.email,
                                        deliveryContactName : this.customerAddress.name,
                                        deliveryContactPhone: this.customerAddress.phoneNumber,
                                        latitude            : this.customerAddress.latitude ? this.customerAddress.latitude : '',
                                        longitude           : this.customerAddress.longitude ? this.customerAddress.longitude : '' 
                                    },
                                    deliveryProviderId: null,
                                    storeId: element.storeId
                                }
                            }));
                        }

                        if (allSelected.length && !allSelected.includes(false)) {
                            // set all selected cart to true since all items in cartItem is true
                            this.selectedCart.selected = true;                            
                        }
                    } else {
                        this.selectedCart = {
                            carts:  this.carts.map(item => {
                                let storeIsClosed = this.isStoreClose(item.storeId); 

                                return {
                                    id: item.id,
                                    storeId: item.storeId,
                                    cartItem: item.cartItems.map(element => {
                                        let obj = {
                                            id: element.id,
                                            selected: false,
                                            disabled: false
                                        }
                                        // Disable the item if quantity is invalid or store is closed
                                        if ((element.quantity > element.productInventory.quantity) && (element.productInventory.product.allowOutOfStockPurchases === false)) {
                                            obj.disabled = true;
                                        }
                                        else if (storeIsClosed) {
                                            obj.disabled = true;
                                        }
                                        else {
                                            obj.disabled = false;
                                        }
                                        return obj

                                    }),
                                    selected: false,
                                    disabled: storeIsClosed ? true : false,
                                    description: {
                                        value: '',
                                        isOpen: false
                                    },
                                    deliveryQuotationId: null,
                                    deliveryType: null,
                                    deliveryProviderId: null,
                                    deliveryQuotations: null,
                                    deliveryProviderImg: null,
                                    deliveryProviderName: null,
                                    isSelfPickup: false,
                                    deliveryPrice: {
                                        selectedDeliveryPrice: null,
                                        discountAmount: null,
                                        discountedPrice: null
                                    },
                                    showRequiredInfo: false
                                }
                            }),
                            selected: false,
                            disabled: false
                        }
                    }

                    this._userService.customerAddress$
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((customerAddress : CustomerAddress) => {
                            if (customerAddress) { 

                                this.customerAddress = customerAddress;
                                // use for self pickup
                                this.selfPickupInfo = customerAddress;

                                // get delivery charges of every carts
                                this.getDeliveryCharges(this.carts.map(element => {
                                    return {
                                        cartId: element.id,
                                        customerId: this.customerId,
                                        delivery: {
                                            deliveryAddress     : this.customerAddress.address,
                                            deliveryCity        : this.customerAddress.city,
                                            deliveryState       : this.customerAddress.state,
                                            deliveryPostcode    : this.customerAddress.postCode,
                                            deliveryCountry     : this.customerAddress.country,
                                            deliveryContactEmail: this.customerAddress.email,
                                            deliveryContactName : this.customerAddress.name,
                                            deliveryContactPhone: this.customerAddress.phoneNumber,
                                            latitude            : this.customerAddress.latitude ? this.customerAddress.latitude : '',
                                            longitude           : this.customerAddress.longitude ? this.customerAddress.longitude : '' 
                                        },
                                        deliveryProviderId: null,
                                        storeId: element.storeId
                                    }
                                }));
                            }
                            // Mark for check 
                            this._changeDetectorRef.markForCheck();
                        });

                    // this.selectCart(null,null,true);
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get the cart pagination
        this._cartService.cartsWithDetailsPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: CartPagination) => {
                if (pagination) {
                    // Update the pagination
                    this.pagination = pagination;                    
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            }); 

        // Reset Payment Details
        this._cartService.cartSummary = null;

        // Get cartSummary data
        this._cartService.cartSummary$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: DiscountOfCartGroup)=>{
                if (response) {
                    this.paymentDetails.cartSubTotal = response.sumCartSubTotal === null ? 0 : response.sumCartSubTotal;
                    this.paymentDetails.deliveryCharges = response.sumCartDeliveryCharge === null ? 0 : response.sumCartDeliveryCharge;
                    this.paymentDetails.cartGrandTotal = response.sumCartGrandTotal === null ? 0 : response.sumCartGrandTotal;
                    this.paymentDetails.platformVoucherSubTotalDiscount = response.platformVoucherSubTotalDiscount === null ? 0 : response.platformVoucherSubTotalDiscount;
                    this.paymentDetails.platformVoucherDeliveryDiscount = response.platformVoucherDeliveryDiscount === null ? 0 : response.platformVoucherDeliveryDiscount;
                    this.paymentDetails.deliveryDiscount = response.sumDeliveryDiscount === null ? 0 : response.sumDeliveryDiscount;
                    this.paymentDetails.subTotalDiscount = response.sumSubTotalDiscount === null ? 0 : response.sumSubTotalDiscount;
                    this.paymentDetails.storeServiceCharge = response.sumServiceCharge === null ? 0 : response.sumServiceCharge;
                    this.paymentDetails.storeDiscountList = response.storeDiscountList;

                    response.storeDiscountList.forEach(item => {
                        let selectedCartIndex = this.selectedCart.carts.findIndex(cart => cart.id === item.cartId);
                        
                        if (selectedCartIndex > -1) {
                            this.selectedCart.carts[selectedCartIndex].deliveryPrice.discountAmount = item.deliveryDiscount;
                            this.selectedCart.carts[selectedCartIndex].deliveryPrice.discountedPrice = item.cartDeliveryCharge - item.deliveryDiscount;
                        }
                    })
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // once selectCart() is triggered, it will set isLoading to true
        // this function will wait for both cartsWithDetails$ & cartSummary$ result first
        // then is isLoading to false
        combineLatest([
            this._cartService.cartsWithDetails$,
            this._cartService.cartSummary$
        ]).pipe(takeUntil(this._unsubscribeAll))
        .subscribe(([result1, result2 ] : [CartWithDetails[], DiscountOfCartGroup])=>{
            if (result1 && result2) {
                this.isLoading = false;
            }            
            // Mark for check
            this._changeDetectorRef.markForCheck();
        });

        // ----------------------
        // Voucher
        // ----------------------

        // Get used customer voucher
        this._voucherService.getAvailableCustomerVoucher(false)
            .subscribe((response: any) => {

                if (response) {
                    this.customerVouchers = response;
    
                    let index = this.customerVouchers.findIndex(x => x.voucher.isNewUserVoucher === true )
                    // select the voucher if it is new user voucher
                    if (index > -1) {
                        this.selectVoucher(this.customerVouchers[index])
                        // this.calculateCharges();
                    }
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get customer voucher pagination, isUsed = false 
        this._voucherService.customerVouchersPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: CustomerVoucherPagination) => {

                if (response) {
                    this.customerVoucherPagination = response; 
                }
                
                // Mark for check
                this._changeDetectorRef.markForCheck();           
            });

        // Get used customer voucher pagination, isUsed = true 
        this._voucherService.usedCustomerVoucherPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: UsedCustomerVoucherPagination) => {

                this.usedCustomerVoucherPagination = response;
                
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {
                this.currentScreenSize = matchingAliases;

                if ( matchingAliases.includes('md') )
                {
                    this.visibleCartSummary = true;
                }
                else {
                    this.visibleCartSummary = false;
                }
            });
    }

    /**
    * After view init
    */
    ngAfterViewInit(): void
    {
        setTimeout(() => {
            if (this._paginator )
            {
                // Mark for check
                this._changeDetectorRef.markForCheck();

                // Get products if sort or page changes
                merge(this._paginator.page).pipe(
                    switchMap(() => {
                        this.isLoading = true;
                        return this._cartService.getCartsWithDetails({page: 0, pageSize: 5, customerId: this.customerId, includeEmptyCart: false});
                    }),
                    map(() => {
                        this.isLoading = false;
                    })
                ).subscribe();
            }
        }, 0);

    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {

        // Resolve back all carts
        this._cartService.cartResolver().subscribe();

        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
      
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public method
    // -----------------------------------------------------------------------------------------------------

    onChangePage(pageOfItems: Array<any>) {
        
        // update current page of items
        this.pageOfItems = pageOfItems;
        
        if(this.pagination && this.pageOfItems['currentPage']){

            if (this.pageOfItems['currentPage'] - 1 !== this.pagination.page) {
                // set loading to true
                this.isLoading = true;
                this._cartService.getCartsWithDetails({ page: this.pageOfItems['currentPage'] - 1, pageSize: this.pageOfItems['pageSize'], customerId: this.customerId, includeEmptyCart: false})
                    .subscribe((response)=>{
                        // set loading to false
                        this.isLoading = false;
                    }, error => {
                        // set loading to false
                        this.isLoading = false;
                    });
                    
            }
        }

        // Mark for check
        this._changeDetectorRef.markForCheck();

    }

    displayStoreLogo(store: Store) {
        // let storeAssetsIndex = storeAssets.findIndex(item => item.assetType === 'LogoUrl');
        if (store.storeLogoUrl != null) {
            return store.storeLogoUrl;
        } else {
            return this.platform.logo;
        }
    }

    deleteCart(cartId: string) {

        // This section is to get this.selectedCart.carts index
        let cartIndex = this.selectedCart.carts.findIndex(cart => cart.id === cartId);
        
        // This section is to get this.carts index
        let thisCartIndex = this.carts.findIndex(cart => cart.id === cartId);
                
        // If selected, show popup to say unable to delete
        let isSelected = this.selectedCart.carts[cartIndex].cartItem.some(item => item.selected) || this.selectedCart.carts[cartIndex].selected;
        if (isSelected) {

            const confirmation = this._fuseConfirmationService.open({
                title  : 'Unable To Delete Cart',
                message: 'Cannot delete selected cart. If you wish to delete the cart, unselect it first.',
                icon:{
                    name:"heroicons_outline:exclamation",
                    color:"warn"
                },
                actions: {
                    confirm: {
                        label: 'OK',
                        color: 'primary'
                    },
                    cancel: {
                        show: false,
                    },
                }
            });

            return;
        }

        let dialogRef = this._dialog.open(ModalConfirmationDeleteItemComponent, { disableClose: true, data:{ cartId: cartId, itemId: null }});
        // Subscribe to the confirmation dialog closed action
        dialogRef.afterClosed().subscribe((result) => {
    
            // If the confirm button pressed...
            if ( result && result.action === 'OK' )
            {
                this.selectedCart.carts.splice(cartIndex, 1);
                this.carts.splice(thisCartIndex, 1);
                
                this._cartService.deleteCart(cartId)
                .subscribe((response)=>{

                    // Resolve cart after deletion
                    this._cartService.cartResolver().subscribe();
                    this._cartService.cartResolver(true).subscribe();
                });
        
                // Mark for check
                this._changeDetectorRef.markForCheck();
            }
        });    
        
    }

    checkQuantity(cartId: string, cartItem: CartItem, quantity: number = null, operator: string = null) {
        quantity = quantity ? quantity : cartItem.quantity;

        this.maxQuantity = cartItem.productInventory.product.allowOutOfStockPurchases === false ? cartItem.productInventory.quantity : 99;

        if (operator === 'decrement')
            quantity > this.minQuantity ? quantity -- : quantity = this.minQuantity;
        else if (operator === 'increment') {
            quantity < this.maxQuantity ? quantity ++ : quantity = this.maxQuantity;
        }
        else {
            if (quantity < this.minQuantity) 
                quantity = this.minQuantity;
            else if (quantity > this.maxQuantity)
                quantity = this.maxQuantity;
        }

        let cartIndex = this.carts.findIndex(item => item.id === cartId);
        let cartItemIndex = this.carts[cartIndex].cartItems.findIndex(item => item.id === cartItem.id);
        
        const cartItemBody = {
            cartId: cartItem.cartId,
            id: cartItem.id,
            itemCode: cartItem.itemCode,
            productId: cartItem.productId,
            quantity: quantity,
            cartSubItem: cartItem.cartSubItem
        }

        if (!((cartItem.quantity === quantity) && (quantity === this.minQuantity || quantity === this.maxQuantity))) {
            this._cartService.putCartItem(cartId, cartItemBody, cartItem.id)
                .subscribe((response)=>{
                    this.carts[cartIndex].cartItems[cartItemIndex].quantity = quantity;
                    this.initializeCheckoutList()
                });
        }
    }

    getCartItemsTotal(cartItems: CartItem[]) : number {
        let cartItemsTotal: number;
        if (cartItems.length && cartItems.length > 0) {
            return cartItems.reduce((partialSum, item) => partialSum + item.totalPrice, 0);
        } else {
            return cartItemsTotal;
        }
    }

    selectCart(carts: CartWithDetails[], cart: CartWithDetails, cartItem: CartItem, checked: boolean) {

        // set isLoading to true
        this.isLoading = true;

        if (carts) {
            // select all carts
            let cartsIds = carts.map(item => item.id);
            this.selectedCart.carts.forEach(item => {

                // Check if store close, if closed, selected is false
                if (this.isStoreClose(item.storeId) || item.disabled) {
                    item.selected = false;
                    item.disabled = true;
                    if (cartsIds.includes(item.id)) {
                        item.cartItem.forEach(element => {
                            element.selected = false;
                            element.disabled = true;
                        });
                    }
                } 
                else {
                    item.selected = checked;
                    if (cartsIds.includes(item.id)) {
                        item.cartItem.forEach(element => {
                            if (!element.disabled) {
                                element.selected = checked;
                            }
                        });
                    }
                }
                // display required info
                item.showRequiredInfo = checked;
            });
        } else if (cart && cartItem === null) {
            // select all cartItems in a cart 
            let cartIndex = this.selectedCart.carts.findIndex(item => item.id === cart.id);
            if (cartIndex > -1) {
                this.selectedCart.carts[cartIndex].cartItem.forEach(item => {
                    if (!item.disabled) {
                        item.selected = checked;
                    }
                });
                // display required info
                this.selectedCart.carts[cartIndex].showRequiredInfo = checked;
            }
            // check for select all cartItems in a cart
            this.carts.forEach(item => {
                if (this.selectedCart.carts.map(element => element.id).includes(item.id)){
                    this.selectedCart.selected = this.selectedCart.carts.every(element => element.selected);
                }
            });
        } else if (cart && cartItem) {
            // select single cart items
            let cartIndex = this.selectedCart.carts.findIndex(item => item.id === cart.id);
            if (cartIndex > -1) {
                this.selectedCart.carts[cartIndex].selected = this.selectedCart.carts[cartIndex].cartItem.every(item => item.selected);

                // display required info
                this.selectedCart.carts[cartIndex].showRequiredInfo = this.selectedCart.carts[cartIndex].cartItem.some(item => item.selected);
            }
            // check for select all cartItems in a cart
            this.carts.forEach(item => {
                if (this.selectedCart.carts.map(element => element.id).includes(item.id)){
                    this.selectedCart.selected = this.selectedCart.carts.every(element => element.selected);
                }
            });
        } else {
            console.warn("Action not configured");
        }

        let cartItemIds: string[];
        this.selectedCart.carts.forEach((item, iteration) => {
            if (iteration === 0) {
                cartItemIds = item.cartItem.map(element => {
                    if (element.selected === true) {
                        return element.id;
                    }
                });
            } else {
                cartItemIds.concat(item.cartItem.map(element => {
                    if (element.selected === true) {
                        return element.id;
                    }
                }));
            }
        });
        
        // this._cartService.selectedCartsObs = this.selectedCart;

        this.initializeCheckoutList();

        //  Set loading to false
        this.isLoading = false;
    }

    deleteCartItem(cartId: string, cartItem: CartWithDetails){

        // This section is to get this.selectedCart.carts index
        let cartIndex = this.selectedCart.carts.findIndex(cart => cart.id === cartId);
        let cartItemIndex = cartIndex ? this.carts[cartIndex].cartItems.findIndex(item => item.id === cartItem.id) : -1;
        
        // This is to get index of selected cart item
        let isCartItemIsSelectedIndex = cartIndex > -1 ? this.selectedCart.carts[cartIndex].cartItem.findIndex(item => item.id === cartItem.id && (item.selected === true)) : -1;
        
        // This section is to get this.carts index
        let thisCartIndex = this.carts.findIndex(cart => cart.id === cartId);
        let thisCartItemIndex = thisCartIndex ? this.carts[thisCartIndex].cartItems.findIndex(item => item.id === cartItem.id) : -1;

        // If more than -1 means it is selected
        if (isCartItemIsSelectedIndex > -1) {

            const confirmation = this._fuseConfirmationService.open({
                title  : 'Unable To Delete Item',
                message: 'Cannot delete selected item. If you wish to delete the item, unselect it first.',
                icon:{
                    name:"heroicons_outline:exclamation",
                    color:"warn"
                },
                actions: {
                    confirm: {
                        label: 'OK',
                        color: 'primary'
                    },
                    cancel: {
                        show: false,
                    },
                }
            });

            return;
        }

        // To make custom pop up, and we pass the details in paramter data
        // Deletion will occur at service level, here we'll only call the resolver
        let dialogRef = this._dialog.open(ModalConfirmationDeleteItemComponent, { disableClose: true, data:{ cartId: cartId, itemId: cartItem.id }});
        dialogRef.afterClosed().subscribe((result) => {    
            if (result && result.action === 'OK') {
                
                this.selectedCart.carts[cartIndex].cartItem.splice(cartItemIndex, 1);
                this.carts[thisCartIndex].cartItems.splice(thisCartItemIndex, 1);
                // If cart item inside the cart only one, splice the cart terus
                if (this.selectedCart.carts[cartIndex].cartItem.length === 0) {
                    this.selectedCart.carts.splice(cartIndex, 1);
                    this.carts.splice(thisCartIndex, 1);
                    
                }
                
                this._cartService.deleteCartItem(result.cartId, result.itemId).subscribe((response)=>{

                    // Resolve cart after deletion
                    this._cartService.cartResolver().subscribe();
                    this._cartService.cartResolver(true).subscribe();
                });
        
                // Mark for check
                this._changeDetectorRef.markForCheck();
            } 
        });
    }

    getDeliveryCharges(deliveryChargesBody: DeliveryCharges[] )
    {
        // return if empty address
        if (!this.customerAddress) return;
        // set this to initiate loading
        this.isGettingDeliveryPrices = true;
        this._checkoutService.postToRetrieveDeliveriesCharges(deliveryChargesBody)
            .subscribe((deliveryProviderResponse: DeliveryProviders[])=>{     
                           
                deliveryProviderResponse.forEach(item => {
                    let cartIndex = this.selectedCart.carts.findIndex(element => element.id === item.cartId);
                    if (cartIndex > -1) {
                        // let minDeliveryCharges1 = Math.min(...item.quotation.filter(x => x.isError === false).map(element => element.price));
                        
                        // Get min/max delivery charges with no error
                        let minDeliveryCharges = Math.min(
                            ...item.quotation.reduce((previousValue, currentValue) => {
                                if (currentValue.isError === false) {
                                    previousValue.push(currentValue.price);
                                }
                                return previousValue
                            }, []))

                        // let maxDeliveryCharges = Math.max(...item.quotation.filter(x => x.isError === false).map(element => element.price));

                        // find delivery with no error
                        let indexOfNoError = item.quotation.findIndex(item => item.isError === false);

                        if (indexOfNoError > -1) {
                            
                            // find index at response to find the minimum price charges
                            let minDeliveryChargesIndex = item.quotation.findIndex(element => element.price === minDeliveryCharges);

                            this.selectedCart.carts[cartIndex].deliveryQuotationId = item.quotation[minDeliveryChargesIndex].refId;
                            this.selectedCart.carts[cartIndex].deliveryType = item.quotation[minDeliveryChargesIndex].deliveryType;
                            this.selectedCart.carts[cartIndex].deliveryProviderId = item.quotation[minDeliveryChargesIndex].providerId;
                            this.selectedCart.carts[cartIndex].deliveryProviderImg = item.quotation[minDeliveryChargesIndex].providerImage;
                            this.selectedCart.carts[cartIndex].deliveryPrice.selectedDeliveryPrice = item.quotation[minDeliveryChargesIndex].price;
                            this.selectedCart.carts[cartIndex].minDeliveryCharges = item.quotation[minDeliveryChargesIndex].price;
                            this.selectedCart.carts[cartIndex].maxDeliveryCharges = item.quotation[minDeliveryChargesIndex].price;
                            this.selectedCart.carts[cartIndex].deliveryProviderName = item.quotation[minDeliveryChargesIndex].providerName;
                            
                        }
                        // if has error
                        else {
                            this.selectedCart.carts[cartIndex].deliveryQuotationId = null;
                            this.selectedCart.carts[cartIndex].deliveryType = null;
                            this.selectedCart.carts[cartIndex].deliveryProviderId = null;
                            this.selectedCart.carts[cartIndex].deliveryErrorMessage = item.quotation.length ? item.quotation[0].message : "No response from delivery provider";

                            // Disable the cart if the carts delivery type is delivery
                            if (this.selectedCart.carts[cartIndex].isSelfPickup === false) {
                                // Disable the store
                                this.selectedCart.carts[cartIndex].disabled = true;
                                // Unselect the store
                                this.selectedCart.carts[cartIndex].selected = false;
                                
                                this.selectedCart.carts[cartIndex].cartItem.forEach(item => {
                                    // Disable the item
                                    item.disabled = true;
                                    // Unselect the item
                                    item.selected = false;
                                });
                            }
                        }
                        // Get all quotations
                        this.selectedCart.carts[cartIndex].deliveryQuotations = item.quotation;
                    }
                });
                this.isGettingDeliveryPrices = false;
                
                // if got cart selected, call initializeCheckoutList
                if (this.totalSelectedCartItem > 0) {
                    this.initializeCheckoutList()
                }
            });
    }

    getDeliveryChargesRange(index: number) : string 
    {
        if (this.selectedCart.carts[index]) {

            let cartId = this.selectedCart.carts[index].id;
            let deliveryDiscount = null;

            let paymentIndex = this.paymentDetails.storeDiscountList.findIndex(item => item.cartId === cartId)

            if (paymentIndex > -1) {
                deliveryDiscount = this.paymentDetails.storeDiscountList[paymentIndex].deliveryDiscount;
            }
            
            if (this.selectedCart.carts[index].deliveryQuotationId === null) {
                return this.selectedCart.carts[index].deliveryErrorMessage;

            }
            if (this.selectedCart.carts[index].minDeliveryCharges === this.selectedCart.carts[index].maxDeliveryCharges && (deliveryDiscount === 0 || deliveryDiscount === null) ) {

                return this._currencyPipe.transform(this.selectedCart.carts[index].minDeliveryCharges, this.platform.currency);
            } 
            else if (this.selectedCart.carts[index].minDeliveryCharges === this.selectedCart.carts[index].maxDeliveryCharges && (deliveryDiscount !== 0 || deliveryDiscount !== null) ) {

                return this._currencyPipe.transform(this.selectedCart.carts[index].minDeliveryCharges, this.platform.currency) + " ( -" + this._currencyPipe.transform(deliveryDiscount, this.platform.currency) + " )";
            }
            else {

                return this._currencyPipe.transform(this.selectedCart.carts[index].minDeliveryCharges, this.platform.currency) + " - " + this._currencyPipe.transform(this.selectedCart.carts[index].maxDeliveryCharges, this.platform.currency);
            }
        }
    }

    changeDeliveryProvider(deliveryProviderId, index: number) {
        if (this.selectedCart.carts[index]) {

            this.selectedCart.carts[index].deliveryProviderId = null;

            // Mark for check
            this._changeDetectorRef.markForCheck();

            let selectedProviderIdIndex = this.selectedCart.carts[index].deliveryQuotations.findIndex(item => item.providerId === deliveryProviderId);

            if (selectedProviderIdIndex > -1) {
                let isSelectedProviderError: boolean = this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].isError;
                if (isSelectedProviderError) {
                    const confirmation = this._fuseConfirmationService.open({
                        "title": `Error provider ${this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].providerName}`,
                        "message": this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].message ? this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].message
                            : `Provider ${this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].providerName} is currently unavailable, please try again later.`,
                        "icon": {
                        "show": true,
                        "name": "heroicons_outline:exclamation",
                        "color": "warn"
                        },
                        "actions": {
                        "confirm": {
                            "show": true,
                            "label": "OK",
                            "color": "primary"
                        },
                        "cancel": {
                            "show": false,
                            "label": "Cancel"
                        }
                        },
                        "dismissible": true
                    });

                    let nextSelectedProviderIdIndex = this.selectedCart.carts[index].deliveryQuotations.findIndex(item => item.isError === false);
                    if (nextSelectedProviderIdIndex > -1) {
                        this.selectedCart.carts[index].deliveryProviderName = this.selectedCart.carts[index].deliveryQuotations[nextSelectedProviderIdIndex].providerName;
                        this.selectedCart.carts[index].deliveryProviderId = this.selectedCart.carts[index].deliveryQuotations[nextSelectedProviderIdIndex].providerId;
                        this.selectedCart.carts[index].deliveryProviderImg = this.selectedCart.carts[index].deliveryQuotations[nextSelectedProviderIdIndex].providerImage;
                        this.selectedCart.carts[index].deliveryQuotationId = this.selectedCart.carts[index].deliveryQuotations[nextSelectedProviderIdIndex].refId;
                        this.selectedCart.carts[index].deliveryType = this.selectedCart.carts[index].deliveryQuotations[nextSelectedProviderIdIndex].deliveryType;
                        this.selectedCart.carts[index].minDeliveryCharges = this.selectedCart.carts[index].deliveryQuotations[nextSelectedProviderIdIndex].price;
                        this.selectedCart.carts[index].maxDeliveryCharges = this.selectedCart.carts[index].deliveryQuotations[nextSelectedProviderIdIndex].price;
                        this.selectedCart.carts[index].deliveryPrice.selectedDeliveryPrice = this.selectedCart.carts[index].deliveryQuotations[nextSelectedProviderIdIndex].price;
                    }
                } else {
                    this.selectedCart.carts[index].deliveryProviderName = this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].providerName;
                    this.selectedCart.carts[index].deliveryProviderId = this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].providerId;
                    this.selectedCart.carts[index].deliveryProviderImg = this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].providerImage;
                    this.selectedCart.carts[index].deliveryQuotationId = this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].refId;
                    this.selectedCart.carts[index].deliveryType = this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].deliveryType;
                    this.selectedCart.carts[index].minDeliveryCharges = this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].price;
                    this.selectedCart.carts[index].maxDeliveryCharges = this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].price;
                    this.selectedCart.carts[index].deliveryPrice.selectedDeliveryPrice = this.selectedCart.carts[index].deliveryQuotations[selectedProviderIdIndex].price;
                }
            }

            this.initializeCheckoutList();

            // Mark for check
            this._changeDetectorRef.markForCheck();

        }
        
        return;
    }

    /**
     * Open the search
     * Used in 'bar'
     */
    open(id: string): void
    {
        let index = this.selectedCart.carts.findIndex(item => item.id === id);

        if(index > -1){
            this.selectedCart.carts[index].description.isOpen = true;
        }
    }

    close(id: string): void
    {
        let index = this.selectedCart.carts.findIndex(item => item.id === id);

        if(index > -1){
            this.selectedCart.carts[index].description.isOpen = false;
        }

    }

    initializeCheckoutList() {

        // to list out the array of selectedCart
        let checkoutListBody: CheckoutItems[] = this.selectedCart.carts.map(item => {
            return {
                cartId: item.id,
                selectedItemId: item.cartItem.map(element => {
                    if (element.selected === true) {
                        return element.id
                    }
                // to remove if selected = false (undefined array of cart item)
                }).filter(x => x),
                deliveryQuotationId : item.isSelfPickup ? null : item.deliveryQuotationId,
                deliveryType : item.isSelfPickup ? 'PICKUP' : item.deliveryType,
                deliveryProviderId : item.isSelfPickup ? null : item.deliveryProviderId,
                orderNotes : item.description.value,
                platformVoucherCode: this.voucherApplied ? this.voucherApplied.voucher.voucherCode : null,
                deliveryPrice: {
                    deliveryFee: item.isSelfPickup ? null : item.deliveryPrice.selectedDeliveryPrice,
                    discountAmount: item.isSelfPickup ? null : item.deliveryPrice.discountAmount,
                    discountedPrice: item.isSelfPickup ? null : item.deliveryPrice.discountedPrice
                },
                selfPickupInfo: {
                    name        : this.selfPickupInfo ? this.selfPickupInfo.name : null,
                    email       : this.selfPickupInfo ? this.selfPickupInfo.email : null,
                    phoneNumber : this.selfPickupInfo ? this.selfPickupInfo.phoneNumber : null
                }
            }
        // to remove if selected = false (undefined array of selectedItemId)
        }).filter(n => {
            if (n.selectedItemId && n.selectedItemId.length > 0) {
                return n;
            }
        });

        // let checkoutListBody2: CheckoutItems[] = this.selectedCart.carts.reduce((previousValue, currentValue) => {
        //     if (currentValue.selectedItemId && n.selectedItemId.length > 0)
        // })

        let newCheckoutListBodyArr = checkoutListBody.map(item => {
            let {platformVoucherCode, deliveryPrice, selfPickupInfo, ...newCheckoutListBody} = item;
            return newCheckoutListBody;
        })

        // Get totalSelectedCartItem to be displayed
        // .reduce will sum up all number in the array of number created by .map
        this.totalSelectedCartItem = checkoutListBody.map(item => item.selectedItemId.length).reduce((partialSum, a) => partialSum + a, 0);

        this.isPristine = (this.totalSelectedCartItem < 1) ? true : false;

        let checkoutParams = null;

        if (checkoutListBody.length > 0 && this.voucherApplied) {
            // If login
            if (this.customerId) {
                checkoutParams = {
                    platformVoucherCode: this.voucherApplied.voucher.voucherCode, 
                    customerId: this.customerId, 
                    email: null
                }
            }
            // If guest
            else if (!this.customerId) {

                if (this.customerAddress) {
                    checkoutParams = {
                        platformVoucherCode: this.voucherApplied.voucher.voucherCode, 
                        customerId: null, 
                        email: this.customerAddress.email
                    }
                }
                else if (this.selfPickupInfo) {
                    checkoutParams = {
                        platformVoucherCode: this.voucherApplied.voucher.voucherCode, 
                        customerId: null, 
                        email: this.selfPickupInfo.email
                    }
                }
                else {
                    // Check if all delivery, true if got delivery, false if all self pickup
                    let isAllSelfPickup = this.selectedCart.carts.filter(x => x.showRequiredInfo).every(cart => cart.isSelfPickup === true);
                    let isAllDelivery = this.selectedCart.carts.filter(x => x.showRequiredInfo).every(cart => cart.isSelfPickup === false);
    
                    // If all selected items are delivery
                    if (isAllDelivery && !this.customerAddress) {
                        
                        const confirmation = this._fuseConfirmationService.open({
                            "title": "Address is empty!",
                            "message": "Please add your delivery address to use this voucher.",
                            "icon": {
                            "show": true,
                            "name": "heroicons_outline:exclamation",
                            "color": "warn"
                            },
                            "actions": {
                            "confirm": {
                                "show": true,
                                "label": "OK",
                                "color": "primary"
                            },
                            "cancel": {
                                "show": false,
                                "label": "Cancel"
                            }
                            },
                            "dismissible": true
                        });
                        
                        // Subscribe to the confirmation dialog closed action
                        confirmation.afterClosed().subscribe((result) => {
    
                            // If the confirm button pressed...
                            if ( result === 'confirmed' )
                            {
                                this.addRequiredInfo(null) 
                            }
                        })
                        return;
                    }
                    // If all self pickup
                    else if (isAllSelfPickup && !this.selfPickupInfo){
                        const confirmation = this._fuseConfirmationService.open({
                            "title": "Contact info is empty!",
                            "message": "Please add your contact information to use this voucher.",
                            "icon": {
                            "show": true,
                            "name": "heroicons_outline:exclamation",
                            "color": "warn"
                            },
                            "actions": {
                            "confirm": {
                                "show": true,
                                "label": "OK",
                                "color": "primary"
                            },
                            "cancel": {
                                "show": false,
                                "label": "Cancel"
                            }
                            },
                            "dismissible": true
                        });
    
                        // Subscribe to the confirmation dialog closed action
                        confirmation.afterClosed().subscribe((result) => {
    
                            // If the confirm button pressed...
                            if ( result === 'confirmed' )
                            {
                                this.addRequiredInfo(null) 
                            }
                        })
                        return;
                    }
                    // If mix
                    else if (!isAllSelfPickup && !isAllDelivery && (!this.selfPickupInfo || !this.customerAddress)){
                        const confirmation = this._fuseConfirmationService.open({
                            "title": "Required info is empty!",
                            "message": "Please add your address/contact information to use this voucher.",
                            "icon": {
                            "show": true,
                            "name": "heroicons_outline:exclamation",
                            "color": "warn"
                            },
                            "actions": {
                            "confirm": {
                                "show": true,
                                "label": "OK",
                                "color": "primary"
                            },
                            "cancel": {
                                "show": false,
                                "label": "Cancel"
                            }
                            },
                            "dismissible": true
                        });
    
                        // Subscribe to the confirmation dialog closed action
                        confirmation.afterClosed().subscribe((result) => {
    
                            // If the confirm button pressed...
                            if ( result === 'confirmed' )
                            {
                                this.addRequiredInfo(null) 
                            }
                        })
                        return;
                    }
                }                
            }
        } else {
            checkoutParams = {
                platformVoucherCode: null, 
                customerId: null, 
                email: null
            }
        }

        // Call for cart summary
        this._cartService.getDiscountOfCartGroup(
            newCheckoutListBodyArr, 
            checkoutParams
            ).subscribe(resp => {}, (error) => {
    
                // if voucher is invalid
                this.promoCode = '';

                if (error.error.message) {
                    // if voucher is invalid
                    this.openVoucherModal('heroicons_outline:x','Error', error.error.message, null, true);

                    // Set to null
                    this.voucherApplied = null;
                    this.paymentDetails.platformVoucherSubTotalDiscount = 0;
                    this.guestVouchers = null;
                }  
              
            });

        // Call for checkout summary
        this._checkoutService.getDiscountOfCartGroup(
            newCheckoutListBodyArr, 
            checkoutParams
            ).subscribe();

        // Resolved checkout
        this._checkoutService.resolveCheckout(checkoutListBody).subscribe();

        // Check if has self pickup 
        this.hasSelfPickup = this.selectedCart.carts.some(item => item.showRequiredInfo && item.isSelfPickup);

        // Check if has delivery
        this.hasDelivery = this.selectedCart.carts.some(item => item.showRequiredInfo && !item.isSelfPickup);

    }

    scroll(id) {
        this._scroller.scrollToAnchor(id)
    }

    scrollToTop(){        
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'smooth' 
     });
    }

    checkStoreTimingNew(cart: CartWithDetails): void
    {
        let storeTiming = cart.store.storeTiming;
        let storeId = cart.storeId;
        let storeSnooze = cart.storeSnooze

        this.storesOpening.push({
            storeId: storeId,
            isOpen : true,
            messageTitle: '',
            message: ''
        })

        let storeOpeningIndex = this.storesOpening.findIndex(i => i.storeId === storeId)

        // the only thing that this function required is this.store.storeTiming

        let todayDate = new Date();
        let today = this.daysArray[todayDate.getDay()];

        // check if store closed for all days
        let isStoreCloseAllDay = storeTiming.map(item => item.isOff);

        // --------------------
        // Check store timing
        // --------------------

        // isStoreCloseAllDay.includes(false) means that there's a day that the store is open
        // hence, we need to find the day that the store is open
        if (isStoreCloseAllDay.includes(false)) {
            storeTiming.forEach((item, index) => {
                if (item.day === today) {
                    // this means store opened
                    if (item.isOff === false) {
                        let openTime = new Date();
                        openTime.setHours(Number(item.openTime.split(":")[0]), Number(item.openTime.split(":")[1]), 0);

                        let closeTime = new Date();
                        closeTime.setHours(Number(item.closeTime.split(":")[0]), Number(item.closeTime.split(":")[1]), 0);

                        if(todayDate >= openTime && todayDate < closeTime ) {

                            // --------------------
                            // Check store snooze
                            // --------------------

                            let snoozeEndTime = new Date(storeSnooze.snoozeEndTime);
                            let nextStoreOpeningTime: string = "";                            

                            if (storeSnooze.isSnooze === true) {

                                // check if snoozeEndTime exceed closeTime
                                if (snoozeEndTime > closeTime) {
                                    // console.info("Store snooze exceed closeTime");

                                    // ------------------------
                                    // Find next available day
                                    // ------------------------

                                    let dayBeforeArray = storeTiming.slice(0, index + 1);
                                    let dayAfterArray = storeTiming.slice(index + 1, storeTiming.length);
                                    
                                    let nextAvailableDay = dayAfterArray.concat(dayBeforeArray);                                
                                    nextAvailableDay.forEach((object, iteration, array) => {
                                        // this means store opened
                                        if (object.isOff === false) {
                                            let nextOpenTime = new Date();
                                            nextOpenTime.setHours(Number(object.openTime.split(":")[0]), Number(object.openTime.split(":")[1]), 0);

                                            let nextCloseTime = new Date();
                                            nextCloseTime.setHours(Number(object.closeTime.split(":")[0]), Number(object.closeTime.split(":")[1]), 0);

                                            if(todayDate >= nextOpenTime){
                                                let nextOpen = (iteration === 0) ? ("tomorrow at " + object.openTime) : ("on " + object.day + " " + object.openTime);
                                                this.notificationMessage = "Please come back " + nextOpen;
                                                nextStoreOpeningTime = "Please come back " + nextOpen;
                                                array.length = iteration + 1;
                                            }
                                        } else {
                                            // console.warn("Store currently snooze. Store close on " + object.day);
                                            
                                            this.storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                                            this.storesOpening[storeOpeningIndex].isOpen = false;
                                            this.storesOpening[storeOpeningIndex].message = this.notificationMessage;
                                        }
                                    });

                                } else {
                                    nextStoreOpeningTime = "Please come back on " + this._datePipe.transform(storeSnooze.snoozeEndTime,'EEEE, h:mm a');
                                }                                

                                if (storeSnooze.snoozeReason && storeSnooze.snoozeReason !== null) {
                                    // this.notificationMessage = "Store is closed due to " + storeSnooze.snoozeReason + ". " + nextStoreOpeningTime;

                                    this.notificationMessage = nextStoreOpeningTime;
                                    
                                    this.storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                                    this.storesOpening[storeOpeningIndex].isOpen = false;
                                    this.storesOpening[storeOpeningIndex].message = this.notificationMessage;

                                } 
                                // Unexpected reason
                                else {
                                    this.notificationMessage = '';
                                    
                                    this.storesOpening[storeOpeningIndex].messageTitle = 'Temporarily';
                                    this.storesOpening[storeOpeningIndex].isOpen = false;
                                    this.storesOpening[storeOpeningIndex].message = this.notificationMessage;
                                }
                            }
                            
                            // ---------------------
                            // check for break hour
                            // ---------------------
                            if ((item.breakStartTime && item.breakStartTime !== null) && (item.breakEndTime && item.breakEndTime !== null)) {
                                let breakStartTime = new Date();
                                breakStartTime.setHours(Number(item.breakStartTime.split(":")[0]), Number(item.breakStartTime.split(":")[1]), 0);
    
                                let breakEndTime = new Date();
                                breakEndTime.setHours(Number(item.breakEndTime.split(":")[0]), Number(item.breakEndTime.split(":")[1]), 0);

                                if(todayDate >= breakStartTime && todayDate < breakEndTime ) {
                                    // console.info("We are on BREAK! We will open at " + item.breakEndTime);
                                    this.notificationMessage = "We will open at " + item.breakEndTime;

                                    this.storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                                    this.storesOpening[storeOpeningIndex].isOpen = false;
                                    this.storesOpening[storeOpeningIndex].message = this.notificationMessage;
                                }
                            }
                        } else if (todayDate < openTime) {
                            // this mean it's open today but it's before store opening hour (store not open yet)
                            this.notificationMessage = "Please come back at " + item.openTime;
                            
                            this.storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                            this.storesOpening[storeOpeningIndex].isOpen = false;
                            this.storesOpening[storeOpeningIndex].message = this.notificationMessage;

                        } else {

                            // console.info("We are CLOSED for the day!");

                            // ------------------------
                            // Find next available day
                            // ------------------------

                            let dayBeforeArray = storeTiming.slice(0, index + 1);
                            let dayAfterArray = storeTiming.slice(index + 1, storeTiming.length);
                            
                            let nextAvailableDay = dayAfterArray.concat(dayBeforeArray);                                
                            nextAvailableDay.forEach((object, iteration, array) => {
                                // this mean store opened
                                if (object.isOff === false) {
                                    let nextOpenTime = new Date();
                                    nextOpenTime.setHours(Number(object.openTime.split(":")[0]), Number(object.openTime.split(":")[1]), 0);

                                    let nextCloseTime = new Date();
                                    nextCloseTime.setHours(Number(object.closeTime.split(":")[0]), Number(object.closeTime.split(":")[1]), 0);

                                    if(todayDate >= nextOpenTime){
                                        let nextOpen = (iteration === 0) ? ("tomorrow at " + object.openTime) : ("on " + object.day + " " + object.openTime);
                                        // console.info("We will open " + nextOpen);
                                        this.notificationMessage = "Please come back " + nextOpen;
                                        
                                        this.storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                                        this.storesOpening[storeOpeningIndex].isOpen = false;
                                        this.storesOpening[storeOpeningIndex].message = this.notificationMessage;

                                        array.length = iteration + 1;
                                    }
                                } else {
                                    // console.warn("Store close on " + object.day);
                                }
                            });
                        }
                    } else {

                        // console.warn("We are CLOSED today");
                        
                        // ------------------------
                        // Find next available day
                        // ------------------------

                        let dayBeforeArray = storeTiming.slice(0, index + 1);
                        let dayAfterArray = storeTiming.slice(index + 1, storeTiming.length);
                        
                        let nextAvailableDay = dayAfterArray.concat(dayBeforeArray);
            
                        nextAvailableDay.forEach((object, iteration, array) => {
                            // this mean store opened
                            if (object.isOff === false) {
                                
                                let nextOpenTime = new Date();                    
                                nextOpenTime.setHours(Number(object.openTime.split(":")[0]), Number(object.openTime.split(":")[1]), 0);
                                
                                let nextCloseTime = new Date();
                                nextCloseTime.setHours(Number(object.closeTime.split(":")[0]), Number(object.closeTime.split(":")[1]), 0);
                                    
                                if(todayDate >= nextOpenTime){
                                    let nextOpen = (iteration === 0) ? ("tomorrow at " + object.openTime) : ("on " + object.day + " " + object.openTime);
                                    // console.info("We will open " + nextOpen);
                                    this.notificationMessage = "Please come back " + nextOpen;
                                    
                                    this.storesOpening[storeOpeningIndex].messageTitle =  'Sorry! We\'re';
                                    this.storesOpening[storeOpeningIndex].isOpen = false;
                                    this.storesOpening[storeOpeningIndex].message = this.notificationMessage;

                                    array.length = iteration + 1;
                                }
                            } else {
                                this.notificationMessage = "We are closed today";
                                this.storesOpening[storeOpeningIndex].messageTitle = 'Temporarily';
                                this.storesOpening[storeOpeningIndex].isOpen = false;
                                this.storesOpening[storeOpeningIndex].message = this.notificationMessage;
                                // console.warn("Store close on this " + object.day);
                            }
                        });
                    }
                }
            });
        } else {
            // this indicate that store closed for all days
            this.notificationMessage = '';

            this.storesOpening[storeOpeningIndex].messageTitle = 'Temporarily';
            this.storesOpening[storeOpeningIndex].isOpen = false;
            this.storesOpening[storeOpeningIndex].message = this.notificationMessage;
        }
    
    }

    isStoreClose(storeId)
    {
        let storeIndex = this.storesOpening.findIndex(x => x.storeId === storeId && (x.isOpen === false));  
        if (storeIndex > -1) 
            return true;
        else 
            return false;

    }
    
    selectVoucher(voucher: any) {
        this.voucherApplied = voucher;
        this.initializeCheckoutList();
    }

    deselectVoucher() {
        this.voucherApplied = null;
        this.paymentDetails.platformVoucherSubTotalDiscount = 0;
        this.guestVouchers = null;

        // change button to Calculate Charges
        this.initializeCheckoutList();
    }

    validateVoucher(voucher: any) {

        // Hardcode for now
        let verticalCodes = [];
        if (this.platform.country === 'MYS') {
            verticalCodes = ['FnB', 'E-Commerce'];
        }
        else
        {
            verticalCodes = ['FnB_PK', 'ECommerce_PK'];
        }

        let index = voucher.voucher.voucherVerticalList.findIndex(item => (verticalCodes.includes(item.verticalCode)));
        if (index > -1) {
            return true;
        }
        else
        {
            return false;
        }
    }

    claimPromoCode() {

        if (this.promoCode === ''){
            return;
        }

        if (this.customerId) {
            this._voucherService.postCustomerClaimVoucher(this.customerId, this.promoCode)
                .subscribe((response) => {
    
                    this.promoCode = '';
    
                    // find the verticalcode in the voucher list
                    // if index -1 mean that the voucher can't be used in current store
    
                    // if voucher is valid
                    this.openVoucherModal('mat_solid:check_circle','Congratulations!', 'Promo code successfully claimed', null, true);
                    this.displayRedeem = false;
                    this.selectVoucher(response);
    
                    
                }, (error) => {
    
                    // if voucher is invalid
                    this.promoCode = '';
    
                    if (error['status'] === 409) {
    
                        if (error.error.message) {
                            // if voucher is invalid
                            this.openVoucherModal('heroicons_outline:x','Error', error.error.message, null, true);
                        }  
                        else {
                            // if voucher is invalid
                            this.openVoucherModal('heroicons_outline:x','Promo code already claimed!', 'Please enter a different code', null, true);
    
                        }
    
                    }
                    else if (error['status'] === 404) {
                        this.openVoucherModal('heroicons_outline:x','Error', error.error.message, null, true);
                    }
                });
        }
        else {
            let guestVouchers = {
                voucher: {
                    name: this.promoCode, 
                    voucherCode: this.promoCode 
                }
            }
            this.displayRedeem = false;
            this.guestVouchers = guestVouchers;
            this.selectVoucher(guestVouchers);
            this.promoCode = '';
        }

        
    }

    openVoucherModal(icon: string, title: string, description: string, voucher: CustomerVoucher, isValid: boolean) : void {
        
        const dialogRef = this._dialog.open( 
        VoucherModalComponent,{
            data:{ 
                icon,
                title,
                description,
                voucher, 
                isValid
            }
        });
        
        dialogRef.afterClosed().subscribe();
    }
 
    deleteGuestAddress() {

        const confirmation = this._fuseConfirmationService.open({
            title  : 'Delete Address',
            message: 'Are you sure you want to delete this address?',
            icon:{
                name:"mat_outline:delete_forever",
                color:"primary"
            },
            actions: {
                confirm: {
                    label: 'Delete',
                    color: 'primary'
                }
            }
        });
        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {

            // If the confirm button pressed...
            if ( result === 'confirmed' )
            {                
                let guestAddresses: CustomerAddress[] = this._userService.guestAddress$ ? JSON.parse(this._userService.guestAddress$) : [];
                let index = guestAddresses.findIndex(item => item.id === this.customerAddress.id);

                if (index > -1) {

                    // Delete the address
                    guestAddresses.splice(index, 1);

                    // Update the address
                    this._userService.customersAddresses = guestAddresses;
                    this._userService.customersAddress = null;

                    // Set to local
                    this._userService.guestAddress = JSON.stringify(guestAddresses);

                    this.customerAddress = null;

                    this.selectedCart.carts.forEach(cart => {
                        cart.deliveryErrorMessage = null;
                        cart.deliveryQuotationId = null;
                        cart.deliveryType = null;
                        cart.deliveryProviderId = null;
                        cart.deliveryQuotations = null;
                        cart.deliveryProviderImg = null;
                        cart.deliveryPrice.selectedDeliveryPrice = null;
                        cart.deliveryProviderName = null;
                    })
                    this.initializeCheckoutList();

                }
            }
        });   
    }

    goToCheckout() {

        if (this.totalSelectedCartItem < 1) {
            
            const confirmation = this._fuseConfirmationService.open({
                "title": "No cart items selected!",
                "message": "Please select cart items before checking out.",
                "icon": {
                "show": true,
                "name": "heroicons_outline:exclamation",
                "color": "warn"
                },
                "actions": {
                "confirm": {
                    "show": true,
                    "label": "OK",
                    "color": "primary"
                },
                "cancel": {
                    "show": false,
                    "label": "Cancel"
                }
                },
                "dismissible": true
            });
            
            return;
        }

        // Check if all delivery, true if got delivery, false if all self pickup
        let isAllSelfPickup = this.selectedCart.carts.filter(x => x.showRequiredInfo).every(cart => cart.isSelfPickup === true);
        let isAllDelivery = this.selectedCart.carts.filter(x => x.showRequiredInfo).every(cart => cart.isSelfPickup === false);

        // If all selected items are delivery
        if (isAllDelivery && !this.customerAddress) {
            
            const confirmation = this._fuseConfirmationService.open({
                "title": "Address is empty!",
                "message": "Please add your delivery address before checking out.",
                "icon": {
                "show": true,
                "name": "heroicons_outline:exclamation",
                "color": "warn"
                },
                "actions": {
                "confirm": {
                    "show": true,
                    "label": "OK",
                    "color": "primary"
                },
                "cancel": {
                    "show": false,
                    "label": "Cancel"
                }
                },
                "dismissible": true
            });
            
            // Subscribe to the confirmation dialog closed action
            confirmation.afterClosed().subscribe((result) => {

                // If the confirm button pressed...
                if ( result === 'confirmed' )
                {
                    this.addRequiredInfo(null) 
                }
            })
            
            return;
        }
        // If all self pickup
        else if (isAllSelfPickup && !this.selfPickupInfo){
            const confirmation = this._fuseConfirmationService.open({
                "title": "Contact info is empty!",
                "message": "Please add your contact information before checking out.",
                "icon": {
                "show": true,
                "name": "heroicons_outline:exclamation",
                "color": "warn"
                },
                "actions": {
                "confirm": {
                    "show": true,
                    "label": "OK",
                    "color": "primary"
                },
                "cancel": {
                    "show": false,
                    "label": "Cancel"
                }
                },
                "dismissible": true
            });

            // Subscribe to the confirmation dialog closed action
            confirmation.afterClosed().subscribe((result) => {

                // If the confirm button pressed...
                if ( result === 'confirmed' )
                {
                    this.addRequiredInfo(null) 
                }
            })
            
            return;
        }
        // If mix
        else if (!isAllSelfPickup && !isAllDelivery && (!this.selfPickupInfo || !this.customerAddress)){
            const confirmation = this._fuseConfirmationService.open({
                "title": "Required info is empty!",
                "message": "Please add your address/contact information before checking out.",
                "icon": {
                "show": true,
                "name": "heroicons_outline:exclamation",
                "color": "warn"
                },
                "actions": {
                "confirm": {
                    "show": true,
                    "label": "OK",
                    "color": "primary"
                },
                "cancel": {
                    "show": false,
                    "label": "Cancel"
                }
                },
                "dismissible": true
            });

            // Subscribe to the confirmation dialog closed action
            confirmation.afterClosed().subscribe((result) => {

                // If the confirm button pressed...
                if ( result === 'confirmed' )
                {
                    this.addRequiredInfo(null) 
                }
            })
            
            return;
        }

        this.initializeCheckoutList();
        
        this._router.navigate(['/checkout']);    
    }

    redirect(type : string, store : Store, productSeo : string) {
        
        let storeSlug = store.domain.split(".")[0];

        if (type === 'store' && storeSlug) {
            
            this._router.navigate(['/store/' + storeSlug]);
        }
        else if (type === 'product' && productSeo) {

            this._router.navigate(['store/' + storeSlug + '/all-products/' + productSeo]);
        }
    }

    openProviderSelection() {

        // If address is empty, show popup
        if (!this.customerAddress) {
            const confirmation = this._fuseConfirmationService.open({
                "title": "Address is empty!",
                "message": "Please add your delivery address to select the delivery option.",
                "icon": {
                "show": true,
                "name": "heroicons_outline:exclamation",
                "color": "warn"
                },
                "actions": {
                "confirm": {
                    "show": true,
                    "label": "OK",
                    "color": "primary"
                },
                "cancel": {
                    "show": false,
                    "label": "Cancel"
                }
                },
                "dismissible": true
            });

            return;
        }
    }

    selectSelfPickup(cartId: string, value: boolean = false) {

        let thisCart = this.selectedCart.carts.filter(cart => cart.id === cartId)[0]
        let storeIsClosed = this.isStoreClose(thisCart.storeId);   
        
        // True if select self pickup
        if (value === true) {

            // If delivery error
            if (storeIsClosed === false && thisCart.deliveryErrorMessage && !thisCart.deliveryQuotationId) {
                // Enable the cart
                thisCart.disabled = false;
                thisCart.cartItem.forEach(item => {
                    item.disabled = false;
                })
            }
        }
        // if select delivery
        else {
            // If delivery error
            if (storeIsClosed === false && thisCart.deliveryErrorMessage && !thisCart.deliveryQuotationId) {
                // Disable/unselect the cart
                thisCart.disabled = true;
                thisCart.selected = false;
                thisCart.showRequiredInfo = false;
                thisCart.cartItem.forEach(item => {
                    item.disabled = true;
                    item.selected = false;
                })                
            }
        }

        this.initializeCheckoutList();
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    validateCustomerInfo(index: number) {
        // For self pickup
        if (this.selectedCart.carts[index].isSelfPickup) {
            if (this.selfPickupInfo) {
                return true;
            }
            else {
                return false;
            }
        }
        // For delivery
        else {
            if (this.customerAddress) {
                return true;
            }
            else {
                return false;
            }
        }
    }

    addRequiredInfo(index?: number, toEdit: boolean = false) {
        
        // Has index means to be updated, toEdit only used in Edit Info field, not in the Required Info button
        if ((index !== null) && (index > -1)) {
            // If self pickup, open popup to edit
            if (this.selectedCart.carts[index].isSelfPickup || toEdit) {
                
                const dialogRef = this._dialog.open( 
                    SelfPickupInfoDialog, {
                        width: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                        height: this.currentScreenSize.includes('sm') ? 'auto' : 'auto',
                        maxWidth: this.currentScreenSize.includes('sm') ? 'auto' : '100vw',  
                        maxHeight: this.currentScreenSize.includes('sm') ? 'auto' : '100vh',
                        disableClose: true,
                        data: {
                            user: this.selfPickupInfo
                        },
                    }
                );    
                dialogRef.afterClosed().subscribe(result=>{                
                    if (result) {
                        this.selfPickupInfo = result;
                        this.initializeCheckoutList();
                    }
                });
            }
            // if delivery, navigate to self address
            else {
                if (this.customerAddress) {
                    this._router.navigate(['/address'], {queryParams: {origin: 'carts'}});

                } else {
                    // max-h-[90vh] max-w-120 sm:min-w-160
                    const dialogRef = this._dialog.open( 
                        CartAddressComponent, {
                            width: this.currentScreenSize.includes('sm') ? '43rem' : '100%',
                            height: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                            maxWidth: this.currentScreenSize.includes('sm') ? 'auto' : '100vw',  
                            // maxHeight: this.currentScreenSize.includes('sm') ? 'auto' : '100vh',
                            disableClose: false,
                        }
                    );  
                }
            }

        }
        else {
            // Check if all delivery, true if got delivery, false if all self pickup
            let isAllDelivery = this.selectedCart.carts.filter(x => x.showRequiredInfo).some(cart => cart.isSelfPickup === false)
            
            // For delivery, navigate to add address
            if (isAllDelivery) {
                if (this.customerAddress) {
                    this._router.navigate(['/address'], {queryParams: {origin: 'carts'}});

                } else {
                    // max-h-[90vh] max-w-120 sm:min-w-160
                    const dialogRef = this._dialog.open( 
                        CartAddressComponent, {
                            width: this.currentScreenSize.includes('sm') ? '43rem' : '100%',
                            height: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                            maxWidth: this.currentScreenSize.includes('sm') ? 'auto' : '100vw',  
                            // maxHeight: this.currentScreenSize.includes('sm') ? 'auto' : '100vh',
                            disableClose: false,
                        }
                    );  
                }
            }
            // For self pickup
            else {
                const dialogRef = this._dialog.open( 
                    SelfPickupInfoDialog, {
                        width: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                        height: this.currentScreenSize.includes('sm') ? 'auto' : 'auto',
                        maxWidth: this.currentScreenSize.includes('sm') ? 'auto' : '100vw',  
                        maxHeight: this.currentScreenSize.includes('sm') ? 'auto' : '100vh',
                        disableClose: true,
                    }
                );    
                dialogRef.afterClosed().subscribe(result=>{                
                    if (result) {
                        this.selfPickupInfo = result;
                        this.initializeCheckoutList();
                    }
                });
            }
        }
    }

    checkCombineShipping(index: number) {
        
        let refId = this.selectedCart.carts[index].deliveryQuotationId;

        let countObject = this.selectedCart.carts.reduce((
            count,
            currentValue
        ) => {
            return (
                count[currentValue.deliveryQuotationId] ? ++count[currentValue.deliveryQuotationId] : (count[currentValue.deliveryQuotationId] = 1),
                count
            );
        },{});
        
        if (countObject[refId] > 1) return true;
        else return false; 
        
    }

    addAddressPopup() {
        if (this.customerAddress) {
            this._router.navigate(['/address'], {queryParams: {origin: 'carts'}});

        } else {
            const dialogRef = this._dialog.open( 
                CartAddressComponent, {
                    width: this.currentScreenSize.includes('sm') ? '43rem' : '100%',
                    height: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                    maxWidth: this.currentScreenSize.includes('sm') ? 'auto' : '100vw',  
                    disableClose: false,
                }
            );  
        }
    }

    toggleSummary() {
        // Toggle the read status
        this.visibleCartSummary = !this.visibleCartSummary;
    }

    calculateAddonPrice(cartItem: CartItem) {
        
        if (cartItem.cartItemAddOn.length > 0) {
            let sumAddOnItems = cartItem.cartItemAddOn.map((item: any )=> item.productAddOn.dineInPrice).reduce((partialSum, a) => partialSum + a, 0);
            let sumAddOnItemsMulti = cartItem.cartItemAddOn.map((item: any )=> item.price).reduce((partialSum, a) => partialSum + a, 0);

            return {
                subtotal: sumAddOnItems + cartItem.productPrice,
                total:  sumAddOnItemsMulti + cartItem.price
            }
        }
    }

}
