import { Component, Inject, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { DOCUMENT } from '@angular/common';
import { StoreAssets } from 'app/core/store/store.types';
import { ProductDetails } from 'app/core/location/location.types';
import { StoresService } from 'app/core/store/store.service';
import { Product } from 'app/core/product/product.types';

@Component({
    selector     : 'featured-products',
    templateUrl  : './featured-products.component.html',
    encapsulation: ViewEncapsulation.None
})
export class _FeaturedProductsComponent implements OnInit, OnDestroy
{

    platform: Platform;
    @Input() products: Product[] | ProductDetails[];
    @Input() title: string = "Product";
    @Input() showViewAll: boolean = false;
    @Input() redirectURL: { categoryId?: string, locationId?: string } = null;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _platformService: PlatformService,
        private _router: Router,
        private _storesService: StoresService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform)=>{
                this.platform = platform;
            })           
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
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }

    chooseStore(storeDomain:string) {
        let slug = storeDomain.split(".")[0]
        this._router.navigate(['/store/' + slug]);
    }

    redirectToProduct(storeId: string, storeDomain: string, seoName: string) {
        let domainName = storeDomain.split(".")[0];
        
        // this._document.location.href = url;
        this._router.navigate(['store/' + domainName + '/' + 'all-products/' + seoName]);

    }

    displayStoreLogo(storeAssets: StoreAssets[]) {
        let storeAssetsIndex = storeAssets.findIndex(item => item.assetType === 'LogoUrl');
        if (storeAssetsIndex > -1) {
            return storeAssets[storeAssetsIndex].assetUrl;
        } else {
            return this.platform.logoSquare;
        }
    }

    displayProductImage(product: any) {
        
    } 

    viewAll(){
        if (this.redirectURL) {
            this._router.navigate(['/product/product-list'], {queryParams: this.redirectURL});
        } else {
            this._router.navigate(['/product/product-list']);
        }
    }
}

