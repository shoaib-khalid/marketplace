import { Route } from '@angular/router';
import { CustomerAddressResolver, LandingDataResolver } from './landing.resolvers';

export const landingRoutes: Route[] = [
    // Landing routes
    {
        path       : '',
        resolve: {
            landingDataResolver: LandingDataResolver,
            customerAddressResolver: CustomerAddressResolver
        },
        children   : [
            {path: '', pathMatch : 'full', loadChildren: () => import('app/modules/landing/home/home.module').then(m => m.LandingHomeModule)},
            {path: 'search', loadChildren: () => import('app/modules/landing/search/search.module').then(m => m.LandingSearchModule)},
            {path: 'category', loadChildren: () => import('app/modules/landing/categories/categories.module').then(m => m.CategoriesModule)},
            {path: 'location', loadChildren: () => import('app/modules/landing/locations/locations.module').then(m => m.LandingLocationsModule)},
            {path: 'store', loadChildren: () => import('app/modules/landing/stores/stores.module').then(m => m.LandingStoresModule)},
            {path: 'product', loadChildren: () => import('app/modules/landing/products/products.module').then(m => m.LandingProductsModule)},
            {path: 'checkout', loadChildren: () => import('app/modules/landing/checkout/checkout.module').then(m => m.BuyerCheckoutModule)},
            {path: 'carts', loadChildren: () => import('app/modules/landing/carts/carts.module').then(m => m.CartsModule)},
            {path: 'address', loadChildren: () => import('app/modules/landing/address-setting/address-setting.module').then(m => m.AddressSettingsModule)}
            // {path: 'legal', loadChildren: () => import('app/modules/admin/docs/legal/legal.module').then(m => m.LegalModule)}
        ]
    }
]; 