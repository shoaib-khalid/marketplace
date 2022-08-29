import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector   : 'join-as-merchant',
    templateUrl: './join-as-merchant.component.html',
    encapsulation: ViewEncapsulation.None
})
export class JoinAsMerchantComponent
{
    marketplaceInfo: { phonenumber: string; email: string; address: string; reg:string };
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _platformsService: PlatformService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _titleService: Title
    )
    {
    }

    ngOnInit() {
        this.marketplaceInfo = {
            email: "hello@deliverin.my",
            phonenumber: "+60125033299",
            address: "First Subang, Unit S-14-06, Level 14, Jalan SS15/4G, 47500 Subang Jaya, Selangor",
            reg: "Symple Business System Sdn Bhd (SSM Reg #: 1436952-D)"
        };

        this._platformsService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                if (platform) {
                    // set title
                    this._titleService.setTitle(platform.name + " | " + "Join As Merchant");
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

    goToUrl(){
        const phonenumber = this.marketplaceInfo.phonenumber.replace(/[^0-9]/g, '');
        const message = encodeURI('Tell me more about joining Deliverin platform!')
        window.open("https://wa.me/" + phonenumber + '?text=' + message, "_blank");

        // this._document.location.href = "https://wa.me/" + phonenumber + '?text=' + message;
    }
    
    joinUs() {
        window.open("https://merchant.symplified.biz/sign-up")
    }
}