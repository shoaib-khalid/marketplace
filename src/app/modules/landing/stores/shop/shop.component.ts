import { DatePipe, ViewportScroller } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { fuseAnimations } from '@fuse/animations';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { ProductsService } from 'app/core/product/product.service';
import { Product, ProductPagination } from 'app/core/product/product.types';
import { StoresService } from 'app/core/store/store.service';
import { Store, StoreCategory } from 'app/core/store/store.types';
import { Observable, Subject, takeUntil } from 'rxjs';



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
            
        `
    ],
    encapsulation: ViewEncapsulation.None,
    animations     : fuseAnimations,
})
export class LandingShopComponent implements OnInit
{
    platform: Platform;

    isLoading: boolean = false;
    isScreenSmall: boolean;
    currentScreenSize: string[] = [];

    store: Store
    storeCategories: StoreCategory[];
    storeCategory: StoreCategory;

    // product
    products$: Observable<Product[]>;
    products: Product[] = [];
    pagination: ProductPagination;

    pageOfItems: Array<any>;
    sortName: string = "name";
    sortOrder: 'asc' | 'desc' | '' = 'asc';
    searchName: string = "";

    productViewOrientation: string = 'grid';
    collapseCategory: boolean = true;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _matIconRegistry: MatIconRegistry,
        private _domSanitizer: DomSanitizer,
        private _scroller: ViewportScroller,
        private _storesService: StoresService,
        private _productsService: ProductsService,
        private _platformService: PlatformService
    )
    {
        this._matIconRegistry
        .addSvgIcon('search',this._domSanitizer.bypassSecurityTrustResourceUrl('assets/layouts/fnb/icons/search.svg'))
        .addSvgIcon('block-view',this._domSanitizer.bypassSecurityTrustResourceUrl('assets/layouts/fnb/icons/block-view.svg'))
        .addSvgIcon('list-view',this._domSanitizer.bypassSecurityTrustResourceUrl('assets/layouts/fnb/icons/list-view.svg'));
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

        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                if (platform) {
                    this.platform = platform;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this._storesService.store$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((store: Store) => {
                if(store){
                    this.store = store;

                    console.log("this.store", this.store);
                    
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this._storesService.storeCategories$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((storeCategories: StoreCategory[]) => {
                if(storeCategories){
                    this.storeCategories = storeCategories;

                    console.log("this.storeCategories", this.storeCategories);
                    
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get the products
        this.products$ = this._productsService.products$;  

        // Get the products pagination
        this._productsService.pagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: ProductPagination) => {
                
                // Update the pagination
                this.pagination = pagination;                

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
        
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
            this._productsService.getProducts((this.pageOfItems['currentPage'] - 1) < 0 ? 0 : (this.pageOfItems['currentPage'] - 1), this.pageOfItems['pageSize'], this.sortName, this.sortOrder, this.searchName, "ACTIVE,OUTOFSTOCK" , this.storeCategory ? this.storeCategory.id : '')
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((response)=>{

                    console.log("response", response);
                    
                    // set loading to false
                    this.isLoading = false;
                });
        }
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    onTabChanged(index) {

        this.pageOfItems['currentPage'] = 1;
        
        let storeCategoryIndex = index - 1;

        this.storeCategory = this.storeCategories[storeCategoryIndex];

        // set loading to true
        this.isLoading = true;
        this._productsService.getProducts((this.pageOfItems['currentPage'] - 1) < 0 ? 0 : (this.pageOfItems['currentPage'] - 1), this.pageOfItems['pageSize'], this.sortName, this.sortOrder, this.searchName, "ACTIVE,OUTOFSTOCK" , this.storeCategory ? this.storeCategory.id : '')
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(()=>{
                // set loading to false
                this.isLoading = false;
            });

        
    }

}