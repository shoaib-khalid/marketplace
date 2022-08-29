import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import paginate from 'jw-paginate';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector       : 'pagination',
    templateUrl    : './pagination.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs       : 'pagination'
})
export class PaginationComponent implements OnInit, OnDestroy
{
    @Input() itemLength: number = 0;
    @Output() changePage = new EventEmitter<any>(true);
    @Input() initialPage: number = 1;
    @Input() pageSize: number = 10;
    @Input() maxPages: number = 3;

    @Input() set _itemLength(value: number) {
        this.itemLength = value;
    }

    pager: any = {};
    
    pageOfItems: Array<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseMediaWatcherService: FuseMediaWatcherService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        this.fuseMediaChanges(this.pageSize);

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
    }

    ngOnChanges(){
        if (this.itemLength) {
            
            this.setPage(this.initialPage);
        }
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    setPage(page: number) {
        // get new pager object for specified page
        this.pager = paginate(this.itemLength, page, this.pageSize, this.maxPages);

        // call change page function in parent component
        this.changePage.emit(this.pager);
    }

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

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    fuseMediaChanges(pageSize: number) {
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {               

                // Set the drawerMode and drawerOpened
                // if ( matchingAliases.includes('lg') ) {
                //     this.maxPages = 10;
                // } else if ( matchingAliases.includes('md') ) {
                //     this.maxPages = 7;
                // } else if ( matchingAliases.includes('sm') ) {
                //     this.maxPages = 5;
                // } else {
                //     this.maxPages = 3;
                // }

                this.maxPages = 3;

                if (pageSize < this.maxPages) {
                    this.maxPages = pageSize; 
                }

                this.setPage(this.pager.currentPage);

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }
}
