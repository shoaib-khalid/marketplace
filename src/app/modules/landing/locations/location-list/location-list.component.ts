import { ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { AdsService } from 'app/core/ads/ads.service';
import { Ad } from 'app/core/ads/ads.types';
import { LocationService } from 'app/core/location/location.service';
import { LandingLocation, LocationPagination } from 'app/core/location/location.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { StoresService } from 'app/core/store/store.service';
import { map, merge, Subject, switchMap, takeUntil } from 'rxjs';

@Component({
    selector     : 'landing-locations',
    templateUrl  : './location-list.component.html',
    encapsulation: ViewEncapsulation.None
})
export class LandingLocationsComponent implements OnInit
{
    @ViewChild(MatPaginator) private _paginator: MatPaginator;
    
    platform: Platform;

    locations: LandingLocation[] = [];
    pagination: LocationPagination;
    pageOfItems: Array<any>;
    isLoading: boolean = false;

    currentScreenSize: string[] = [];
    categoryId: string;
    adjacentLocationIds: string[] = [];
    ads: Ad[] = [];

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
        private _activatedRoute: ActivatedRoute,
        private _titleService: Title
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {

        // Get searches from url parameter 
        this._activatedRoute.queryParams.subscribe(params => {
            this.categoryId = params.categoryId ? params.categoryId : null;
        });


        this._platformsService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => { 
                if (platform) {
                    this.platform = platform;
                    
                    // This is when user directly open /location/location-list
                    if (this.locations.length < 1){
                        // Get all the available location
                        this._locationService.getFeaturedLocations({pageSize: 50, regionCountryId: this.platform.country, sortByCol: 'sequence', sortingOrder: 'ASC'})
                            .subscribe((location : LandingLocation[]) => {                        
                            });
                    }

                    // set title
                    this._titleService.setTitle(this.platform.name + " | " + "Location List");
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this._locationService.featuredLocations$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((locations: LandingLocation[]) => {
                if (locations) {
                    this.locations = locations; 
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();           
            });

        this._locationService.featuredLocationPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: LocationPagination) => {
                if (response) {
                    this.pagination = response; 
                }
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
                        return this._locationService.getFeaturedLocations({pageSize:20 , sortByCol: 'sequence', sortingOrder: 'ASC', regionCountryId: "MYS"});
                    }),
                    map(() => {
                        this.isLoading = false;
                    })
                ).subscribe();
            }
        }, 0);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public Method
    // -----------------------------------------------------------------------------------------------------

    onChangePage(pageOfItems: Array<any>) {
        // update current page of items
        this.pageOfItems = pageOfItems;
        
        if(this.pagination && this.pageOfItems['currentPage']) {
            if (this.pageOfItems['currentPage'] - 1 !== this.pagination.page) {
                // set loading to true
                this.isLoading = true;
                this._locationService.getFeaturedLocations({ page: this.pageOfItems['currentPage'] - 1, pageSize: this.pageOfItems['pageSize'], sortByCol: 'sequence', sortingOrder: 'ASC'})
                    .subscribe(()=>{
                        // set loading to false
                        this.isLoading = false;
                    });
            }
        }
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    scrollToTop(){        
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'smooth' 
     });
    }
}
