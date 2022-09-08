import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, ReplaySubject, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class BottomPopUpService
{
    private _bottomPopUp: ReplaySubject<any> = new ReplaySubject<any>(1);

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient)
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for bottom pop up
     *
     * @param value
     */
    set bottomPopUp(value: any)
    {
        // Store the value
        this._bottomPopUp.next(value);
    }

    get bottomPopUp$(): Observable<any>
    {
        return this._bottomPopUp.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Set popup
     */
    set(bottomPopUp: any)
    {
        this._bottomPopUp.next(bottomPopUp);
        // return of(false); 
    }

}
