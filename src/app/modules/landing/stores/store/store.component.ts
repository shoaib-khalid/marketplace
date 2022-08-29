import { DatePipe, DOCUMENT, ViewportScroller } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { ProductsService } from 'app/core/product/product.service';
import { Product, ProductPagination } from 'app/core/product/product.types';
import { StoresService } from 'app/core/store/store.service';
import { Store, StoreAssets, StoreCategory } from 'app/core/store/store.types';
import { SearchService } from 'app/layout/common/_search/search.service';
import { Subject, switchMap, Observable } from 'rxjs';
import { takeUntil, debounceTime, map } from 'rxjs/operators';
import { StoreService } from './store.service';


@Component({
    selector     : 'landing-store',
    templateUrl  : './store.component.html',
    styles       : [
        `
        /** Custom input number **/
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
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
    animations     : fuseAnimations,
})
export class LandingStoreComponent implements OnInit
{
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    platform: Platform;
   
    storeDomain: string;

    image: any = [];
    store: Store;
    storeCategories: StoreCategory[];
    storeCategory: StoreCategory;
    catalogueSlug: string;

    cartId: string;
    currentScreenSize: string[] = [];
    collapseCategory: boolean = true;

    // product
    products$: Observable<Product[]>;
    products: Product[] = [];
    selectedProduct: Product | null = null;
    pagination: ProductPagination;
    productName: string = null;

    productViewOrientation: string = 'grid';
    oldPaginationIndex: number = 0;

    sortInputControl: FormControl = new FormControl();
    sortName: string = "name";
    sortOrder: 'asc' | 'desc' | '' = 'asc';
    searchInputControl: FormControl = new FormControl();
    searchName: string = "";

    isLoading: boolean = false;
    quantity: number = 0;
    pageOfItems: Array<any>;

    storeDetails: {
        image: string,
        domain: string
    }
    searchValue: string;

    notificationMessage: string;
    notificationMessageTitle: string = '';
    daysArray = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    storesOpening: { 
        storeId: string,
        isOpen : boolean,
        messageTitle : string,
        message: string
    }[] = [];


    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _platformService: PlatformService,
        private _storeService: StoreService,
        private _storesService: StoresService,
        private _productsService: ProductsService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _matIconRegistry: MatIconRegistry,
        private _domSanitizer: DomSanitizer,
        private _route: ActivatedRoute,
        private _searchService: SearchService,
        private _datePipe: DatePipe,
        private _scroller: ViewportScroller,

    )
    {
        this._matIconRegistry
        .addSvgIcon('search',this._domSanitizer.bypassSecurityTrustResourceUrl('assets/layouts/fnb/icons/search.svg'))
        .addSvgIcon('block-view',this._domSanitizer.bypassSecurityTrustResourceUrl('assets/layouts/fnb/icons/block-view.svg'))
        .addSvgIcon('list-view',this._domSanitizer.bypassSecurityTrustResourceUrl('assets/layouts/fnb/icons/list-view.svg'));
    }

    ngOnInit(): void {        

        // Set route to 'store' on init
        this._searchService.route = 'store'

        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                if (platform) {
                    this.platform = platform;
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

        this.storeDomain = this._route.snapshot.paramMap.get('store-slug');    
        
        this._storesService.store$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: Store) => {

                if (response) {

                    // set loading to true
                    this.isLoading = true;
                    this.store = response;

                    this._storesService.storeId = this.store.id;
    
                    let storeLogo = this.displayStoreLogo(this.store.storeAssets);
                    // To be sent to _search component
                    this.storeDetails = {
                        image : storeLogo,
                        domain: this.storeDomain
                    }
                    // Setter for store details for _search component
                    this._searchService.storeDetails = this.storeDetails;
                    
                    // check if store id exists
                    if (this.store.id && this.store.id !== null) {
    
                        // -----------------------
                        // Get Store Category
                        // -----------------------
    
                        this._storesService.storeCategories$
                            .pipe(takeUntil(this._unsubscribeAll))
                            .subscribe((storeCategories: StoreCategory[])=>{
                                if (storeCategories) {
                                    this.storeCategories = storeCategories
        
                                    // If keyword from search exist, set catalogueSlug to null so that checkbox won't be checked
                                    if (!this.catalogueSlug && this._activatedRoute.snapshot.queryParamMap.get('keyword')){
                                        this.catalogueSlug = null;
                                    }
                                    // Else, set the catalogueSlug
                                    else if (!this.catalogueSlug) {
                                        this.catalogueSlug = this._activatedRoute.snapshot.paramMap.get('catalogue-slug');
                                    }
                                    
                                    let index = this.storeCategories.findIndex(item => item.name.toLowerCase().replace(/ /g, '-').replace(/[-]+/g, '-').replace(/[^\w-]+/g, '') === this.catalogueSlug);
                                    this.storeCategory = (index > -1) ? this.storeCategories[index] : null;

                                    // move selected category to the front
                                    this.storeCategories = this.moveArray(this.storeCategories, index, 0)
                                }
                            
                                // get back the previous pagination page
                                // more than 2 means it won't get back the previous pagination page when navigate back from 'carts' page
                                if (this._storeService.getPreviousUrl() && this._storeService.getPreviousUrl().split("/").length > 4) {                            
                                    this.oldPaginationIndex = this.pagination ? this.pagination.page : 0;
                                }
    
                                // Get searches from url parameter 
                                this._activatedRoute.queryParams.subscribe(params => {
                                    this.searchValue = params['keyword'];
                                    // If keyword exist
                                    if (this.searchValue) {
                                        // Get searched product
                                        this._productsService.getProducts(0, 12, "name", "asc", this.searchValue, 'ACTIVE,OUTOFSTOCK', this.storeCategory ? this.storeCategory.id : '')
                                            .pipe(takeUntil(this._unsubscribeAll))
                                            .subscribe(()=>{
                                                // set loading to false
                                                this.isLoading = false;
            
                                                // Mark for check
                                                this._changeDetectorRef.markForCheck();
                                            });
    
                                    }
                                    // Else, get all products
                                    else {
                                        this._productsService.getProducts(this.oldPaginationIndex, 12, "name", "asc", "", 'ACTIVE,OUTOFSTOCK', this.storeCategory ? this.storeCategory.id : '')
                                            .pipe(takeUntil(this._unsubscribeAll))
                                            .subscribe(()=>{
                                                // set loading to false
                                                this.isLoading = false;
            
                                                // Mark for check
                                                this._changeDetectorRef.markForCheck();
                                            });
    
                                    }
                                });
    
                                // Mark for check
                                this._changeDetectorRef.markForCheck();
                            });
    
                        // check store timing                
                        this.storesOpening = [];
                            
                        this.checkStoreTiming(response);

                    } else {
                        // this._router.navigate(['']);
                        // alert("no store id");
                        console.error("No store found");
                    }
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();                            
            });

        // Get the products
        this.products$ = this._productsService.products$;        

        // Subscribe to search input field value changes
        this.searchInputControl.valueChanges
        .pipe(
            takeUntil(this._unsubscribeAll),
            debounceTime(300),
            switchMap((query) => {     
                
                this.searchName = query;
                
                // set loading to true
                this.isLoading = true;
                return this._productsService.getProducts(0, 12, this.sortName, this.sortOrder, this.searchName, "ACTIVE,OUTOFSTOCK" , this.storeCategory ? this.storeCategory.id : '');
            }),
            map(() => {
                // set loading to false
                this.isLoading = false;
            })
        )
        .subscribe();

        this.sortInputControl.valueChanges
            .pipe(
                takeUntil(this._unsubscribeAll),
                debounceTime(300),
                switchMap((query) => {

                    if (query === "recent") {
                        this.sortName = "created";
                        this.sortOrder = "desc";
                    } else if (query === "cheapest") {
                        this.sortName = "price";
                        this.sortOrder = "asc";
                    } else if (query === "expensive") {
                        this.sortName = "price";
                        this.sortOrder = "desc";
                    } else if (query === "a-z") {
                        this.sortName = "name";
                        this.sortOrder = "asc";
                    } else if (query === "z-a") {
                        this.sortName = "name";
                        this.sortOrder = "desc";
                    } else {
                        // default to recent (same as recent)
                        this.sortName = "created";
                        this.sortOrder = "desc";
                    }
                    
                    // set loading to true
                    this.isLoading = true;
                    return this._productsService.getProducts(0, 12, this.sortName, this.sortOrder, this.searchName, "ACTIVE,OUTOFSTOCK" , this.storeCategory ? this.storeCategory.id : '');
                }),
                map(() => {
                    // set loading to false
                    this.isLoading = false;
                })
            ).subscribe();

        // collapse category to false if desktop by default, 
        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {

                this.currentScreenSize = matchingAliases;

                // Set the drawerMode and drawerOpened
                if ( matchingAliases.includes('sm') )
                {
                    this.collapseCategory = false;
                }
                else
                {
                    this.collapseCategory = true;
                    this.productViewOrientation = 'list';
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

    reload(){
        this._router.routeReuseStrategy.shouldReuseRoute = () => false;
        this._router.onSameUrlNavigation = 'reload';
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

    onChangePage(pageOfItems: Array<any>) {
        
        // update current page of items
        this.pageOfItems = pageOfItems;
        
        if ( ( (this.pageOfItems['currentPage'] - 1) > -1 ) && (this.pageOfItems['currentPage'] - 1 !== this.pagination.page)) {
            // set loading to true
            this.isLoading = true;
            this._productsService.getProducts((this.pageOfItems['currentPage'] - 1) < 0 ? 0 : (this.pageOfItems['currentPage'] - 1), this.pageOfItems['pageSize'], this.sortName, this.sortOrder, this.searchName, "ACTIVE,OUTOFSTOCK" , this.storeCategory ? this.storeCategory.id : '')
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(()=>{
                    // set loading to false
                    this.isLoading = false;
                });
        }
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    displayStoreLogo(storeAssets: StoreAssets[]) {
        let storeAssetsIndex = storeAssets.findIndex(item => item.assetType === 'LogoUrl');
        if (storeAssetsIndex > -1) {
            return storeAssets[storeAssetsIndex].assetUrl;
        } else {
            return this.platform.logo;
        }
    }

    getCategorySlug(categoryName: string) {
        return categoryName.toLowerCase().replace(/ /g, '-').replace(/[-]+/g, '-').replace(/[^\w-]+/g, '');
    }

    changeCatalogue(value, event = null) {

        // find if categoty exists
        let index = this.storeCategories.findIndex(item => item.name.toLowerCase().replace(/ /g, '-').replace(/[-]+/g, '-').replace(/[^\w-]+/g, '') === value);
        // since all-product is not a real category, it will set to null
        this.storeCategory = (index > -1) ? this.storeCategories[index] : null;
        // catalogue slug will be use in url
        this.catalogueSlug = value;       
        
        this._router.navigate(['store/' + this.storeDomain + '/' + value]);

        this.reload();

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    viewProduct(product: Product) {
        let catalogue = this.catalogueSlug ? this.catalogueSlug : 'all-products'
        this._router.navigate(['store/' + this.storeDomain + '/' + catalogue + '/' + product.seoName]);
    }

    redirectToProduct(url: string) {
        this._document.location.href = url;
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

    scroll(id) {
        this._scroller.scrollToAnchor(id)
    }

    moveArray(arr, old_index, new_index) {
        if (new_index >= arr.length) {
            var k = new_index - arr.length + 1;
            while (k--) {
                arr.push(undefined);
            }
        }
        arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
        return arr; 
    };

}
