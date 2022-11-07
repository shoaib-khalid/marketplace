import { NgModule } from '@angular/core';
import { SplashScreenComponent } from './splash-screen.component';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';
import { SharedModule } from 'app/shared/shared.module';

@NgModule({
    declarations: [
        SplashScreenComponent,
    ],
    imports     : [
        MatIconModule,
        TranslocoModule,
        SharedModule
    ],
    exports   : [
        SplashScreenComponent
    ]
})
export class SplashScreenModule
{
}