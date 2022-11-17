import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { Subject, takeUntil } from 'rxjs';
import { LoadingScreenService } from './loading-screen.service';

@Component({
    selector       : 'loading-screen',
    templateUrl    : './loading-screen.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations     : fuseAnimations,
    styleUrls      : ['./loading-screen.component.scss'],
})
export class LoadingScreenComponent
{

    show: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    
    /**
     * Constructor
     */
    constructor(
        private _loadingScreenService: LoadingScreenService,
        private _changeDetectorRef: ChangeDetectorRef,

    )
    {
    }

    ngOnInit(): void 
    {
        this._loadingScreenService.show$
        .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: boolean) => {
                
                this.show = response;

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
}
