import { ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { DOCUMENT } from '@angular/common';
import { MatBottomSheet, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { NgxGalleryAnimation, NgxGalleryImage, NgxGalleryOptions } from 'ngx-gallery-9';
import { AddOnItemProduct, AddOnProduct, Product, ProductAssets, ProductInventory, ProductInventoryItem, ProductPackageOption } from 'app/core/product/product.types';
import { FormBuilder, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { CartService } from 'app/core/cart/cart.service';
import { AuthService } from 'app/core/auth/auth.service';
import { JwtService } from 'app/core/jwt/jwt.service';
import { Cart, CartItem, CustomerCart } from 'app/core/cart/cart.types';
import { Store } from 'app/core/store/store.types';
import { StoresService } from 'app/core/store/store.service';
import { AppConfig } from 'app/config/service.config';
import { MatCheckboxChange } from '@angular/material/checkbox';

@Component({
    selector     : 'bottom-sheet',
    templateUrl  : './bottom-sheet.component.html',
    styles       : [
        `
            ::ng-deep .mat-bottom-sheet-container {
                padding: 10px 16px 0px 16px;
                min-width: 100vw;
                box-sizing: border-box;
                display: block;
                outline: 0;
                max-height: 100vh;
                overflow: hidden;
                border-top-right-radius: 10px;
                border-top-left-radius: 10px;
            }

            :host ::ng-deep .mat-checkbox .mat-checkbox-layout {
                width: 100% !important;
            }

            :host ::ng-deep .mat-checkbox .mat-checkbox-layout .mat-checkbox-label {
                width: 100% !important;
            }

            :host ::ng-deep .mat-checkbox-inner-container {
                width: 14px;
                height: 14px;
            }

            :host ::ng-deep .mat-checkbox-frame {
                border-width: 1px;
            }

            :host ::ng-deep .mat-radio-ripple {
                display: none;
            }

            :host ::ng-deep .mat-radio-outer-circle {
                border-width: 1px;
            }

            :host ::ng-deep .mat-radio-label-content {
                padding-left: 16px;
            }
        `
    ],
})
export class _BottomSheetComponent implements OnInit, OnDestroy
{

    platform: Platform;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    selectedProduct: Product = null
    combos: ProductPackageOption[] = [];
    selectedCombo: any = [];
    selectedAddOn: any = [];
    selectedVariants: any = [];
    selectedVariant: any = [];
    selectedVariantNew: any = [];
    selectedProductInventory: ProductInventory = null;
    selectedProductInventoryItems: ProductInventoryItem[] = [];

    
    productAssets: ProductAssets[] = [];
    imageCollection:any = [];
    galleryOptions: NgxGalleryOptions[] = [];
    galleryImages: NgxGalleryImage[] = [];
    displayedProduct: any = {
        price: 0,
        itemCode: null,
        sku: null,
        discountAmount:0,
        discountedPrice:0,
        SubTotal:0,
        normalPrice: 0,
        basePrice: 0
    }
    openPreview: boolean = false;
    quantity: number = 1;
    minQuantity: number = 1;
    maxQuantity: number = 999;

    specialInstructionForm: UntypedFormGroup;
    store: Store
    addOns: AddOnProduct[] = [];
    sumAddonPrice: number = 0;
    cartItem: CartItem = null;

    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _platformService: PlatformService,
        @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
        private _formBuilder: UntypedFormBuilder,
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirmationService: FuseConfirmationService,
        private _cartService: CartService,
        private _authService: AuthService,
        private _jwtService: JwtService,
        private _storesService: StoresService,
        private _apiServer: AppConfig,
        private _bottomSheet: MatBottomSheet,

    )
    {
        this.selectedProduct = data.product;
        this.combos = data.combos;
        this.addOns = data.addOns;
        this.cartItem = data.cartItem ? data.cartItem : null;
        this.store = data.store;
        
        // set galleryOptions
        this.galleryOptions = [
            {
                // width: '350px',
                height: '350px',
                thumbnailsColumns: 3,
                imageAnimation: NgxGalleryAnimation.Slide,
                thumbnailsArrows: true,
                thumbnails : false,
                imageArrowsAutoHide: false, 
                thumbnailsArrowsAutoHide: false,
                thumbnailsAutoHide: true,
                imageBullets : true,
                "previewCloseOnClick": true, 
                "previewCloseOnEsc": true,
            },
            {
                breakpoint: 959,
                thumbnailsColumns: 0,
                thumbnails : false,
                thumbnailsArrows  : true,
                imageArrowsAutoHide : false,
                thumbnailsArrowsAutoHide: false,
                imageSwipe: true,
                imageBullets : true,
                // width: '200px',
                height: '200px',
            }
        ];
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

        this.specialInstructionForm = this._formBuilder.group({
            specialInstructionValue     : ['']
        });
        
        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform)=>{
                this.platform = platform;

                // Mark for check
                this._changeDetectorRef.markForCheck();
            })  
            
        this._storesService.store$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((store: Store) => {
                if (store){
                    this.store = store;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // INITIALIZE DATA
        // Combo
        if (this.combos.length > 0) {

            this.combos.forEach(combo => {
                
                this.selectedCombo[combo.id] = [];

                combo.productPackageOptionDetail.forEach((product) => {
                    product['quantity'] = 0;
                })
            });

            // Initialize data if has cart item
            if (this.cartItem) {

                // Group by productPackageOptionId
                const groupedObj = this.cartItem.cartSubItem.reduce((acc, item) => {
                                    (acc[item['productPackageOptionId']] = acc[item['productPackageOptionId']] || [])
                                        .push(item.productId);
                                    return acc;
                                }, {});

                // Set the quantity for each option
                this.combos.forEach(combo => {
                    if (groupedObj[combo.id]) {
                        combo.productPackageOptionDetail.forEach(option => {
                            for (let index = 0; index < groupedObj[option.productPackageOptionId].length; index++) {
                                const element = groupedObj[option.productPackageOptionId][index];
                                
                                if (element === option.productId) {
                                    option.quantity = option.quantity + 1;
                                }
                            }
                        })
                    }
                })

                // Push sub items to selectedCombo
                this.cartItem.cartSubItem.forEach((subItem: any) => {
                    if (this.selectedCombo[subItem.productPackageOptionId]) {
                        this.selectedCombo[subItem.productPackageOptionId].push(subItem.productId);
                    }
                })
            }
        }

        // Normal product 
        if (this.selectedProduct) {            
            // Reset quantity on getting new product
            this.quantity = 1;

            if (this.cartItem) {

                const productInventoryFromCart = this.selectedProduct.productInventories.find(inv => inv.itemCode === this.cartItem.productInventory.itemCode);
                
                this.selectedProductInventory = productInventoryFromCart;
            }
            else {

                //Check condition if the product inventory got itemDiscount or not
                const checkItemDiscount = this.selectedProduct.productInventories.filter((x:any)=>x.itemDiscount);
                                    
                if (checkItemDiscount.length > 0){
                    //get most discount amount 
                    this.selectedProductInventory = this.selectedProduct.productInventories.reduce((r, e) => (<any>r).itemDiscount.discountAmount > (<any>e).itemDiscount.discountAmount ? r : e);
                }
                else {
                    //get the cheapest price
                    this.selectedProductInventory = this.selectedProduct.productInventories.reduce((r, e) => r.price < e.price ? r : e);
                }
            }
                    
            // set initial selectedProductInventoryItems to the cheapest item
            this.selectedProductInventoryItems = this.selectedProductInventory.productInventoryItems;
            
            if (this.selectedProductInventory.itemDiscount) {
                this.displayedProduct.price = this.selectedProductInventory.itemDiscount.discountedPrice;
                this.displayedProduct.itemCode = this.selectedProductInventory.itemCode;
                this.displayedProduct.sku = this.selectedProductInventory.sku;
                this.displayedProduct.discountAmount = this.selectedProductInventory.itemDiscount.discountAmount;
                this.displayedProduct.discountedPrice = this.selectedProductInventory.itemDiscount.discountedPrice;
                this.displayedProduct.normalPrice = this.selectedProductInventory.itemDiscount.normalPrice;
                // set the base price
                this.displayedProduct.basePrice = this.selectedProductInventory.itemDiscount.discountedPrice;

            }
            else {
                this.displayedProduct.price = this.selectedProductInventory.price;
                this.displayedProduct.itemCode = this.selectedProductInventory.itemCode;
                this.displayedProduct.sku = this.selectedProductInventory.sku;
                this.displayedProduct.discountAmount = null;
                this.displayedProduct.discountedPrice = null;
                this.displayedProduct.normalPrice = this.selectedProductInventory.price;
                // set the base price
                this.displayedProduct.basePrice = this.selectedProductInventory.price;
            }
                
            // set currentVariant
            this.selectedProductInventoryItems.forEach(item => {
                this.selectedVariants.push(item.productVariantAvailableId)
            });
    
            // logic here is to extract current selected variant and to reconstruct new object with its string identifier 
            // basically it creates new array of object from this.product.productVariants to => this.requestParamVariant
            const _productVariants = this.selectedProduct.productVariants
            _productVariants.map(variantBase => {
                const _productVariantsAvailable = variantBase.productVariantsAvailable;
                _productVariantsAvailable.forEach(element => {
                    this.selectedVariants.map(currentVariant => {
                        if (currentVariant.indexOf(element.id) > -1){
                            let _data = {
                                basename: variantBase.name,
                                variantID: element.id,
                            }
                            this.selectedVariant.push(_data)
                        }
                    })
                })
            });
            // ------------------
            // Product Assets
            // ------------------
    
            this.productAssets = this.selectedProduct.productAssets;
    
            //reset
            this.imageCollection = [];
    
            // first this will push all images expect the one that are currently display
            this.selectedProduct.productAssets.forEach( object => {
                let _imageObject = {
                    small   : '' + object.url,
                    medium  : '' + object.url,
                    big     : '' + object.url + '?original=true'
                }
                
                if (object.itemCode != this.displayedProduct.itemCode){
                    this.imageCollection.push(_imageObject)
                } 
            });
    
            // loop second one to push the one that are currently display in first array
            this.selectedProduct.productAssets.forEach( object => {
                let _imageObject = {
                    small   : '' + object.url,
                    medium  : '' + object.url,
                    big     : '' + object.url + '?original=true'
                }
                
                if (object.itemCode == this.displayedProduct.itemCode){
                    this.imageCollection.unshift(_imageObject)
                }
            });
    
            // set to galery images
            this.galleryImages = this.imageCollection                    
            
            if (this.galleryImages.length < 1) {
                this.store.storeAssets.forEach(item => {                            
                    if(item.assetType === "LogoUrl") {
                        this.galleryImages = [{
                            small   : '' + this._apiServer.settings.apiServer.assetsService + '/product-assets/No-Image-Available-Product-Cover-Image.jpg',
                            medium  : '' + this._apiServer.settings.apiServer.assetsService + '/product-assets/No-Image-Available-Product-Cover-Image.jpg',
                            big     : '' + this._apiServer.settings.apiServer.assetsService + '/product-assets/No-Image-Available-Product-Cover-Image.jpg' + '?original=true'
                        }];
                    }
                });
            }
    
            // Mark for check
            this._changeDetectorRef.markForCheck();
            
        }
    
        // Addon
        if (this.addOns.length > 0) {

            this.addOns.forEach(addon => {
                this.selectedAddOn[addon.id] = [];
            });

            // Initialize data if has cart item
            if (this.cartItem) {
                
                this.cartItem.cartItemAddOn.forEach((addOn: any) => {
                    if (this.selectedAddOn[addOn.productAddOn.productAddonGroupId]) {
                        // set currentAddOn
                        this.selectedAddOn[addOn.productAddOn.productAddonGroupId].push({id: addOn.productAddOn.id, price: addOn.productAddOn.price});
                    }
                })
                // get an array of prices
                let priceArr = this.addOns.reduce((previousValue, currentValue) => {
    
                    if (this.selectedAddOn[currentValue.id]) {
                        previousValue.push(this.selectedAddOn[currentValue.id].map(x => x.price));
                    }
                    return previousValue;
                }, []).flat();
    
                // sum up the prices
                this.sumAddonPrice = priceArr.reduce((partialSum, a) => partialSum + a, 0)
    
                // add the sum to product's base price
                this.displayedProduct.price = this.displayedProduct.basePrice + this.sumAddonPrice;
            }

        }

        // Set quantity and special instruction for edit cart item
        if (this.cartItem) {

            this.quantity = this.cartItem.quantity;
            this.specialInstructionForm.get('specialInstructionValue').patchValue(this.cartItem.specialInstruction);
        }
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
        this._bottomSheet.dismiss();
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

    addToCart() {

        if (this.selectedProduct.isNoteOptional === false && !this.specialInstructionForm.get('specialInstructionValue').value) {

            // this is to make the form shows 'required' error
            this.specialInstructionForm.get('specialInstructionValue').markAsTouched();

            // Mark for check
            this._changeDetectorRef.markForCheck();

            return;
        }

        // Pre-check the product price
        if (this.selectedProductInventory.price === 0) {
            const confirmation = this._fuseConfirmationService.open({
                "title": "Item Unavailable",
                "message": "Sorry, this item is not available at the moment.",
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

            return;
        }
        // Pre-check the product inventory
        if (this.isProductOutOfStock(this.selectedProduct)) {
            const confirmation = this._fuseConfirmationService.open({
                "title": "Item Out of Stock",
                "message": "Sorry, the item is currently out of stock",
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

            return;
        }

        // Precheck for combo
        if (this.selectedProduct.isPackage) {
            let BreakException = {};
            try {
                this.combos.forEach(item => {
                    let message: string;
                    const totalAllow = item.totalAllow * this.quantity;

                    if (item.minAllow > 0 && item.minAllow >  this.selectedCombo[item.id].length) {
                        message = "You need to select minimum " + item.minAllow + " item(s) of <b>" + item.title + "</b>";
                    } else if (this.selectedCombo[item.id].length > totalAllow) {
                        message = "You need to select minimum " + totalAllow + " item(s) of <b>" + item.title + " only</b>";
                    } 

                    if (message) {
                        this._fuseConfirmationService.open({
                            "title": "Incomplete Item Combo selection",
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
                        throw BreakException;
                    }
                });
            } catch (error) {
                // console.error(error);
                return;
            }
        }

        // Precheck for addOn
        if (this.selectedProduct.hasAddOn) {
            let BreakException = {};
            try {
                this.addOns.forEach(item => {
                    let message: string;
                    if (item.minAllowed > 0 && item.minAllowed >  this.selectedAddOn[item.id].length) {
                        message = "You need to select " + item.minAllowed + " item(s) of <b>" + item.title + "</b>";
                    } else if (this.selectedAddOn[item.id].length > item.maxAllowed) {
                        message = "You need to select " + item.maxAllowed + " item(s) of <b>" + item.title + " only</b>";
                    } 

                    if (message) {
                        this._fuseConfirmationService.open({
                            "title": "Incomplete Item Add-On selection",
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
                        throw BreakException;
                    }
                });
            } catch (error) {
                // console.error(error);
                return;
            }
        }

        // -----------------
        // Provisioning
        // -----------------
        
        let customerId = this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid ? this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid : null

        if (customerId){
            // Get cartId from that customer
            this._cartService.getCartsByCustomerId(customerId)
                .subscribe((customerCart: CustomerCart) => {
                    let cartIndex = customerCart.cartList.findIndex(item => item.storeId === this.store.id);
                    if (cartIndex > -1) { // Cart of store belong to the customer found
                        this.postCartItem(customerCart.cartList[cartIndex].id).then(()=>{
                            // Re-resolve the cart
                            this._cartService.cartResolver().subscribe();
                            this._cartService.cartResolver(true).subscribe();
                        });
                    } else { // No cart found for that customer
                        const cart = {
                            customerId  : customerId, 
                            storeId     : this.store.id,
                            serviceType : "DELIVERIN"
                        }
                        // Create it first
                        this._cartService.createCart(cart)
                            .subscribe((cart: Cart)=>{
                                // Post it to cart
                                this.postCartItem(cart.id).then(()=>{
                                    // Re-resolve the cart
                                    this._cartService.cartResolver().subscribe();
                                    this._cartService.cartResolver(true).subscribe();
                                });
                            });
                    }
                });
        } else {
            let cartIds: { id: string, storeId: string, cartItems: CartItem[]}[] = this._cartService.cartIds$ ? JSON.parse(this._cartService.cartIds$) : [];
            if (cartIds && cartIds.length) {
                let cartIndex = cartIds.findIndex(item => item.storeId === this.store.id);
                if (cartIndex > -1) { // update cartItems if cartId exists
                    if (cartIds[cartIndex].cartItems.length > 9) {
                        const confirmation = this._fuseConfirmationService.open({
                            "title": "Too many items",
                            "message": 'Guest only allowed 10 items per shop',
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
                        
                        console.error("Guest only allowed 10 cart items");

                    } else {
                        this.postCartItem(cartIds[cartIndex].id).then((response: CartItem)=>{
                            cartIds[cartIndex].cartItems.push(response);
                            this._cartService.cartIds = JSON.stringify(cartIds);

                            // Re-resolve the cart
                            this._cartService.cartResolver().subscribe();
                            this._cartService.cartResolver(true).subscribe();
                        });
                    }
                } else { // New cart to be pushed
                    if (cartIds.length > 4) { // Too many in local storage
                        const confirmation = this._fuseConfirmationService.open({
                            "title": "Too many carts",
                            "message": 'Guest only allowed maximum 5 carts',
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
                        console.error("Guest only allowed 5 carts");
                    } else {
                        const cart = {
                            customerId  : null, 
                            storeId     : this.store.id,
                            serviceType : "DELIVERIN"
                        }
                        // Create it first
                        this._cartService.createCart(cart)
                            .subscribe((cart: Cart)=>{
                                // Post it to cart
                                this.postCartItem(cart.id).then((response: CartItem)=>{
                                    // Push new cart id
                                    cartIds.push({
                                        id: response.cartId,
                                        cartItems: [response],
                                        storeId: this.store.id
                                    });

                                    this._cartService.cartIds = JSON.stringify(cartIds);

                                    // Re-resolve the cart
                                    this._cartService.cartResolver().subscribe();
                                    this._cartService.cartResolver(true).subscribe();
                                });
                            })
                    }
                }
            } else {
                const cart = {
                    customerId  : null, 
                    storeId     : this.store.id,
                    serviceType : "DELIVERIN"
                }

                // Create it first
                this._cartService.createCart(cart)
                    .subscribe((cart: Cart)=>{
                        // Post it to cart
                        this.postCartItem(cart.id).then((response: CartItem)=>{
                            cartIds = [{
                                id: response.cartId,
                                cartItems: [response],
                                storeId: this.store.id
                            }];

                            this._cartService.cartIds = JSON.stringify(cartIds);

                            // Re-resolve the cart
                            this._cartService.cartResolver().subscribe();
                            this._cartService.cartResolver(true).subscribe();
                        });
                    });
            }
        }
    }

    /**
     * @param cartId 
     * @returns 
     */
    private postCartItem(cartId: string) : Promise<any>
    {
        const cartItemBody = {
            cartId: cartId,
            itemCode: this.selectedProductInventory.itemCode,
            price: this.selectedProductInventory.price,
            productId: this.selectedProductInventory.productId,
            productPrice: this.selectedProductInventory.price,
            quantity: this.quantity,
            SKU: this.selectedProductInventory.sku,
            specialInstruction: this.specialInstructionForm.get('specialInstructionValue').value
        };

        // additinal step for product combo
        if (this.selectedProduct.isPackage){
            cartItemBody["cartSubItem"] = [];
            // loop all combos from backend
            this.combos.forEach(item => {
                // compare it with current selected combo by user
                if (this.selectedCombo[item.id]) {
                    // loop the selected current combo
                    this.selectedCombo[item.id].forEach(element => {
                        // get productPakageOptionDetail from this.combo[].productPackageOptionDetail where it's subitem.productId == element (id in this.currentcombo array)
                        let productPakageOptionDetail = item.productPackageOptionDetail.find(subitem => subitem.productId === element);
                        if (productPakageOptionDetail){
                            // push to cart
                            cartItemBody["cartSubItem"].push(
                                {
                                    productPackageOptionId: item.id,
                                    SKU: productPakageOptionDetail.productInventory[0].sku,
                                    productName: productPakageOptionDetail.product.name,
                                    productId: element,
                                    itemCode: productPakageOptionDetail.productInventory[0].itemCode,
                                    quantity: 1, // this is set to one because this is not main product quantity, this is item for selected prouct in this combo
                                    productPrice: 0, // this is set to zero because we don't charge differently for product combo item
                                    specialInstruction: this.specialInstructionForm.get('specialInstructionValue').value
                                }
                            );
                        }
                    });
                }
            });            
        }

        // additinal step for product addOn
        if (this.selectedProduct.hasAddOn){
            cartItemBody["cartItemAddOn"] = [];
            // loop all combos from backend
            this.addOns.forEach(item => {
                // compare it with current selected combo by user
                if (this.selectedAddOn[item.id]) {
                    // loop the selected current combo
                    this.selectedAddOn[item.id].forEach(element => {
                        
                        // get productPakageOptionDetail from this.combo[].productPackageOptionDetail where it's subitem.productId == element (id in this.currentcombo array)
                        let productPakageOptionDetail = item.productAddOnItemDetail.find(subitem => subitem.id === element.id);
                        if (productPakageOptionDetail){
                            // push to cart
                            cartItemBody["cartItemAddOn"].push(
                                {
                                    productAddOnId: element.id,
                                }
                            );
                        }
                    });
                }
            });            
        }

        return new Promise(resolve => { this._cartService.postCartItem(cartId, cartItemBody)
            .subscribe((response)=>{
                this._bottomSheet.dismiss();
                // clear special instruction field
                this.specialInstructionForm.get('specialInstructionValue').setValue('');
                this.specialInstructionForm.get('specialInstructionValue').markAsUntouched();
                resolve(response);

            }, (error) => {
                const confirmation = this._fuseConfirmationService.open({
                    "title": "Out of Stock!",
                    "message": "Sorry, this item is currently out of stock",
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
            });
        });
    }

    isProductOutOfStock(product: Product): boolean
    {
        if (product.allowOutOfStockPurchases === true) {
            return false;
        } else {
            if (product.productInventories.length > 0) {
                let productInventoryQuantities = product.productInventories.map(item => item.quantity);
                let totalProductInventoryQuantity = productInventoryQuantities.reduce((partialSum, a) => partialSum + a, 0);
    
                if (totalProductInventoryQuantity > 0) {
                    return false;
                } else {
                    return true;
                }
            } else {
                return true;
            }
        }
    }

    //----------------
    //  Combo Section
    //----------------
    /**
     * 
     * @param comboId 
     * @param productId 
     * @param operator 
     * @returns 
     */
    onChangeComboQuantity(comboId, productId, operator: string = null) {

        const comboIndex = this.combos.findIndex(combo => combo.id === comboId);
        const combo = this.combos[comboIndex];
        const allowSameItem: boolean = combo.allowSameItem;
        const totalAllow = combo.totalAllow * this.quantity;

        if (comboIndex > -1) {
            const productIndex = combo.productPackageOptionDetail.findIndex(prod => prod.productId === productId);
            if (operator === 'increment') {
                // If allowSameItem false, cannot add same item more than 1
                if (allowSameItem === true || (allowSameItem === false && combo.productPackageOptionDetail[productIndex].quantity < 1)) {

                    // Only add item when total allowed hasn't reached
                    if (this.selectedCombo[comboId].length < totalAllow) {
                        combo.productPackageOptionDetail[productIndex].quantity++;
                        this.selectedCombo[comboId].push(productId);
                    }

                }
                else return
            }
            else if (operator === 'decrement') {
                // If quantity less or equal to 0, exit
                if (combo.productPackageOptionDetail[productIndex].quantity <= 0) 
                    return;

                else {
                    let index = this.selectedCombo[comboId].indexOf(productId);                    
                    if (index !== -1) {
                        this.selectedCombo[comboId].splice(index, 1);
                    }

                    combo.productPackageOptionDetail[productIndex].quantity--;
                }
            }
        }
    }

    //----------------
    //  AddOn Section
    //----------------
    onChangeAddOn(addOn: AddOnProduct, option: AddOnItemProduct, event: MatCheckboxChange){
        let optionID = event.source.value;

        // remove only unchecked item in array
        if (event.checked === false) {
            let index = this.selectedAddOn[addOn.id].findIndex(x => x.id === optionID);
            if (index > -1) {
                this.selectedAddOn[addOn.id].splice(index, 1);
            }
        }
        else {

            let currentAddOnSetting = this.addOns.find(item => item.id === addOn.id);
            
            if (this.selectedAddOn[addOn.id].length >= currentAddOnSetting.maxAllowed){   
                this.selectedAddOn[addOn.id].shift();
            }
    
            // set currentAddOn
            this.selectedAddOn[addOn.id].push({id: option.id, price: option.price});
        }

        // get an array of prices
        let priceArr = this.addOns.reduce((previousValue, currentValue) => {

            if (this.selectedAddOn[currentValue.id]) {
                previousValue.push(this.selectedAddOn[currentValue.id].map(x => x.price));
            }
            return previousValue;
        }, []).flat();

        // sum up the prices
        this.sumAddonPrice = priceArr.reduce((partialSum, a) => partialSum + a, 0)

        // add the sum to product's base price
        this.displayedProduct.price = this.displayedProduct.basePrice + this.sumAddonPrice;

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    validateCheckbox(id: string, addonId: string) {

        const found = this.selectedAddOn[addonId].some(el => el.id === id);
        if (found) return true
        else return false        
    }

    //-------------
    // Variant Section
    //-------------
    onChangeVariant(id, type, productID){     

        this.selectedVariant.map( variant => {
            if(variant.basename == type && variant.variantID != id){
                this.selectedVariant.find( oldVariant => oldVariant.basename === type).variantID = id
            }
        });

        this.selectedVariantNew = [];
        this.selectedVariant.forEach(element => {
            this.selectedVariantNew.push(element.variantID)
        });

        this.findInventory();
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    findInventory() {

        let toFind = this.selectedVariantNew;
        let productArr = this.selectedProduct;
        let inventories = productArr.productInventories;
        let assetsArr = productArr.productAssets;

        let flag = true;
        let selectedProductInventory: ProductInventory = null;
        let productInventoryItems: ProductInventoryItem[] = [];
        
        for (let i = 0; i < inventories.length; i++) {
            flag = true;
            selectedProductInventory = inventories[i];

            // find the inventory items
            productInventoryItems = inventories[i]['productInventoryItems'];
            for (let j = 0; j < productInventoryItems.length; j++) {
                if (toFind.includes(productInventoryItems[j].productVariantAvailableId)){
                    continue;
                } else {
                    flag = false;
                    break;
                }
            }
            
            if (flag) {

                this.selectedProductInventory = selectedProductInventory;

                if (this.selectedProductInventory.itemDiscount) {	
                    this.displayedProduct.price = this.selectedProductInventory.itemDiscount.discountedPrice;	
                    this.displayedProduct.itemCode = this.selectedProductInventory.itemCode;	
                    this.displayedProduct.sku = this.selectedProductInventory.sku;	
                    this.displayedProduct.discountAmount = this.selectedProductInventory.itemDiscount.discountAmount;	
                    this.displayedProduct.discountedPrice = this.selectedProductInventory.itemDiscount.discountedPrice;	
                    this.displayedProduct.normalPrice = this.selectedProductInventory.itemDiscount.normalPrice;	
                    // set the base price	
                    this.displayedProduct.basePrice = this.selectedProductInventory.itemDiscount.discountedPrice;	
                }
                else {	
                    this.displayedProduct.price = this.selectedProductInventory.price;	
                    this.displayedProduct.itemCode = this.selectedProductInventory.itemCode;	
                    this.displayedProduct.sku = this.selectedProductInventory.sku;	
                    this.displayedProduct.discountAmount = null;	
                    this.displayedProduct.discountedPrice = null;	
                    this.displayedProduct.normalPrice = this.selectedProductInventory.price;	
                    // set the base price	
                    this.displayedProduct.basePrice = this.selectedProductInventory.price;	
                }

                // reorder image collection 
                this.galleryImages = [];
                this.imageCollection = [];
                this.productAssets = assetsArr;

                // rearrange imageCollection 
                this.productAssets.forEach( object => {
                    let _imageObject = {
                        small   : '' + object.url,
                        medium  : '' + object.url,
                        big     : '' + object.url + '?original=true'
                    }
                    
                    if (object.itemCode != this.displayedProduct.itemCode){
                        this.imageCollection.push(_imageObject)
                    }
                    
                });

                this.productAssets.forEach( object => {
                    let _imageObject = {
                        small   : '' + object.url,
                        medium  : '' + object.url,
                        big     : '' + object.url + '?original=true'
                    }
                    
                    if(object.itemCode == this.displayedProduct.itemCode){
                        this.imageCollection.unshift(_imageObject)
                    }
                    
                });

                this.galleryImages = this.imageCollection
                if (this.galleryImages.length < 1) {
                    this.galleryImages = [{
                        small   : '' + this._apiServer.settings.apiServer.assetsService + '/product-assets/No-Image-Available-Product-Cover-Image.jpg',
                        medium  : '' + this._apiServer.settings.apiServer.assetsService + '/product-assets/No-Image-Available-Product-Cover-Image.jpg',
                        big     : '' + this._apiServer.settings.apiServer.assetsService + '/product-assets/No-Image-Available-Product-Cover-Image.jpg' + '?original=true'
                    }];
                }
                // end of reorder image collection
            }
        }
    }

    checkQuantity(operator: string = null) {
        if (operator === 'decrement')
            this.quantity > this.minQuantity ? this.quantity -- : this.quantity = this.minQuantity;
        else if (operator === 'increment')
            this.quantity < this.maxQuantity ? this.quantity ++ : this.quantity = this.maxQuantity;
        else {
            if (this.quantity < this.minQuantity) 
                this.quantity = this.minQuantity;
            else if (this.quantity > this.maxQuantity)
                this.quantity = this.maxQuantity;
        }
    }
    
    closeSheet() {
        this._bottomSheet.dismiss();
    }

    updateCart() {

        if (this.selectedProduct.isNoteOptional === false && !this.specialInstructionForm.get('specialInstructionValue').value) {

            // this is to make the form shows 'required' error
            this.specialInstructionForm.get('specialInstructionValue').markAsTouched();

            // Mark for check
            this._changeDetectorRef.markForCheck();

            return;
        }

        // Pre-check the product price
        if (this.selectedProductInventory.price === 0) {
            const confirmation = this._fuseConfirmationService.open({
                "title": "Item Unavailable",
                "message": "Sorry, this item is not available at the moment.",
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

            return;
        }
        // Pre-check the product inventory
        if (this.isProductOutOfStock(this.selectedProduct)) {
            const confirmation = this._fuseConfirmationService.open({
                "title": "Item Out of Stock",
                "message": "Sorry, the item is currently out of stock",
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

            return;
        }

        // Precheck for combo
        if (this.selectedProduct.isPackage) {
            let BreakException = {};
            try {
                this.combos.forEach(item => {
                    let message: string;
                    const totalAllow = item.totalAllow * this.quantity;

                    if (item.minAllow > 0 && item.minAllow >  this.selectedCombo[item.id].length) {
                        message = "You need to select minimum " + item.minAllow + " item(s) of <b>" + item.title + "</b>";
                    } else if (this.selectedCombo[item.id].length > totalAllow) {
                        message = "You need to select minimum " + totalAllow + " item(s) of <b>" + item.title + " only</b>";
                    } 

                    if (message) {
                        this._fuseConfirmationService.open({
                            "title": "Incomplete Item Combo selection",
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
                        throw BreakException;
                    }
                });
            } catch (error) {
                // console.error(error);
                return;
            }
        }

        // Precheck for addOn
        if (this.selectedProduct.hasAddOn) {
            let BreakException = {};
            try {
                this.addOns.forEach(item => {
                    let message: string;
                    if (item.minAllowed > 0 && item.minAllowed >  this.selectedAddOn[item.id].length) {
                        message = "You need to select " + item.minAllowed + " item(s) of <b>" + item.title + "</b>";
                    } else if (this.selectedAddOn[item.id].length > item.maxAllowed) {
                        message = "You need to select " + item.maxAllowed + " item(s) of <b>" + item.title + " only</b>";
                    } 

                    if (message) {
                        this._fuseConfirmationService.open({
                            "title": "Incomplete Item Add-On selection",
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
                        throw BreakException;
                    }
                });
            } catch (error) {
                // console.error(error);
                return;
            }
        }

        const cartItemBody = {
            cartId: this.cartItem.cartId,
            itemCode: this.selectedProductInventory.itemCode,
            price: this.selectedProductInventory.price, // need to recheck & revisit
            productId: this.selectedProductInventory.productId,
            productPrice: this.selectedProductInventory.price, // need to recheck & revisit
            quantity: this.quantity,
            SKU: this.selectedProductInventory.sku,
            specialInstruction: this.specialInstructionForm.get('specialInstructionValue').value
        };

        // additinal step for product combo
        if (this.selectedProduct.isPackage){
            cartItemBody["cartSubItem"] = [];
            // loop all combos from backend
            this.combos.forEach(item => {
                // compare it with current selected combo by user
                if (this.selectedCombo[item.id]) {
                    // loop the selected current combo
                    this.selectedCombo[item.id].forEach(element => {
                        // get productPakageOptionDetail from this.combo[].productPackageOptionDetail where it's subitem.productId == element (id in this.currentcombo array)
                        let productPakageOptionDetail = item.productPackageOptionDetail.find(subitem => subitem.productId === element);
                        if (productPakageOptionDetail){
                            // push to cart
                            cartItemBody["cartSubItem"].push(
                                {
                                    productPackageOptionId: item.id,
                                    SKU: productPakageOptionDetail.productInventory[0].sku,
                                    productName: productPakageOptionDetail.product.name,
                                    productId: element,
                                    itemCode: productPakageOptionDetail.productInventory[0].itemCode,
                                    quantity: 1, // this is set to one because this is not main product quantity, this is item for selected prouct in this combo
                                    productPrice: 0, // this is set to zero because we don't charge differently for product combo item
                                    specialInstruction: this.specialInstructionForm.get('specialInstructionValue').value
                                }
                            );
                        }
                    });
                }
            });            
        }

        // additinal step for product addOn
        if (this.selectedProduct.hasAddOn){
            cartItemBody["cartItemAddOn"] = [];
            // loop all combos from backend
            this.addOns.forEach(item => {
                // compare it with current selected combo by user
                if (this.selectedAddOn[item.id]) {
                    // loop the selected current combo
                    this.selectedAddOn[item.id].forEach(element => {
                        
                        // get productPakageOptionDetail from this.combo[].productPackageOptionDetail where it's subitem.productId == element (id in this.currentcombo array)
                        let productPakageOptionDetail = item.productAddOnItemDetail.find(subitem => subitem.id === element.id);
                        if (productPakageOptionDetail){
                            // push to cart
                            cartItemBody["cartItemAddOn"].push(
                                {
                                    productAddOnId: element.id,
                                }
                            );
                        }
                    });
                }
            });            
        }

        return new Promise(resolve => { this._cartService.putCartItem(this.cartItem.cartId, cartItemBody, this.cartItem.id)
            .subscribe((response)=>{
                this._bottomSheet.dismiss('saved');
                // clear special instruction field
                this.specialInstructionForm.get('specialInstructionValue').setValue('');
                this.specialInstructionForm.get('specialInstructionValue').markAsUntouched();
                resolve(response);

            }, (error) => {
                const confirmation = this._fuseConfirmationService.open({
                    "title": "Out of Stock!",
                    "message": "Sorry, this item is currently out of stock",
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
            });
        });
        
    }

}
