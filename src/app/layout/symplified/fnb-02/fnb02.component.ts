import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil, distinctUntilChanged } from 'rxjs';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { Navigation } from 'app/core/navigation/navigation.types';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { Platform } from 'app/core/platform/platform.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { fuseAnimations } from '@fuse/animations';
import { DOCUMENT, PlatformLocation } from '@angular/common';
import { FloatingBannerService } from 'app/core/floating-banner/floating-banner.service';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import { AppConfig } from 'app/config/service.config';
import { DisplayErrorService } from 'app/core/display-error/display-error.service';
import { SearchService } from 'app/layout/common/_search/search.service';

@Component({
    selector     : 'fnb02-layout',
    templateUrl  : './fnb02.component.html',
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations

})
export class Fnb2LayoutComponent implements OnInit, OnDestroy
{
    opened: boolean = false;
    platform: Platform;
    user: User;

    displayError: {
        type: string,
        title: string;
        message: string;
    } = null;
    
    isScreenSmall: boolean;
    navigation: Navigation;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    
    floatingMessageData = {};
    
    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _activatedRoute: ActivatedRoute,
        private _changeDetectorRef: ChangeDetectorRef,
        private _apiServer: AppConfig,
        private _router: Router,
        private _navigationService: NavigationService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService,
        private _platformsService: PlatformService,
        private _displayErrorService: DisplayErrorService,
        private _userService: UserService,
        private _platformLocation: PlatformLocation,
        private _floatingBannerService: FloatingBannerService,
        private _searchService: SearchService
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
        this._router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            distinctUntilChanged(),
            takeUntil(this._unsubscribeAll)
        ).subscribe((response: NavigationEnd) => {            

            let route = response.url.split('/');
            
            // If inside store page, set route to 'store'
            if (route[1] === 'store') {
                this._searchService.route = 'store';
            }
            // else set route and storeDetails to null
            else
            {
                this._searchService.route = null;
                this._searchService.storeDetails = null;
            }
        });

        // Subscribe to navigation data
        this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) => {
                this.navigation = navigation;
            });

        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {

                // Check if the screen is small
                this.isScreenSmall = !matchingAliases.includes('md');
            });

        // Subscribe to platform data
        this._platformsService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                if (platform) {
                    this.platform = platform;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Subscribe to the user service
        this._userService.user$
            .pipe((takeUntil(this._unsubscribeAll)))
            .subscribe((user: User) => {
                if(user) {
                    this.user = user;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Set promo banner
        if (!this.user) {
            let fullUrl = (this._platformLocation as any).location.origin;
            let sanatiseUrl = fullUrl.replace(/^(https?:|)\/\//, '').split(':')[0]; // this will get the domain from the URL
            let redirectUrl = 'https://' + this._apiServer.settings.marketplaceDomain + '/sign-up' +
                    '?redirectURL=' + encodeURI('https://' + sanatiseUrl  + this._router.url) 
                    // + '&guestCartId=' + this._cartService.cartId$ + '&storeId=' + this._storesService.storeId$;
            this._floatingBannerService.setSmallBanner('assets/gif/SignUp_Now_Button_Click_GIF.gif', redirectUrl)
            this._floatingBannerService.setBigBanner('assets/promo/Sign-Up-PopUp-Banner_400x500.png', redirectUrl)
        }

        // Subscribe to show error
        this._displayErrorService.errorMessage$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response) => {
                if (response) {
                    this.displayError = response;
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

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Open the search
     * Used in 'bar'
     */
    open(): void
    {
        // Return if it's already opened
        if ( this.opened )
        {
            return;
        }

        // Open the search
        this.opened = true;
    }

    close(): void
    {
        // Return if it's already closed
        if ( !this.opened )
        {
            return;
        }

        // Close the search
        this.opened = false;
    }

    /**
     * Toggle navigation
     *
     * @param name
     */
    toggleNavigation(name: string): void
    {
        // Get the navigation
        const navigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(name);

        if ( navigation )
        {
            // Toggle the opened status
            navigation.toggle();
        }
    }

    goToHome() {
        this._router.navigate(['/']);

        // Navigate to the internal redirect url (temporary)
        // const redirectURL = this.platform.name === "DeliverIn" ? "https://www.deliverin.my" : "https://www.easydukan.co";
        // this._document.location.href = redirectURL;
    }
    
}
