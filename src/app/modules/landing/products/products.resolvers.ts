// import { Injectable } from '@angular/core';
// import { ActivatedRoute, ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router';
// import { forkJoin, Observable, of, throwError } from 'rxjs';
// import { catchError, switchMap, take } from 'rxjs/operators';
// import { StoreCategory, Store, StorePagination } from 'app/core/store/store.types';
// import { StoresService } from 'app/core/store/store.service';
// import { LocationService } from 'app/core/location/location.service';
// import { PlatformService } from 'app/core/platform/platform.service';
// import { map } from 'lodash';

// @Injectable({
//     providedIn: 'root'
// })
// export class ProductsResolver implements Resolve<any>
// {
//     storeDomain: string;
//     /**
//      * Constructor
//      */
//     constructor(
//         private _router: Router, 
//         private _storesService: StoresService,
//         private _locationService: LocationService,
//         private _platformsService: PlatformService,
//         private _route: ActivatedRoute,

//     )
//     {
//     }

//     // -----------------------------------------------------------------------------------------------------
//     // @ Public methods
//     // -----------------------------------------------------------------------------------------------------

//     /**
//     * Resolver
//     *
//     * @param route
//     * @param state
//     */
//     resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any>
//     {

//         this.storeDomain = this._route.snapshot.paramMap.get('store-slug')   

//         return this._storesService.getStoreByDomainName(route.paramMap.get('store-slug'))
//             .pipe(
//                 switchMap((store) => {

//                     return this._storesService.getStoreCategories(store.id)
//                 })
//             );

//     }
// }
