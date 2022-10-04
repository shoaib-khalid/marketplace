import { ChangeDetectorRef, Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ProductsService } from 'app/core/product/product.service';
import { Product } from 'app/core/product/product.types';
import { StoresService } from 'app/core/store/store.service';
import { ProductPagination, Store, StoreAssets, StoreCategory } from 'app/core/store/store.types';
import { NgxGalleryOptions, NgxGalleryImage, NgxGalleryAnimation } from 'ngx-gallery-9';
import { take, of, distinctUntilChanged, takeUntil, Subject, filter } from 'rxjs';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { Platform } from 'app/core/platform/platform.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { DatePipe, DOCUMENT } from '@angular/common';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { CartService } from 'app/core/cart/cart.service';
import { JwtService } from 'app/core/jwt/jwt.service';
import { AuthService } from 'app/core/auth/auth.service';
import { Cart, CartItem, CustomerCart } from 'app/core/cart/cart.types';
import { AppConfig } from 'app/config/service.config';

@Component({
    selector     : 'landing-product-details',
    templateUrl  : './product-details.component.html',
    styles       : [
        `
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

        :host ::ng-deep ngx-gallery {
            position: relative;
            border-radius:15px !important;
            z-index: 30;

            // Open this if layout want to disable overlay (refer layout)
            // @screen sm {
            //     position: relative;
            //     z-index: 50;
            //     border-radius:15px !important;
            // }
        }

        :host ::ng-deep .ngx-gallery-image {
            border-radius:15px !important;
        }

        :host ::ng-deep .ngx-gallery-thumbnail {
            border-radius:15px !important;
        }

        :host ::ng-deep .ngx-gallery-preview-img {
            width: auto;
            background-color: white;
            border-radius:15px !important;
        }

        :host ::ng-deep .fa-arrow-circle-right:before {
            color: var(--fuse-primary);
        }

        :host ::ng-deep .fa-arrow-circle-left:before {
            color: var(--fuse-primary);
        }

        :host ::ng-deep .ngx-gallery-bullet.ngx-gallery-active {
            background: white !important;
            border: 2px double var(--fuse-primary) !important;
        }

        :host ::ng-deep .ngx-gallery-bullet{
            background: white !important;
            border: 2px double black !important;
        }
        `
    ]
})
export class LandingProductDetailsComponent implements OnInit
{ 
    platform: Platform;
    storeDomain: string;

    store: Store;
    product: Product;
    products: Product[];

    quantity: number = 1;
    minQuantity: number = 1;
    maxQuantity: number = 999;

    specialInstruction: string;

    selectedProductInventory: any;
    selectedProductInventoryItems: any;

    selectedVariants: any = [];
    selectedVariant: any = [];
    selectedVariantNew: any = [];

    combos: any = [];
    selectedCombo: any = [];

    productAssets: any;
    displayedProduct: any = {
        price: 0,
        itemCode: null,
        sku: null,
        discountAmount:0,
        discountedPrice:0,
        SubTotal:0
    }

    categorySlug: string;

    imageCollection:any = [];
    galleryOptions: NgxGalleryOptions[] = [];
    galleryImages: NgxGalleryImage[] = [];
    specialInstructionForm: FormGroup;

    currentScreenSize: string[] = [];

    pagination: ProductPagination;
    
    notificationMessage: string;
    notificationMessageTitle: string = '';
    daysArray = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    
    storesOpening: { 
        storeId: string,
        isOpen : boolean,
        messageTitle : string,
        message: string
    }[] = [];

