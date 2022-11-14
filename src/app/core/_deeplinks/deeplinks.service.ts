import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, ReplaySubject, tap } from 'rxjs';
import { Navigation } from 'app/core/navigation/navigation.types';
import { ActivatedRoute } from '@angular/router';
import { AppConfig } from 'app/config/service.config';
import { LogService } from '../logging/log.service';

@Injectable({
    providedIn: 'root'
})
export class DeepLinksService
{
    private _navigation: ReplaySubject<Navigation> = new ReplaySubject<Navigation>(1);

    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private _apiServer: AppConfig,
        private _logging: LogService,
        private _activatedRoute: ActivatedRoute

    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for navigation
     */
    get navigation$(): Observable<Navigation>
    {
        return this._navigation.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get all navigation data
     */
    getDeeplinks(): Observable<any>
    {
        let deliverinUrl = this._apiServer.settings.marketplaceDomain;
        let slug = this._activatedRoute.snapshot.paramMap.get('slug');

        return this._httpClient.get<any[]>(deliverinUrl + '?slug=' + slug + '&_embed').pipe(
            map((response) => {
                this._logging.debug("Response from DeepLinksService (getDeepLinks)",response);

                let deeplink = response[0];
                deeplink['media_url'] = deeplink['embedded']['wp:featuredmedia'][0]['media_details'].sizes['medium'].source_url;

                return deeplink;
            })
        );
    }


}
