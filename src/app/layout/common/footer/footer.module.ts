import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { FooterComponent } from 'app/layout/common/footer/footer.component';
import { SharedModule } from 'app/shared/shared.module';
import { _FeaturedCategoriesModule } from '../_featured-categories/featured-categories.module';

@NgModule({
    declarations: [
        FooterComponent
    ],
    imports     : [
        RouterModule.forChild([]),
        MatButtonModule,
        MatDividerModule,
        MatIconModule,
        MatMenuModule,
        SharedModule,
        _FeaturedCategoriesModule
    ],
    exports     : [
        FooterComponent
    ]
})
export class FooterModule
{
}
