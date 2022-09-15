import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'app/shared/shared.module';
import { NgxGalleryModule } from 'ngx-gallery-9';
import { _BottomSheetComponent } from './bottom-sheet.component';

@NgModule({
    declarations: [
        _BottomSheetComponent
    ],
    imports     : [
        RouterModule.forChild([]),
        SharedModule,
        NgxGalleryModule,
        MatIconModule,
        MatInputModule
    ],
    exports     : [
        _BottomSheetComponent
    ]
})
export class _BottomSheetModule
{
}
