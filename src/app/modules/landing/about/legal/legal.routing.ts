import { Route } from '@angular/router';
import { LegalComponent } from './legal';

export const legalRoutes: Route[] = [
    {
        path     : ':id',
        component: LegalComponent
    }
];
