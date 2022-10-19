import { ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, NgForm, ValidationErrors, Validators } from '@angular/forms';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { CurrencyPipe, DatePipe, DOCUMENT, PlatformLocation } from '@angular/common'; 
import { CartService } from 'app/core/cart/cart.service';
import { Cart, CartItem, CartPagination, CartWithDetails, DiscountOfCartGroup } from 'app/core/cart/cart.types';
import { Store, StoreSnooze, StoreTiming } from 'app/core/store/store.types';
import { of, Subject, merge, timer, interval as observableInterval, combineLatest } from 'rxjs';
import { map, switchMap, takeUntil, debounceTime, filter, distinctUntilChanged, startWith, isEmpty, retry } from 'rxjs/operators';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Address, AXTResponseBody, CartDiscount, CheckoutItems, DeliveryProvider, GroupOrder } from 'app/core/checkout/checkout.types';
import { ModalConfirmationDeleteItemComponent } from './modal-confirmation-delete-item/modal-confirmation-delete-item.component';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { AuthService } from 'app/core/auth/auth.service';
import { fuseAnimations } from '@fuse/animations';
import { MatPaginator } from '@angular/material/paginator';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { JwtService } from 'app/core/jwt/jwt.service';
import { CustomerAddress, User } from 'app/core/user/user.types';
import { UserService } from 'app/core/user/user.service';
import { CheckoutService } from 'app/core/checkout/checkout.service';
import { Router } from '@angular/router';
import { AnalyticService } from 'app/core/analytic/analytic.service';
import { AppConfig } from 'app/config/service.config';
import { StoresService } from 'app/core/store/store.service';
import { CustomerActivity } from 'app/core/analytic/analytic.types';
import { Title } from '@angular/platform-browser';
import { OriginService } from 'app/core/_origin/origin.service';

