import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router';
import { ProductsService } from 'app/core/product/product.service';
import { StoresService } from 'app/core/store/store.service';
import { Store } from 'app/core/store/store.types';
import { forkJoin, tap, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ProductResolver implements Resolve<any>
{
    /**
     * Constructor
     */
    constructor(
        private _productsService: ProductsService,
        private _storesService: StoresService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Resolver
     *
     * @param route
     * @param state
     */

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any>
    {
        // Fork join multiple API endpoint calls to wait all of them to finish
        return this._storesService.store$
            .pipe(
                tap((store: Store) => {        
                    let productSlug: string = route.paramMap.get('product-slug');                    
                    let shortId: number = +(productSlug.split("-")[0]);
                    this._productsService.getProductByShortId(store.id, shortId).subscribe();
                })
            );
    }
}