import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FloatingCartsComponent } from './floating-carts.component';

@NgModule({
    declarations: [
        FloatingCartsComponent
    ],
    imports     : [
        MatIconModule,
        MatButtonModule
    ],
    exports     : [
        FloatingCartsComponent
    ]
})
export class _FloatingCartsModule
{
}
