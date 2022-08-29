import { ChangeDetectorRef, Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RoutesRecognized } from '@angular/router';
import { Platform, PlatformTag } from 'app/core/platform/platform.types';
import { Subject, takeUntil } from 'rxjs';
import { PlatformService } from 'app/core/platform/platform.service';
import { IpAddressService } from './core/ip-address/ip-address.service';
import { AnalyticService } from './core/analytic/analytic.service';
import { JwtService } from './core/jwt/jwt.service';
import { AuthService } from './core/auth/auth.service';
import { AppConfig } from './config/service.config';
import { SwUpdate } from '@angular/service-worker';
import { UserService } from './core/user/user.service';
import { UserSession } from './core/user/user.types';
import { CustomerActivity } from './core/analytic/analytic.types';
import { CurrentLocationService } from './core/_current-location/current-location.service';
import { CurrentLocation } from './core/_current-location/current-location.types';
import { StoresService } from './core/store/store.service';

declare let gtag: Function;

@Component({
    selector   : 'app-root',
    templateUrl: './app.component.html',
    styleUrls  : ['./app.component.scss']
})
export class AppComponent
{
    platform: Platform;
    ipAddress  : string;
    userSession : UserSession;
    customerActivity: CustomerActivity = {};

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
        private _storeService: StoresService,
        private _analyticService: AnalyticService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _currentLocationService: CurrentLocationService,
        private _apiServer: AppConfig,
        private _userService: UserService,
        private _swUpdate: SwUpdate
    )
    {        
        // reload if there are any update for PWA
        _swUpdate.available.subscribe(event => {
            _swUpdate.activateUpdate().then(()=>document.location.reload());
        });
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
                                    // set title
                                    this._titleService.setTitle(tags[titleIndex].content);
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

        this._userService.userSession$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((userSession: UserSession)=>{
                if (userSession) {
                    this.userSession = userSession                    

                    // Set customer activiry
                    this.customerActivity.customerId  = this.userSession.id;
                    this.customerActivity.browserType = this.userSession.browser;
                    this.customerActivity.deviceModel = this.userSession.device;
                    this.customerActivity.ip          = this.userSession.ip;
                    this.customerActivity.os          = this.userSession.os;
                    this.customerActivity.sessionId   = this.userSession.id;
                }
                // Mark for Check
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
        
        this._router.events.forEach((event) => {   
            if(event instanceof RoutesRecognized) {
                // set store id
                if (this._storeService.storeId$ !== "") this.customerActivity.storeId = this._storeService.storeId$;
                // set page visited
                this.customerActivity.pageVisited = 'https://' + this._apiServer.settings.marketplaceDomain + event["urlAfterRedirects"];
                
                this._analyticService.customerActivity = this.customerActivity;
                this._analyticService.postActivity(this.customerActivity).subscribe();           
            }        
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

            if (channel === null) {
                channel = this.customerActivity.channel;
            }
            
            this.customerActivity.channel = channel
        });
    }
}
