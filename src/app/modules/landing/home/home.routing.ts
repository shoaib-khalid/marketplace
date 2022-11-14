import { Route } from '@angular/router';
import { LandingHomeComponent } from 'app/modules/landing/home/home.component';
import { StoresResolver } from '../stores/stores.resolvers';

export const landingHomeRoutes: Route[] = [
    {
        path     : '',  
        children   : [
            {
                path: '',
                component: LandingHomeComponent,
            }
        ],
    },
];
