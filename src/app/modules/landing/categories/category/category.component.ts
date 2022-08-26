import { ChangeDetectorRef, Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { LocationService } from 'app/core/location/location.service';
import { LandingLocation, LocationArea, LocationPagination, ParentCategory, ProductDetails, StoresDetails } from 'app/core/location/location.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { combineLatest, distinctUntilChanged, filter, Subject, takeUntil } from 'rxjs';
import { Location } from '@angular/common';
import { ProductPagination, StorePagination } from 'app/core/store/store.types';
import { CurrentLocationService } from 'app/core/_current-location/current-location.service';
import { CurrentLocation } from 'app/core/_current-location/current-location.types';
import { Title } from '@angular/platform-browser';

@Component({
    selector     : 'category',
    templateUrl  : './category.component.html',
    encapsulation: ViewEncapsulation.None
})
export class CategoryComponent implements OnInit
{
    platform: Platform;

    categoryId: string;
    category: ParentCategory;

    // Locations
    locationId: string;
    adjacentLocationIds: string[] = [];
    location: LandingLocation;
    locations: LandingLocation[] = [];
    featuredLocationPagination: LocationPagination;

    // Stores Details
    storesDetailsTitle: string = "Shops"
    storesDetails: StoresDetails[] = [];
    storesDetailsPagination: StorePagination;
    storesDetailsPageSize: number = 9;
    oldStoresDetailsPaginationIndex: number = 0;

    maxStoresDisplay: number = 5;
    maxProductsDisplay: number = 30;
    maxLocationsDisplay: number = 50;
    
    redirectUrl: { categoryId?: string, locationId?: string }
    locationsViewAll: boolean = false;

    currentLocation: CurrentLocation;

    isLoading: boolean = true;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    
    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _platformsService: PlatformService,
        private _route: ActivatedRoute,
        private _locationService: LocationService,
        private _currentLocationService: CurrentLocationService,
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
        
        // Get location when change route - this is when we pick one location
        this._router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            distinctUntilChanged(),
            takeUntil(this._unsubscribeAll)
        ).subscribe((responseCategory: NavigationEnd) => {
            if (responseCategory) {
                this.locationId = responseCategory.url.split("/")[3];

                // redirct for see more
                this.redirectUrl.locationId = this.locationId;

                // Get current category with categoryId
                this._locationService.getParentCategories({pageSize: 1, regionCountryId: this.platform.country, parentCategoryId: this.categoryId })
                    .subscribe((category : ParentCategory[]) => {
                    });

                // Set current location to null since we don't have locationId
                this._locationService.featuredLocation = null;    

                // Get current location with locationId
                this._locationService.getFeaturedLocations({pageSize: 1, regionCountryId: this.platform.country, cityId: this.locationId, sortByCol: 'sequence', sortingOrder: 'ASC' })
                    .subscribe((location : LandingLocation[]) => {
                    });

                // Get adjacent city first
                this._locationService.getLocationArea(this.locationId)
                    .subscribe((response: LocationArea[]) => {
                        this.adjacentLocationIds = [];
                        this.adjacentLocationIds = response.map(item => {
                            return item.storeCityId;
                        });

                        // put the original this.locationId in the adjacentLocationIds
                        if (this.adjacentLocationIds.length > 0) {
                            this.adjacentLocationIds.unshift(this.locationId);
                        }
                        
                        // if locationId exists
                        if (this.adjacentLocationIds.length < 1 && this.locationId) {
                            this.adjacentLocationIds = [this.locationId];
                        }

                        this._locationService.getFeaturedLocations({
                            pageSize        : this.maxLocationsDisplay, 
                            regionCountryId : this.platform.country, 
                            sortByCol       : 'sequence', 
                            sortingOrder    : 'ASC' 
                        })
                        .subscribe((locations : LandingLocation[]) => {});

                        this._locationService.storesDetails = null;

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

                // Set title if location is on
                if (currentLocation.isAllowed) {
                    this.storesDetailsTitle = 'Discover Shops Near Me';
                }

                let currentLat = currentLocation.isAllowed ? currentLocation.location.lat : null;
                let currentLong = currentLocation.isAllowed ? currentLocation.location.lng : null;

                // Get current category with categoryId
                this._locationService.getParentCategories({
                    page            : 0,
                    pageSize        : 1,
                    regionCountryId : this.platform.country, 
                    parentCategoryId: this.categoryId,
                })
                .subscribe((category : ParentCategory[]) => {
                });

                // Set current location to null since we don't have locationId
                this._locationService.featuredLocation = null;    

                
                // Get current location with locationId
                this._locationService.getFeaturedLocations({
                    page            : 0, 
                    pageSize        : 1, 
                    regionCountryId : this.platform.country, 
                    cityId          : this.locationId, 
                    sortByCol       : 'sequence', 
                    sortingOrder    : 'ASC' 
                })
                .subscribe((location : LandingLocation[]) => {
                });                

                // Get adjacent city first
                this._locationService.getLocationArea(this.locationId)
                    .subscribe((response: LocationArea[]) => {                        

                        this.adjacentLocationIds = [];
                        this.adjacentLocationIds = response.map(item => {
                            return item.storeCityId;
                        });

                        // put the original this.locationId in the adjacentLocationIds
                        if (this.adjacentLocationIds.length > 0) {
                            this.adjacentLocationIds.unshift(this.locationId);
                        }
                        
                        // if locationId exists
                        if (this.adjacentLocationIds.length < 1 && this.locationId) {
                            this.adjacentLocationIds = [this.locationId];
                        }

                        // at this point this.adjacentLocationIds should have at least one locationId
                        // unless it's at main /category/<category-id> page
                        if (this.adjacentLocationIds.length > 0) {
                            currentLat = null;
                            currentLong = null;
                        }
                            
                        this._locationService.getFeaturedLocations({
                            page            : 0,
                            pageSize        : this.maxLocationsDisplay, 
                            regionCountryId : this.platform.country, 
                            sortByCol       : 'sequence', 
                            sortingOrder    : 'ASC' 
                        })
                        .subscribe((locations : LandingLocation[]) => {
                        });
                        
                        this._locationService.productsDetails = null;
                        this._locationService.storesDetails = null;

                        // Get stores details
                        this._locationService.getStoresDetails({
                            page            : this.oldStoresDetailsPaginationIndex,
                            pageSize        : this.storesDetailsPageSize,
                            sortByCol       : 'created', 
                            sortingOrder    : 'DESC', 
                            regionCountryId : this.platform.country,
                            cityId          : this.adjacentLocationIds,
                            parentCategoryId: this.categoryId,
                            latitude        : currentLat,
                            longitude       : currentLong
                        })
                        .subscribe((storesDetails: StoresDetails[])=>{
                        });
                    });
            }   
            // Mark for check
            this._changeDetectorRef.markForCheck();
        });
            
        // Get current category
        this._locationService.parentCategory$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((category) => {
                if (category) {                    
                    this.category = category;

                    // set title
                    this._titleService.setTitle(this.platform.name + " | " + this.category.parentName);
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get current selected location
        this._locationService.featuredLocation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(location => {
                if (location) {
                    this.location = location;
                    this.storesDetailsTitle = "Discover Shops Near " + location.cityDetails.name;   
                    
                    // set title
                    this._titleService.setTitle(this.platform.name + " | " + this.category.parentName + " @ " + this.location.cityDetails.name);

                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get all locations
        this._locationService.featuredLocations$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((locations : LandingLocation[]) => {
                if (locations) {
                    this.locations = locations;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get all locations pagination
        this._locationService.featuredLocationPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination) => {
                if (pagination) {
                    this.featuredLocationPagination = pagination;
                    this.locationsViewAll = (pagination.length > pagination.size) ? true : false;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get Stores
        this._locationService.storesDetails$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((stores: StoresDetails[]) => { 
                this.storesDetails = stores;
                this.isLoading = false;
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get Featured Stores pagination
        this._locationService.storesDetailPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: StorePagination) => { 
                this.storesDetailsPagination =  pagination;
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
    // @ Public Method
    // -----------------------------------------------------------------------------------------------------

    backClicked() {
        this._location.back();
    }
}
