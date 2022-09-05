import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { tap, Observable} from 'rxjs';
import { StoresService } from 'app/core/store/store.service';
import { ProductsService } from 'app/core/product/product.service';
import { AppConfig } from 'app/config/service.config';
import { Store } from 'app/core/store/store.types';
import { DisplayErrorService } from 'app/core/display-error/display-error.service';

@Injectable({
    providedIn: 'root'
})
export class StoresResolver implements Resolve<any>
{
    storeDomain: string;
    /**
     * Constructor
     */
    constructor(
        private _apiServer: AppConfig,
        private _storesService: StoresService,
        private _productsService: ProductsService,
        private _displayErrorService: DisplayErrorService
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
        let storeFrontUrl = this._apiServer.settings.storeFrontDomain;
        let storeDomain = route.paramMap.get('store-slug');        

        return this._storesService.getStoreByDomainName(storeDomain + storeFrontUrl)
                .pipe(
                    tap((store: Store) => {                        
                        if (store) {
                            this._storesService.getStoreCategories(store.id).subscribe();
                            this._productsService.getProducts(store.id, { page: 0, size: 8, sortByCol: "created", sortingOrder: "DESC", status: 'ACTIVE,OUTOFSTOCK'}, false).subscribe();
                        } else {
                            this._displayErrorService.show({title: "Store Not Found", type: '4xx', message: "The store you are looking for might have been removed, had its name changed or is temporarily unavailable.", code: "404"});
                        }
                    })
                );
    }
}
