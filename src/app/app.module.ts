import { APP_INITIALIZER, Injectable, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExtraOptions, PreloadAllModules, RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { FuseModule } from '@fuse';
import { FuseConfigModule } from '@fuse/services/config';
import { FuseMockApiModule } from '@fuse/lib/mock-api';
import { CoreModule } from 'app/core/core.module';
import { appConfig } from 'app/core/config/app.config';
import { mockApiServices } from 'app/mock-api';
import { LayoutModule } from 'app/layout/layout.module';
import { AppComponent } from 'app/app.component';
import { appRoutes } from 'app/app.routing';
import { AppConfig } from 'app/config/service.config';
// import { ServiceWorkerModule } from '@angular/service-worker';
// import { environment } from '../environments/environment';
import { HttpClientModule } from '@angular/common/http';

const routerConfig: ExtraOptions = {
    preloadingStrategy       : PreloadAllModules,
    scrollPositionRestoration: 'enabled'
};

@NgModule({
    declarations: [
        AppComponent
    ],
    imports     : [
        BrowserModule,
        BrowserAnimationsModule,
        RouterModule.forRoot(appRoutes, routerConfig),

        // Fuse, FuseConfig & FuseMockAPI
        FuseModule,
        FuseConfigModule.forRoot(appConfig),
        FuseMockApiModule.forRoot(mockApiServices),

        // Core module of your application
        CoreModule,

        // Layout module of your application
        LayoutModule,

        HttpClientModule,

        // 3rd party modules that require global configuration via forRoot
        // MarkdownModule.forRoot({}),
        //     ServiceWorkerModule.register('ngsw-worker.js', {
        //     enabled: environment.production,
        //     // Register the ServiceWorker as soon as the application is stable
        //     // or after 30 seconds (whichever comes first).
        //     registrationStrategy: 'registerWhenStable:30000'
        //     })
    ],
    bootstrap   : [
        AppComponent
    ],
    providers: [
        AppConfig,
        { 
            provide: APP_INITIALIZER,
            useFactory: initializeApp,
            deps: [AppConfig], 
            multi: true 
        },
    ]
})
export class AppModule
{
}

export function initializeApp(appConfig: AppConfig) {
    return () => appConfig.load();
}