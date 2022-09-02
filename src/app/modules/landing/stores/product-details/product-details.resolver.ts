import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router';
import { ProductsService } from 'app/core/product/product.service';
import { StoresService } from 'app/core/store/store.service';
import { forkJoin, map, Observable } from 'rxjs';

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
        return this._storesService.resolveStore(route.paramMap.get('store-slug'))
                    .pipe(
                        map((response)=>{
                            console.log("response", response);
                            
                            if (response) {
                                this._productsService.resolveProduct( route.paramMap.get('product-slug')).subscribe()
                                this._productsService.getProducts(0, 8, "name", "asc", '', 'ACTIVE,OUTOFSTOCK', '', true).subscribe()
                            }
                        })
                    )
        return forkJoin([
            this._storesService.resolveStore(route.paramMap.get('store-slug'))
            // this._productsService.resolveProduct( route.paramMap.get('product-slug')),
            // this._productsService.getProducts(0, 8, "name", "asc", '', 'ACTIVE,OUTOFSTOCK', '', true)
        ]);
    }
}