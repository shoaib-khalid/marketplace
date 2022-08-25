import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
    selector   : 'join-as-merchant',
    templateUrl: './join-as-merchant.component.html',
    encapsulation: ViewEncapsulation.None
})
export class JoinAsMerchantComponent
{
    marketplaceInfo: { phonenumber: string; email: string; address: string; reg:string };

    /**
     * Constructor
     */
    constructor(
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