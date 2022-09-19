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
    animations   : fuseAnimations,

})
export class Fnb2LayoutComponent implements OnInit, OnDestroy
{
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

    isHidden: boolean = false;
    isStorePage: boolean = false;
    isSearchOpened: boolean = false;
    floatingCartHidden: boolean = false;

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
        // set route and storeDetails to null first
        this._searchService.route = '';
        this._searchService.storeDetails = null;
        
        if (this._router.url.split('/').length > 1 && this._router.url.split('/')[1] === 'store'){
            this.isStorePage = true;
        }
        
        if (this._router.url && this._router.url === '/') {
            this.isSearchOpened = true;
        } 

        if ((this._router.url.split('/').length > 1 && this._router.url.split('/')[1] === 'carts') || (this._router.url === '/')){
            this.floatingCartHidden = true;
        }

        this._router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            distinctUntilChanged(),
            takeUntil(this._unsubscribeAll)
        ).subscribe((response: NavigationEnd) => {            

            let route = response.url.split('/');
            
            // If inside store page, set route to 'store'
            if (response.url === '/') {
                this.isSearchOpened = true;
            } else {
                this.isSearchOpened = false;
            }

            if (route[1] === 'store') {
                this._searchService.route = 'store';
                this.isStorePage = true;
            } else {
                // else set route and storeDetails to null
                this._searchService.route = '';
                this._searchService.storeDetails = null;
                this.isStorePage = false;
            }

            if (route[1] === 'carts' || response.url === '/') {
                this.floatingCartHidden = true;
            } else {
                this.floatingCartHidden = false;
            }
            
            // Mark for check
            this._changeDetectorRef.markForCheck();
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
    toggleSearch(): void
    {
        this.isSearchOpened = !this.isSearchOpened;
    }

    closeSearch(): void
    {
        // Return if it's already closed
        if ( !this.isSearchOpened )
        {
            return;
        }

        // Close the search
        this.isSearchOpened = false;
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
