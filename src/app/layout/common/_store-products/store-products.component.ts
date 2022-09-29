import { ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { DOCUMENT } from '@angular/common';
import { StoreAssets } from 'app/core/store/store.types';
import { ProductDetails } from 'app/core/location/location.types';
import { Product, ProductInventory } from 'app/core/product/product.types';
import { BottomPopUpService } from '../_bottom-popup/bottom-popup.service';
import { ProductsService } from 'app/core/product/product.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { _BottomSheetComponent } from '../../../modules/landing/stores/_bottom-sheet-product/bottom-sheet.component';

@Component({
    selector     : 'store-products',
    templateUrl  : './store-products.component.html',
    encapsulation: ViewEncapsulation.None
})
export class _StoreProductsComponent implements OnInit, OnDestroy
{

    platform: Platform;
    @Input() products: any;
    @Input() store: any;
    @Input() productViewOrientation: string = "grid"; 
    @Input() catalogueSlug: any;
    @Input() storeSlug: any;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    currentScreenSize: string[];

    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _platformService: PlatformService,
        private _router: Router,
        private _route: ActivatedRoute,
        private _bottomPopUpService: BottomPopUpService,
        private _productsService: ProductsService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseMediaWatcherService: FuseMediaWatcherService,

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
            
        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {
                this.currentScreenSize = matchingAliases;

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

    redirectToProduct(product: Product) {
        // if has stock
        if (this.isProductHasStock(product)) {
            if (this.currentScreenSize.includes('md'))
                this._router.navigate(['store/' + this.storeSlug + '/' + this.catalogueSlug + '/' + product.seoNameMarketplace]);
            else {
                this._productsService.selectProduct(product);
            }
        }
        else return
    }

    selectProduct(product: Product){
        if (this.isProductHasStock(product)) {
            this._productsService.selectProduct(product);
        }
        else return
    }

    displayStoreLogo(storeAssets: StoreAssets[]) {
        let storeAssetsIndex = storeAssets.findIndex(item => item.assetType === 'LogoUrl');
        if (storeAssetsIndex > -1) {
            return storeAssets[storeAssetsIndex].assetUrl;
        } else {
            return this.platform.logo;
        }
    }
    
    isProductHasStock(product: Product): boolean
    {
        if (product.allowOutOfStockPurchases === true) {
            return true;
        } else {
            if (product.productInventories.length > 0) {
                let productInventoryQuantities = product.productInventories.map(item => item.quantity);
                let totalProductInventoryQuantity = productInventoryQuantities.reduce((partialSum, a) => partialSum + a, 0);
    
                if (totalProductInventoryQuantity > 0) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }
    }    
}
