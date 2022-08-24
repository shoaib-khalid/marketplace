import { Route } from '@angular/router';
import { LayoutComponent } from 'app/layout/layout.component';
import { JoinAsMerchantComponent } from './join-as-merchant.component';

export const joinAsMerchantRoutes: Route[] = [
    // Join as Merchant routes
    {
        path        : '',
        component   : LayoutComponent,
        data        : {
            layout      : 'fnb2',
            breadcrumb  : 'Join as Merchant' 
        },
        children    : [
            { path: '', pathMatch : 'full', component: JoinAsMerchantComponent }
        ]
    }
];