import { ChangeDetectorRef, Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RoutesRecognized } from '@angular/router';
import { Platform, PlatformTag } from 'app/core/platform/platform.types';
import { Subject, takeUntil } from 'rxjs';
import { PlatformService } from 'app/core/platform/platform.service';
import { AnalyticService } from './core/analytic/analytic.service';
import { AppConfig } from './config/service.config';
// import { SwUpdate } from '@angular/service-worker';
import { UserService } from './core/user/user.service';
import { User, UserSession } from './core/user/user.types';
import { CustomerActivity } from './core/analytic/analytic.types';
import { CurrentLocationService } from './core/_current-location/current-location.service';
import { CurrentLocation } from './core/_current-location/current-location.types';
import { StoresService } from './core/store/store.service';
import { Store } from './core/store/store.types';
import { CartService } from './core/cart/cart.service';
import { CartItem } from './core/cart/cart.types';
import { App } from '@capacitor/app';
import { FuseConfirmationService } from '@fuse/services/confirmation';


declare let gtag: Function;

@Component({
    selector   : 'app-root',
    templateUrl: './app.component.html',
    styleUrls  : ['./app.component.scss']
})
export class AppComponent
{
    platform    : Platform;
    store       : Store;
    ipAddress   : string;
    user        : User;
    userSession : UserSession;
    customerActivity: CustomerActivity = {};
    cartIds     : string[];

    favIcon16: HTMLLinkElement = document.querySelector('#appIcon16');
    favIcon32: HTMLLinkElement = document.querySelector('#appIcon32');

    metaDescription: HTMLMetaElement = document.querySelector('meta[name="description"]');
    metaKeyword: HTMLMetaElement = document.querySelector('meta[name="keywords"]');
    h1Title: HTMLLinkElement = document.querySelector('#body-title');

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _titleService: Title,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _platformsService: PlatformService,
        private _storesService: StoresService,
        private _analyticService: AnalyticService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _currentLocationService: CurrentLocationService,
        private _apiServer: AppConfig,
        private _userService: UserService,
        private _cartsService: CartService,
        private _fuseConfirmationService: FuseConfirmationService
        // private _swUpdate: SwUpdate
    )
    {        
        // reload if there are any update for PWA
        // _swUpdate.available.subscribe(event => {
        //     _swUpdate.activateUpdate().then(()=>document.location.reload());
        // });
    }

    ngOnInit() {

        // Subscribe to platform data
        this._platformsService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                if (platform) {
                    this.platform = platform;
                    
                    let googleAnalyticId = null;

                    this._platformsService.getTag(platform.id)
                        .subscribe((tags: PlatformTag[]) => {
                            if (tags) {

                                let titleIndex = tags.findIndex(tag => tag.property === 'og:title');
                                let descIndex = tags.findIndex(tag => tag.property === 'og:description');
                                let keywordsIndex = tags.findIndex(tag => tag.name === 'keywords');

                                if (descIndex > -1) {
                                    this.metaDescription.content = tags[descIndex].content;
                                }
                                if (keywordsIndex > -1) {
                                    this.metaKeyword.content = tags[keywordsIndex].content;
                                }
                                if (titleIndex > -1) {
                                    // // set title
                                    // this._titleService.setTitle(tags[titleIndex].content);
                                    // set h1
                                    this.h1Title.innerText = tags[titleIndex].content;
                                }
                            }
                        });
     
                    // set GA code
                    googleAnalyticId = this.platform.gacode;

                    // set favicon
                    this.favIcon16.href = this.platform.favicon16 + '?original=true';
                    this.favIcon32.href = this.platform.favicon32 + '?original=true';

                    // Set Google Analytic Code
                    if (googleAnalyticId) {

                        // Remove this later
                        // load google tag manager script
                        // const script = document.createElement('script');
                        // script.type = 'text/javascript';
                        // script.async = true;
                        // script.src = 'https://www.google-analytics.com/analytics.js';
                        // document.head.appendChild(script);   
                        
                        // register google tag manager
                        const script2 = document.createElement('script');
                        script2.async = true;
                        script2.src = 'https://www.googletagmanager.com/gtag/js?id=' + googleAnalyticId;
                        document.head.appendChild(script2);

                        // load custom GA script
                        const gaScript = document.createElement('script');
                        gaScript.innerHTML = `
                        window.dataLayer = window.dataLayer || [];
                        function gtag() { dataLayer.push(arguments); }
                        gtag('js', new Date());
                        gtag('config', '${googleAnalyticId}');
                        `;
                        document.head.appendChild(gaScript);

                        // GA for all pages
                        this._router.events.subscribe(event => {
                            if(event instanceof NavigationEnd){
                                // register google analytics            
                                gtag('config', googleAnalyticId, {'page_path': event.urlAfterRedirects});
                                
                            }
                        });
                    }
                }
            });

        this._storesService.store$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((store: Store)=>{
                this.store = store;
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
            
        this._userService.userSession$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((userSession: UserSession)=>{
                if (userSession) {
                    this.userSession = userSession                    

                    // Set customer activity
                    this.customerActivity.browserType = this.userSession.browser;
                    this.customerActivity.deviceModel = this.userSession.device;
                    this.customerActivity.ip          = this.userSession.ip;
                    this.customerActivity.os          = this.userSession.os;
                    this.customerActivity.sessionId   = this.userSession.id;
                }
                // Mark for Check
                this._changeDetectorRef.markForCheck();
            });

        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User)=>{
                if (user) {
                    this.user = user;
                    this.customerActivity.customerId = user.id;
                }
                // Mark for Check
                this._changeDetectorRef.markForCheck();
            });

        // get cart ids to be send to customer activity
        this._cartsService.cartsHeaderWithDetails$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response)=>{
                if (response) {
                    this.cartIds = response.map(item => item.id);
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this._currentLocationService.currentLocation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: CurrentLocation)=>{
                if (response && response.isAllowed) {                    
                    this.customerActivity.latitude = response.location.lat + "";
                    this.customerActivity.longitude = response.location.lng + "";
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get searches from url parameter 
        this._activatedRoute.queryParams.subscribe(params => {
            let channel = null;
            if (params['gclid']) {
                channel = "Google";
            } 
            
            if (params['fbclid']) {
                channel = "Facebook";
            }

            if (params['origin'] === "payhub2u") {
                channel = "Payhub2U";
            }

            if (channel === null) {
                channel = this.customerActivity.channel;
            }
            
            this.customerActivity.channel = channel;
        });
        
        // check router 
        this._router.events.forEach((event) => {
            if(event instanceof RoutesRecognized) {
                // set store id
                if (this.store && this.store.id !== "") {
                    this.customerActivity.storeId = this.store.id;
                }

                // set page visited
                this.customerActivity.pageVisited = 'https://' + this._apiServer.settings.marketplaceDomain + event["urlAfterRedirects"];
                
                // set carts
                this.customerActivity.cart = this.cartIds;

                this._analyticService.customerActivity = this.customerActivity;
                this._analyticService.postActivity(this.customerActivity).subscribe(); 
                
                // back handler for android pwa app 
                // App.addListener('backButton', ({ canGoBack }) => {
                //     if(canGoBack && event.url !== '/'){
                //         window.history.back();
                //     } 
                //     else if (event.url === '/')
                //     {
                //         App.exitApp();
                //     }
                // });
                

            }
        });

        // back handler for android pwa app 
        App.addListener('backButton', ({ canGoBack }) => {
            if(canGoBack){
                window.history.back();
            } 
            else {
                App.exitApp();
            }
        });
        
    }
}
