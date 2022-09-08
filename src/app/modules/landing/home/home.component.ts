import { ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { LocationService } from 'app/core/location/location.service';
import { ParentCategory, LandingLocation, StoresDetails, ProductDetails } from 'app/core/location/location.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform, PlatformTag } from 'app/core/platform/platform.types';
import { StorePagination } from 'app/core/store/store.types';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { AdsService } from 'app/core/ads/ads.service';
import { Ad } from 'app/core/ads/ads.types';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { NavigateService } from 'app/core/navigate-url/navigate.service';
import { CurrentLocationService } from 'app/core/_current-location/current-location.service';
import { CurrentLocation } from 'app/core/_current-location/current-location.types';
import { BottomPopUpService } from 'app/layout/common/_bottom-popup/bottom-popup.service';
import { Title } from '@angular/platform-browser';

@Component({
    selector     : 'landing-home',
    templateUrl  : './home.component.html',
    encapsulation: ViewEncapsulation.None
})
export class LandingHomeComponent implements OnInit
{
    @ViewChild("storesDetailsPaginator", {read: MatPaginator}) private _storesDetailsPaginator: MatPaginator;
    @ViewChild('openDetails', { read: TemplateRef }) _openDetails:TemplateRef<any>;


    platform: Platform;

    locations: LandingLocation[] = [];
    locationsViewAll : boolean = false;

    categories: ParentCategory[] = [];
    categoriesViewAll: boolean = false;

    // store details
    storesDetailsTitle: string = "Shops";
    storesDetails: StoresDetails[] = [];
    storesDetailsPagination: StorePagination;
    storesDetailsPageOfItems: Array<any>;
    storesDetailsPageSize: number = 9;
    oldStoresDetailsPaginationIndex: number = 0;

    isLoading: boolean = false;
    currentScreenSize: string[] = [];
    ads: Ad[] = [];

    currentLocation: CurrentLocation;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _platformsService: PlatformService,
        private _locationService: LocationService,
        private _adsService: AdsService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _currentLocationService: CurrentLocationService,
        private _navigate: NavigateService,
        private _bottomPopUpService: BottomPopUpService,
        private _titleService: Title
    )
    {
    }

    ngOnInit(): void {

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

                // get back the previous pagination page
                // more than 2 means it won't get back the previous pagination page when navigate back from 'carts' page
                if (this._navigate.getPreviousUrl() && this._navigate.getPreviousUrl().split("/").length > 2) {              
                    this.oldStoresDetailsPaginationIndex = this.storesDetailsPagination ? this.storesDetailsPagination.page : 0;
                }

                // Get categories
                this._locationService.getParentCategories({ pageSize: 50, regionCountryId: this.platform.country })
                    .subscribe((category : ParentCategory[]) => {
                    });

                // Get locations
                this._locationService.getFeaturedLocations({ pageSize: 50, sortByCol: 'sequence', sortingOrder: 'ASC', regionCountryId: this.platform.country })
                    .subscribe((location : LandingLocation[]) => {
                    });

                this._locationService.storesDetails = null;

                // Get stores details
                this._locationService.getStoresDetails({
                    page            : this.oldStoresDetailsPaginationIndex,
                    pageSize        : this.storesDetailsPageSize,
                    sortByCol       : 'created', 
                    sortingOrder    : 'DESC', 
                    regionCountryId : this.platform.country,
                    latitude        : currentLat,
                    longitude       : currentLong,
                    isMainLevel     : true
                })
                .subscribe((storesDetails: StoresDetails[])=>{
                });

                this._platformsService.getTag(platform.id)
                    .subscribe((tags: PlatformTag[]) => {
                        if (tags) {

                            let titleIndex = tags.findIndex(tag => tag.property === 'og:title');
                            if (titleIndex > -1) {
                                // set title
                                this._titleService.setTitle(tags[titleIndex].content);
                            }
                        }
                    });

            }

            // Mark for check
            this._changeDetectorRef.markForCheck();
        })

        // Get all locations
        this._locationService.featuredLocations$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((locations) => {
                if (locations) {
                    this.locations = locations;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get all locations
        this._locationService.featuredLocationPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination) => {
                if (pagination) {
                    this.locationsViewAll = (pagination.length > pagination.size) ? true : false;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get all parentCategories
        this._locationService.parentCategories$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((categories: ParentCategory[]) => {
                if (categories) {
                    // to show only 8
                    // this.categories = (categories.length >= 8) ? categories.slice(0, 8) : categories;
                    // if (categories.length >= 8) this.categoriesViewAll = true;
                    this.categories = categories;

                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get featured stores
        this._locationService.storesDetails$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((stores) => {
                this.storesDetails = stores;
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get featured stores pagination
        this._locationService.storesDetailPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((storesPagination) => {
                this.storesDetailsPagination = storesPagination;
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get banners
        this._adsService.ads$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((ads: Ad[]) => {
                if (ads) {
                    // to show only 8
                    this.ads = ads;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

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
    }
    
}