    openPreview: boolean = false;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    
    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _apiServer: AppConfig,
        private _storesService: StoresService,
        private _productsService: ProductsService,
        private _platformService: PlatformService,
        private _cartService: CartService,
        private _fuseConfirmationService: FuseConfirmationService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _authService: AuthService,
        private _jwtService: JwtService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _formBuilder: FormBuilder,
        private _changeDetectorRef: ChangeDetectorRef,
        private _datePipe: DatePipe,
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit() {

        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                if (platform) {
                    this.platform = platform;
                }
                // Mark for change
                this._changeDetectorRef.markForCheck();
            });

        this.specialInstructionForm = this._formBuilder.group({
            specialInstructionValue     : ['']
        });

        this.storeDomain = this._activatedRoute.snapshot.paramMap.get('store-slug');             

        this._storesService.store$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((store: Store) => {
                                
                if(store) {

                    this.store = store;
                    
                    // get product
                    this._productsService.product$
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((product: Product) => {
                            if (product){
        
                                this.product = product;           
            
                                // ----------------------------------
                                // Get category info by category id
                                // ----------------------------------
            
                                if (this.product && this.product.productInventories.length > 0) {
                                    
                                    // this._storesService.getStoreCategoriesById(response.categoryId)
                                    //     .subscribe((response: StoreCategory) => {
                                    //         this.categorySlug = response.name.toLowerCase().replace(/ /g, '-').replace(/[-]+/g, '-').replace(/[^\w-]+/g, '');
                                    //     });
                                    
                                    //Check condition if the product inventory got itemDiscount or not
                                    const checkItemDiscount = this.product.productInventories.filter((x:any)=>x.itemDiscount);
                                    
                                    if(checkItemDiscount.length > 0){
                                        //get most discount amount 
                                        this.selectedProductInventory = this.product.productInventories.reduce((r, e) => (<any>r).itemDiscount.discountAmount > (<any>e).itemDiscount.discountAmount ? r : e);
                                    }
                                    else {
                                        //get the cheapest price
                                        this.selectedProductInventory = this.product.productInventories.reduce((r, e) => r.price < e.price ? r : e);
                                    }
                                    
                                    // set initial selectedProductInventoryItems to the cheapest item
                                    this.selectedProductInventoryItems = this.selectedProductInventory.productInventoryItems;
            
                                    if (this.selectedProductInventoryItems) {
                                        this.displayedProduct.price = this.selectedProductInventory.price;
                                        this.displayedProduct.itemCode = this.selectedProductInventory.itemCode;
                                        this.displayedProduct.sku = this.selectedProductInventory.sku;
                                        this.displayedProduct.discountAmount = this.selectedProductInventory.itemDiscount ? this.selectedProductInventory.itemDiscount.discountAmount : null;
                                        this.displayedProduct.discountedPrice = this.selectedProductInventory.itemDiscount ? this.selectedProductInventory.itemDiscount.discountedPrice : null;
                                    } 
                                    else {
                                        this.displayedProduct.price = this.selectedProductInventory.price;
                                        this.displayedProduct.itemCode = this.selectedProductInventory.itemCode;
                                        this.displayedProduct.sku = this.selectedProductInventory.sku;
                                        this.displayedProduct.discountAmount = this.selectedProductInventory.itemDiscount ? this.selectedProductInventory.itemDiscount.discountAmount : null;
                                        this.displayedProduct.discountedPrice = this.selectedProductInventory.itemDiscount ? this.selectedProductInventory.itemDiscount.discountedPrice : null;
                                    }
            
                                    // ------------------
                                    // Product Assets
                                    // ------------------
            
                                    this.productAssets = this.product.productAssets;

                                    //reset
                                    this.imageCollection = [];
            
                                    // first this will push all images expect the one that are currently display
                                    product.productAssets.forEach( object => {
                                        let _imageObject = {
                                            small   : '' + object.url,
                                            medium  : '' + object.url,
                                            big     : '' + object.url + '?original=true'
                                        }
                                        
                                        if(object.itemCode != this.displayedProduct.itemCode){
                                            this.imageCollection.push(_imageObject)
                                        } 
                                    });
            
                                    // loop second one to push the one that are currently display in first array
                                    product.productAssets.forEach( object => {
                                        let _imageObject = {
                                            small   : '' + object.url,
                                            medium  : '' + object.url,
                                            big     : '' + object.url + '?original=true'
                                        }
                                        
                                        if(object.itemCode == this.displayedProduct.itemCode){
                                            this.imageCollection.unshift(_imageObject)
                                        }
                                    });
                            
                                    // set to galerry images
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
            
                                    // -----------------------
                                    // Product Variants
                                    // -----------------------
            
                                    // set currentVariant
                                    this.selectedProductInventoryItems.forEach(item => {
                                        this.selectedVariants.push(item.productVariantAvailableId)
                                    });
            
                                    // logic here is to extract current selected variant and to reconstruct new object with its string identifier 
                                    // basically it create new array of object from this.product.productVariants to => this.requestParamVariant
                                    let _productVariants = this.product.productVariants
                                    _productVariants.map(variantBase => {
                                        let _productVariantsAvailable = variantBase.productVariantsAvailable;
                                        _productVariantsAvailable.forEach(element => {
                                            this.selectedVariants.map(currentVariant => {
                                                if(currentVariant.indexOf(element.id) > -1){
                                                    let _data = {
                                                        basename: variantBase.name,
                                                        variantID: element.id,
                                                    }
                                                    this.selectedVariant.push(_data)
                                                }
                                            })
            
                                        })
                                    });
            
                                    // -----------------------
                                    // Product Combo
                                    // -----------------------
            
                                    // get product package if exists
                                    if (this.product.isPackage) {
                                        this._productsService.getProductPackageOptions(this.store.id, this.product.id)
                                        .subscribe((response)=>{
            
                                            this.combos = response;
                                            
                                            if (this.combos.length > 0) {
                                                this.combos.forEach(combo => {
                                    
                                                    // const firstValue = combo.productPackageOptionDetail.reduce((previousValue, currentValue) => {
                                                    //     if (currentValue.sequenceNumber === 1) {
                                                    //         return currentValue.productId;
                                                    //     }
                                                    //     return previousValue;
                                                    // }, []);
                                                    
                                                    this.selectedCombo[combo.id] = [];
                                                    // if (firstValue !== undefined) {
                                                    //     this.selectedCombo[combo.id].push(firstValue);
                                                    // }
                                                });
                                            }
            
                                        });
                                    }
            
                                    // -----------------------
                                    // Create meta description for product
                                    // -----------------------
            
                                    if (this.product.description) {
                                        const meta = document.createElement('meta');
                                        meta.name = 'description';
                                        meta.content = this.product.description;
                                        document.head.appendChild(meta);
                                    }
                                } else {
                                    // this means there is no data in product inventory, loading the default image
                                    this.galleryImages = [{
                                        small   : '' + this.store.storeAsset.logoUrl,
                                        medium  : '' + this.store.storeAsset.logoUrl,
                                        big     : '' + this.store.storeAsset.logoUrl + '?original=true'
                                    }];
                                }
                            }
                            // Mark for check
                            this._changeDetectorRef.markForCheck();
                        });
    
                    // get all products
                    this._productsService.popularProducts$
                        .subscribe((products: Product[]) => {
                            // Shuffle the array
                            // this.products = this.shuffle(products); 
                            this.products = products;
                        })
    
                    // Get the products pagination
                    this._productsService.pagination$
                        .pipe(takeUntil(this._unsubscribeAll))
                        .subscribe((pagination: ProductPagination) => {
                            
                            // Update the pagination
                            this.pagination = pagination;                
        
                            // Mark for check
                            this._changeDetectorRef.markForCheck();
                        });

                    //  Check Store timing
                    this.storesOpening = [];
                        
                    this.checkStoreTiming(store)
                }
                // Mark for change
                this._changeDetectorRef.markForCheck();
            });
        
        // initialise gallery
        // set galleryOptions
        this.galleryOptions = [
            {
                width: '350px',
                height: '350px',
                thumbnailsColumns: 3,
                imageAnimation: NgxGalleryAnimation.Slide,
                thumbnailsArrows: true,
                thumbnails : false,
                // previewDownload: true,
                imageArrowsAutoHide: false, 
                thumbnailsArrowsAutoHide: false,
                thumbnailsAutoHide: true,
                imageBullets : true,
                // "imageSize": "contain",
                "previewCloseOnClick": true, 
                "previewCloseOnEsc": true,
                // "thumbnailsRemainingCount": true
            },
            // max-width 767 Mobile configuration (medium view)
            {
                breakpoint: 959,
                thumbnailsColumns: 0,
                thumbnails : false,
                thumbnailsArrows  : true,
                imageArrowsAutoHide : false,
                thumbnailsArrowsAutoHide: false,
                imageSwipe: true,
                imageBullets : true,
                width: '360px',
                height: '360px',
                // imagePercent: 100,
                // thumbnailsPercent: 30,
                // thumbnailsMargin: 10,
                // thumbnailMargin: 5,
            }
        ];

        // ----------------------
        // Fuse Media Watcher
        // ----------------------

        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {               

                this.currentScreenSize = matchingAliases;                

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

        this._productsService.product = null;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    shuffle(array) {
        let currentIndex = array.length,  randomIndex;
      
        // While there remain elements to shuffle.
        while (currentIndex != 0) {
      
          // Pick a remaining element.
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex--;
      
          // And swap it with the current element.
          [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
        }
      
        return array;
    }

    goToCatalogue() {
        history.back();
        // this._router.navigate(['/catalogue/'+this.categorySlug]);
    }

    addToCart() {

        // Do nothing if special instruction is empty

        if (this.product.isNoteOptional === false && !this.specialInstructionForm.get('specialInstructionValue').value) {

            // this is to make the form shows 'required' error
            this.specialInstructionForm.get('specialInstructionValue').markAsTouched();

            // Mark for check
            this._changeDetectorRef.markForCheck();

            return;
        }

        // Pre-check the product inventory
        if (!this.selectedProductInventory) {
            const confirmation = this._fuseConfirmationService.open({
                "title": "Product Out of Stock",
                "message": "Sorry, the product is currently out of stock",
                "icon": {
                  "show": true,
                  "name": "heroicons_outline:exclamation",
                  "color": "warn"
                },
                "actions": {
                  "confirm": {
                    "show": true,
                    "label": "Ok",
                    "color": "warn"
                  },
                  "cancel": {
                    "show": false,
                    "label": "Cancel"
                  }
                },
                "dismissible": true
              });

            return false;
        }

        // Pre-check the product price
        if (this.selectedProductInventory.price === 0) {
            const confirmation = this._fuseConfirmationService.open({
                "title": "Product Unavailable",
                "message": "Sorry, this item is not available at the moment.",
                "icon": {
                  "show": true,
                  "name": "heroicons_outline:exclamation",
                  "color": "warn"
                },
                "actions": {
                  "confirm": {
                    "show": true,
                    "label": "Ok",
                    "color": "warn"
                  },
                  "cancel": {
                    "show": false,
                    "label": "Cancel"
                  }
                },
                "dismissible": true
              });

            return false;
        }

        // Precheck for combo
        if (this.product.isPackage) {
            let BreakException = {};
            try {
                this.combos.forEach(item => {
                    if (item.totalAllow !== this.selectedCombo[item.id].length) {
                        const confirmation = this._fuseConfirmationService.open({
                            "title": "Incomplete Product Combo selection",
                            "message": 'You need to select ' + item.totalAllow + ' item of <b>"' + item.title + '"</b>',
                            "icon": {
                                "show": true,
                                "name": "heroicons_outline:exclamation",
                                "color": "warn"
                            },
                            "actions": {
                                "confirm": {
                                "show": true,
                                "label": "Ok",
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
                                "label": "Ok",
                                "color": "warn"
                                },
                                "cancel": {
                                "show": false,
                                "label": "Cancel"
                                }
                            },
                            "dismissible": true
                        });
                        
                        console.error("Guest only allowed 10 cartItems only");

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
                                "label": "Ok",
                                "color": "warn"
                                },
                                "cancel": {
                                "show": false,
                                "label": "Cancel"
                                }
                            },
                            "dismissible": true
                        });
                        console.error("Guest only allowed 5 carts only");
                    } else {
                        const cart = {
                            customerId  : null, 
                            storeId     : this.store.id,
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
            price: this.selectedProductInventory.price, // need to recheck & revisit
            productId: this.selectedProductInventory.productId,
            productPrice: this.selectedProductInventory.price, // need to recheck & revisit
            quantity: this.quantity,
            SKU: this.selectedProductInventory.sku,
            specialInstruction: this.specialInstructionForm.get('specialInstructionValue').value
        };

        // additinal step for product combo
        if(this.product.isPackage){
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
                                    SKU: productPakageOptionDetail.productInventory[0].sku,
                                    productName: productPakageOptionDetail.product.name,
                                    productId: element,
                                    itemCode: productPakageOptionDetail.productInventory[0].itemCode,
                                    quantity: 1, // this is set to one because this is not main product quantity, this is item for selected prouct in this combo
                                    productPrice: 0, // this is set to zero because we don't charge differently for product combo item
                                    specialInstruction: this.specialInstructionForm.get('specialInstructionValue').value // we actually don't need this because this already included in main product, we'll at this later
                                }
                            );
                        }
                    });
                }
            });            
        }

        return new Promise(resolve => { this._cartService.postCartItem(cartId, cartItemBody)
            .subscribe((response)=>{
                const confirmation = this._fuseConfirmationService.open({
                    "title": "Great!",
                    "message": "Item successfully added to cart",
                    "icon": {
                      "show": true,
                      "name": "heroicons_outline:check",
                      "color": "success"
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
                resolve(response);
                
                // clear special instruction field
                this.specialInstructionForm.get('specialInstructionValue').setValue('');
                this.specialInstructionForm.get('specialInstructionValue').markAsUntouched();

                // Subscribe to the confirmation dialog closed action
                confirmation.afterClosed().subscribe((result) => {
                    // If the confirm button pressed...
                    if ( result === 'confirmed' )
                    {          
                        // redirect back to product list
                        history.back();
                        // this.chooseStore(this.store.domain);
                    }
                });

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

        this.findInventory()
    }

    findInventory() {

        let toFind = this.selectedVariantNew;
        let productArr = this.product;
        let inventories = productArr.productInventories;
        let assetsArr = productArr.productAssets;

        let flag = true;
        let selectedProductInventory;
        let productInventoryItems;
        
        for (let i = 0; i < inventories.length; i++) {
            flag=true;
            selectedProductInventory = inventories[i];

            // find the inventory items
            productInventoryItems = inventories[i]['productInventoryItems'];
            for (let j = 0; j < productInventoryItems.length; j++) {
                if(toFind.includes(productInventoryItems[j].productVariantAvailableId)){
                    continue;
                } else{
                    flag = false;
                    break;
                }
            }
            
            if(flag){

                this.selectedProductInventory = selectedProductInventory;

                this.displayedProduct.price = selectedProductInventory.price
                this.displayedProduct.itemCode = selectedProductInventory.itemCode
                this.displayedProduct.sku = selectedProductInventory.sku
                this.displayedProduct.discountAmount = selectedProductInventory.itemDiscount ? selectedProductInventory.itemDiscount.discountAmount : null;
                this.displayedProduct.discountedPrice = selectedProductInventory.itemDiscount ? selectedProductInventory.itemDiscount.discountedPrice : null;

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
                    
                    if(object.itemCode != this.displayedProduct.itemCode){
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

    onChangeCombo(comboId, productId , event){

        let productID = event.target.value;

        // remove only unchecked item in array
        if (event.target.checked === false) {
            let index = this.selectedCombo[comboId].indexOf(productID);
            if (index !== -1) {
                this.selectedCombo[comboId].splice(index, 1);
                return;
            }
        }

        let currentComboSetting = this.combos.find(item => item.id === comboId);
        
        // remove first item in array if it exceed totalAllow
        if (this.selectedCombo[comboId].length >= currentComboSetting.totalAllow){
            this.selectedCombo[comboId].shift();
        }

        // set currentCombo
        this.selectedCombo[comboId].push(productId);
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

    displayStoreLogo(storeAssets: StoreAssets[]) {
        let storeAssetsIndex = storeAssets.findIndex(item => item.assetType === 'LogoUrl');
        if (storeAssetsIndex > -1) {
            return storeAssets[storeAssetsIndex].assetUrl;
        } else {
            return this.platform.logo;
        }
    }

    chooseStore(storeDomain:string) {
        
        let slug = storeDomain.split(".")[0]
        
        this._router.navigate(['/store/' + slug]);
        
    }

    redirectToProduct(seoName: string) {
        // let domainName = storeDomain.split(".")[0]
        
        // this._document.location.href = url;
        this._router.navigate(['store/' + this.storeDomain + '/' + 'all-products/' + seoName]);

    }

    //--------------------------
    //      store timing
    //--------------------------

    checkStoreTiming(store: Store): void
    {
        let storeTiming = store.storeTiming;

        let storeId = store.id;

        this.storesOpening.push({
            storeId: storeId,
            isOpen : true,
            messageTitle: '',
            message: ''
        })

        let storeOpeningIndex = this.storesOpening.findIndex(i => i.storeId === storeId)

        let storeSnooze = store.storeSnooze.isSnooze
    
        // let storeSnooze = snooze

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

                        if(store && todayDate >= openTime && todayDate < closeTime ) {

                            // --------------------
                            // Check store snooze
                            // --------------------

                            let snoozeEndTime = new Date(store.storeSnooze.snoozeEndTime);
                            let nextStoreOpeningTime: string = "";                            

                            if (storeSnooze === true) {

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
                                    nextStoreOpeningTime = "Please come back on " + this._datePipe.transform(store.storeSnooze.snoozeEndTime,'EEEE, h:mm a');
                                }                                

                                if (store.storeSnooze.snoozeReason && store.storeSnooze.snoozeReason !== null) {
                                    // this.notificationMessage = "Sorry for the inconvenience, Store is currently closed due to " + store.storeSnooze.snoozeReason + ". " + nextStoreOpeningTime;
                                    
                                    this.notificationMessage = nextStoreOpeningTime;

                                    this.storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                                    this.storesOpening[storeOpeningIndex].isOpen = false;
                                    this.storesOpening[storeOpeningIndex].message = this.notificationMessage;

                                } else {

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

        this.notificationMessageTitle = this.storesOpening[storeOpeningIndex].messageTitle;
      
    }

    isStoreClose(storeId)
    {
        let storeIndex = this.storesOpening.findIndex(x => x.storeId === storeId && (x.isOpen === false));  
        if (storeIndex > -1) 
            return true;
        else 
            return false;
    }

    scrollToTop(){
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'smooth' 
        });
    }
    
}
