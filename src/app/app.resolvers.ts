import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { forkJoin, Observable, of, switchMap } from 'rxjs';
import { MessagesService } from 'app/layout/common/messages/messages.service';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';
import { QuickChatService } from 'app/layout/common/quick-chat/quick-chat.service';
import { ShortcutsService } from 'app/layout/common/shortcuts/shortcuts.service';
import { UserService } from 'app/core/user/user.service';
import { PlatformService } from 'app/core/platform/platform.service';
import { JwtService } from './core/jwt/jwt.service';
import { AuthService } from './core/auth/auth.service';
import { CartService } from './core/cart/cart.service';
import { HttpStatService } from './mock-api/httpstat/httpstat.service';
import { AnalyticService } from './core/analytic/analytic.service';
import { CurrentLocationService } from './core/_current-location/current-location.service';
import { LocationService } from './core/location/location.service';

@Injectable({
    providedIn: 'root'
})
export class InitialDataResolver implements Resolve<any>
{
    /**
     * Constructor
     */
    constructor(
        private _messagesService: MessagesService,
        private _navigationService: NavigationService,
        private _notificationsService: NotificationsService,
        private _quickChatService: QuickChatService,
        private _shortcutsService: ShortcutsService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Use this resolver to resolve initial mock-api for the application
     *
     * @param route
     * @param state
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any>
    {
        // Fork join multiple API endpoint calls to wait all of them to finish
        return forkJoin([
            this._navigationService.get(),
            this._messagesService.getAll(),
            this._notificationsService.getAll(),
            this._quickChatService.getChats(),
            this._shortcutsService.getAll(),
        ]);
    }
}

@Injectable({
    providedIn: 'root'
})
export class PlatformSetupResolver implements Resolve<any>
{
    /**
     * Constructor
     */
    constructor(
        private _platformsService: PlatformService,
        private _jwtService: JwtService,
        private _authService: AuthService,
        private _cartService: CartService,
        private _userService: UserService,
        private _cartsService: CartService,
        private _analyticService: AnalyticService,
        private _currentLocationService: CurrentLocationService,
        private _locationService: LocationService,
        private _httpstatService: HttpStatService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Use this resolver to resolve initial mock-api for the application
     *
     * @param route
     * @param state
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any>
    {        
        let customerId = this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid ? this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid : null

        return forkJoin([
            this._platformsService.set(),
            this._userService.get(this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid),
            this._cartService.getCartsByCustomerId(customerId),
            this._cartsService.cartResolver(true), // cartResolver(true) means we resolving the cart notification header
            this._analyticService.resolveAnalytic(),
            this._currentLocationService.get(),
            // this._locationService.getTags()
            // this._httpstatService.get(500)
        ])
    }
}

@Injectable({
    providedIn: 'root'
})
export class BrowserCompatibilityResolver implements Resolve<any>
{
    noscript: HTMLLinkElement = document.querySelector('#noscript');

    /**
     * Constructor
     */
    constructor(
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Use this resolver to resolve initial mock-api for the application
     *
     * @param route
     * @param state
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any>
    {        
        return of(true).pipe(
            switchMap(async (response: any) => {
                this.noscript.innerText = "";
                this.noscript.style.display = "none";
            })
        );
    }
}