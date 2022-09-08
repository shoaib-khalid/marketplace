import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FloatingCartsComponent } from './floating-carts.component';
import { CurrencyPipe } from '@angular/common';
import { SharedModule } from 'app/shared/shared.module';

@NgModule({
    declarations: [
        FloatingCartsComponent
    ],
    imports     : [
        MatIconModule,
        MatButtonModule,
        SharedModule
    ],
    exports     : [
        FloatingCartsComponent
    ],
    providers   : [
        CurrencyPipe
    ]
})
export class _FloatingCartsModule
{
}
