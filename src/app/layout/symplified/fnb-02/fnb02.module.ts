import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { FuseFullscreenModule } from '@fuse/components/fullscreen';
import { FuseLoadingBarModule } from '@fuse/components/loading-bar';
import { FuseNavigationModule } from '@fuse/components/navigation';
import { LanguagesModule } from 'app/layout/common/languages/languages.module';
import { MessagesModule } from 'app/layout/common/messages/messages.module';
import { NotificationsModule } from 'app/layout/common/notifications/notifications.module';
import { QuickChatModule } from 'app/layout/common/quick-chat/quick-chat.module';
import { ShortcutsModule } from 'app/layout/common/shortcuts/shortcuts.module';
import { UserModule } from 'app/layout/common/user/user.module';
import { SharedModule } from 'app/shared/shared.module';
import { Fnb2LayoutComponent } from 'app/layout/symplified/fnb-02/fnb02.component';
import { CartModule } from 'app/layout/common/cart/cart.module';
import { FooterModule } from 'app/layout/common/footer/footer.module';
import { _SearchModule } from 'app/layout/common/_search/search.module';
import { FloatingMessageModule } from 'app/layout/common/_floating-message/floating-message.module';
import { DisplayErrorModule } from 'app/layout/common/_display-error/display-error.module';
import { BreadcrumbModule } from 'app/layout/common/breadcrumb/breadcrumb.module';
import { _SearchLocationModule } from 'app/layout/common/_search-location/search-location.module';
import { _VerticalModeModule } from 'app/layout/common/_vertical-mode/vertical-mode.module';
import { _BottomPopUpModule } from 'app/layout/common/_bottom-popup/bottom-popup.module';
import { _FloatingCartsModule } from 'app/layout/common/_floating-carts/floating-carts.module';
import { LoadingScreenModule } from 'app/shared/loading-screen/loading-screen.module';

@NgModule({
    declarations: [
        Fnb2LayoutComponent
    ],
    imports     : [
        HttpClientModule,
        RouterModule,
        MatButtonModule,
        MatDividerModule,
        MatIconModule,
        MatMenuModule,
        FuseFullscreenModule,
        FuseLoadingBarModule,
        FuseNavigationModule,
        LanguagesModule,
        MessagesModule,
        NotificationsModule,
        QuickChatModule,
        DisplayErrorModule,
        ShortcutsModule,
        UserModule,
        SharedModule,
        CartModule,
        FooterModule,
        _SearchModule,
        _SearchLocationModule,
        _VerticalModeModule,
        FloatingMessageModule,
        BreadcrumbModule,
        _BottomPopUpModule,
        _FloatingCartsModule,
        LoadingScreenModule
    ],
    exports     : [
        Fnb2LayoutComponent
    ]
})
export class Fnb2LayoutModule
{
}
