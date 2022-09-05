import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SharedModule } from 'app/shared/shared.module';
import { LandingHomeComponent } from 'app/modules/landing/home/home.component';
import { landingHomeRoutes } from 'app/modules/landing/home/home.routing';
import { MatInputModule } from '@angular/material/input';
import { FuseCardModule } from '@fuse/components/card';
import { _SwiperBannerModule } from 'app/layout/common/_swiper-banner/swiper-banner.module';
import { _SearchModule } from 'app/layout/common/_search/search.module';
import { _FeaturedStoresModule } from 'app/layout/common/_featured-stores/featured-stores.module';
import { _FeaturedCategoriesModule } from 'app/layout/common/_featured-categories/featured-categories.module';
import { _FeaturedLocationsModule } from 'app/layout/common/_featured-locations/featured-locations.module';
import { _FeaturedProductsModule } from 'app/layout/common/_featured-products/featured-products.module';
import { PaginationModule } from 'app/layout/common/pagination/pagination.module';
import { _AdsBannerModule } from 'app/layout/common/_ads-banner/ads-banner.module';
import { _BottomPopUpModule } from 'app/layout/common/_bottom-popup/bottom-popup.module';

@NgModule({
    declarations: [
        LandingHomeComponent
    ],
    imports     : [
        RouterModule.forChild(landingHomeRoutes),
        MatButtonModule,
        MatIconModule,
        SharedModule,
        MatInputModule,
        FuseCardModule,
        _SearchModule,
        _FeaturedStoresModule,
        _FeaturedCategoriesModule,
        _FeaturedLocationsModule,
        _FeaturedProductsModule,
        _AdsBannerModule,
        _SwiperBannerModule,
        PaginationModule,
        _BottomPopUpModule,
    ]
})
export class LandingHomeModule
{
}
