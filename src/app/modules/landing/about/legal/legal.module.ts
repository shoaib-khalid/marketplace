import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'app/shared/shared.module';
import { LegalComponent } from './legal';
import { legalRoutes } from './legal.routing';

@NgModule({
    declarations: [
        LegalComponent
    ],
    imports     : [
        RouterModule.forChild(legalRoutes),
        SharedModule,
        MatIconModule
    ]
})
export class LegalModule
{
}
