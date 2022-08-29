/* eslint-disable max-len */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector       : 'legal',
    templateUrl    : './legal.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegalComponent implements OnInit
{
    docId: string;
    private _unsubscribeAll: Subject<any> = new Subject<any>();


    /**
     * Constructor
     */
    constructor(
        private _route: ActivatedRoute,
        private _titleService: Title,
        private _platformsService: PlatformService,
        private _changeDetectorRef: ChangeDetectorRef,

    )
    {
    }
    ngOnInit(): void {

        this.docId = this._route.snapshot.paramMap.get('id');

        this._platformsService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                
                if (platform) {
                    let title = '';
                    if (this.docId === 'privacy-policy') {
                        title = 'Privacy Policy'
                    }
                    else if (this.docId === 'refund-policy') {
                        title = 'Refund Policy'
                    }
                    else if (this.docId === 'terms-conditions') {
                        title = 'Terms & Condition'
                    }
                    
                    // set title
                    this._titleService.setTitle(platform.name + " | " + title);
                    // Mark for check
                    this._changeDetectorRef.markForCheck();
                }
                
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
