import { ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { LocationService } from 'app/core/location/location.service';
import { LandingLocation, LocationArea, StoresDetailPagination, StoresDetails } from 'app/core/location/location.types';
import { NavigateService } from 'app/core/navigate-url/navigate.service';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { StoresService } from 'app/core/store/store.service';
import { Store, StoreAssets, StorePagination } from 'app/core/store/store.types';
import { CurrentLocationService } from 'app/core/_current-location/current-location.service';
import { CurrentLocation } from 'app/core/_current-location/current-location.types';
import { Subject, takeUntil, map, merge, combineLatest } from 'rxjs';
import { switchMap, debounceTime } from 'rxjs/operators';

@Component({
    selector     : 'landing-stores',
    templateUrl  : './store-list.component.html',
    encapsulation: ViewEncapsulation.None
})
export class LandingStoresComponent implements OnInit
{
    @ViewChild("storesPaginator", {read: MatPaginator}) private _paginator: MatPaginator;
    
    platform: Platform;
    currentLocation: CurrentLocation;
    
    // Stores Details
    storesDetailsTitle: string = "Shops"
    storesDetails: StoresDetails[] = [];
    storesDetailsPagination: StorePagination;
    storesDetailsPageOfItems: Array<any>;
    storesDetailsPageSize: number = 30;
    oldStoresDetailsPaginationIndex: number = 0;
    
    categoryId: string;
    
    locationId: string;
    location: LandingLocation;
    adjacentLocationIds: string[] = [];
    
    currentScreenSize: string[] = [];
    isLoading: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _platformsService: PlatformService,
        private _currentLocationService: CurrentLocationService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _locationService: LocationService,
        private _activatedRoute: ActivatedRoute,
        private _navigate: NavigateService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {

        this._locationService.storesDetails$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((stores: StoresDetails[]) => { 
                this.storesDetails = stores;             
                this._changeDetectorRef.markForCheck();
            });

        // Get the store pagination
        this._locationService.storesDetailPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: StoresDetailPagination) => {
                // Update the pagination
                this.storesDetailsPagination = pagination;                   
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
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
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

                    // Get searches from url parameter 
                    this._activatedRoute.queryParams.subscribe(params => {
                        this.categoryId = params.categoryId ? params.categoryId : null;
                        this.locationId = params.locationId ? params.locationId : null;

                        // if there are value for categoryId OR locationId
                        // no need for lat long, since customer want to see stores that contain the query
                        if (this.categoryId || this.locationId) {
                            currentLat = null;
                            currentLong = null;
                        }

                        // get back the previous pagination page
                        // more than 2 means it won't get back the previous pagination page when navigate back from 'carts' page
                        if (this._navigate.getPreviousUrl() && this._navigate.getPreviousUrl().split("/").length > 2) {                            
                            this.oldStoresDetailsPaginationIndex = this.storesDetailsPagination ? this.storesDetailsPagination.page : 0;
                        }

                        // Get current location with locationId 
                        this._locationService.getFeaturedLocations({ pageSize: 1, regionCountryId: this.platform.country, cityId: this.locationId, sortByCol: 'sequence', sortingOrder: 'ASC' })
                            .subscribe((location : LandingLocation[]) => {});

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
                        
                                // Get stores
                                this._locationService.getStoresDetails({
                                    page            : this.oldStoresDetailsPaginationIndex,
                                    pageSize        : this.storesDetailsPageSize, 
                                    regionCountryId : this.platform.country, 
                                    parentCategoryId: this.categoryId, 
                                    cityId          : this.adjacentLocationIds,
                                    latitude        : currentLat,
                                    longitude       : currentLong
                                })
                                .subscribe((stores : StoresDetails[]) => {});
                            });
                    });
                }
                this._changeDetectorRef.markForCheck();
            });

        // collapse category to false if desktop by default, 
        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {
                this.currentScreenSize = matchingAliases;
                // Mark for check
                this._changeDetectorRef.markForCheck();
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

                // handle if user allow location
                let currentLat = this.currentLocation.isAllowed ? this.currentLocation.location.lat : null;
                let currentLong = this.currentLocation.isAllowed ? this.currentLocation.location.lng : null;

                // if there are value for categoryId OR locationId
                // no need for lat long, since customer want to see stores that contain the query
                if (this.categoryId || this.locationId) {
                    currentLat = null;
                    currentLong = null;
                }

                // Get products if sort or page changes
                merge(this._paginator.page).pipe(
                    switchMap(() => {
                        this.isLoading = true;
                        return this._locationService.getStoresDetails({
                            page            : this.storesDetailsPageOfItems['currentPage'] - 1, 
                            pageSize        : this.storesDetailsPageOfItems['pageSize'], 
                            regionCountryId : this.platform.country, 
                            parentCategoryId: this.categoryId, 
                            cityId          : this.adjacentLocationIds,
                            latitude        : currentLat,
                            longitude       : currentLong
                        });
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
    // @ Public Function
    // -----------------------------------------------------------------------------------------------------

    onChangePage(pageOfItems: Array<any>) {
        // update current page of items
        this.storesDetailsPageOfItems = pageOfItems;

        if(this.storesDetailsPagination && this.storesDetailsPageOfItems['currentPage']) {
            if (this.storesDetailsPageOfItems['currentPage'] - 1 !== this.storesDetailsPagination.page) {
                // set loading to true
                this.isLoading = true;

                // handle if user allow location
                let currentLat = this.currentLocation.isAllowed ? this.currentLocation.location.lat : null;
                let currentLong = this.currentLocation.isAllowed ? this.currentLocation.location.lng : null;

                // if there are value for categoryId OR locationId
                // no need for lat long, since customer want to see stores that contain the query
                if (this.categoryId || this.locationId) {
                    currentLat = null;
                    currentLong = null;
                }
    
                this._locationService.getStoresDetails({
                    page            : this.storesDetailsPageOfItems['currentPage'] - 1, 
                    pageSize        : this.storesDetailsPageOfItems['pageSize'], 
                    regionCountryId : this.platform.country, 
                    parentCategoryId: this.categoryId, 
                    cityId          : this.adjacentLocationIds,
                    latitude        : currentLat,
                    longitude       : currentLong
                })
                .subscribe(()=>{
                    // set loading to false
                    this.isLoading = false;
                });
            }
        }
        
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
    * 
    * This function will return display see more based on height of 
    * div container
    * 
    * @param storesDescription 
    * @returns 
    */
    displaySeeMore(storesDescription){

        var div = document.createElement("div")
        div.innerHTML = storesDescription
        div.style.width ="15rem";
        document.body.appendChild(div)

        if (div.offsetHeight > 20) {
            div.setAttribute("class","hidden")
            return true;
        } else {
            div.setAttribute("class","hidden")
            return false;
        }
    }

    scrollToTop(){        
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'smooth' 
        });
    }
}
