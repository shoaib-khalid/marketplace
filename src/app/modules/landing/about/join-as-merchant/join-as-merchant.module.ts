import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'app/shared/shared.module';
import { JoinAsMerchantComponent } from './join-as-merchant.component';
import { joinAsMerchantRoutes } from './join-as-merchant.routing';

@NgModule({
    declarations: [
        JoinAsMerchantComponent
    ],
    imports     : [
        RouterModule.forChild(joinAsMerchantRoutes),
        MatButtonModule,
        MatIconModule,
        MatExpansionModule,
        SharedModule
    ],
    bootstrap   : [
    ]
})
export class JoinAsMerchantModule
{
}