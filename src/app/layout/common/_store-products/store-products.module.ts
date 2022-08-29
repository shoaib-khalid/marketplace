import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'app/shared/shared.module';
import { _StoreProductsComponent } from './store-products.component';

@NgModule({
    declarations: [
        _StoreProductsComponent
    ],
    imports     : [
        RouterModule.forChild([]),
        MatButtonModule,
        MatIconModule,
        SharedModule
    ],
    exports     : [
        _StoreProductsComponent
    ]
})
export class _StoreProductsModule
{
}
