import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PaginationModule } from 'app/layout/common/pagination/pagination.module';
import { MatMenuModule } from '@angular/material/menu';
import { SharedModule } from 'app/shared/shared.module';
import { MatTabsModule } from '@angular/material/tabs'
import { voucherRoutes } from './carts.routing';
import { MatTableModule } from '@angular/material/table';
import { FuseCardModule } from '@fuse/components/card';
import { CartListComponent } from './carts.component';
import { ModalConfirmationDeleteItemComponent } from './modal-confirmation-delete-item/modal-confirmation-delete-item.component';
import { ErrorBackgroundModule } from 'app/shared/error-background/error-background.module';
import { MatRadioModule } from '@angular/material/radio';
import { SelfPickupInfoDialog } from './modal-self-pickup-info/modal-self-pickup-info.component';
import { CartAddressComponent } from './modal-address/cart-addresses.component';
import { CartAddressModule } from './modal-address/cart-addresses.module';
import { _FloatingCartsModule } from 'app/layout/common/_floating-carts/floating-carts.module';

@NgModule({
    declarations: [
        CartListComponent,
        ModalConfirmationDeleteItemComponent,
        SelfPickupInfoDialog,
    ],
    imports     : [
        RouterModule.forChild(voucherRoutes),
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatSelectModule,
        MatInputModule,
        MatCheckboxModule,
        MatTooltipModule,
        MatPaginatorModule,
        MatMenuModule,
        PaginationModule,
        SharedModule,
        MatTabsModule,
        ErrorBackgroundModule,
        FuseCardModule,
        MatRadioModule,
        CartAddressModule,
        _FloatingCartsModule
    ],
    providers: [
        CurrencyPipe,
        DatePipe
    ],
    bootstrap   : [
    ]
})
export class CartsModule
{
}