@Component({
    selector     : 'buyer-checkout',
    templateUrl  : './checkout.component.html',
    styles       : [
        /* language=SCSS */
        `
            .checkout-grid {
                grid-template-columns: 0px auto 96px 96px 96px 0px;

                // @screen md {
                //     grid-template-columns: 0px auto 112px 112px 112px 0px;
                // }

                @screen md {
                    grid-template-columns: 0px auto 112px 86px 112px 0px;
                }
                @screen xl {
                    grid-template-columns: 0px auto 112px 112px 112px 0px;
                }
            }

            .checkout-title-grid {
                grid-template-columns: 0px auto;

                @screen lg {
                    grid-template-columns: 0px auto;
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
export class BuyerCheckoutComponent implements OnInit
{

    @ViewChild(MatPaginator) private _paginator: MatPaginator;

    platform: Platform;

    // Quantity Selector
    quantity: number = 1;
    minQuantity: number = 1;
    maxQuantity: number = 999;

    currentScreenSize: string[] = [];

    isLoading: boolean = false;
    pageOfItems: Array<any>;
    pagination: CartPagination;

    cart: Cart;
    carts: CartWithDetails[];
    
    deliveryCharges: {
        cartId: string,
        minDeliveryCharges: number,
        maxDeliveryCharges: number,
        deliveryQuotationId: string,
        deliveryType: string
    }[];
    totalSelectedCartItem: number = 0;
    checkoutItems: CheckoutItems[] = [];
        
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

    user: User;
    order: GroupOrder;
    payment: any;
    
    selfPickupInfo: {
        name: string,
        email: string,
        phoneNumber: string
    } = null;
    hasSelfPickup: boolean;
    
    customerActivity: CustomerActivity;

    visibleCartSummary: boolean = false;
    webOrigin: string; // from which the website is loaded/originated from

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        public _dialog: MatDialog,
        private _platformService: PlatformService,
        private _fuseConfirmationService: FuseConfirmationService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _currencyPipe: CurrencyPipe,
        private _cartService: CartService,
        private _checkoutService: CheckoutService,
        private _jwtService: JwtService,
        private _authService: AuthService,
        private _router: Router,
        private _userService: UserService,
        private _datePipe: DatePipe,
        private _analyticService: AnalyticService,
        private _apiServer: AppConfig,
        private _platformLocation: PlatformLocation,
        private _originService: OriginService,
        private _storesService: StoresService,
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
                    this._titleService.setTitle(this.platform.name + " | " + "Checkout");

                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this._checkoutService.cartsWithDetails$
            .pipe(
                startWith(false),
                debounceTime(1), // wait 1 milisecond
                takeUntil(this._unsubscribeAll),
            )
            .subscribe((cartsWithDetails: CartWithDetails[] | boolean) => {    
                            
                if (typeof(cartsWithDetails) !== "boolean" && cartsWithDetails) {
                    this.carts = cartsWithDetails;
                    
                    // Set default deliveryCharges
                    if (this.deliveryCharges) {
                        this.carts.forEach(item => {
                            // check for duplicate delivery charges
                            let index = this.deliveryCharges.findIndex(element => element.cartId === item.id);
                            if (index < 0) {
                                this.deliveryCharges.push({
                                    cartId: item.id,
                                    minDeliveryCharges: 0,
                                    maxDeliveryCharges: 0,
                                    deliveryQuotationId: null,
                                    deliveryType: null
                                });
                            }
                        });
                    } else {
                        this.deliveryCharges = this.carts.map(item => {
                            return {
                                cartId: item.id,
                                minDeliveryCharges: 0,
                                maxDeliveryCharges: 0,
                                deliveryQuotationId: null,
                                deliveryType: null
                            };
                        });
                    }                    

                    // CartsWithDetailsTotalItems
                    this._checkoutService.checkoutItems$
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((checkoutItems: CheckoutItems[])=>{
                            if (checkoutItems) { 
                                
                                this.checkoutItems = checkoutItems;
                                let cartsWithDetailsTotalItemsArr = checkoutItems.map(item => item.selectedItemId.length);
                                let cartsWithDetailsTotalItems = cartsWithDetailsTotalItemsArr.reduce((partialSum, a) => partialSum + a, 0);
                                this.totalSelectedCartItem = cartsWithDetailsTotalItems;

                                // Check if has self pickup 
                                this.hasSelfPickup = checkoutItems.some(item => item.deliveryType === 'PICKUP');
                                
                                // Get self pickup info
                                let selfPickupIndex = checkoutItems.findIndex(item => item.selfPickupInfo.name);
                                if (selfPickupIndex > -1) this.selfPickupInfo = checkoutItems[selfPickupIndex].selfPickupInfo;
                            }
                            // Mark for check 
                            this._changeDetectorRef.markForCheck();
                        });

                    // Customer Address
                    this._userService.customerAddress$
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((customerAddress : CustomerAddress) => {
                            if (customerAddress) {                                
                                this.customerAddress = customerAddress;
                                
                                // this.carts.forEach(item => {                        
                                //     // get delivery charges of every carts
                                //     // this.getDeliveryCharges(item.id,item.storeId);
                                // });
                            }
                            // Mark for check 
                            this._changeDetectorRef.markForCheck();
                        });
                } else {
                    this._router.navigate(['carts'])
                }                

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get the cart pagination
        this._checkoutService.cartsWithDetailsPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: CartPagination) => {
                if (pagination) {
                    // Update the pagination
                    this.pagination = pagination;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            }); 

        // Get cart summary
        this._checkoutService.cartSummary$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: DiscountOfCartGroup)=>{
                if(response) {
                    this.paymentDetails.cartSubTotal = response.sumCartSubTotal === null ? 0 : response.sumCartSubTotal
                    this.paymentDetails.deliveryCharges = response.sumCartDeliveryCharge === null ? 0 : response.sumCartDeliveryCharge
                    this.paymentDetails.cartGrandTotal = response.sumCartGrandTotal === null ? 0 : response.sumCartGrandTotal
                    this.paymentDetails.platformVoucherSubTotalDiscount = response.platformVoucherSubTotalDiscount === null ? 0 : response.platformVoucherSubTotalDiscount;
                    this.paymentDetails.platformVoucherDeliveryDiscount = response.platformVoucherDeliveryDiscount === null ? 0 : response.platformVoucherDeliveryDiscount;
                    this.paymentDetails.deliveryDiscount = response.sumDeliveryDiscount === null ? 0 : response.sumDeliveryDiscount;
                    this.paymentDetails.subTotalDiscount = response.sumSubTotalDiscount === null ? 0 : response.sumSubTotalDiscount;
                    this.paymentDetails.storeServiceCharge = response.sumServiceCharge === null ? 0 : response.sumServiceCharge;
                    this.paymentDetails.storeDiscountList = response.storeDiscountList;

                }
                // Mark for check
                this._changeDetectorRef.markForCheck()
            });

        // Subscribe to user changes
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user;
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    
        this._analyticService.customerActivity$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((customerActivity: CustomerActivity) => {
                this.customerActivity = customerActivity;
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this._originService.origin$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response)=>{
                if(response) {
                    this.webOrigin = response;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // once selectCart() is triggered, it will set isLoading to true
        // this function will wait for both cartsWithDetails$ & cartSummary$ result first
        // then is isLoading to false
        combineLatest([
            this._checkoutService.cartsWithDetails$,
            this._checkoutService.cartSummary$
        ]).pipe(takeUntil(this._unsubscribeAll))
        .subscribe(([result1, result2 ] : [CartWithDetails[], DiscountOfCartGroup])=>{
            if (result1 && result2) {
                this.isLoading = false;
            }            
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
                        return this._checkoutService.getCartsWithDetails({ cartIdList: this.checkoutItems.map(item => item.cartId), page: 0, pageSize: 4, customerId: this.customerId, includeEmptyCart: false}, this.checkoutItems);
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
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
      
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public method
    // -----------------------------------------------------------------------------------------------------

    onlinePay(){

        // Set Loading to true
        // this.isLoading = true;
        
        let orderBodies = [];
        let platformVoucherCode = null;

        let customerInfo = {
            address: this.customerAddress ? this.customerAddress.address : '',
            city: this.customerAddress ? this.customerAddress.city : '',
            country: this.customerAddress ? this.customerAddress.country : '',
            state: this.customerAddress ? this.customerAddress.state : '',
            postCode: this.customerAddress ? this.customerAddress.postCode : '',

            email: this.customerAddress ? this.customerAddress.email : this.selfPickupInfo.email,
            phoneNumber: this.customerAddress ? this.customerAddress.phoneNumber : this.selfPickupInfo.phoneNumber,
            name: this.customerAddress ? this.customerAddress.name : this.selfPickupInfo.name
        }

        this.checkoutItems.forEach(checkout => {

            const orderBody = {
                cartId: checkout.cartId,
                cartItems: checkout.selectedItemId.map(element => {
                    return {
                        id: element,
                    }
                }),
                customerId: this.customerId,
                customerNotes: checkout.orderNotes,
                // voucherCode: checkout.platformVoucherCode,
                orderPaymentDetails: {
                    accountName: this.user ? this.user.name : customerInfo.name,
                    deliveryQuotationReferenceId: checkout.deliveryQuotationId ? checkout.deliveryQuotationId : null
                },
                orderShipmentDetails: {
                    address:  customerInfo.address,
                    city: customerInfo.city,
                    country: customerInfo.country,
                    email: customerInfo.email,
                    phoneNumber: customerInfo.phoneNumber,
                    receiverName: customerInfo.name,
                    state: customerInfo.state,
                    storePickup: checkout.deliveryType === 'PICKUP' ? true : false,
                    zipcode: customerInfo.postCode,
                    deliveryProviderId: checkout.deliveryProviderId,
                    deliveryType: checkout.deliveryType ? checkout.deliveryType : null
                }

            };
            orderBodies.push(orderBody)
            platformVoucherCode = checkout.platformVoucherCode;
        })
        
        this._checkoutService.postPlaceGroupOrder(orderBodies, true, platformVoucherCode)
            .subscribe((response) => {

                this.order = response;

                let dateTime = new Date();
                let transactionId = this._datePipe.transform(dateTime, "yyyyMMddhhmmss");
                let dateTimeNow = this._datePipe.transform(dateTime, "yyyy-MM-dd hh:mm:ss"); //2022-05-18 09:51:36

                const paymentBody = {
                    // callbackUrl      : "https://bon-appetit.symplified.ai/thankyou",
                    customerId          : this.user ? this.user.id : null,
                    customerName        : this.user ? this.user.name : customerInfo.name,
                    productCode         : "parcel", // 
                    // storeName        : this.store.name,
                    systemTransactionId : transactionId,
                    transactionId       : this.order.id,
                    channel             : this.webOrigin ? this.webOrigin.toUpperCase() : null
                }

                // return

                this._checkoutService.postMakePayment(paymentBody)
                    .subscribe((response) => {

                        this.payment = response;

                        console.log("this.payment" + JSON.stringify(this.payment));
                        
                        

                        if (this.payment.isSuccess === true) {
                            if (this.payment.providerId == "1") {
                                window.location.href = this.payment.paymentLink;
                            } else if (this.payment.providerId == "2") {                                                               
                                this.postForm( "post-to-senangpay", this.payment.paymentLink, 
                                {
                                    "detail"    : this.payment.sysTransactionId, 
                                    "amount"    : this.paymentDetails.cartGrandTotal.toFixed(2), 
                                    "order_id"  : this.order.id, 
                                    "name"      : this.order.shipmentName, 
                                    "email"     : this.order.shipmentEmail, 
                                    "phone"     : this.order.shipmentPhoneNumber, 
                                    "hash"      : this.payment.hash 
                                },'post', true );
                            } else if (this.payment.providerId == "3") {      
                                let fullUrl = (this._platformLocation as any).location.origin;
                                this.postForm("post-to-fastpay", this.payment.paymentLink, 
                                    { 
                                        "CURRENCY_CODE" : "PKR", 
                                        "MERCHANT_ID"   : "13464", 
                                        "MERCHANT_NAME" : "EasyDukan Pvt Ltd", 
                                        "TOKEN"         : this.payment.token, 
                                        "SUCCESS_URL"   : this._apiServer.settings.apiServer.paymentService + 
                                                            "/payments/payment-redirect?name=" + this.order.shipmentName + 
                                                            "&email="           + this.order.shipmentEmail + 
                                                            "&phone="           + this.order.shipmentPhoneNumber + 
                                                            "&amount="          + this.paymentDetails.cartGrandTotal.toFixed(2) +
                                                            "&hash="            + this.payment.hash +
                                                            "&status_id=1"      +
                                                            "&order_id="        + this.order.id+
                                                            "&transaction_id="  + transactionId+
                                                            "&msg=Payment_was_successful&payment_channel=fastpay", 
                                        "FAILURE_URL"   : this._apiServer.settings.apiServer.paymentService + 
                                                            "/payments/payment-redirect?name=" + this.order.shipmentName + 
                                                            "&email="           + this.order.shipmentEmail + 
                                                            "&phone="           + this.order.shipmentPhoneNumber + 
                                                            "&amount="          + this.paymentDetails.cartGrandTotal.toFixed(2)+ 
                                                            "&hash="            + this.payment.hash +
                                                            "&status_id=0"      +
                                                            "&order_id="        + this.order.id +
                                                            "&transaction_id="  + transactionId +
                                                            "&msg=Payment_was_failed&payment_channel=fastpay", 
                                        "CHECKOUT_URL"  : fullUrl + "/checkout", 
                                        "CUSTOMER_EMAIL_ADDRESS"    : this.order.shipmentEmail, 
                                        "CUSTOMER_MOBILE_NO"        : this.order.shipmentPhoneNumber, 
                                        "TXNAMT"        : this.paymentDetails.cartGrandTotal.toFixed(2), 
                                        "BASKET_ID"     : this.payment.sysTransactionId, 
                                        "ORDER_DATE"    : dateTimeNow, 
                                        "SIGNATURE"     : "SOME-RANDOM-STRING", 
                                        "VERSION"       : "MERCHANT-CART-0.1", 
                                        "TXNDESC"       : "Item purchased from EasyDukan", 
                                        "PROCCODE"      : "00", 
                                        "TRAN_TYPE"     : "ECOMM_PURCHASE", 
                                        "STORE_ID"      : "", 
                                    } , 'post', false);
                            } else if (this.payment.providerId == "4") {
                                
                                let axtPaymentBody = {
                                    "user_id"        : this.payment.clientId,
                                    "transaction_id" : this.payment.sysTransactionId, 
                                    "name"           : this.order.shipmentName,
                                    "email"          : this.order.shipmentEmail,
                                    "mobile"         : this.order.shipmentPhoneNumber,
                                    "description"    : "Payment for " + this.order.shipmentName + " of deliverin",
                                    "redirect_url"   : "https://www.payhub2u.my/pay-bills/bill-list",
                                    "callback_url"   : this.payment.orderCreated.callbackUrl,
                                    "callback_token" : this.payment.orderCreated.callbackToken
                                };
                                
                                this._checkoutService.postATXPayment(this.payment.paymentLink, axtPaymentBody, { accessKey: this.payment.token })
                                    .subscribe((response: AXTResponseBody)=>{
                                        if (response && response.message === 'success') {
                                            let redirectUrl = response.secondary_url.replace('{amount}', this.order.total.toString());                                         
                                            this._document.location.href = redirectUrl;
                                        }
                                    });
                            } else {
                                this.displayError("Provider id not configured");
                                console.error("Provider id not configured");
                            }
                        }
                        // Set Loading to false
                        this.isLoading = false;
                    }, (error) => {
                        // Set Loading to false
                        this.isLoading = false;
                    });
            }, (error) => {
                // Set Loading to false
                this.isLoading = false;
            });
        
    }

    postForm(id, path, params, method, encode: boolean) {
        method = method || 'post';
    
        let form = document.createElement('form');
        form.setAttribute('method', method);
        form.setAttribute('action', path);
        form.setAttribute('id', id);
    
        for (let key in params) {
            if (params.hasOwnProperty(key)) {
                let hiddenField = document.createElement('input');
                hiddenField.setAttribute('type', 'hidden');
                hiddenField.setAttribute('name', key);
                hiddenField.setAttribute('value', encode ? encodeURI(params[key]) : params[key]);
    
                form.appendChild(hiddenField);
            }
        }
    
        document.body.appendChild(form);        
        form.submit();

        let customerActivity = this.customerActivity;
        customerActivity.pageVisited = path;
        customerActivity.storeId = null;
        
        this._analyticService.postActivity(customerActivity).subscribe(()=>{}); 
    }

    onChangePage(pageOfItems: Array<any>) {
        
        // update current page of items
        this.pageOfItems = pageOfItems;
        
        if(this.pagination && this.pageOfItems['currentPage']){

            if (this.pageOfItems['currentPage'] - 1 !== this.pagination.page) {
                // set loading to true
                this.isLoading = true;
                this._checkoutService.getCartsWithDetails({ cartIdList: this.checkoutItems.map(item => item.cartId) , page: this.pageOfItems['currentPage'] - 1, pageSize: this.pageOfItems['pageSize'], customerId: this.customerId, includeEmptyCart: false}, this.checkoutItems)
                    .subscribe((response)=>{
                        // set loading to false
                        this.isLoading = false;
                    }, error =>{
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

    getDeliveryCharges(cartId: string, storeId: string)
    {
        // if customerId null means guest
        let _customerId = this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid ? this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid : null

        const deliveryChargesBody = {
            cartId: cartId,
            customerId: _customerId,
            delivery: {
                deliveryAddress     : this.customerAddress.address,
                deliveryCity        : this.customerAddress.city,
                deliveryState       : this.customerAddress.state,
                deliveryPostcode    : this.customerAddress.postCode,
                deliveryCountry     : this.customerAddress.country,
                deliveryContactEmail: this.customerAddress.email,
                deliveryContactName : this.customerAddress.name,
                deliveryContactPhone: this.customerAddress.phoneNumber,
                latitude            : null,
                longitude           : null
            },
            deliveryProviderId      : null,
            storeId: storeId
        }

        this._checkoutService.postToRetrieveDeliveryCharges(deliveryChargesBody)
            .subscribe((deliveryProviderResponse: DeliveryProvider[])=>{
                let cartIndex = this.deliveryCharges ? this.deliveryCharges.findIndex(item => item.cartId == cartId) : -1;
                if (cartIndex > -1) {
                    let minDeliveryCharges = Math.min(...deliveryProviderResponse.map(item => item.price));
                    let maxDeliveryCharges = Math.max(...deliveryProviderResponse.map(item => item.price));
                    
                    this.deliveryCharges[cartIndex].minDeliveryCharges = minDeliveryCharges;
                    this.deliveryCharges[cartIndex].maxDeliveryCharges = maxDeliveryCharges;

                    // find index at response to find the minimum price charges
                    let minDeliveryChargesIndex = deliveryProviderResponse.findIndex(item => item.price === minDeliveryCharges);

                    this.deliveryCharges[cartIndex].deliveryQuotationId = deliveryProviderResponse[minDeliveryChargesIndex].refId;
                    this.deliveryCharges[cartIndex].deliveryType = deliveryProviderResponse[minDeliveryChargesIndex].deliveryType;
                }                
            });
    }

    getDeliveryChargesRange(index: number) : string 
    {
        
        if (this.deliveryCharges && this.deliveryCharges[index]) {
            if (this.deliveryCharges[index].minDeliveryCharges === this.deliveryCharges[index].maxDeliveryCharges) {
                return this._currencyPipe.transform(this.deliveryCharges[index].minDeliveryCharges, this.platform.currency);
            } else {
                return this._currencyPipe.transform(this.deliveryCharges[index].minDeliveryCharges, this.platform.currency) + " - " + this._currencyPipe.transform(this.deliveryCharges[index].maxDeliveryCharges, this.platform.currency);
            }
        } else {
            return "Price not available";
        }
    }

    deleteCart(cartId: string) {

        const confirmation = this._fuseConfirmationService.open({
                title  : 'Delete Cart',
                message: 'Are you sure you want to delete this cart?',
                icon:{
                    name:"mat_outline:delete_forever",
                    color:"primary"
                },
                actions: {
                    confirm: {
                        label: 'Delete',
                        color: 'warn'
                    }
                }
            });
        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {
    
            // If the confirm button pressed...
            if ( result === 'confirmed' )
            {
                this._cartService.deleteCart(cartId)
                    .subscribe(response => {
                        this._cartService.getCartsByCustomerId(this.customerId)
                            .subscribe()
                    });
            }
        });    
        
    }

    checkQuantity(cartId: string, cartItem: CartItem, quantity: number = null, operator: string = null) {
        quantity = quantity ? quantity : cartItem.quantity;
        if (operator === 'decrement')
            quantity > this.minQuantity ? quantity -- : quantity = this.minQuantity;
        else if (operator === 'increment')
            quantity < this.maxQuantity ? quantity ++ : quantity = this.maxQuantity;
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
            quantity: quantity
        }

        if (!((cartItem.quantity === quantity) && (quantity === this.minQuantity || quantity === this.maxQuantity))) {
            this._cartService.putCartItem(cartId, cartItemBody, cartItem.id)
                .subscribe((response)=>{
                    this.carts[cartIndex].cartItems[cartItemIndex].quantity = quantity;
                });
        }
    }

    getCartItemsTotal(cartItems: CartItem[]) : number {
        let cartItemsTotal: number;
        if (cartItems.length && cartItems.length > 0) {
            return cartItems.reduce((partialSum, item) => partialSum + item.price, 0);
        } else {
            return cartItemsTotal;
        }
    }

    deleteCartItem(cartId: string, cartItem: CartItem){

        //To make custom pop up, and we pass the details in paramter data
        let dialogRef = this._dialog.open(ModalConfirmationDeleteItemComponent, { disableClose: true, data:{ cartId: cartId, itemId:cartItem.id }});
        dialogRef.afterClosed().subscribe((result) => {
            
            // // if cart has items, calculate the charges
            // if (this.cartItems.length > 0) {
                
            //     this.calculateCharges()                
            // }
            // // if cart is empty, reset the values
            // else {
            //     // change button to Calculate Charges
            //     this.addressFormChanges();
            // }
        });
    }

    displayError(message: string) {
        const confirmation = this._fuseConfirmationService.open({
            "title": "Error",
            "message": message,
            "icon": {
            "show": true,
            "name": "heroicons_outline:exclamation",
            "color": "warn"
            },
            "actions": {
            "confirm": {
                "show": true,
                "label": "OK",
                "color": "warn"
            },
            "cancel": {
                "show": false,
                "label": "Cancel"
            }
            },
            "dismissible": true
        });

        return confirmation;
    }

    scrollToTop(){        
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'smooth' 
     });
    }

    getDeliveryFee(cartId: string){
        let index = this.checkoutItems.findIndex(item => item.cartId === cartId);

        if (index > -1) {
            return this.checkoutItems[index];
            
        }
        else return null;
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

    checkCombineShipping(cartId: string) {
        let index = this.checkoutItems.findIndex(item => item.cartId === cartId);
        let refId = this.checkoutItems[index].deliveryQuotationId;

        let countObject = this.checkoutItems.reduce((
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

    toggleSummary() {
        // Toggle the read status
        this.visibleCartSummary = !this.visibleCartSummary;
    }
}
