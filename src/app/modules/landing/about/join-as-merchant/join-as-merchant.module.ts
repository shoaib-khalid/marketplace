import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { JoinAsMerchantComponent } from './join-as-merchant.component';
import { joinAsMerchantRoutes } from './join-as-merchant.routing';

@NgModule({
    declarations: [
        JoinAsMerchantComponent
    ],
    imports     : [
        RouterModule.forChild(joinAsMerchantRoutes),
    ],
    bootstrap   : [
    ]
})
export class JoinAsMerchantModule
{
}