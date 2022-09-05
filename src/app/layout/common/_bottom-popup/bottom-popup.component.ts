import { Component, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, Input, ElementRef, OnInit, ChangeDetectorRef, ViewChild, TemplateRef, ViewContainerRef } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { Subject, takeUntil } from 'rxjs';
import { BottomPopUpService } from './bottom-popup.service';

@Component({
    selector       : 'bottom-popup',
    templateUrl    : 'bottom-popup.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation  : ViewEncapsulation.None,
    animations     :fuseAnimations
})
export class BottomPopupComponent implements OnInit, OnDestroy 
{

    @ViewChild('openPopUp') _openPopUp:TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _viewContainerRef: ViewContainerRef,
        private _bottomPopUpService: BottomPopUpService,
        private _changeDetectorRef: ChangeDetectorRef
    ) 
    {
    }

    ngOnInit(): void {
        
        this._bottomPopUpService.bottomPopUp$
        .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(response => {
                this._openPopUp = response;

                if (this._openPopUp) {
                    this._viewContainerRef.clear();
                    this._viewContainerRef.createEmbeddedView(this._openPopUp)
                } else {
                    this._viewContainerRef.clear();
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }


    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
}