import { NgModule } from '@angular/core';
import { SharedModule } from 'app/shared/shared.module';
import { LoadingScreenComponent } from './loading-screen.component';

@NgModule({
    declarations: [
        LoadingScreenComponent,
    ],
    imports     : [
        SharedModule
    ],
    exports   : [
        LoadingScreenComponent
    ]
})
export class LoadingScreenModule
{
}