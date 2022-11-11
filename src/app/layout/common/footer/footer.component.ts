import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { environment } from 'environments/environment';
import { distinctUntilChanged, filter, Subject, takeUntil } from 'rxjs';
import { StoresService } from 'app/core/store/store.service';
import { Store } from 'app/core/store/store.types';
import { NavigationEnd, Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { ParentCategory } from 'app/core/location/location.types';
import { LocationService } from 'app/core/location/location.service';
import { fuseAnimations } from '@fuse/animations';
import { AppConfig } from 'app/config/service.config';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';

@Component({
    selector       : 'footer',
    templateUrl    : './footer.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs       : 'footer',
    animations   : fuseAnimations
})
export class FooterComponent implements OnInit
{
    footerDetails: { about: boolean, categories: boolean } = { about: false, categories: false };

    platform: Platform;
    store: Store;

    @Input() footerType: string = "footer-01";

    marketplaceInfo: 
    { 
        phonenumber : string, 
        email       : string,
        address     : string,
        reg         :string 
    } = {
        phonenumber : null,
        email       : null, 
        address     : null, 
        reg         : null 
    };
    landingPage: boolean = true;
    paymentLogos: string[] = [];
    
    public version: string = environment.appVersion;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    providerLogos: string[] = [];

    categories: ParentCategory[] = [];
    isScreenSmall: boolean = false;

    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _platformService: PlatformService,
        private _storesService: StoresService,
        private _router: Router,
        private _changeDetectorRef: ChangeDetectorRef,
        private _locationService: LocationService,
        private _apiServer: AppConfig,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for current year
     */
    get currentYear(): number
    {
        return new Date().getFullYear();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                if (platform) {
                    this.platform = platform;
                    
                    // Get categories
                    this._locationService.getParentCategories({ pageSize: 50, regionCountryId: this.platform.country })
                    .subscribe();

                    this.marketplaceInfo = {
                        email: this.platform.platformDetails.email,
                        phonenumber: this.platform.platformDetails.phoneNumber,
                        address: this.platform.platformDetails.address,
                        reg: this.platform.platformDetails.businessReg
                    };

                    this.paymentLogos = this.platform.paymentProviders.map(x => x.providerImage);
            
                    this.providerLogos = this.platform.deliveryProviders.map(x => x.providerImage);

                    // this.paymentLogos = [
                    //     this._apiServer.settings.apiServer.assetsService + '/store-assets/tng-ewallet.png',
                    //     this._apiServer.settings.apiServer.assetsService + '/store-assets/grabpay.png',
                    //     this._apiServer.settings.apiServer.assetsService + '/store-assets/fpx.png',
                    //     this._apiServer.settings.apiServer.assetsService + '/store-assets/visa-mastercard.png',
                    //     this._apiServer.settings.apiServer.assetsService + '/store-assets/boost.png'
                    // ]
            
                    // this.providerLogos = [
                    //     this._apiServer.settings.apiServer.assetsService + '/delivery-assets/provider-logo/borzo.png',
                    //     this._apiServer.settings.apiServer.assetsService +'/delivery-assets/provider-logo/jnt.png',
                    //     this._apiServer.settings.apiServer.assetsService + '/delivery-assets/provider-logo/lalamove.png',
                    //     this._apiServer.settings.apiServer.assetsService + '/delivery-assets/provider-logo/pickupp.png',
                    //     // 'https://symplified.it/delivery-assets/provider-logo/tcs.png'
                    // ]
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
                
        if ( this._router.url === '/' ) {
            this.landingPage = true;
        }
        else this.landingPage = false;
        

        this._router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            distinctUntilChanged(),
        ).subscribe((response: NavigationEnd) => {
            
            if (!response.url.includes("/store/")) {
                this.store = null;
            }

            if (response.url === '/') {
                this.landingPage = true;
                
            } else this.landingPage = false;

            // Mark for check
            this._changeDetectorRef.markForCheck();
        });

        this._storesService.store$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: Store) => {

                this.store = response;

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {

                // Check if the screen is small
                this.isScreenSmall = !matchingAliases.includes('md');

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
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    goToUrl(){
        window.open(this.platform.platformDetails.whatsappUrl, "_blank");
    }

    navigate(type: string) {
        this._router.navigate(['/about/legal/' + type]);
    }

    goToFacebook() {
        window.open(this.platform.platformDetails.fbUrl, "_blank");
        this.platform
    }

    
    scrollToTop(){
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'smooth' 
        });
    }

    chooseCategory(parentCategoryId: string) {
        this._router.navigate(['/category/' + parentCategoryId]);
        this.reload();
    }

    reload(){
        this._router.routeReuseStrategy.shouldReuseRoute = () => false;
        this._router.onSameUrlNavigation = 'reload';
    }
    
    /**
     * Open the search
     * Used in 'bar'
     */
    open(type: string): void
    {
        // Return if it's already opened
        if (this.footerDetails[type])
        {
            return;
        }        

        // Open the search
        this.footerDetails[type] = true;
    }

    /**
     * Close the search
     * * Used in 'bar'
     */
    close(type: string): void
    {
        // Return if it's already closed
        if ( !this.footerDetails[type] )
        {
            return;
        }
        
        // Close the search
        this.footerDetails[type] = false;
    }
    
}
