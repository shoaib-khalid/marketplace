import { ChangeDetectorRef, Component, Inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { LocationService } from 'app/core/location/location.service';
import { LandingLocation, LocationArea, ParentCategory, ProductDetails, StoreDetails, StoresDetails } from 'app/core/location/location.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { distinctUntilChanged, filter, map, merge, Subject, switchMap, takeUntil, combineLatest } from 'rxjs';
import { Location } from '@angular/common';
import { ProductPagination, StorePagination } from 'app/core/store/store.types';
import { MatPaginator } from '@angular/material/paginator';
import { CurrentLocationService } from 'app/core/_current-location/current-location.service';
import { CurrentLocation } from 'app/core/_current-location/current-location.types';
import { Title } from '@angular/platform-browser';

@Component({
    selector     : 'location',
    templateUrl  : './location.component.html',
    encapsulation: ViewEncapsulation.None
})
export class LocationComponent implements OnInit
{
    @ViewChild("storesPaginator", {read: MatPaginator}) private _storesPaginator: MatPaginator;
    @ViewChild("productsPaginator", {read: MatPaginator}) private _productsPaginator: MatPaginator;


    platform: Platform;
    currentLocation: CurrentLocation;
    
    categoryId: string;
    category: ParentCategory;
    categories: ParentCategory[] = [];
    
    locationId: string;
    location: LandingLocation;
    adjacentLocationIds: string[] = [];

    // Stores Details
    storesDetailsTitle: string = "Shops"
    storesDetails: StoresDetails[] = [];
    storesDetailsPagination: StorePagination;
    storesDetailsPageSize: number = 9;
    oldStoresDetailsPaginationIndex: number = 0;
    
    redirectUrl: { categoryId?: string, locationId?: string }
    storesViewAll: boolean = false;
    productsViewAll: boolean = false;
    categoriesViewAll: boolean = false;

    maxCategoriesDisplay: number = 50;
    
    isLoading: boolean = true;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _platformsService: PlatformService,
        private _route: ActivatedRoute,
        private _currentLocationService: CurrentLocationService,
        private _locationService: LocationService,
        private _location: Location,
        private _router: Router,
        private _titleService: Title
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {

        this.locationId = this._route.snapshot.paramMap.get('location-id');
        this.categoryId = this._route.snapshot.paramMap.get('category-id');

        this.redirectUrl = {
            locationId : this.locationId,
            categoryId : this.categoryId
        }

        // Get parent category by Id when change route - this is when we pick the category
        this._router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            distinctUntilChanged(),
            takeUntil(this._unsubscribeAll)
        ).subscribe((responseLocation: NavigationEnd) => {
            if (responseLocation) {
                this.categoryId = responseLocation.url.split("/")[3];

                // redirct for see more
                this.redirectUrl.categoryId = this.categoryId;

                // Reset current category
                this._locationService.parentCategory = null;

                // Get current category with parentCategoryId
                this._locationService.getParentCategories({ pageSize: 1, regionCountryId: this.platform.country, parentCategoryId: this.categoryId })
                    .subscribe((category : ParentCategory[]) => {});

                // Get adjacent city first
                this._locationService.getLocationArea(this.locationId)
                    .subscribe((response: LocationArea[]) => {
                        this.adjacentLocationIds = [];
                        this.adjacentLocationIds = response.map(item => {
                            return item.storeCityId;
                        });
                        this.adjacentLocationIds.unshift(this.locationId);

                        // Get stores details
                        this._locationService.getStoresDetails({
                            page            : this.oldStoresDetailsPaginationIndex,
                            pageSize        : this.storesDetailsPageSize,
                            sortByCol       : 'created', 
                            sortingOrder    : 'DESC', 
                            regionCountryId : this.platform.country,
                            cityId          : this.adjacentLocationIds, 
                            parentCategoryId: this.categoryId
                        })
                        .subscribe((storesDetails: StoresDetails[])=>{
                        });

                    });
            }
        });

        combineLatest([
            this._currentLocationService.currentLocation$,
            this._platformsService.platform$
        ]).pipe(takeUntil(this._unsubscribeAll))
        .subscribe(([currentLocation, platform] : [CurrentLocation, Platform])=>{
            if (currentLocation && platform) { 

                this.platform = platform;
                this.currentLocation = currentLocation;
                
                // Get current location with locationId 
                this._locationService.getFeaturedLocations({ pageSize: 1, regionCountryId: this.platform.country, cityId: this.locationId, sortByCol: 'sequence', sortingOrder: 'ASC' })
                    .subscribe((location : LandingLocation[]) => {});

                // Reset current category
                this._locationService.parentCategory = null;
                
                // Get current category with parentCategoryId
                this._locationService.getParentCategories({ pageSize: 1, regionCountryId: this.platform.country, parentCategoryId: this.categoryId })
                    .subscribe((category : ParentCategory[]) => {});

                // Get adjacent city first
                this._locationService.getLocationArea(this.locationId)
                    .subscribe((response: LocationArea[]) => {
                        this.adjacentLocationIds = [];
                        this.adjacentLocationIds = response.map(item => {
                            return item.storeCityId;
                        });

                        // put the original this.locationId in the adjacentLocationIds
                        this.adjacentLocationIds.unshift(this.locationId);

                        // Get categories
                        this._locationService.getParentCategories({ pageSize: this.maxCategoriesDisplay, regionCountryId: this.platform.country, cityId: this.adjacentLocationIds })
                            .subscribe((category : ParentCategory[]) => {});

                        // Get stores details
                        this._locationService.getStoresDetails({
                            page            : this.oldStoresDetailsPaginationIndex,
                            pageSize        : this.storesDetailsPageSize,
                            sortByCol       : 'created', 
                            sortingOrder    : 'DESC', 
                            regionCountryId : this.platform.country,
                            cityId          : this.adjacentLocationIds, 
                            parentCategoryId: this.categoryId
                        })
                        .subscribe((storesDetails: StoresDetails[])=>{
                        });

                    });
            }

            // Mark for check
            this._changeDetectorRef.markForCheck();
        });


        // Get Current parentCategory
        this._locationService.parentCategory$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(category => {
                if (category) {                    
                    this.category = category;

                    // set title
                    this._titleService.setTitle(this.platform.name + " | " + this.location.cityDetails.name + " - " + this.category.parentName );
                }                
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
            
        // Get all parentCategories
        this._locationService.parentCategories$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((categories: ParentCategory[]) => {
                if (categories) {
                    // to show only maxCategoriesDisplay
                    // this is to block more that maxCategoriesDisplay if coming from home category resolver 
                    this.categories = (categories.length >= this.maxCategoriesDisplay) ? categories.slice(0, this.maxCategoriesDisplay) : categories;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get parentCategories pagination
        this._locationService.parentCategoriesPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination) => { 
                if (pagination) {       
                    this.categoriesViewAll = (pagination.length > pagination.size) ? true : false;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get Current Location
        this._locationService.featuredLocation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((location: LandingLocation) => {
                if (location) {
                    this.location = location;
                    this.storesDetailsTitle = "Discover Shops Near " + location.cityDetails.name;

                    // set title
                    this._titleService.setTitle(this.platform.name + " | " + this.location.cityDetails.name);

                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get Stores
        this._locationService.storesDetails$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((stores: StoresDetails[]) => { 
                if (stores) {
                    this.storesDetails = stores;                     
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get Stores Pagination
        this._locationService.storesDetailPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination) => { 
                if (pagination) {               
                    this.storesDetailsPagination = pagination;     
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
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
    // @ Public Method
    // -----------------------------------------------------------------------------------------------------

    backClicked() {
        this._location.back();
    }
}
