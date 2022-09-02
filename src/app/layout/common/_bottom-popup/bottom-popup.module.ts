import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';
import { SharedModule } from 'app/shared/shared.module';
import { BottomPopupContentComponent } from './bottom-popup-content/bottom-popup-content.component';
import { BottomPopupHeaderComponent } from './bottom-popup-header/bottom-popup-header.component';
import { BottomPopupComponent } from './bottom-popup.component';

@NgModule({
    declarations: [
        BottomPopupComponent,
        BottomPopupContentComponent,
        BottomPopupHeaderComponent
    ],
    imports     : [
        MatButtonModule,
        MatIconModule,
        TranslocoModule,
        SharedModule
    ],
    exports     : [
        BottomPopupComponent,
        BottomPopupContentComponent,
        BottomPopupHeaderComponent
    ]
})
export class _BottomPopUpModule
{
}