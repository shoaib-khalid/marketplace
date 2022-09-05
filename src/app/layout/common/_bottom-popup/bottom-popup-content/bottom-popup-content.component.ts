import { Component, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation, Input, ElementRef, OnInit, ChangeDetectorRef, ViewChild, TemplateRef, ViewContainerRef } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { Subject, takeUntil } from 'rxjs';
import { BottomPopUpService } from '../bottom-popup.service';

@Component({
    selector       : 'bottom-popup-content',
    templateUrl    : 'bottom-popup-content.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation  : ViewEncapsulation.None,
    animations     :fuseAnimations
})
export class BottomPopupContentComponent implements OnInit, OnDestroy 
{
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _bottomPopUpService: BottomPopUpService,
    ) 
    {
    }

    ngOnInit(): void {
        
    }


    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    closePopup() {
        this._bottomPopUpService.get(null).subscribe();
    }
}