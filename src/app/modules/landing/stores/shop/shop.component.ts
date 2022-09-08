import { DatePipe, ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, QueryList, TemplateRef, ViewChild, ViewChildren, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { ProductsService } from 'app/core/product/product.service';
import { Product, ProductAssets, ProductInventory, ProductInventoryItem, ProductPagination } from 'app/core/product/product.types';
import { StoresService } from 'app/core/store/store.service';
import { Store, StoreAssets, StoreCategory } from 'app/core/store/store.types';
import { BottomPopUpService } from 'app/layout/common/_bottom-popup/bottom-popup.service';
import { SearchService } from 'app/layout/common/_search/search.service';
import { NgxGalleryAnimation, NgxGalleryImage, NgxGalleryOptions } from 'ngx-gallery-9';
import { debounceTime, map, Observable, Subject, switchMap, takeUntil, take } from 'rxjs';
import { ShopService } from './shop.service';
import { AppConfig } from 'app/config/service.config';
import { CupertinoPane } from 'cupertino-pane';
import { Cart, CartItem, CustomerCart } from 'app/core/cart/cart.types';
import { CartService } from 'app/core/cart/cart.service';
import { AuthService } from 'app/core/auth/auth.service';
import { JwtService } from 'app/core/jwt/jwt.service';

@Component({
    selector     : 'landing-shop',
    templateUrl  : './shop.component.html',
    styles       : [
        `
            .mat-tab-group {

                /* No header */
                &.fuse-mat-no-header {
            
                    .mat-tab-header {
                        height: 0 !important;
                        max-height: 0 !important;
                        border: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        overflow-x: scroll !important;
                    }
                }
            
                .mat-tab-header {
                    border-bottom: flex !important;
                    overflow-x: scroll !important;
                    

                    .mat-tab-header-pagination-before{
                        display: none !important;
                    }
    
                    .mat-tab-header-pagination-after {
                        display: none !important;
                    }
    
                    @screen md{
                        .mat-tab-header-pagination-before{
                            display: flex !important;
                        }
        
                        .mat-tab-header-pagination-after {
                            display: flex !important;
                        }

                        overflow-x: none !important;

                    }                  

                    .mat-tab-label-container {
                        padding: 0 0px;
                        overflow: visible !important;

                        @screen md{
                            overflow: hidden !important;

                        }

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

            .cat {
                margin-right: -5px !important;
                margin-left: -5px !important; 
            }

            ngx-gallery {
                position: relative;
                border-radius:12px !important;
                z-index: 30;

            }

            .ngx-gallery-image {
                border-radius:12px !important;
            }

            .ngx-gallery-thumbnail {
                border-radius:12px !important;
            }

            .ngx-gallery-preview-img {
                width: auto;
                background-color: white;
                border-radius:12px !important;
            }

            .fa-arrow-circle-right:before {
                color: var(--fuse-primary);
            }

            .fa-arrow-circle-left:before {
                color: var(--fuse-primary);
            }

            .ngx-gallery-bullet.ngx-gallery-active {
                background: white !important;
                border: 2px double var(--fuse-primary) !important;
            }

            .ngx-gallery-bullet{
                background: white !important;
                border: 2px double black !important;
            }  

            .cupertino-class {
                z-index: 99;
            }
            
        `
    ],
    encapsulation: ViewEncapsulation.None,
    animations     : fuseAnimations,
    // changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingShopComponent implements OnInit
{
    platform: Platform;

    isLoading: boolean = false;
    isScreenSmall: boolean;
    currentScreenSize: string[] = [];

    store: Store
    storeCategories: StoreCategory[];
    selectedCategory: StoreCategory = null;
    catalogueSlug: string = "all-products";
    storeDomain: string;
    storeDetails: {
        image: string,
        domain: string
    }

    // product
    products$: Observable<Product[]>;
    products: Product[] = [];
    pagination: ProductPagination;

    sortInputControl: FormControl = new FormControl('recent');
    pageOfItems: Array<any>;
    sortName: string = "created";
    sortOrder: 'ASC' | 'DESC' | '' = 'DESC';
    searchName: string;
    oldPaginationIndex: number = 0;

    productViewOrientation: string = 'grid';
    collapseCategory: boolean = true;

    notificationMessage: string;
    notificationMessageTitle: string = '';
    daysArray = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    storesOpening: { 
        storeId: string,
        isOpen : boolean,
        messageTitle : string,
        message: string
    }[] = [];

    combos: any = [];
    selectedCombo: any = [];
    selectedProduct: Product = null

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
        SubTotal:0
    }
    openPreview: boolean = false;
    quantity: number = 1;
    minQuantity: number = 1;
    maxQuantity: number = 999;


    private _unsubscribeAll: Subject<any> = new Subject<any>();
    @ViewChild('openDetails', { read: TemplateRef }) _openDetails:TemplateRef<any>;
    drawer: CupertinoPane;
    

    /**
     * Constructor
     */
    constructor(
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _matIconRegistry: MatIconRegistry,
        private _domSanitizer: DomSanitizer,
        private _scroller: ViewportScroller,
        private _activatedRoute: ActivatedRoute,
        private _storesService: StoresService,
        private _productsService: ProductsService,
        private _platformService: PlatformService,
        private _searchService: SearchService,
        private _datePipe: DatePipe,
        private _shopService: ShopService,
        private _bottomPopUpService: BottomPopUpService,
        private _fuseConfirmationService: FuseConfirmationService,
        private _apiServer: AppConfig,
        private _cartService: CartService,
        private _authService: AuthService,
        private _jwtService: JwtService

    )
    {
        this._matIconRegistry
        .addSvgIcon('search',this._domSanitizer.bypassSecurityTrustResourceUrl('assets/layouts/fnb/icons/search.svg'))
        .addSvgIcon('block-view',this._domSanitizer.bypassSecurityTrustResourceUrl('assets/layouts/fnb/icons/block-view.svg'))
        .addSvgIcon('list-view',this._domSanitizer.bypassSecurityTrustResourceUrl('assets/layouts/fnb/icons/list-view.svg'));

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
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {  

        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {
                this.currentScreenSize = matchingAliases;

                // Set the drawerMode and drawerOpened
                if ( matchingAliases.includes('sm') )
                {
                    this.collapseCategory = false;
                    this.productViewOrientation = 'grid';
                }
                else
                {
                    this.collapseCategory = true;
                    this.productViewOrientation = 'list';
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();

                // Check if the screen is small
                this.isScreenSmall = !matchingAliases.includes('md');
            });

        this.sortInputControl.valueChanges
        .pipe(
            takeUntil(this._unsubscribeAll),
            debounceTime(300),
            switchMap((query) => {                

                if (query === "recent") {
                    this.sortName = "created";
                    this.sortOrder = "DESC";
                } else if (query === "cheapest") {
                    this.sortName = "price";
                    this.sortOrder = "ASC";
                } else if (query === "expensive") {
                    this.sortName = "price";
                    this.sortOrder = "DESC";
                } else if (query === "a-z") {
                    this.sortName = "name";
                    this.sortOrder = "ASC";
                } else if (query === "z-a") {
                    this.sortName = "name";
                    this.sortOrder = "DESC";
                } else {
                    // default to recent (same as recent)
                    this.sortName = "created";
                    this.sortOrder = "DESC";
                }

                this._productsService.sortProduct = { sortByCol: this.sortName, sortingOrder: this.sortOrder};
                this._productsService.sortProductByLabel = query;

                // set loading to true
                // this.isLoading = true;
                return this._productsService.getProducts(this.store.id, {
                    name        : this.searchName, 
                    page        : this.oldPaginationIndex, 
                    size        : 12, 
                    sortByCol   : this.sortName,
                    sortingOrder: this.sortOrder,
                    status      : "ACTIVE,OUTOFSTOCK" , 
                    categoryId  : this.selectedCategory ? this.selectedCategory.id : null
                }, false);
            }),
            map(() => {
                // set loading to false
                this.isLoading = false;
            })
        ).subscribe();

        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                if (platform) {
                    this.platform = platform;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this.storeDomain = this._activatedRoute.snapshot.paramMap.get('store-slug');    

        this._storesService.store$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((store: Store) => {
                if(store){
                    this.store = store;

                    let storeLogo = this.displayStoreLogo(this.store.storeAssets);
                    
                    // If keyword from search exist, set catalogueSlug to null so that checkbox won't be checked
                    if (!this.catalogueSlug && this._activatedRoute.snapshot.queryParamMap.get('keyword')){
                        this.catalogueSlug = null;
                    }
                    
                    // To be sent to _search component
                    this.storeDetails = {
                        image : storeLogo,
                        domain: this.storeDomain
                    };
                    // Setter for store details for _search component
                    this._searchService.storeDetails = this.storeDetails;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get the products pagination
        this._productsService.pagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: ProductPagination) => {
                
                // Update the pagination
                this.pagination = pagination;                

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });


        // Get searches from url parameter 
        this._activatedRoute.queryParams
            .subscribe(params => {
                this.isLoading = true;

                // get back the previous pagination page
                // more than 2 means it won't get back the previous pagination page when navigate back from 'carts' page
                if (this._shopService.getPreviousUrl() && this._shopService.getPreviousUrl().split("/").length > 4) {                            
                    this.oldPaginationIndex = this.pagination ? this.pagination.page : 0;
                    
                    // Used for first query back end, considered as hack to make product loading looks 'nicer', no popping2
                    this._productsService.sortProduct$
                        .pipe(take(1))
                        .subscribe((response: { sortByCol: string, sortingOrder: 'ASC' | 'DESC' | ''}) => {
                            if (response) {
                                this.sortName = response.sortByCol;
                                this.sortOrder = response.sortingOrder;
                            }
                            
                            // Mark for check
                            this._changeDetectorRef.markForCheck();
                        });

                    // This will trigger back the sortInputControl and query back end
                    this._productsService.sortProductByLabel$
                        .pipe(take(1))
                        .subscribe((responseLabel: string) => {
                            if (responseLabel) {
                                this.sortInputControl.patchValue(responseLabel)
                            }
                            
                            // Mark for check
                            this._changeDetectorRef.markForCheck();
                        });
                }

                this.searchName = params['keyword'] ? params['keyword'] : null;

                this._storesService.getStoreCategories(this.store.id)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((storeCategories: StoreCategory[]) => {
                    if (storeCategories) {
                        this.storeCategories = storeCategories;

                        this._storesService.storeCategory$
                            .pipe(takeUntil(this._unsubscribeAll))
                            .subscribe((storeCategory: StoreCategory) => {
                                
                                // Select the category if its already selected before
                                if (storeCategory && this.storeCategories.map(x => x.id).includes(storeCategory.id)){
                                    this.selectedCategory = storeCategory;
                                }
                                else {
                                    this.selectedCategory = null;
                                }

                                this._productsService.getProducts(this.store.id, {
                                    name        : this.searchName,
                                    page        : this.searchName ? 0 : this.oldPaginationIndex, 
                                    size        : 12,
                                    sortByCol   : this.searchName ? 'created' : this.sortName, 
                                    sortingOrder: this.searchName ? 'DESC' : this.sortOrder, 
                                    status      : 'ACTIVE,OUTOFSTOCK',
                                    categoryId  : this.selectedCategory ? this.selectedCategory.id : null
                                }, false)
                                .pipe(takeUntil(this._unsubscribeAll))
                                .subscribe(()=>{
                                    // set loading to false
                                    this.isLoading = false;
            
                                    // Mark for check
                                    this._changeDetectorRef.markForCheck();
                                });

                                // Mark for check
                                this._changeDetectorRef.markForCheck();
                            });
                        
                    }
                    // Mark for check
                    this._changeDetectorRef.markForCheck();
                });
        });

        // Get the products
        this.products$ = this._productsService.products$;  

        this._productsService.selectedProduct$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((product: Product) => {
                if (product) {
                    this.selectedProduct = product;

                    // Reset quantity on getting new product
                    this.quantity = 1;

                    //Check condition if the product inventory got itemDiscount or not
                    const checkItemDiscount = product.productInventories.filter((x:any)=>x.itemDiscount);
                                        
                    if (checkItemDiscount.length > 0){
                        //get most discount amount 
                        this.selectedProductInventory = product.productInventories.reduce((r, e) => (<any>r).itemDiscount.discountAmount > (<any>e).itemDiscount.discountAmount ? r : e);
                    }
                    else {
                        //get the cheapest price
                        this.selectedProductInventory = product.productInventories.reduce((r, e) => r.price < e.price ? r : e);
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

                    // set currentVariant
                    this.selectedProductInventoryItems.forEach(item => {
                        this.selectedVariants.push(item.productVariantAvailableId)
                    });

                    // logic here is to extract current selected variant and to reconstruct new object with its string identifier 
                    // basically it creates new array of object from this.product.productVariants to => this.requestParamVariant
                    let _productVariants = product.productVariants
                    _productVariants.map(variantBase => {
                        let _productVariantsAvailable = variantBase.productVariantsAvailable;
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

                    this.productAssets = product.productAssets;

                    //reset
                    this.imageCollection = [];

                    // first this will push all images expect the one that are currently display
                    product.productAssets.forEach( object => {
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
                    this.preLoadProduct(product)
                    // this._bottomPopUpService.set(this._openDetails);
                }
                
            })
        
    }

    /**
    * After view init
    */
    ngAfterViewInit(): void
    {

        // Scroll selected category into view
        setTimeout(() => {
            
            if (this.selectedCategory) {

                let index = this.storeCategories.findIndex(category => category.id === this.selectedCategory.id);
                if (index > -1) {
                    const locateButton = document.getElementById(`cat-${index}`) as HTMLInputElement;
                    locateButton.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest', 
                        inline: 'start'
                      });
                }
            }
        }, 500);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
        if (this.drawer) 
            this.drawer.destroy()
        this._productsService.selectProduct(null);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    scroll(id) {
        this._scroller.scrollToAnchor(id)
    }

    onChangePage(pageOfItems: Array<any>) {

        // update current page of items
        this.pageOfItems = pageOfItems;
        
        if ( ( (this.pageOfItems['currentPage'] - 1) > -1 ) && (this.pageOfItems['currentPage'] - 1 !== this.pagination.page)) {
            // set loading to true
            this.isLoading = true;
            this._productsService.getProducts(this.store.id, {
                name        : this.searchName, 
                page        : (this.pageOfItems['currentPage'] - 1) < 0 ? 0 : (this.pageOfItems['currentPage'] - 1), 
                size        : this.pageOfItems['pageSize'], 
                sortByCol   : this.sortName, 
                sortingOrder: this.sortOrder, 
                status      : "ACTIVE,OUTOFSTOCK" , 
                categoryId  : this.selectedCategory ? this.selectedCategory.id : null
            }, false)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response)=>{
                // set loading to false
                this.isLoading = false;
            });
        }
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    chooseCategory(category : StoreCategory) {
        
        if (category) {
            // Resolve selected category
            this._storesService.getStoreCategoriesById(category.id).subscribe();
        } else {
            this._storesService.storeCategory = null;
            this.selectedCategory = null;
        }
        
        this.catalogueSlug = category ? category.name.toLowerCase().replace(/ /g, '-').replace(/[-]+/g, '-').replace(/[^\w-]+/g, '') : "all-products";

        this.pageOfItems['currentPage'] = 1;

        this.oldPaginationIndex = 0;
        
        // set loading to true
        this.isLoading = true;
    }

    displayStoreLogo(storeAssets: StoreAssets[]) {
        let storeAssetsIndex = storeAssets.findIndex(item => item.assetType === 'LogoUrl');
        if (storeAssetsIndex > -1) {
            return storeAssets[storeAssetsIndex].assetUrl;
        } else {
            return this.platform.logo;
        }
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
                            // if ((item.breakStartTime && item.breakStartTime !== null) && (item.breakEndTime && item.breakEndTime !== null)) {
                            //     let breakStartTime = new Date();
                            //     breakStartTime.setHours(Number(item.breakStartTime.split(":")[0]), Number(item.breakStartTime.split(":")[1]), 0);
    
                            //     let breakEndTime = new Date();
                            //     breakEndTime.setHours(Number(item.breakEndTime.split(":")[0]), Number(item.breakEndTime.split(":")[1]), 0);

                            //     if(todayDate >= breakStartTime && todayDate < breakEndTime ) {
                            //         // console.info("We are on BREAK! We will open at " + item.breakEndTime);
                            //         this.notificationMessage = "Sorry for the inconvenience, We are on break! We will open at " + item.breakEndTime;
                            //     }
                            // }
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

    preLoadProduct(product: Product){

        // Precheck for combo
        if (product.isPackage) {
            this.combos = null;
            
            // get product package if exists
            this._productsService.getProductPackageOptions(this.store.id, product.id)
            .subscribe((response)=>{
                
                if (response.length > 0) {
                    this.combos = response;
                    // this._bottomPopUpService.set(this._openDetails);
                    this.combos.forEach(element => {
                        this.selectedCombo[element.id] = [];
                    });
                    this.openDrawer();

                    // Mark for check
                    this._changeDetectorRef.markForCheck();
                }

            });
        }
        // Variant
        else if (product.productVariants.length > 0) {
            // this._bottomPopUpService.set(this._openDetails);
            this.openDrawer();
        }
        // Normal product
        else {
            this.openDrawer();
        }
        
    }

    addToCart() {

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

            return;
        }
        // Pre-check the product inventory
        if (!this.isProductOutOfStock(this.selectedProduct)) {
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

            return;
        }

        // Precheck for combo
        if (this.selectedProduct.isPackage) {
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
        };

        // additinal step for product combo
        if(this.selectedProduct.isPackage){
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
                                }
                            );
                        }
                    });
                }
            });            
        }

        return new Promise(resolve => { this._cartService.postCartItem(cartId, cartItemBody)
            .subscribe((response)=>{
                // close panel
                if (this.drawer) {
                    this.drawer.destroy({animate: true})
                }
                resolve(response);
                // const confirmation = this._fuseConfirmationService.open({
                //     "title": "Great!",
                //     "message": "Item successfully added to cart",
                //     "icon": {
                //     "show": true,
                //     "name": "heroicons_outline:check",
                //     "color": "success"
                //     },
                //     "actions": {
                //     "confirm": {
                //         "show": true,
                //         "label": "OK",
                //         "color": "primary"
                //     },
                //     "cancel": {
                //         "show": false,
                //         "label": "Cancel"
                //     }
                //     },
                //     "dismissible": true
                // });
                
                // // Subscribe to the confirmation dialog closed action
                // confirmation.afterClosed().subscribe((result) => {
                //     // If the confirm button pressed...
                //     if ( result === 'confirmed' )
                //     {          
                //         // close panel
                //         if (this.drawer) 
                //             this.drawer.destroy({animate: true})
                //     }
                // });

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

    //----------------
    //  Combo Section
    //----------------
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

        this.findInventory()
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

    openDrawer(){
        this.drawer = new CupertinoPane('.cupertino-pane', { 
            parentElement: "fnb02-layout", // Parent container
            backdrop: true,
            initialBreak: 'top',
            fitHeight: true,
            bottomClose: true,
            // breaks: {
            //     top: {enabled: true, height: 600},
            //     middle: {enabled: true, height: 300},
            //     bottom: {enabled: false}
            // },
            backdropOpacity: 0.5, 
            cssClass: 'cupertino-class',
            events: {
                onBackdropTap: () => {
                    this.drawer.destroy({animate: true});
                    this._productsService.selectProduct(null);
                    this.selectedProduct = null;
                } ,
                onDidDismiss: () => {
                    this._productsService.selectProduct(null);
                    this.selectedProduct = null;
                }
              }
        });
        this.drawer.present({ animate: true });
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }
}