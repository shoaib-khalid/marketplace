import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseFindByKeyPipeModule } from '@fuse/pipes/find-by-key';
import { SharedModule } from 'app/shared/shared.module';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { FuseCardModule } from '@fuse/components/card';
import { FuseAlertModule } from '@fuse/components/alert';
import { MatDialogModule } from '@angular/material/dialog';


import { userProfileRoutes } from './user-profile.routing';

import { EditProfileComponent } from './edit-profile/edit-profile.component';
import { EditAccountComponent } from './account/account.component';
import { EditSecurityComponent } from './security/security.component';
import { EditDeliveryAddressComponent } from './delivery-address/delivery-address.component';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { _CustomerAddressesModule } from 'app/layout/common/_customer-addresses/customer-addresses.module';
import { DeleteAccountComponent } from './delete-account/delete-account.component';
import { ConfirmDeleteDialog } from './delete-account/modal-confirm-delete/modal-confirm-delete.component';

@NgModule({
    declarations: [
        EditProfileComponent,
        EditAccountComponent,
        EditSecurityComponent,
        EditDeliveryAddressComponent,
        DeleteAccountComponent,
        ConfirmDeleteDialog
    ],
    imports     : [
        RouterModule.forChild(userProfileRoutes),
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressBarModule,
        MatSelectModule,
        MatRadioModule,
        MatSidenavModule,
        MatSlideToggleModule,
        MatTooltipModule,
        FuseFindByKeyPipeModule,
        SharedModule,
        MatTabsModule,
        MatPaginatorModule,
        MatCheckboxModule,
        MatToolbarModule,
        MatListModule,
        FuseCardModule,
        FuseAlertModule,
        MatDialogModule,
        NgxMatSelectSearchModule,
        _CustomerAddressesModule
    ],
    providers: [
        // GraphHelper
    ],
})
export class UserProfileModule
{
}
