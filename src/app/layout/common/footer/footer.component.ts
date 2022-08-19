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

    marketplaceInfo: { phonenumber: string; email: string; address: string; reg: string };
    landingPage: boolean = true;
    paymentLogos: string[] = [];
    
    public version: string = environment.appVersion;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    providerLogos: string[] = [];

    categories: ParentCategory[] = [];

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
                    .subscribe((category : ParentCategory[]) => {
                    });
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

        this.marketplaceInfo = {
            email: "hello@deliverin.my",
            phonenumber: "+60125033299",
            address: "First Subang, Unit S-14-06, Level 14, Jalan SS15/4G, 47500 Subang Jaya, Selangor",
            reg: "Symple Business System Sdn Bhd (SSM Reg #: 1436952-D)"
        };

        this.paymentLogos = [
            this._apiServer.settings.apiServer.assetsService + '/store-assets/tng-ewallet.png',
            this._apiServer.settings.apiServer.assetsService + '/store-assets/grabpay.png',
            this._apiServer.settings.apiServer.assetsService + '/store-assets/fpx.png',
            this._apiServer.settings.apiServer.assetsService + '/store-assets/visa-mastercard.png',
            this._apiServer.settings.apiServer.assetsService + '/store-assets/boost.png'
        ]

        this.providerLogos = [
            this._apiServer.settings.apiServer.assetsService + '/delivery-assets/provider-logo/borzo.png',
            this._apiServer.settings.apiServer.assetsService +'/delivery-assets/provider-logo/jnt.png',
            this._apiServer.settings.apiServer.assetsService + '/delivery-assets/provider-logo/lalamove.png',
            this._apiServer.settings.apiServer.assetsService + '/delivery-assets/provider-logo/pickupp.png',
            // 'https://symplified.it/delivery-assets/provider-logo/tcs.png'
        ]
                
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
        const phonenumber = this.marketplaceInfo.phonenumber.replace(/[^0-9]/g, '');
        const message = encodeURI('Tell me more about joining Deliverin platform!')
        window.open("https://wa.me/" + phonenumber + '?text=' + message, "_blank");

        // this._document.location.href = "https://wa.me/" + phonenumber + '?text=' + message;
    }

    navigate(type: string) {
        this._router.navigate(['/docs/legal/' + type]);
    }

    goToFacebook() {
        window.open("https://www.facebook.com/DeliverIn.My/", "_blank");
        // this._document.location.href = "https://www.facebook.com/DeliverIn.My/"
    }

    
    scrollToTop(){
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'smooth' 
        });
    }

    // scrollToTop(el) {
    //     var to = 0;
    //     var duration = 1000;
    //     var start = el.scrollTop,
    //         change = to - start,
    //         currentTime = 0,
    //         increment = 20;
    
    //     var easeInOutQuad = function(t, b, c, d) {
    //         t /= d / 2;
    //         if (t < 1) 
    //             return c / 2 * t * t + b;
    //         t--;
    //         return -c / 2 * (t * (t - 2) - 1) + b;
    //     }
    
    //     var animateScroll = function() {        
    //         currentTime += increment;
    //         var val = easeInOutQuad(currentTime, start, change, duration);
    
    //         el.scrollTop = val;
    //         if(currentTime < duration) {
    //             setTimeout(animateScroll, increment);
    //             el.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'start' });
    //         }
    //     }
    //     animateScroll();    
    // }

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
