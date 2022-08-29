import { ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { AdsService } from 'app/core/ads/ads.service';
import { Ad } from 'app/core/ads/ads.types';
import { LocationService } from 'app/core/location/location.service';
import { CategoryPagination, LocationArea, ParentCategory } from 'app/core/location/location.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector     : 'landing-categories',
    templateUrl  : './category-list.component.html',
    encapsulation: ViewEncapsulation.None
})
export class LandingCategoriesComponent implements OnInit
{
    @ViewChild(MatPaginator) private _paginator: MatPaginator;
    
    platform: Platform;
    
    categories: ParentCategory[] = [];
    pagination: CategoryPagination;
    isLoading: boolean = false;
    pageOfItems: Array<any>;

    currentScreenSize: string[] = [];
    locationId: string;
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
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _titleService: Title
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    ngOnInit(): void {

        // Get Platform Data
        this._platformsService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => { 
                if (platform) {
                    this.platform = platform;  
        
                    // Get searches from url parameter 
                    this._activatedRoute.queryParams.subscribe(params => {
                        this.locationId = params.locationId ? params.locationId : null;

                        // Get adjacent city first
                        this._locationService.getLocationArea(this.locationId)
                            .subscribe((response: LocationArea[]) => {
                                this.adjacentLocationIds = [];
                                this.adjacentLocationIds = response.map(item => {
                                    return item.storeCityId;
                                });

                                // put the original this.locationId in the adjacentLocationIds
                                this.adjacentLocationIds.unshift(this.locationId);
    
                                // Get featured stores
                                this._locationService.getParentCategories({pageSize: 10, regionCountryId: this.platform.country, cityId: this.adjacentLocationIds })
                                    .subscribe((category : ParentCategory[]) => {});
                            });
                    });

                    // set title
                    this._titleService.setTitle(this.platform.name + " | " + "Category List");
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get parent categories
        this._locationService.parentCategories$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((categories: ParentCategory[]) => {
                if (categories) {
                    this.categories = categories;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
        
        // Get parent categories pagination
        this._locationService.parentCategoriesPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: CategoryPagination) => {
                if (pagination) {
                    this.pagination = pagination;
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

    // -----------------------------------------------------------------------------------------------------
    // @ Public Method
    // -----------------------------------------------------------------------------------------------------
    
    chooseCategory(categoryId: string, locationId?: string) {
        if (locationId) {
            this._router.navigate(['/location/' + locationId + '/' + categoryId]);
        } else {
            this._router.navigate(['/category/' + categoryId]);
        }
    }

    onChangePage(pageOfItems: Array<any>) {
        // update current page of items
        this.pageOfItems = pageOfItems;

        if(this.pagination && this.pageOfItems['currentPage']){
            if (this.pageOfItems['currentPage'] - 1 !== this.pagination.page) {
                // set loading to true
                this.isLoading = true;
                this._locationService.getParentCategories({ page: this.pageOfItems['currentPage'] - 1, pageSize: this.pageOfItems['pageSize'], regionCountryId: this.platform.country, cityId: this.locationId})
                    .subscribe((response)=>{
                        // set loading to false
                        this.isLoading = false;
                    });
            }
        }
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }
}
