import { Injectable } from '@angular/core';
import { Observable, of, ReplaySubject, switchMap } from 'rxjs';
import { LogService } from 'app/core/logging/log.service';
import { CurrentLocation } from './current-location.types';

@Injectable({
    providedIn: 'root'
})
export class CurrentLocationService
{
    private _currentLocation: ReplaySubject<CurrentLocation> = new ReplaySubject<CurrentLocation>(1);

    /**
     * Constructor
     */
    constructor(
        private _logging: LogService
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /** Setter for cart
     * @param value
     */
    set currentLocation(value: any) { this._currentLocation.next(value); }
    /** Getter for cart */
    get currentLocation$(): Observable<any> { return this._currentLocation.asObservable(); }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /** Set current platform */
    get(): Observable<any>
    {
        return of(true).pipe(
            switchMap(async (response: any) => {
                let currentLat: number;
                let currentLong: number;
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        var crd = position.coords;
                        currentLat = crd.latitude;
                        currentLong = crd.longitude;

                        this._logging.debug("User has allowed location", { lat: currentLat, lng: currentLong });

                        this._currentLocation.next({ isAllowed: true, location: { lat: currentLat, lng: currentLong }});
                    },
                    (error) => {
                        this._logging.debug("User has NOT allowed location")
                        this._currentLocation.next({ isAllowed: false });
                    }
                );
            })
        );
    }
}
