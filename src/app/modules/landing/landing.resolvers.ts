import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { HttpStatService } from 'app/mock-api/httpstat/httpstat.service';
import { AdsService } from 'app/core/ads/ads.service';
import { CartService } from 'app/core/cart/cart.service';
import { UserService } from 'app/core/user/user.service';
import { FloatingBannerService } from 'app/core/floating-banner/floating-banner.service';


@Injectable({
    providedIn: 'root'
})
export class LandingDataResolver implements Resolve<any>
{
    /**
     * Constructor
     */
    constructor(
        private _adsService: AdsService,
        private _cartsService: CartService,
        private _userService: UserService,
        private _httpstatService: HttpStatService,
        private _floatingBannerService: FloatingBannerService,

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
            // this._adsService.set(),
            this._userService.getCustomerAddresses(),
            this._floatingBannerService.resolveBanners()
            // this._httpstatService.get(500)
        ]);
    }
}
