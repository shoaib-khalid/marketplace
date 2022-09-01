import { NgModule } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { FuseCardModule } from '@fuse/components/card';
import { SharedModule } from 'app/shared/shared.module';
// import { NgxHideOnScrollModule } from 'ngx-hide-on-scroll';
import { _StoreCategoriesSideComponent } from './side-placement/store-categories-side.component';
import { _StoreCategoriesTopComponent } from './top-placement/store-categories-top.component';
import { _StoreCategoriesScrollComponent } from './_scroll-hide/store-categories-scroll.component';

@NgModule({
    declarations: [
        _StoreCategoriesSideComponent,
        _StoreCategoriesTopComponent,
        _StoreCategoriesScrollComponent
    ],
    imports     : [
        RouterModule.forChild([]),
        SharedModule,
        MatIconModule,
        MatCheckboxModule,
        FuseCardModule,
        // NgxHideOnScrollModule
    ],
    exports     : [
        _StoreCategoriesSideComponent,
        _StoreCategoriesTopComponent,
        _StoreCategoriesScrollComponent
    ]
})
export class _StoreCategoriesModule
{
}
