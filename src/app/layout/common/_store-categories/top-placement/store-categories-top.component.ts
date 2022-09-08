import { ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { DOCUMENT } from '@angular/common';
import { StoreAssets } from 'app/core/store/store.types';
import { ProductDetails } from 'app/core/location/location.types';
import { Product } from 'app/core/product/product.types';
import { StoresService } from 'app/core/store/store.service';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { fuseAnimations } from '@fuse/animations';

@Component({
    selector     : 'store-categories-top',
    templateUrl  : './store-categories-top.component.html',
    encapsulation: ViewEncapsulation.None,
    animations     : fuseAnimations,
    styles       : [
        `
            /** Custom mat-checkbox theme **/
        
            body.light .mat-checkbox-disabled.mat-checkbox-checked .mat-checkbox-background {
                background-color: var(--fuse-primary);
            }
            
            body.light .mat-checkbox-disabled .mat-checkbox-label {
                color: black;
            }
        
            body.light .mat-checkbox-frame {
                border-color: var(--fuse-primary);
            }
        `
    ]
})
export class _StoreCategoriesTopComponent implements OnInit, OnDestroy
{

    @Input() categories: any;
    @Input() category: any
    @Input() store: any;
    @Input() catalogueSlug: string;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    currentScreenSize: string[];
    collapseCategory: boolean = true;
    platform: Platform;

    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _platformService: PlatformService,
        private _router: Router,
        private _storesService: StoresService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _changeDetectorRef: ChangeDetectorRef,
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
        
        // collapse category to false if desktop by default, 
        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(({matchingAliases}) => {
            
            this.currentScreenSize = matchingAliases;
            
            // Set the drawerMode and drawerOpened
            if ( matchingAliases.includes('sm') )
            {
                this.collapseCategory = false;
            }
            else
            {
                this.collapseCategory = true;
            }
            
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

    getCategorySlug(categoryName: string) {
        return categoryName.toLowerCase().replace(/ /g, '-').replace(/[-]+/g, '-').replace(/[^\w-]+/g, '');
    }

    changeCatalogue(value, event = null) {

        let storeDomain = this.store.domain.split(".")[0];

        // find if categoty exists
        let index = this.categories.findIndex(item => item.name.toLowerCase().replace(/ /g, '-').replace(/[-]+/g, '-').replace(/[^\w-]+/g, '') === value);
        // since all-product is not a real category, it will set to null
        this.categories = (index > -1) ? this.categories[index] : null;
        // catalogue slug will be use in url
        this.catalogueSlug = value;       
        
        this._router.navigate(['store/' + storeDomain + '/' + value]);

        // Reload
        this._router.routeReuseStrategy.shouldReuseRoute = () => false;
        this._router.onSameUrlNavigation = 'reload';

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    textTruncate(str, length, ending?: any){
        if (length == null) { length = 100; }
        if (ending == null) { ending = '...'; }
        
        if (str.length > length) {
            return str.substring(0, length - ending.length) + ending;
        } else {
            return str;
        }
    }
    
}
